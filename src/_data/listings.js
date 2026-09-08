/* Business directory.

   Compiled from published sources on 2026-09-08: the Niwot Business
   Association's own directory and category pages at niwot.com, business
   profiles and closure reports in the Left Hand Valley Courier (lhvc.com),
   and each business's own website where it publishes one. Nothing here is
   inferred — a field is present only where a source stated it.

   What that means in practice:

   - `address` is the street address as published. Suite and unit numbers are
     included only where a single source gives them unambiguously; where two
     sources disagreed (Fly Away Home and Belle Terre Floral are both listed
     at 7960 Niwot Road unit B1 by different sources) the unit is left off and
     only the centre is named.
   - Phone numbers are deliberately not reproduced. They change more often
     than anything else on a listing and the Association holds the current
     ones, so every row links out rather than carrying a number that may
     already be wrong.
   - `note` is omitted where no source described the business. A row with a
     name, a category and a place is still a useful row; an invented sentence
     is not.
   - `area` names the district — Old Town, Cottonwood Square, inside the
     market — and is omitted where it would only repeat the street already in
     `address`. Both fields are optional; the template renders what is set.
   - Businesses reported closed are removed rather than left to rot. Removed
     at this revision: Bell, Book, Candle & Coffee (lease ended May 2018),
     The Wandering Jellyfish Bookshop (closed December 2023), Farow (closed
     2025), Few of a Kind Vintage + Mercantile (closed April 2026), Pie Dog
     Pizza, The Little Shop and Niwot Veterinary Clinic.

   Coverage is every Niwot business those sources surfaced and show as
   trading. It is not a claim of completeness, and should not be presented as
   one: the Association directory was searched rather than crawled end to end,
   and a sole trader who keeps no public listing will not appear at all. The
   page says as much, and invites the ones that are missing. Re-verify against
   the Association directory before treating a row as current. */
const verified = 'September 8, 2026';

const categories = [
  'Restaurants & Bars',
  'Coffee & Bakery',
  'Grocery & Provisions',
  'Shops & Gifts',
  'Arts & Makers',
  'Health & Wellness',
  'Beauty & Personal Care',
  'Everyday Services',
  'Professional Services',
  'Stay the Night',
];

/* The Association's own directory. Rows without a website of their own point
   here, because it is where the current hours and contact details live. */
const association = 'https://niwot.com/';

