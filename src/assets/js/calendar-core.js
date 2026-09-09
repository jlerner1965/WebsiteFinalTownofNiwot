/* Event occurrence logic and markup, shared by the build and the browser.

   Eleventy imports this at build time to render the initial month, the
   "Coming up" strip and the archive, so the page is complete without
   JavaScript and complete for a crawler. The browser then imports the same
   module and re-renders from the real current time, because a static build
   goes stale the moment an event ends.

   One implementation, two callers. Keep it free of DOM and Node APIs.

   Dates are handled as plain strings ("2026-09-11") and times as "HH:MM",
   never as local Date objects, because the build machine, the visitor's
   browser and Niwot are in three different timezones. "Now" is converted
   once into Niwot's own clock (America/Denver) and everything is compared
   against that. */

export const TZ = 'America/Denver';
export const TZ_LABEL = 'Mountain Time';

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* Monday-first, to match the calendar grid. */
export const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* The statuses that carry a real date. `tentative` records are expected but
   unconfirmed; they never enter the dated lists. */
export const DATED_STATUSES = ['confirmed', 'cancelled', 'postponed'];

export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ---- calendar arithmetic on ISO strings ---- */

const pad = (n) => (n < 10 ? '0' : '') + n;

export function isoDate(y, m, d) {
  return y + '-' + pad(m) + '-' + pad(d);
}

export function parseIso(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return { y, m, d };
}

/* Sunday = 0, as Date#getDay(). Computed in UTC so the host timezone never
   shifts the day. */
