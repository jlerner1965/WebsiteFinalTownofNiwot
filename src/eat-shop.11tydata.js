/* ItemList structured data for the directory.

   Only fields the guide can actually stand behind are emitted, and only for
   active records. `streetAddress` and `postalCode` appear where a source
   published them and are left off the rest rather than guessed; phone
   numbers, hours, coordinates, ratings and prices are never asserted.
   `schemaType` is the most specific type the record's source supports and
   falls back to LocalBusiness. Each ListItem carries the row's own anchor
   as a stable URL. */
import listings from './_data/listings.js';
import site from './_data/site.js';

const active = listings.entries.filter((entry) => entry.status === 'active');

export default {
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Niwot business directory',
    numberOfItems: active.length,
    itemListElement: active.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${site.url}/eat-shop/#${entry.slug}`,
      item: {
        '@type': entry.schemaType || 'LocalBusiness',
        '@id': `${site.url}/eat-shop/#${entry.slug}`,
        name: entry.name,
        ...(entry.description ? { description: entry.description } : {}),
        url: entry.href,
        address: {
          '@type': 'PostalAddress',
          ...(entry.address ? { streetAddress: entry.address } : {}),
          ...(entry.postalCode ? { postalCode: entry.postalCode } : {}),
          addressLocality: 'Niwot',
          addressRegion: 'CO',
          addressCountry: 'US',
        },
      },
    })),
  },
};
