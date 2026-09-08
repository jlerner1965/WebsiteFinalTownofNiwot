/* Event structured data for the next occurrences.

   These are generated from recurring-series definitions, so `startDate` is the
   computed date and the description repeats what the page says: the organizer
   sets the confirmed dates. No time of day is asserted, because none is
   confirmed. */
import series from './_data/series.js';
import { buildUpcoming } from './assets/js/calendar-core.js';

function today() {
  const iso = process.env.NIWOT_TODAY;
  if (iso) {
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export default {
  structuredData: {
    '@context': 'https://schema.org',
    '@graph': buildUpcoming(series, today(), 3).map((occ) => ({
      '@type': 'Event',
      name: occ.series.name,
      startDate: new Date(occ.date.getTime() - occ.date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10),
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      description: occ.series.note,
      location: {
        '@type': 'Place',
        name: occ.series.place,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Niwot',
          addressRegion: 'CO',
          addressCountry: 'US',
        },
      },
      organizer: { '@type': 'Organization', name: occ.series.host, url: occ.series.href },
    })),
  },
};
