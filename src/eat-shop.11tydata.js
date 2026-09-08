/* LocalBusiness structured data for the directory.

   Only fields the guide can actually stand behind are emitted: name, category
   and area. Addresses and phone numbers are held with the Business
   Association, so `url` points there rather than asserting contact details
   this site has not verified. */
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
        description: entry.note,
        url: entry.href,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Niwot',
          addressRegion: 'CO',
          addressCountry: 'US',
        },
      },
    })),
  },
};