const entries = [
  /* ---- Restaurants & Bars ---- */
  {
    name: 'Niwot Tavern',
    category: 'Restaurants & Bars',
    area: 'Cottonwood Square',
    address: '7960 Niwot Road',
    note: 'Neighbourhood tavern with a covered patio on the corner, beside the bear sculptures.',
    href: 'https://www.niwottavern.com/',
    linkLabel: 'Website',
  },
  {
    name: 'Raza Fresa Mexican Kitchen',
    category: 'Restaurants & Bars',
    area: 'Cottonwood Square',
    address: '7960 Niwot Road, Suite 11D',
    note: 'Mexican kitchen with umbrella-shaded patio seating alongside the square.',
    href: 'https://razafresa.com/',
    linkLabel: 'Website',
  },
  {
    name: 'Cimmini’s Italian Restaurant',
    category: 'Restaurants & Bars',
    area: 'Old Town, 300 block',
    address: '300 Second Avenue',
    note: 'Italian cooking made from scratch, on the 300 block with a heated front patio. Open since January 2022.',
    href: 'https://cimminisniwot.com/',
    linkLabel: 'Website',
  },
  {
    name: 'Fortezza Ristorante',
    category: 'Restaurants & Bars',
    address: '7916 Niwot Road',
    note: 'Northern Italian steakhouse: house-made pasta, Wagyu steaks and a long wine list.',
    href: 'https://fortezzaristorante.com/',
    linkLabel: 'Website',
  },
  {
    name: '1914 House',
    category: 'Restaurants & Bars',
    area: 'Old Town, Second Avenue',
    address: '121 Second Avenue',
    note: 'Contemporary American cooking in a two-storey historic building, built on sustainably grown ingredients.',
    href: 'http://www.1914house.com/',
    linkLabel: 'Website',
  },
  {
    name: 'Sachi Sushi',
    category: 'Restaurants & Bars',
    area: 'Inside Niwot Market',
    address: '7980 Niwot Road',
    note: 'Japanese kitchen at the back of Niwot Market — sushi through the week and ramen on Sundays.',
    href: 'https://niwotmarket.com/sachi-sushi-1',
    linkLabel: 'Website',
  },
  {
    name: 'Fan’s Chinese Cuisine',
    category: 'Restaurants & Bars',
    area: 'Cottonwood Square',
    address: '7960 Niwot Road, Unit C9',
    note: 'Chinese kitchen in the square: dine in, take out or delivery.',
    href: association,
    linkLabel: 'Hours & contact',
  },
  {
    name: 'Abo’s Pizza Niwot',
    category: 'Restaurants & Bars',
    area: 'Cottonwood Square',
    address: '7960 Niwot Road, Suite B5',
    note: 'New York-style pizza by the slice or the pie, from the Boulder original that started in 1977.',
    href: 'https://abospizza.com/locations/niwot/',
    linkLabel: 'Website',
  },
  {
    name: 'The Garden Gate Cafe',
    category: 'Restaurants & Bars',
    area: 'Cottonwood Square',
    address: '7960 Niwot Road, Unit B4',
    note: 'Breakfast and lunch daily — benedicts, farmhouse plates and Southwest specials.',
    href: 'https://www.thegardengatecafe.com/',
    linkLabel: 'Website',
  },
  {
    name: 'Fritz Family Brewers',
    category: 'Restaurants & Bars',
    address: '6778 N 79th Street',
    note: 'Family-run brewery pouring German-style lagers and ales. Kids and dogs welcome.',
    href: 'https://www.fritzfamilybrewers.com/',
    linkLabel: 'Website',
  },
  {
    name: 'The Wheel House',
    category: 'Restaurants & Bars',
    area: 'Old Town, Second Avenue',
    address: '300 Second Avenue',
    note: 'Taproom and gathering space at the corner of Murray Street.',
    href: association,
    linkLabel: 'Hours & contact',
  },
  {
    name: 'La Musette',
    category: 'Restaurants & Bars',
    area: 'Murray Street, behind The Wheel House',
    note: 'Farm-to-table food truck, parked permanently. The menu changes every week with what is in season.',
    href: association,
    linkLabel: 'Hours & contact',
  },
  {
    name: 'Niwot Market Deli',
    category: 'Restaurants & Bars',
    area: 'Inside Niwot Market',
    address: '7980 Niwot Road',
    note: 'Deli counter inside the market: breakfast burritos, made-to-order sandwiches and a soup bar.',
    href: 'https://niwotmarket.com/deli',
    linkLabel: 'Website',
  },
  {
    name: 'Subway',
    category: 'Restaurants & Bars',
    area: 'Cottonwood Square',
    address: '7960 Niwot Road, Unit B10',
    note: 'Independently owned franchise of the sandwich chain, in the square.',
    href: 'https://restaurants.subway.com/united-states/co/niwot/7960-niwot-rd',
    linkLabel: 'Website',
  },

  /* ---- Coffee & Bakery ---- */
  {
    name: 'The Old Oak Coffeehouse',
    category: 'Coffee & Bakery',
    area: 'Old Town, Second Avenue',
    address: '136 Second Avenue',
    note: 'Specialty coffee, house-made baked goods and panini, seven days a week.',
    href: 'https://www.theoldoakcoffeehouse.com/',
    linkLabel: 'Website',
  },
  {
    name: 'WiNot Coffee Company',
    category: 'Coffee & Bakery',
    area: 'Cottonwood Square',
    address: '7960 Niwot Road, Unit D13',
    note: 'Morning coffee bar on the square.',
    href: 'https://niwot.com/listing/winot-coffee-company/',
    linkLabel: 'Hours & contact',
  },

  /* ---- Grocery & Provisions ---- */
  {
    name: 'Niwot Market',
    category: 'Grocery & Provisions',
    address: '7980 Niwot Road',
    note: 'The independent grocery, trading since 2002: produce, deli, prepared foods and pet supplies.',
    href: 'https://niwotmarket.com/',
    linkLabel: 'Website',
  },
  {
    name: 'Niwot Liquor Store',
    category: 'Grocery & Provisions',
    area: 'Old Town, Second Avenue',
    address: '361 Second Avenue',
    href: association,
    linkLabel: 'Hours & contact',
  },

  /* ---- Shops & Gifts ---- */
  {
    name: 'Little Bird',
    category: 'Shops & Gifts',
    area: 'Old Town, Second Avenue',
    address: '112 Second Avenue',
    note: 'Women’s clothing, handmade jewellery, locally made body care and art.',
    href: 'https://niwot.com/listing/little-bird/',
    linkLabel: 'Hours & contact',
  },
  {
    name: 'Wise Buys Antiques',
    category: 'Shops & Gifts',
    area: 'Old Town, Second Avenue',
    address: '190 Second Avenue',
    note: 'Five thousand square feet of collectibles from the 1800s onward, plus furniture refinishing and repair.',
    href: 'https://niwot.com/listing/wise-buys-antiques/',
    linkLabel: 'Hours & contact',
  },
  {
    name: 'Niwot Jewelry & Gifts',
    category: 'Shops & Gifts',
    area: 'Old Town, 300 block',
    address: '300 Second Avenue, Suite 102',
    href: association,
    linkLabel: 'Hours & contact',
  },
  {
    name: 'Inkberry Books',
    category: 'Shops & Gifts',
    area: 'Cottonwood Square',
    address: '7960 Niwot Road, Suite B3',
    note: 'Independent bookshop, open since 2018.',
    href: association,
    linkLabel: 'Hours & contact',
  },
  {
    name: 'Fly Away Home',
    category: 'Shops & Gifts',
    area: 'Cottonwood Square',
    address: '7960 Niwot Road',
    note: 'Home decor and gifts.',
    href: 'https://www.flyawayhomedecor.com/',
    linkLabel: 'Website',
  },
  {
    name: 'The Nook',
    category: 'Shops & Gifts',
    area: 'Inside Niwot Market',
    address: '7980 Niwot Road',
    note: 'Home decor and gifts tucked into the market, run by the same owner since 2019.',
    href: 'https://niwotmarket.com/the-nook',
    linkLabel: 'Website',
  },
  {
    name: 'Belle Terre Floral',
    category: 'Shops & Gifts',
    area: 'Cottonwood Square, and inside Niwot Market',
    address: '7960 Niwot Road',
    note: 'Florist, with a second counter inside the market.',
    href: 'https://niwot.com/listing/belle-terre-floral/',
    linkLabel: 'Hours & contact',
  },
  {
    name: 'Niwot Wheel Works',
    category: 'Shops & Gifts',
    area: 'Cottonwood Square',
    address: '7960 Niwot Road, Unit C10',
    note: 'Bike shop: sales, rentals, tune-ups and apparel. Behind Fan’s, facing the brewery.',
    href: 'https://www.niwotwheelworks.com/',
    linkLabel: 'Website',
  },

  /* ---- Arts & Makers ---- */
  {
    name: 'Osmosis Gallery',
    category: 'Arts & Makers',
    area: 'Old Town, Second Avenue',
    address: '290 Second Avenue',
    note: 'Contemporary gallery in a renovated 1910 brick building, showing more than forty Colorado artists.',
    href: 'https://www.osmosisartgallery.com/',
    linkLabel: 'Website',
  },
  {
    name: 'Pebble Art Jewelry',
    category: 'Arts & Makers',
    address: '7980 Niwot Road',
    note: 'Handmade jewellery.',
    href: association,
    linkLabel: 'Hours & contact',
  },

  /* ---- Health & Wellness ---- */
  {
    name: 'Left Hand Animal Hospital',
    category: 'Health & Wellness',
    area: 'Old Town, Franklin Street',
    address: '304 Franklin Street',
    note: 'Veterinary practice, weekdays only.',
    href: 'https://lefthandanimalhospital.com/',
    linkLabel: 'Website',
  },
  {
    name: 'Niwot Natural Medicine',
    category: 'Health & Wellness',
    area: 'Old Town, Second Avenue',
    address: '165 Second Avenue',
    href: 'https://niwot.com/listing/niwot-natural-medicine-2/',
    linkLabel: 'Hours & contact',
  },
  {
    name: 'OHM Physical Therapy',
    category: 'Health & Wellness',
    area: 'Cottonwood Square',
    address: '7960 Niwot Road',
    href: 'https://niwot.com/listing/ohm/',
    linkLabel: 'Hours & contact',
  },
  {
    name: 'Dignity Counseling and Wellness',
    category: 'Health & Wellness',
    area: 'Old Town, Franklin Street',
    address: '210 Franklin Street',
    href: 'https://niwot.com/listing/dignity-counseling-and-wellness/',
    linkLabel: 'Hours & contact',
  },
  {
    name: 'Western Wellness Chiropractic',
    category: 'Health & Wellness',
    area: 'Old Town, Second Avenue',
    address: '198 Second Avenue',
    note: 'Chiropractic practice specialising in spinal decompression. Opened in Niwot in 2024.',
    href: association,
    linkLabel: 'Hours & contact',
  },
  {
    name: 'Chill Cryotherapy & Recovery',
    category: 'Health & Wellness',
    area: 'Old Town, Second Avenue',
    address: '198 Second Avenue, Unit D',
    note: 'Cryotherapy, compression therapy and muscle recovery.',
    href: 'https://chill303.com/',
    linkLabel: 'Website',
  },
  {
    name: 'Butterfield Wellness Center',
    category: 'Health & Wellness',
    address: '8940 Morton Road',
    note: 'Neuromuscular massage therapy — deep tissue work aimed at pain patterns.',
    href: 'https://butterfieldwellness.com/',
    linkLabel: 'Website',
  },
  {
    name: 'The Hidden Yoga Studio',
    category: 'Health & Wellness',
    area: 'Old Town, Second Avenue',
    address: '361 Second Avenue, Unit 201',
    href: 'https://www.thehiddenyogastudio.com/',
    linkLabel: 'Website',
  },
  {
    name: 'Una Vida Meditation & Movement',
    category: 'Health & Wellness',
    area: 'Cottonwood Square',
    note: 'Meditation, movement and bodywork.',
    href: 'https://www.unavidaniwot.com/',
    linkLabel: 'Website',
  },
  {
    name: 'Inner Space Healing',
    category: 'Health & Wellness',
    area: 'Cottonwood Square',
    note: 'Psychotherapists and other practitioners sharing one space. Opened October 2024.',
    href: association,
    linkLabel: 'Hours & contact',
  },
  {
    name: 'Hanna’s Herb Shop',
    category: 'Health & Wellness',
    area: 'Cottonwood Square',
    address: '7960 Niwot Road, Suite D15',
    note: 'Herbal apothecary, in Niwot since November 2025 after decades in Boulder.',
    href: 'https://www.hannasherbshop.com/',
    linkLabel: 'Website',
  },
  {
    name: 'The Alchemy Lounge',
    category: 'Health & Wellness',
    area: 'Old Town',
    note: 'Bodywork sessions and women’s circles.',
    href: association,
    linkLabel: 'Hours & contact',
  },

  /* ---- Beauty & Personal Care ---- */
  {
    name: 'Blessings Day Spa & Skincare Boutique',
    category: 'Beauty & Personal Care',
    area: 'Old Town, Second Avenue',
    address: '240 Second Avenue',
    note: 'Facials, lash services and advanced aesthetics.',
    href: 'https://www.niwotblessings.com/',
    linkLabel: 'Website',
  },
  {
    name: 'Classic Looks',
    category: 'Beauty & Personal Care',
    address: '6964 N 79th Street, Unit 6',
    note: 'Full-service salon since 1989 — hair, nails, skincare and barbering.',
    href: 'https://www.classiclooks.net/',
    linkLabel: 'Website',
  },
  {
    name: 'Niwot Beauty Bar',
    category: 'Beauty & Personal Care',
    address: '6897 Paiute Avenue',
    note: 'Facials, anti-ageing treatments, waxing and makeup.',
    href: association,
    linkLabel: 'Hours & contact',
  },

  /* ---- Everyday Services ---- */
  {
    name: 'John’s Dry Cleaners',
    category: 'Everyday Services',
    address: '6964 N 79th Street, Unit 5',
    note: 'Dry cleaning and laundry.',
    href: 'https://www.johnsdrycleaners.com/6964-n-79th-st/',
    linkLabel: 'Website',
  },
  {
    name: 'Strohl Electric',
    category: 'Everyday Services',
    area: 'Niwot',
    note: 'Electrical contractor: full house wiring, remodels, basement finishes and service calls.',
    href: 'https://niwot.com/listing/strohl-electric/',
    linkLabel: 'Hours & contact',
  },

  /* ---- Professional Services ---- */
  {
    name: 'Warren, Carlson & Moore, LLP',
    category: 'Professional Services',
    address: '6964 N 79th Street, Suite 3',
    note: 'Estate planning, real estate and business law. In practice here since 1975.',
    href: 'https://www.niwotlaw.com/',
    linkLabel: 'Website',
  },
  {
    name: 'Colorado Landmark, Realtors',
    category: 'Professional Services',
    area: 'Old Town, Second Avenue',
    address: '136 Second Avenue, Unit C',
    note: 'Residential real estate.',
    href: association,
    linkLabel: 'Hours & contact',
  },
  {
    name: 'Osmosis Architecture',
    category: 'Professional Services',
    area: 'Old Town, Second Avenue',
    address: '290 Second Avenue',
    note: 'Residential architecture studio, sharing the 1910 building with the gallery.',
    href: 'https://www.osmosisarchitecture.com/',
    linkLabel: 'Website',
  },
  {
    name: 'Left Hand Valley Courier',
    category: 'Professional Services',
    area: 'Niwot',
    note: 'The non-profit weekly covering Niwot and Gunbarrel, delivered free to 6,000 homes and businesses.',
    href: 'https://www.lhvc.com/',
    linkLabel: 'Website',
  },
  {
    name: 'H&E Business and Tax Consultants LLC',
    category: 'Professional Services',
    area: 'Niwot',
    href: 'https://niwot.com/listing/he-business-and-tax-consultants-llc',
    linkLabel: 'Hours & contact',
  },
  {
    name: 'Robinson Consulting',
    category: 'Professional Services',
    area: 'Niwot',
    note: 'Twenty years of consulting with small businesses across Boulder County.',
    href: 'https://niwot.com/listing/robinson-consulting/',
    linkLabel: 'Hours & contact',
  },
  {
    name: 'Noblestar Technologies LLC',
    category: 'Professional Services',
    area: 'Niwot',
    note: 'Infrastructure and software for logistics, community development and operations.',
    href: 'https://niwot.com/listing/noblestar-techologies-llc/',
    linkLabel: 'Hours & contact',
  },
  {
    name: 'DMR Group, LLC',
    category: 'Professional Services',
    area: 'Niwot',
    href: 'https://niwot.com/listing/dmr-group-llc/',
    linkLabel: 'Hours & contact',
  },
  {
    name: 'Niwot Partners LLC',
    category: 'Professional Services',
    area: 'Niwot',
    href: 'https://niwot.com/listing/niwot-partners-llc/',
    linkLabel: 'Hours & contact',
  },
  {
    name: 'iTrade Colorado',
    category: 'Professional Services',
    area: 'Niwot',
    note: 'Barter network: members earn credits on what they sell and spend them with other members.',
    href: 'https://niwot.com/listing/itrade-colorado/',
    linkLabel: 'Hours & contact',
  },

  /* ---- Stay the Night ---- */
  {
    name: 'Niwot Inn & Spa',
    category: 'Stay the Night',
    area: 'Old Town, Second Avenue',
    address: '342 Second Avenue',
    note: 'Fourteen rooms and an on-site spa, in the middle of Old Town.',
    href: 'https://niwotinn.com/',
    linkLabel: 'Website',
  },
];

/* The rail shows a count beside each category, derived from the data rather
   than maintained by hand. Empty categories are dropped: a chip that can only
   ever return nothing is a dead control, and on a phone it is a dead control
   the reader has to scroll past. */
const countIn = (category) => entries.filter((e) => e.category === category).length;

export default {
  verified,
  categories: [{ label: 'All categories', value: 'All', count: entries.length }].concat(
    categories
      .map((c) => ({ label: c, value: c, count: countIn(c) }))
      .filter((c) => c.count > 0)
  ),
  entries,
};
