/* Event structured data for the unexpired, dated instances.

   Built by lib/events.js from the same records the page renders, so the
   list, the calendar, the detail rail and the markup agree by construction.
   Tentative ("expected") records are excluded there and cannot be marked
   scheduled. */
import { buildNow, eventsJsonLd } from '../lib/events.js';
import events from './_data/events.js';

export default {
  eventsJsonLd: eventsJsonLd(events, buildNow()),
};
