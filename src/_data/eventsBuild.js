/* Build-time render of the calendar, so the events page and the homepage ship
   complete markup for crawlers and for readers without JavaScript.

   The browser re-renders both from the real current date on load — a static
   build goes stale as soon as the month turns over.

   Set NIWOT_TODAY=YYYY-MM-DD to build a fixed date for testing. */
import {
  MONTHS,
  DOWS,
  buildUpcoming,
  buildCells,
  buildArchive,
  detailFor,
  renderCells,
  renderDetail,
  renderUpcoming,
} from '../assets/js/calendar-core.js';
import series from './series.js';

function today() {
  const iso = process.env.NIWOT_TODAY;
  if (iso) {
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export default function () {
  const now = today();
  const upcoming = buildUpcoming(series, now, 3);
  const cells = buildCells(series, now.getFullYear(), now.getMonth(), null);
  const detail = upcoming.length
    ? detailFor(upcoming[0].series, upcoming[0].date)
    : detailFor(series[0], null);
  const archive = buildArchive(series, now, 4);

  return {
    dows: DOWS,
    monthLabel: MONTHS[now.getMonth()] + ' ' + now.getFullYear(),
    cellsHtml: renderCells(cells),
    detailHtml: renderDetail(detail),
    upcomingHomeHtml: renderUpcoming(upcoming, 'link', now),
    upcomingEventsHtml: renderUpcoming(upcoming, 'select', now),
    archive,
    hasArchive: archive.length > 0,
    /* Plain data for the homepage cards and for Event structured data. */
    upcoming: upcoming.map((occ) => ({
      when: DOWS[(occ.date.getDay() + 6) % 7] + ' ' + occ.date.getDate() + ' ' + MONTHS[occ.date.getMonth()],
      iso: new Date(occ.date.getTime() - occ.date.getTimezoneOffset() * 60000).toISOString().slice(0, 10),
      name: occ.series.name,
      place: occ.series.place,
      host: occ.series.host,
      cost: occ.series.cost,
    })),
  };
}
