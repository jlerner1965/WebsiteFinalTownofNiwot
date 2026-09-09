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
  instancesOn,
  parseIso,
  renderCells,
  renderDetail,
  renderExpected,
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
  const cells = buildCells(events, y, m, null);
  const archive = buildArchive(events, now, 4);

  /* The rail is never empty: with nothing selected it shows the next
     occurrence, and every occurrence on that day. */
  const detail = upcoming.length
    ? instancesOn(events, upcoming[0].date).filter((i) => !i.endDate || i.endDate >= now.date).map((i) => detailFor(i, now))
    : [];

  return {
    now,
    dows: DOWS,
    monthLabel: MONTHS[m - 1] + ' ' + y,
    cellsHtml: renderCells(cells),
    detailHtml: detail.length
      ? renderDetail(detail)
      : '<p class="n-body" style="margin:0">No confirmed dates are on the calendar. The expected seasonal events are listed on this page.</p>',
    upcomingHomeHtml: renderUpcoming(upcoming.slice(0, 3), 'link', now),
    upcomingEventsHtml: renderUpcoming(upcoming, 'select', now),
    expectedHtml: renderExpected(expected),
    upcomingCount: upcoming.length,
    expectedCount: expected.length,
    archive,
    hasArchive: archive.length > 0,
  };
}
