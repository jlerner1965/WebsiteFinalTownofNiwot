/* The event records are emitted into the page as JSON by the template, so
   the browser and the build read exactly the same data. */
import { zonedParts } from './calendar-core.js';

export function readEvents() {
  const node = document.getElementById('niwot-events');
  if (!node) return [];
  try {
    return JSON.parse(node.textContent);
  } catch {
    return [];
  }
}

/* `data-now="<ISO instant>"` on that element pins the clock, for tests.
   Returns Niwot's wall-clock { date, time }. */
export function now() {
  const node = document.getElementById('niwot-events');
  const iso = node && node.dataset.now;
  if (iso) {
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return zonedParts(parsed);
  }
  return zonedParts(new Date());
}
