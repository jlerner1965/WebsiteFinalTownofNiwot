/* Homepage: keep the "Coming up" cards honest.

   They are rendered at build time, but they carry real dates and a static
   build is only as fresh as its last deploy, so recompute them on load. */
import { buildUpcoming, renderUpcoming } from './calendar-core.js';
import { readEvents, now as nowInNiwot } from './events-data.js';

const events = readEvents();
const strip = document.querySelector('[data-upcoming]');

if (events.length && strip) {
  const now = nowInNiwot();
  strip.innerHTML = renderUpcoming(buildUpcoming(events, now, 3), strip.dataset.upcoming, now);
}
