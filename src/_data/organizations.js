/* Community organizations. `runs` is what the group actually operates — the
   line exists so a reader can tell which body to approach for what.

   `kind` separates the volunteer and membership groups from the public
   bodies that happen to carry Niwot's name: a reader should not approach
   the county's improvement district or the Election Commission as if they
   were clubs. Each entry's `body` is drawn from the organization's own site
   (or, for the district, the county's page) as read on 2026-09-09. */
export default [
  {
    name: 'Niwot Business Association',
    kind: 'community',
    body: 'The membership organization for local businesses. It maintains the members’ directory with current hours and contact details, keeps the community events calendar, and co-produces the summer concert series at Whistle Stop Park with the Cultural Arts Association.',
    runs: 'Business directory, events calendar, seasonal gatherings in Old Town',
    href: 'https://niwot.com/',
    linkLabel: 'niwot.com',
  },
  {
    name: 'Niwot Cultural Arts Association',
    kind: 'community',
    body: 'A volunteer non-profit, formed in 2009, that funds and organizes the arts in Niwot. It built and looks after Whistle Stop Park and the Niwot Sculpture Park, runs the Why Not Niwot? juried show, and produces the Rock & Rails concert series with the Business Association.',
    runs: 'Whistle Stop Park, Niwot Sculpture Park, Why Not Niwot?, Rock & Rails',
    href: 'https://niwotarts.org/',
    linkLabel: 'niwotarts.org',
  },
  {
    name: 'Niwot Historical Society',
    kind: 'community',
    body: 'Preserves, collects and shares the history of Niwot: an online timeline covering 150 years of the community, walking tours and lectures, and photograph and artifact collections.',
    runs: 'History timeline, walking tours, lectures, archives',
    href: 'https://niwothistoricalsociety.org/',
    linkLabel: 'niwothistoricalsociety.org',
  },
  {
    name: 'Niwot Community Association',
    kind: 'community',
    body: 'An all-volunteer non-profit of household members, established in 1990. It provides a link between residents and Boulder County government on issues affecting the community, and holds community and family events.',
    runs: 'Residents’ voice to the county, community events',
    href: 'https://niwot.org/',
    linkLabel: 'niwot.org',
  },
  {
    name: 'Niwot Election Commission',
    kind: 'public',
    body: 'The body appointed by the Boulder County District Court to administer the November 2026 incorporation election, in coordination with the Boulder County Clerk and Recorder. It publishes the official ballot language and election notices, and takes no position on the question.',
    runs: 'Official ballot language, election notices, voter information',
    href: 'https://niwotelection.org/',
    linkLabel: 'niwotelection.org',
  },
  {
    name: 'Niwot Local Improvement District',
    kind: 'public',
    body: 'A Boulder County improvement district, not a volunteer group, funded by a 1% sales tax collected in the Niwot business area. A nine-member advisory committee recommends spending on capital improvements, community events and transportation to the County Commissioners, who serve as its board.',
    runs: 'Sales-tax spending on the business district, decided by the county',
    href: 'https://bouldercounty.gov/government/boards-and-commissions/niwot-local-improvement-district/',
    linkLabel: 'bouldercounty.gov',
  },
];
