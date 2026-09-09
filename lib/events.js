/* Events: record schema, build-time validation and structured data.

   The records live in src/_data/events.js and the occurrence logic in
   src/assets/js/calendar-core.js (shared with the browser). This module is
   build-only: it decides what may be published and what may be marked up.

   Record shape
   -----------
   id             stable identifier                                     required
   name                                                                  required
   status         confirmed | tentative | cancelled | postponed          required
   startDate      YYYY-MM-DD           required unless status is tentative
   endDate        YYYY-MM-DD, for multi-day events
   startTime      HH:MM, 24-hour, in `timezone`
   endTime        HH:MM
   timezone       must be America/Denver                                required
   recurrence     { weekday, until } — an organizer-confirmed season only:
                  every <weekday> from startDate to `until` inclusive.
                  Never use it to project a season that has not been
                  announced; that is what `tentative` is for.
   expected       for tentative records: the organizer's own wording of when
                  it usually happens ("Thursday evenings, June to August")
   location       { name, address? }                                    required
   organizer      { name, url }                                         required
   sourceUrl      the organizer's page for this event or series          required
   verifiedAt     YYYY-MM-DD, the day the record was checked            required
   cost           the organizer's wording ("Free admission")
   accessibility  the organizer's wording, if published
   tag            short calendar-cell label ("Concert")
   description    one or two sentences from the source

   Editorial workflow
   ------------------
   There is no scraper. When the organizer publishes dates, add or update
   the record, set `verifiedAt` to the day you read the organizer's page and
   cite that page in `sourceUrl`. A season that is expected but unannounced
   is a `tentative` record with `expected` text and no dates; it appears
   under "Expected" and never in structured data. Past instances drop out of
   the upcoming list on their own and are kept in the archive. */
import {
  DATED_STATUSES,
  buildUpcoming,
  expandEvents,
  isIsoDateString,
  weekdayOf,
  zonedIso,
  zonedParts,
  TZ,
} from '../src/assets/js/calendar-core.js';

export const EVENT_STATUSES = ['confirmed', 'tentative', 'cancelled', 'postponed'];
export const EVENT_FRESHNESS_DAYS = 120;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function httpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(toIso + 'T00:00:00Z') - Date.parse(fromIso + 'T00:00:00Z')) / 86400000);
}