export function weekdayOf(iso) {
  const { y, m, d } = parseIso(iso);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(iso, n) {
  const { y, m, d } = parseIso(iso);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return isoDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/* ---- timezone ---- */

function partsFormatter(tz) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

/* The wall-clock date and time in `tz` at instant `date`. */
export function zonedParts(date, tz = TZ) {
  const out = {};
  for (const p of partsFormatter(tz).formatToParts(date)) out[p.type] = p.value;
  const hour = out.hour === '24' ? '00' : out.hour;
  return { date: out.year + '-' + out.month + '-' + out.day, time: hour + ':' + out.minute };
}

/* UTC offset of `tz` at local `iso` `time`, as "-06:00". */
export function tzOffset(iso, time, tz = TZ) {
  const { y, m, d } = parseIso(iso);
  const [hh, mm] = (time || '12:00').split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const local = zonedParts(new Date(guess), tz);
  const l = parseIso(local.date);
  const [lh, lm] = local.time.split(':').map(Number);
  const asUtc = Date.UTC(l.y, l.m - 1, l.d, lh, lm);
  const minutes = Math.round((asUtc - guess) / 60000);
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return sign + pad(Math.floor(abs / 60)) + ':' + pad(abs % 60);
}

/* "2026-09-11T18:00:00-06:00" — a timezone-aware ISO datetime for `tz`. */
export function zonedIso(iso, time, tz = TZ) {
  return iso + 'T' + time + ':00' + tzOffset(iso, time, tz);
}

/* ---- instances ----
   A record with `recurrence` describes an organizer-confirmed season
   (weekday + last date) and expands to one instance per date. Everything
   else is a single instance. Instances are keyed by id and date, so the
   same occurrence can never be listed twice. */

export function expandEvents(events) {
  const seen = new Map();
  for (const ev of events) {
    if (!ev.startDate || DATED_STATUSES.indexOf(ev.status) === -1) continue;
    const dates = [];
    if (ev.recurrence) {
      let d = ev.startDate;
      let guard = 0;
      while (d <= ev.recurrence.until && guard++ < 400) {
        if (weekdayOf(d) === ev.recurrence.weekday) dates.push(d);
        d = addDays(d, 1);
      }
    } else {
      dates.push(ev.startDate);
    }
    for (const date of dates) {
      const key = ev.id + '@' + date;
      if (seen.has(key)) continue;
      seen.set(key, {
        key,
        id: ev.id,
        date,
        endDate: ev.recurrence ? date : ev.endDate || date,
        startTime: ev.startTime || null,
        endTime: ev.endTime || null,
        event: ev,
      });
    }
  }
  return Array.from(seen.values());
}

/* An instance is over once its end time has been reached on Niwot's clock.
   An event with no end time lasts to the end of its last day. */
export function isPast(inst, now) {
  const endDate = inst.endDate || inst.date;
  const endTime = inst.endTime || '24:00';
  if (endDate !== now.date) return endDate < now.date;
  return endTime <= now.time;
}

function compareInstances(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  const at = a.startTime || '00:00';
  const bt = b.startTime || '00:00';
  if (at !== bt) return at < bt ? -1 : 1;
  return a.event.name < b.event.name ? -1 : a.event.name > b.event.name ? 1 : 0;
}

/* Every unexpired dated instance, soonest first. */
export function buildUpcoming(events, now, limit) {
  const list = expandEvents(events).filter((i) => !isPast(i, now)).sort(compareInstances);
  return limit ? list.slice(0, limit) : list;
}

export function instancesOn(events, iso) {
  return expandEvents(events).filter((i) => i.date === iso).sort(compareInstances);
}

/* Expected-but-unconfirmed records, in file order. */
export function buildExpected(events) {
  return events.filter((ev) => ev.status === 'tentative');
}

export function buildArchive(events, now, limit = 4) {
  return expandEvents(events)
    .filter((i) => i.event.status === 'confirmed' && isPast(i, now))
    .sort((a, b) => -compareInstances(a, b))
    .slice(0, limit)
    .map((i) => ({
      when: longDate(i.date),
      name: i.event.name,
      place: i.event.location.name,
    }));
}

export function buildCells(events, year, month1, sel) {
  const first = isoDate(year, month1, 1);
  const lead = (weekdayOf(first) + 6) % 7;
  const days = daysInMonth(year, month1);
  const cells = [];
  for (let i = 0; i < lead; i++) {
    cells.push({ day: '', tag: '', empty: true, has: false, selected: false, aria: '' });
  }
  for (let d = 1; d <= days; d++) {
    const iso = isoDate(year, month1, d);
    const hits = instancesOn(events, iso);
    const has = hits.length > 0;
    const first = hits[0];
    const tag = !has ? '' : first.event.status === 'confirmed' ? first.event.tag : statusLabel(first.event.status);
    cells.push({
      day: String(d),
      iso,
      tag,
      empty: false,
      has,
      selected: sel === d,
      aria: has
        ? MONTHS[month1 - 1] + ' ' + d + ' — ' + hits.map((h) => h.event.name + (h.event.status !== 'confirmed' ? ' (' + statusLabel(h.event.status).toLowerCase() + ')' : '')).join(', ')
        : MONTHS[month1 - 1] + ' ' + d,
    });
  }
  return cells;
}

/* The instances in one month, in calendar order. */
export function instancesInMonth(events, year, month1) {
  const prefix = isoDate(year, month1, 1).slice(0, 7);
  return expandEvents(events).filter((i) => i.date.slice(0, 7) === prefix).sort(compareInstances);
}

/* What the detail rail shows for a month when no day has been chosen: the
   first day of that month with an instance still ahead, and everything on
   that day. Null when the month holds nothing ahead — the rail then says so
   (renderMonthEmpty) instead of showing a day from some other month, so the
   heading and the detail can never disagree. */
export function monthDefault(events, year, month1, now) {
  const ahead = instancesInMonth(events, year, month1).filter((i) => !isPast(i, now));
  if (!ahead.length) return null;
  const date = ahead[0].date;
  return { date, day: parseIso(date).d, instances: instancesOn(events, date) };
}

/* ---- labels ---- */

export function statusLabel(status) {
  return { confirmed: 'Confirmed', cancelled: 'Cancelled', postponed: 'Postponed', tentative: 'Expected — date not confirmed' }[status] || status;
}

/* "Fri, September 11" — month first, as the "Checked September 9, 2026"
   stamp beside it and the rest of a Colorado audience write dates; the year
   is added when it is not the current one. */
export function dayLabel(iso, now) {
  const { y, m, d } = parseIso(iso);
  const base = DOWS[(weekdayOf(iso) + 6) % 7] + ', ' + MONTHS[m - 1] + ' ' + d;
  const currentYear = now ? parseIso(now.date).y : y;
  return y === currentYear ? base : base + ', ' + y;
}

export function longDate(iso) {
  const { y, m, d } = parseIso(iso);
  return DOWS[(weekdayOf(iso) + 6) % 7] + ', ' + MONTHS[m - 1] + ' ' + d + ', ' + y;
}

export function clockTime(time) {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return hour + (m ? ':' + pad(m) : '') + ' ' + suffix;
}

export function timeLabel(inst) {
  if (!inst.startTime) return null;
  const start = clockTime(inst.startTime);
  if (!inst.endTime) return start + ', ' + TZ_LABEL;
  const end = clockTime(inst.endTime);
  const startNoSuffix = start.replace(/ (am|pm)$/, '');
  const same = start.slice(-2) === end.slice(-2);
  return (same ? startNoSuffix + '–' + end : start + '–' + end) + ', ' + TZ_LABEL;
}

export function dateLabel(inst, now) {
  if (inst.endDate && inst.endDate !== inst.date) {
    return dayLabel(inst.date, now) + ' to ' + dayLabel(inst.endDate, now);
  }
  return dayLabel(inst.date, now);
}

/* The detail rail for one instance. Every row is drawn from the record, so
   the rail, the card and the structured data can only ever say the same
   thing. */
export function detailFor(inst, now) {
  const ev = inst.event;
  const rows = [{ k: 'Date', v: dateLabel(inst, now) }];
  const time = timeLabel(inst);
  if (time) rows.push({ k: 'Time', v: time });
  if (ev.status !== 'confirmed') rows.push({ k: 'Status', v: statusLabel(ev.status) });
  rows.push({ k: 'Location', v: ev.location.name + (ev.location.address ? ', ' + ev.location.address : '') });
  rows.push({ k: 'Organizer', v: ev.organizer.name });
  if (ev.cost) rows.push({ k: 'Cost', v: ev.cost });
  if (ev.accessibility) rows.push({ k: 'Access', v: ev.accessibility });
  rows.push({ k: 'Checked', v: humanDate(ev.verifiedAt) + ' against the organizer’s page' });
  return {
    id: ev.id,
    date: inst.date,
    when: dateLabel(inst, now),
    name: ev.name,
    status: ev.status,
    time: time ? time.replace(', ' + TZ_LABEL, '') : null,
    rows,
    note: ev.description,
    href: ev.sourceUrl,
    linkLabel: 'Organizer’s page',
  };
}

export function humanDate(iso) {
  const { y, m, d } = parseIso(iso);
  return MONTHS[m - 1] + ' ' + d + ', ' + y;
}

/* ---- markup ----
   Returned as strings so the same code can write the build output and set
   innerHTML in the browser. */

export function renderCells(cells) {
  return cells
    .map((c) => {
      /* The cells before the 1st are layout, not controls: an unnamed
         disabled button there fails "buttons must have discernible text". */
      if (c.empty) return '<div data-day data-empty="yes" aria-hidden="true"></div>';
      const attrs = [
        'type="button"',
        'data-day',
        'data-has="' + (c.has ? 'yes' : 'no') + '"',
        'data-empty="' + (c.empty ? 'yes' : 'no') + '"',
        'aria-pressed="' + (c.selected ? 'true' : 'false') + '"',
        'aria-label="' + escapeHtml(c.aria) + '"',
      ];
      if (!c.has) attrs.push('disabled');
      if (c.day) attrs.push('data-date="' + c.day + '"');
      if (c.iso) attrs.push('data-iso="' + c.iso + '"');
      return (
        '<button ' + attrs.join(' ') + '>' +
        '<span style="font-size:.8125rem">' + escapeHtml(c.day) + '</span>' +
        '<span class="n-daytag">' + escapeHtml(c.tag) + '</span>' +
        '</button>'
      );
    })
    .join('');
}

function renderRows(rows) {
  return rows
    .map(
      (r) =>
        '<div style="display:grid;grid-template-columns:minmax(88px,.4fr) minmax(0,1fr);gap:14px;padding:12px 0;border-top:1px solid var(--n-rule)">' +
        '<dt class="n-label n-label--quiet" style="font-size:12px">' + escapeHtml(r.k) + '</dt>' +
        '<dd class="n-body" style="margin:0;font-size:.9375rem">' + escapeHtml(r.v) + '</dd>' +
        '</div>'
    )
    .join('');
}

function renderOne(detail, inList) {
  return (
    '<div' + (inList ? ' style="margin-top:20px;padding-top:18px;border-top:2px solid var(--n-evergreen)"' : '') + '>' +
    '<div class="n-label">' + escapeHtml(detail.when) + '</div>' +
    '<h4 class="n-h3" style="margin-top:12px;font-size:clamp(1.375rem,1.15rem + .8vw,1.875rem);color:var(--n-evergreen)">' + escapeHtml(detail.name) + '</h4>' +
    (detail.status !== 'confirmed' ? '<div class="n-label" style="margin-top:8px">' + escapeHtml(statusLabel(detail.status)) + '</div>' : '') +
    '<dl style="margin:20px 0 0">' + renderRows(detail.rows) + '</dl>' +
    (detail.note ? '<p class="n-body" style="margin:18px 0 0;font-size:.9375rem">' + escapeHtml(detail.note) + '</p>' : '') +
    '<a class="n-btn" href="' + escapeHtml(detail.href) + '" rel="noopener" style="margin-top:20px">' + escapeHtml(detail.linkLabel) + ' <span aria-hidden="true">&#8599;</span></a>' +
    '</div>'
  );
}

/* One or more instances on the same day. A day with several shows a compact
   list of them and one expanded; `pick` names the expanded one by event id
   (the first, otherwise). In the browser the list items are buttons that
   re-render with another one expanded; the build writes them as plain text,
   since without a script there is nothing for a button to do. */
export function renderDetail(details, options = {}) {
  const list = Array.isArray(details) ? details : [details];
  const interactive = options.interactive === true;
  let picked = options.pick ? list.findIndex((d) => d.id === options.pick) : -1;
  if (picked < 0) picked = 0;
  if (list.length < 2) return renderOne(list[0], false);
  const items = list
    .map((d, i) => {
      const inner =
        '<span>' + escapeHtml(d.name) + '</span>' +
        '<span class="n-small" style="font-size:.8125rem;white-space:nowrap">' + escapeHtml(d.time || 'Time not published') + '</span>';
      const current = i === picked;
      return (
        '<li>' +
        (interactive
          ? '<button type="button" class="n-daypick" data-pick="' + escapeHtml(d.id) + '" aria-pressed="' + (current ? 'true' : 'false') + '">' + inner + '</button>'
          : '<span class="n-daypick"' + (current ? ' aria-current="true"' : '') + '>' + inner + '</span>') +
        '</li>'
      );
    })
    .join('');
  return (
    '<div data-day-list>' +
    '<div class="n-label">' + escapeHtml(list[0].when) + ' &#183; ' + list.length + ' events</div>' +
    '<ol class="n-daylist" style="list-style:none;margin:12px 0 0;padding:0">' + items + '</ol>' +
    '</div>' +
    renderOne(list[picked], true)
  );
}

/* The rail for a month with nothing ahead in it. It says which month, and
   points at the next confirmed date elsewhere on the calendar, so a reader
   who has paged forward is never shown a day from a different month. */
export function renderMonthEmpty(year, month1, now, next, hadAny) {
  const month = MONTHS[month1 - 1] + ' ' + year;
  const lead = hadAny
    ? 'The ' + month + ' dates on this calendar have already taken place.'
    : 'Nothing is confirmed for ' + month + ' yet.';
  const pointer = next
    ? ' The next confirmed date is ' + escapeHtml(dateLabel(next, now)) + ' &#8212; ' + escapeHtml(next.event.name) + '; it is in the <a href="#next-h">Coming up</a> list.'
    : ' The annual events still waiting on a date are listed under <a href="#expected">Expected</a>.';
  return (
    '<p class="n-body" data-cal-empty="' + escapeHtml(month) + '" style="margin:0">' +
    escapeHtml(lead) + pointer +
    ' The organizers’ own pages carry anything announced since this page was checked.</p>'
  );
}

/* The events page opened on one occurrence: the calendar reads `date` and
   `event` from the query string and selects that day and that event. */
export function eventUrl(inst) {
  return '/events/?date=' + inst.date + '&event=' + encodeURIComponent(inst.id) + '#cal-h';
}

/* `mode: 'link'` sends the reader to the events page (used on the homepage).
   `mode: 'select'` loads the occurrence into the detail rail in place. */
export function renderUpcoming(list, mode, now) {
  if (!list.length) {
    /* The events page has its "Expected" list further down; the homepage
       has no such list, so it points at the events page instead. */
    const expected =
      mode === 'select'
        ? 'The expected seasonal events are listed below'
        : 'The expected seasonal events are listed on the <a href="/events/#expected">events calendar</a>';
    return (
      '<p class="n-body" data-upcoming-empty style="margin:0;max-width:56ch">Nothing is confirmed on the calendar right now. ' +
      expected + ', and the organizers’ own pages carry anything announced since this page was checked.</p>'
    );
  }
  return list
    .map((inst) => {
      const ev = inst.event;
      const action =
        mode === 'select'
          ? '<button type="button" class="n-jump" data-jump="' + inst.date + '" data-jump-event="' + escapeHtml(inst.id) + '"' +
            ' style="margin-top:auto;align-self:start;background:none;border:0;border-bottom:1px solid currentColor;color:var(--n-sky-ink);font:inherit;font-size:13px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer">View details <span aria-hidden="true">&#8594;</span></button>'
          : '<a class="n-link" href="' + escapeHtml(eventUrl(inst)) + '" style="margin-top:auto;align-self:start">View details <span aria-hidden="true">&#8594;</span></a>';
      const time = timeLabel(inst);
      return (
        '<article data-event-id="' + escapeHtml(inst.id) + '" data-event-date="' + inst.date + '" data-event-status="' + escapeHtml(ev.status) + '" style="display:flex;flex-direction:column;gap:10px;padding-top:16px;border-top:3px solid var(--n-red)">' +
        '<div class="n-label">' + escapeHtml(dateLabel(inst, now)) + (time ? ' &#183; ' + escapeHtml(time.replace(', ' + TZ_LABEL, '')) : '') + '</div>' +
        '<h3 class="n-h3" style="font-size:1.375rem;color:var(--n-evergreen)">' + escapeHtml(ev.name) + '</h3>' +
        (ev.status !== 'confirmed' ? '<div class="n-label">' + escapeHtml(statusLabel(ev.status)) + '</div>' : '') +
        '<div class="n-body" style="font-size:.9375rem">' + escapeHtml(ev.location.name) + '</div>' +
        '<div class="n-small" style="font-size:.875rem">' + escapeHtml(ev.organizer.name) + (ev.cost ? ' &#183; ' + escapeHtml(ev.cost) : '') + '</div>' +
        action +
        '</article>'
      );
    })
    .join('');
}

export function renderExpected(list) {
  return list
    .map(
      (ev) =>
        '<li data-expected-id="' + escapeHtml(ev.id) + '" style="display:grid;grid-template-columns:minmax(150px,.34fr) minmax(0,1fr);gap:12px 24px;padding:16px 0;border-top:1px solid var(--n-rule)">' +
        '<div><div class="n-label n-label--quiet">' + escapeHtml(statusLabel('tentative')) + '</div>' +
        '<div class="n-small" style="margin-top:6px;color:var(--n-ink)">' + escapeHtml(ev.expected) + '</div></div>' +
        '<div><h3 class="n-h3" style="font-size:1.25rem;color:var(--n-evergreen)">' + escapeHtml(ev.name) + '</h3>' +
        '<p class="n-body" style="margin:8px 0 0;max-width:60ch;font-size:.9375rem">' + escapeHtml(ev.description) + '</p>' +
        '<div class="n-small" style="margin-top:8px;font-size:.875rem">' + escapeHtml(ev.location.name) + ' &#183; ' + escapeHtml(ev.organizer.name) + '</div>' +
        '<a class="n-link" href="' + escapeHtml(ev.sourceUrl) + '" rel="noopener" style="display:inline-block;margin-top:12px">Organizer’s page <span aria-hidden="true">&#8599;</span></a></div>' +
        '</li>'
    )
    .join('');
}

/* A real calendar date in YYYY-MM-DD form. */
export function isIsoDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { y, m, d } = parseIso(value);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}
