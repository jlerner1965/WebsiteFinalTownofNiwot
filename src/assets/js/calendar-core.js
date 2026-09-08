/* Event occurrence logic and markup, shared by the build and the browser.

   Eleventy imports this at build time to render the initial month, the
   "Coming up" strip and the archive, so the page is complete without
   JavaScript and complete for a crawler. The browser then imports the same
   module and re-renders from the real current date, because a static build
   goes stale the moment the month turns over.

   One implementation, two callers. Keep it free of DOM and Node APIs. */

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* Monday-first, to match the calendar grid. */
export const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Date#getDay() is Sunday-first; the grid is Monday-first. */
function mondayIndex(date) {
  return (date.getDay() + 6) % 7;
}

/* The year is carried only when it is not the current one. Most occurrences
   are weeks away and the year would be noise; but the concert series resumes
   next June, and "Thu 3 June" beside September dates places nothing. */
function dayLabel(date) {
  return DOWS[mondayIndex(date)] + ' ' + date.getDate() + ' ' + MONTHS[date.getMonth()];
}

function formatDay(date, reference) {
  const base = dayLabel(date);
  const currentYear = (reference || new Date()).getFullYear();
  return date.getFullYear() === currentYear ? base : base + ' ' + date.getFullYear();
}

/* Which series fall on a given calendar day. */
export function seriesOn(series, year, month, day) {
  const dow = new Date(year, month, day).getDay();
  return series.filter((s) => s.months.indexOf(month) !== -1 && s.weekday === dow);
}

/* The next `count` occurrences of any series, walking forward day by day. */
export function occurrences(series, from, count) {
  const out = [];
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < 400 && out.length < count; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const hits = seriesOn(series, d.getFullYear(), d.getMonth(), d.getDate());
    for (const hit of hits) {
      if (out.length < count) out.push({ date: d, series: hit });
    }
  }
  return out;
}

export function detailFor(entry, date) {
  const when = date ? dayLabel(date) + ' ' + date.getFullYear() : entry.time;
  return {
    when,
    name: entry.name,
    rows: [
      { k: 'Date', v: date ? when + ' — confirm with organizer' : entry.time },
      { k: 'Time', v: entry.time },
      { k: 'Location', v: entry.place },
      { k: 'Organizer', v: entry.host },
      { k: 'Cost', v: entry.cost },
    ],
    note: entry.note,
    href: entry.href,
    linkLabel: entry.linkLabel,
  };
}

/* The next occurrence of each distinct series first, then the remaining slots
   filled chronologically — otherwise the strip reads as one event repeated. */
export function buildUpcoming(series, now, limit = 3) {
  const pool = occurrences(series, now, 14);
  const seen = {};
  const picked = [];
  for (const occ of pool) {
    if (!seen[occ.series.id]) {
      seen[occ.series.id] = true;
      picked.push(occ);
    }
  }
  for (const occ of pool) {
    if (picked.length >= limit) break;
    if (picked.indexOf(occ) === -1) picked.push(occ);
  }
  picked.sort((a, b) => a.date - b.date);
  picked.length = Math.min(picked.length, limit);
  return picked;
}

export function buildCells(series, year, month, sel) {
  const first = new Date(year, month, 1);
  const lead = mondayIndex(first);
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) {
    cells.push({ day: '', tag: '', empty: true, has: false, selected: false, aria: '' });
  }
  for (let d = 1; d <= days; d++) {
    const hits = seriesOn(series, year, month, d);
    const has = hits.length > 0;
    cells.push({
      day: String(d),
      tag: has ? hits[0].tag : '',
      empty: false,
      has,
      selected: sel === d,
      aria: has
        ? d + ' ' + MONTHS[month] + ' — ' + hits[0].name
        : d + ' ' + MONTHS[month],
    });
  }
  return cells;
}

export function buildArchive(series, now, limit = 4) {
  const past = [];
  for (let back = 1; back <= 12 && past.length < limit; back++) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    for (let day = dim; day >= 1 && past.length < limit; day--) {
      const hits = seriesOn(series, d.getFullYear(), d.getMonth(), day);
      if (hits.length) {
        past.push({
          when: day + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(),
          name: hits[0].name,
          place: hits[0].place,
        });
      }
    }
  }
  return past;
}

/* ---- markup ----
   Returned as strings so the same code can write the build output and set
   innerHTML in the browser. */

export function renderCells(cells) {
  return cells
    .map((c) => {
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
      return (
        '<button ' + attrs.join(' ') + '>' +
        '<span style="font-size:.8125rem">' + escapeHtml(c.day) + '</span>' +
        '<span class="n-daytag">' + escapeHtml(c.tag) + '</span>' +
        '</button>'
      );
    })
    .join('');
}

export function renderDetail(detail) {
  const rows = detail.rows
    .map(
      (r) =>
        '<div style="display:grid;grid-template-columns:minmax(88px,.4fr) minmax(0,1fr);gap:14px;padding:12px 0;border-top:1px solid var(--n-rule)">' +
        '<dt class="n-label n-label--quiet" style="font-size:12px">' + escapeHtml(r.k) + '</dt>' +
        '<dd class="n-body" style="margin:0;font-size:.9375rem">' + escapeHtml(r.v) + '</dd>' +
        '</div>'
    )
    .join('');
  return (
    '<div class="n-label">' + escapeHtml(detail.when) + '</div>' +
    '<h4 class="n-h3" style="margin-top:12px;font-size:clamp(1.375rem,1.15rem + .8vw,1.875rem);color:var(--n-evergreen)">' + escapeHtml(detail.name) + '</h4>' +
    '<dl style="margin:20px 0 0">' + rows + '</dl>' +
    '<p class="n-body" style="margin:18px 0 0;font-size:.9375rem">' + escapeHtml(detail.note) + '</p>' +
    '<a class="n-btn" href="' + escapeHtml(detail.href) + '" rel="noopener" style="margin-top:20px">' + escapeHtml(detail.linkLabel) + '</a>'
  );
}

/* `mode: 'link'` sends the reader to the events page (used on the homepage).
   `mode: 'select'` loads the occurrence into the detail rail in place. */
export function renderUpcoming(list, mode, reference) {
  return list
    .map((occ) => {
      const action =
        mode === 'select'
          ? '<button type="button" data-jump="' +
            occ.date.getFullYear() + '-' + occ.date.getMonth() + '-' + occ.date.getDate() +
            '" style="margin-top:auto;align-self:start;padding:0;background:none;border:0;border-bottom:1px solid currentColor;color:var(--n-sky-ink);font:inherit;font-size:13px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer">View details &#8594;</button>'
          : '<a class="n-link" href="/events/" style="margin-top:auto;align-self:start">View details &#8594;</a>';
      return (
        '<article style="display:flex;flex-direction:column;gap:10px;padding-top:16px;border-top:3px solid var(--n-red)">' +
        '<div class="n-label">' + escapeHtml(formatDay(occ.date, reference)) + '</div>' +
        '<h3 class="n-h3" style="font-size:1.375rem;color:var(--n-evergreen)">' + escapeHtml(occ.series.name) + '</h3>' +
        '<div class="n-body" style="font-size:.9375rem">' + escapeHtml(occ.series.place) + '</div>' +
        '<div class="n-small" style="font-size:.875rem">' + escapeHtml(occ.series.host) + ' &#183; ' + escapeHtml(occ.series.cost) + '</div>' +
        action +
        '</article>'
      );
    })
    .join('');
}

export { dayLabel, formatDay, mondayIndex };