export function validateEvents(records, { today = new Date().toISOString().slice(0, 10), freshnessDays = EVENT_FRESHNESS_DAYS } = {}) {
  const errors = [];
  if (!Array.isArray(records)) return { errors: ['events: expected an array of records'] };
  const ids = new Map();
  const occurrences = new Map();

  records.forEach((ev, i) => {
    const id = ev.id || ev.name || `#${i}`;
    if (!ev.id || !SLUG.test(ev.id)) errors.push(`${id}: id is missing or not lower-case-hyphenated`);
    if (ids.has(ev.id)) errors.push(`${id}: duplicate id (also record #${ids.get(ev.id)})`);
    ids.set(ev.id, i);
    if (!ev.name) errors.push(`${id}: name is missing`);
    if (!EVENT_STATUSES.includes(ev.status)) errors.push(`${id}: status "${ev.status}" is not one of ${EVENT_STATUSES.join(', ')}`);
    if (ev.timezone !== TZ) errors.push(`${id}: timezone must be "${TZ}" (got ${ev.timezone})`);
    if (!ev.location || !ev.location.name) errors.push(`${id}: location.name is missing`);
    if (!ev.organizer || !ev.organizer.name) errors.push(`${id}: organizer.name is missing`);
    if (!ev.organizer || !httpsUrl(ev.organizer.url)) errors.push(`${id}: organizer.url must be the organizer's https:// site`);
    if (!httpsUrl(ev.sourceUrl)) errors.push(`${id}: sourceUrl must be an https:// URL on the organizer's or an authoritative site`);
    if (!isIsoDateString(ev.verifiedAt)) errors.push(`${id}: verifiedAt must be YYYY-MM-DD`);
    /* One day of tolerance for the timezone gap between the editor's clock,
       the build's clock and Niwot's. */
    else if (daysBetween(today, ev.verifiedAt) > 1) errors.push(`${id}: verifiedAt ${ev.verifiedAt} is in the future`);
    if (!ev.description) errors.push(`${id}: description is missing`);

    for (const field of ['startTime', 'endTime']) {
      if (ev[field] !== undefined && !TIME.test(ev[field])) errors.push(`${id}: ${field} must be HH:MM (24-hour)`);
    }
    if (ev.endTime && !ev.startTime) errors.push(`${id}: endTime without startTime`);

    if (ev.status === 'tentative') {
      if (!ev.expected) errors.push(`${id}: a tentative record needs \`expected\` — the organizer's own wording of when it usually happens`);
      if (ev.recurrence) errors.push(`${id}: a tentative record cannot carry a recurrence; that would project dates the organizer has not confirmed`);
      return;
    }

    if (!isIsoDateString(ev.startDate)) {
      errors.push(`${id}: a ${ev.status} event needs a startDate (YYYY-MM-DD) taken from ${ev.sourceUrl || 'the organizer'}`);
      return;
    }
    if (ev.endDate !== undefined) {
      if (!isIsoDateString(ev.endDate)) errors.push(`${id}: endDate must be YYYY-MM-DD`);
      else if (ev.endDate < ev.startDate) errors.push(`${id}: endDate is before startDate`);
    }
    if (ev.startTime && ev.endTime && (ev.endDate === undefined || ev.endDate === ev.startDate) && ev.endTime <= ev.startTime) {
      errors.push(`${id}: endTime must be after startTime`);
    }
    if (ev.recurrence) {
      const r = ev.recurrence;
      if (!Number.isInteger(r.weekday) || r.weekday < 0 || r.weekday > 6) errors.push(`${id}: recurrence.weekday must be 0 (Sunday) to 6`);
      if (!isIsoDateString(r.until)) errors.push(`${id}: recurrence.until must be YYYY-MM-DD`);
      else {
        if (r.until < ev.startDate) errors.push(`${id}: recurrence.until is before startDate`);
        if (daysBetween(ev.startDate, r.until) > 366) errors.push(`${id}: recurrence spans more than a year — confirm each season separately`);
      }
      if (Number.isInteger(r.weekday) && weekdayOf(ev.startDate) !== r.weekday) {
        errors.push(`${id}: startDate ${ev.startDate} is not on recurrence.weekday ${r.weekday}`);
      }
      if (ev.endDate) errors.push(`${id}: a recurring record cannot also have endDate`);
    }

    /* A confirmed future date that was last checked months ago is not
       really confirmed. */
    if (ev.status === 'confirmed' && isIsoDateString(ev.verifiedAt)) {
      const lastDate = ev.recurrence ? ev.recurrence.until : ev.endDate || ev.startDate;
      if (lastDate >= today && daysBetween(ev.verifiedAt, today) > freshnessDays) {
        errors.push(`${id}: confirmed for ${lastDate} but last checked ${ev.verifiedAt}, over ${freshnessDays} days ago. Re-check ${ev.sourceUrl} and update verifiedAt.`);
      }
    }
  });

  /* The same happening listed twice under different ids. */
  for (const inst of expandEvents(records.filter((r) => r.id && DATED_STATUSES.includes(r.status) && r.startDate))) {
    const key = String(inst.event.name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + '|' + inst.date;
    if (occurrences.has(key) && occurrences.get(key) !== inst.id) {
      errors.push(`${inst.id}: "${inst.event.name}" on ${inst.date} is also listed by ${occurrences.get(key)} — one instance per happening`);
    }
    occurrences.set(key, inst.id);
  }

  return { errors };
}

export function assertValidEvents(records, options) {
  const { errors } = validateEvents(records, options);
  if (errors.length) {
    throw new Error(`Events failed validation (${errors.length}):\n  - ${errors.join('\n  - ')}`);
  }
}

/* "Now" for a build. NIWOT_NOW pins an instant (ISO 8601, any zone);
   NIWOT_TODAY pins a calendar day, taken as noon in Niwot. */
export function buildNow(env = process.env) {
  if (env.NIWOT_NOW) {
    const d = new Date(env.NIWOT_NOW);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (env.NIWOT_TODAY && isIsoDateString(env.NIWOT_TODAY)) {
    return new Date(zonedIso(env.NIWOT_TODAY, '12:00'));
  }
  return new Date();
}

const STATUS_URI = {
  confirmed: 'https://schema.org/EventScheduled',
  cancelled: 'https://schema.org/EventCancelled',
  postponed: 'https://schema.org/EventPostponed',
};

/* Event structured data for the unexpired dated instances. Tentative
   records have no place here, and the guards below refuse to mark anything
   scheduled that is not a confirmed, sourced, future instance — even if the
   caller passes one in. */
export function eventsJsonLd(records, now = new Date()) {
  const parts = zonedParts(now);
  const graph = buildUpcoming(records, parts).map((inst) => {
    const ev = inst.event;
    if (!STATUS_URI[ev.status]) throw new Error(`${ev.id}: refusing to emit structured data for a ${ev.status} event`);
    if (!httpsUrl(ev.sourceUrl) || !httpsUrl(ev.organizer.url)) throw new Error(`${ev.id}: refusing to emit structured data without an organizer source`);
    if (inst.endDate < parts.date) throw new Error(`${ev.id}: refusing to emit structured data for an expired instance`);
    const item = {
      '@type': 'Event',
      name: ev.name,
      startDate: inst.startTime ? zonedIso(inst.date, inst.startTime) : inst.date,
      eventStatus: STATUS_URI[ev.status],
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      description: ev.description,
      url: ev.sourceUrl,
      location: {
        '@type': 'Place',
        name: ev.location.name,
        address: {
          '@type': 'PostalAddress',
          ...(ev.location.address ? { streetAddress: ev.location.address } : {}),
          addressLocality: 'Niwot',
          addressRegion: 'CO',
          addressCountry: 'US',
        },
      },
      organizer: { '@type': 'Organization', name: ev.organizer.name, url: ev.organizer.url },
    };
    if (inst.endTime) item.endDate = zonedIso(inst.endDate, inst.endTime);
    else if (inst.endDate !== inst.date) item.endDate = inst.endDate;
    if (ev.cost && /\bfree\b/i.test(ev.cost)) item.isAccessibleForFree = true;
    if (ev.status === 'postponed' && ev.previousStartDate) item.previousStartDate = ev.previousStartDate;
    return item;
  });
  return { '@context': 'https://schema.org', '@graph': graph };
}
