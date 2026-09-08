/* Recurring event series run by the Niwot Business Association.

   Occurrences are generated from a recurring weekday rather than stored as
   fixed dates, because the organizer sets the season's exact dates and those
   were not confirmable at the time of writing. Every listing says so and links
   to the organizer's own page.

   `months` are zero-based (5 = June). `weekday` follows Date#getDay()
   (0 = Sunday, 4 = Thursday, 6 = Saturday).

   Wire a CMS or the Business Association calendar here and the calendar takes
   explicit dates directly. */
export default [
  {
    id: 'rockrails',
    name: 'Rock & Rails concert series',
    place: 'Whistle Stop Park, Old Town',
    host: 'Niwot Business Association',
    cost: 'Free admission',
    time: 'Thursday evenings',
    months: [5, 6, 7],
    weekday: 4,
    tag: 'Concert',
    note: 'A free outdoor concert series held on the lawn beside the caboose at Whistle Stop Park. The season line-up and the confirmed dates are published by the Business Association each spring.',
    href: 'https://niwot.com/',
    linkLabel: 'Organizer’s listing',
  },
  {
    id: 'market',
    name: 'Niwot Farmers Market',
    place: 'Old Town Niwot',
    host: 'Niwot Business Association',
    cost: 'Free entry',
    time: 'Weekend mornings in season',
    months: [6, 7, 8],
    weekday: 6,
    tag: 'Market',
    note: 'A seasonal producers’ market in Old Town. Opening weekend, closing weekend and stallholder details are announced by the organizer before each season.',
    href: 'https://niwot.com/',
    linkLabel: 'Organizer’s listing',
  },
];
