/* Homepage: keep the "Coming up" cards honest.

   They are rendered at build time, but they carry real dates and a static
   build is only as fresh as its last deploy, so recompute them on load. */
import { buildUpcoming, renderUpcoming } from './calendar-core.js';
import { readSeries, today } from './series-data.js';

const series = readSeries();
const strip = document.querySelector('[data-upcoming]');

if (series.length && strip) {
  const now = today();
  const list = buildUpcoming(series, now, 3);
  if (list.length) strip.innerHTML = renderUpcoming(list, strip.dataset.upcoming, now);
}
