/* Build-time render of the calendar, so the events page and the homepage
   ship complete markup for crawlers and for readers without JavaScript.

   The browser re-renders both from the real current time on load — a static
   build goes stale as soon as an event ends.

   Set NIWOT_TODAY=YYYY-MM-DD (or NIWOT_NOW=<ISO instant>) to build a fixed
   moment for testing. */
import {
  MONTHS,
  DOWS,
  buildUpcoming,
  buildCells,
  buildArchive,
  buildExpected,
  detailFor,
  instancesInMonth,
  monthDefault,
  parseIso,
  renderCells,
  renderDetail,
  renderExpected,
  renderMonthEmpty,
  renderUpcoming,
  zonedParts,
} from '../assets/js/calendar-core.js';
import { buildNow } from '../../lib/events.js';
import events from './events.js';

export default function () {
  const now = zonedParts(buildNow());
  const { y, m } = parseIso(now.date);
  const upcoming = buildUpcoming(events, now);
  const expected = buildExpected(events);
  const archive = buildArchive(events, now, 4);

  /* The rail describes the month on screen, which at build time is the
     current one: its first day still ahead, or a note that nothing in it
     is, pointing at the next confirmed date. Same rule as page-events.js. */
  const shown = monthDefault(events, y, m, now);
  const cells = buildCells(events, y, m, shown ? shown.day : null);
  const detailHtml = shown
    ? renderDetail(shown.instances.map((i) => detailFor(i, now)), { interactive: false })
    : renderMonthEmpty(y, m, now, upcoming[0] || null, instancesInMonth(events, y, m).length > 0);

  return {
    now,
    dows: DOWS,
    monthLabel: MONTHS[m - 1] + ' ' + y,
    cellsHtml: renderCells(cells),
    detailHtml,
    upcomingHomeHtml: renderUpcoming(upcoming.slice(0, 3), 'link', now),
    upcomingEventsHtml: renderUpcoming(upcoming, 'select', now),
    expectedHtml: renderExpected(expected),
    upcomingCount: upcoming.length,
    expectedCount: expected.length,
    archive,
    hasArchive: archive.length > 0,
  };
}
