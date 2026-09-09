/* 2026 Niwot incorporation election.

   This file is held to a stricter standard than the rest of the site.

   - Nothing here argues for or against incorporation. Measures are described
     as filed, without commentary on whether they are advisable.
   - The certified ballot language published by the Niwot Election Commission
     controls. Everything here is a plain-language summary of it.
   - The Commission scheduled printer's-proof review for September 11, 2026.
     Re-check this content against the Commission's official ballot page after
     that date before treating any of it as final, and update `verified` in
     src/_data/site.js when you do.
   - Campaign material is labeled as advocacy wherever it appears, and the
     Commission is never presented as an advocate.
   - `official` on a question or issue is the Commission's own label for it
     ("Question 1", "Issue 1"). It is left unset until it has been read from
     the certified ballot: this guide's order is not evidence of the
     ballot's, and a number that turned out not to match would be worse
     than none. The template renders it only when set.

   The qualifications added on 2026-09-09 (the food exemption, the
   marijuana tax's start and conditions, the constitutional revenue limits
   and the 2027 start, the bond's repayment source, the dependency of the
   charter commission on incorporation) follow the pre-launch audit's
   reading of the Commission's ballot page and summaries on that date.
   Confirm each against the certified text after the proof review.

   Anything that cannot be supported by a filed document or an official
   publication is removed rather than softened. */

import site from './site.js';

const BALLOT = 'https://niwotelection.org/ballot';
const FAQ = 'https://niwotelection.org/faq';
const COUNTY = 'https://bouldercounty.gov/elections/';

/* The three things a voter most often needs, kept above everything else. */
const tasks = [
  {
    label: 'Check the proposed boundary',
    note: 'The Commission’s FAQ: the boundary is the one described in the petition’s Exhibits A and B. An address-lookup tool run by a campaign is not official material.',
    href: FAQ,
    linkLabel: 'Commission FAQ',
  },
  {
    label: 'Read the ballot',
    note: 'The certified ballot content, on the Commission’s own site.',
    href: BALLOT,
    linkLabel: 'Official ballot content',
  },
  {
    label: 'Voter registration and ballot help',
    note: 'Register, update an address, and find ballot drop-off and voting locations.',
    href: COUNTY,
    linkLabel: 'Boulder County Elections',
  },
];

/* The compact status strip. */
const status = [
  { label: 'Election date', value: 'November 3, 2026', note: 'A coordinated mail-ballot election held with other Boulder County contests.' },
  { label: 'Who may vote', value: 'Registered electors', note: 'Those residing within the proposed boundary.' },
  { label: 'Run by', value: 'Niwot Election Commission', note: 'Appointed by the Boulder County District Court, in coordination with the County Clerk and Recorder.' },
  { label: 'Last verified', value: site.verified, note: 'Checked against official sources on this date. The official text controls.' },
];

const questions = [
  {
    official: null,
    title: 'Whether Niwot should incorporate as a municipality',
    body: 'Whether the territory described in the petition should be organized as a Colorado municipality. Approval would begin the creation of a town government; rejection would leave the area unincorporated and administered by Boulder County, and none of the other measures would take effect.',
    sourceHref: BALLOT,
  },
  {
    official: null,
    title: 'Whether to form a nine-member home rule charter commission',
    body: 'Whether a commission of nine members should be formed to draft a proposed home rule charter for the new municipality. The commission drafts a charter; it does not adopt one. It is formed only if incorporation is approved.',
    sourceHref: BALLOT,
  },
  {
    official: null,
    title: 'Which nine charter commission candidates should be elected',
    body: 'Which candidates would serve on that charter commission. Candidates appear on the same ballot, and those elected take office only if incorporation and the charter commission question are both approved.',
    sourceHref: BALLOT,
  },
];

