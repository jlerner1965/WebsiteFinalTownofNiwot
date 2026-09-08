/* LocalBusiness structured data for the directory.

   Only fields the guide can actually stand behind are emitted. `streetAddress`
   appears for the rows that carry a published address and is left off the
   rest, rather than guessing; phone numbers are held with the Business
   Association, so `url` points at the business's own site or at the
   Association listing instead of asserting contact details this site has not
   verified. */
import listings from './_data/listings.js';

export default {
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Niwot business directory',
    itemListElement: listings.entries.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'LocalBusiness',
        name: entry.name,
        ...(entry.note ? { description: entry.note } : {}),
        url: entry.href,
        address: {
          '@type': 'PostalAddress',
          ...(entry.address ? { streetAddress: entry.address } : {}),
          addressLocality: 'Niwot',
          addressRegion: 'CO',
          addressCountry: 'US',
        },
      },
    })),
  },
};
