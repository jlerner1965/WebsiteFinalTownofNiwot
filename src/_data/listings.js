/* Business directory.

   These are the businesses whose signage is legible in the supplied
   photographs of Old Town and Cottonwood Square. Street addresses and phone
   numbers are deliberately NOT reproduced here: the Business Association holds
   the current details, so every row links there rather than carrying a number
   that may already be wrong.

   The shape below supports address, website, phone and photo as well. Add
   those fields as verified data arrives — the template renders what is set. */
const categories = [
  'Restaurants & Bars',
  'Coffee, Books & Gifts',
  'Grocery & Provisions',
  'Arts & Makers',
  'Health & Wellness',
  'Professional Services',
];

const entries = [
    {
      name: 'Niwot Tavern',
      category: 'Restaurants & Bars',
      area: 'Cottonwood Square',
      note: 'Neighbourhood tavern with a covered patio on the corner, beside the bear sculptures.',
      href: 'https://niwot.com/',
      linkLabel: 'Hours & contact',
    },
    {
      name: 'Raza Fresa Mexican Kitchen',
      category: 'Restaurants & Bars',
      area: 'Cottonwood Square',
      note: 'Mexican kitchen with umbrella-shaded patio seating alongside the square.',
      href: 'https://niwot.com/',
      linkLabel: 'Hours & contact',
    },
    {
      name: 'Ciummini’s Italian Restaurant',
      category: 'Restaurants & Bars',
      area: 'Second Avenue, 300 block',
      note: 'Italian restaurant on the 300 block, with a heated front patio.',
      href: 'https://niwot.com/',
      linkLabel: 'Hours & contact',
    },
    {
      name: 'Bell, Book, Candle & Coffee',
      category: 'Coffee, Books & Gifts',
      area: 'Niwot Tribune building, Second Avenue',
      note: 'Coffee, books and gifts in the historic Niwot Tribune false-front building.',
      href: 'https://niwot.com/',
      linkLabel: 'Hours & contact',
    },
  ];

/* The rail shows a count beside each category, derived from the data rather
   than maintained by hand. */
const countIn = (category) => entries.filter((e) => e.category === category).length;

export default {
  categories: [{ label: 'All categories', value: 'All', count: entries.length }].concat(
    categories.map((c) => ({ label: c, value: c, count: countIn(c) }))
  ),
  entries,
};