const fiscal = [
  {
    official: null,
    title: 'A 2.5% sales and use tax beginning January 1, 2028',
    body: 'Authorization to levy a municipal sales and use tax at 2.5%, with collection beginning January 1, 2028. The ballot text exempts food for domestic consumption.',
    sourceHref: BALLOT,
  },
  {
    official: null,
    title: 'A four-mill property tax',
    body: 'Authorization to levy a property tax of four mills within the municipal boundary.',
    sourceHref: BALLOT,
  },
  {
    official: null,
    title: 'An additional 3% sales tax on retail marijuana, beginning January 1, 2028',
    body: 'Authorization for an additional special sales tax of 3% on retail marijuana sales, with collection beginning January 1, 2028. It applies only if retail marijuana businesses operate within the municipality.',
    sourceHref: BALLOT,
  },
  {
    official: null,
    title: 'Authorization to retain and spend collected revenue from 2027',
    body: 'Authorization for the municipality to keep and spend all the revenue it collects from 2027 onward, as a voter-approved revenue change under the revenue and spending limits in Article X, Section 20 of the Colorado Constitution (the Taxpayer’s Bill of Rights), rather than refunding amounts above those limits.',
    sourceHref: BALLOT,
  },
  {
    official: null,
    title: 'Authorization for up to $15 million in debt for transportation infrastructure',
    body: 'Authorization to incur up to $15 million in debt for transportation infrastructure, with a maximum total repayment cost of up to $28 million. The petition proposes repaying it from the sales and use tax above, so this authorization depends on that tax being approved.',
    sourceHref: BALLOT,
  },
];

/* Plain language for readers who do not know what a vote to incorporate
   decides. */
const meaning = [
  'Incorporation would create a town: a municipal government for the area inside the boundary described in the petition, with its own elected officials and the powers Colorado law gives a municipality. That is why the same ballot carries the taxes and the debt that would fund it. Niwot is unincorporated today, so those functions sit with Boulder County and the special districts.',
  'The proposed boundary is not the same as the Niwot census designated place. The 4,306 people counted there in 2020 are not the electorate for this vote, and not necessarily the population of the proposed town. The petition’s Exhibits A and B describe the boundary; the Commission’s FAQ explains how to check an address against them.',
];

const after = [
  { n: '01', text: 'If incorporation is rejected, no municipality is created, no charter commission is formed, and the fiscal authorizations have nothing to apply to. The process ends.' },
  { n: '02', text: 'If incorporation is approved, the court enters an order of incorporation, and the fiscal measures that also passed take effect on the dates in the ballot text.' },
  { n: '03', text: 'If the charter commission question is also approved, the nine elected commissioners draft a proposed home rule charter. The commission exists only alongside incorporation.' },
  { n: '04', text: 'The proposed charter returns to voters at a later election.' },
  { n: '05', text: 'No charter is being approved in the November 3, 2026 election.' },
];

/* One entry per destination. Task-specific links are in `tasks` above. */
const official = [
  { label: 'Niwot Election Commission', note: 'Notices, meeting records and the election timetable', href: 'https://niwotelection.org/' },
  { label: 'Official ballot content', note: 'The certified questions and fiscal issues', href: BALLOT },
  { label: 'Election FAQ and the proposed boundary', note: 'Including how to check an address against the petition exhibits', href: FAQ },
  { label: 'Boulder County Elections', note: 'Registration, address updates, drop-off and voting locations, results', href: COUNTY },
];

/* Every registered campaign committee, listed together and labeled
   identically. None is an election authority and none is presented as one.
   Niwot Together was added in the September 2026 pre-launch audit: the Left
   Hand Valley Courier reported its first campaign-finance filing on
   August 12, 2026, a week after Neighbors for Niwot's. Re-check the
   Secretary of State's TRACER filings for new committees before the
   election. */
const campaigns = [
  { label: 'Niwot Incorporation Committee — campaign material', href: 'https://www.niwot.town/' },
  { label: 'Niwot Together — campaign material', href: 'https://niwottogether.org/' },
  { label: 'Neighbors for Niwot — campaign material', href: 'https://neighborsforniwot.org/' },
];

export default { tasks, status, meaning, questions, fiscal, after, official, campaigns };
