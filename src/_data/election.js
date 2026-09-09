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

   Anything that cannot be supported by a filed document or an official
   publication is removed rather than softened. */

import site from './site.js';

const status = [
  {
    label: 'Election date',
    value: 'November 3, 2026',
    note: 'A coordinated election held with other Boulder County contests.',
  },
  {
    label: 'Who may vote',
    value: 'Registered electors',
    note: 'Registered electors residing within the proposed boundary.',
  },
  {
    label: 'Election format',
    value: 'Mail ballot',
    note: 'A coordinated mail-ballot election, with drop-off and voting locations published by the county.',
  },
  {
    label: 'Ballot administrator',
    value: 'Niwot Election Commission',
    note: 'In coordination with the Boulder County Clerk and Recorder.',
  },
  {
    label: 'Last verified',
    value: site.verified,
    note: 'The date this page was last checked against official sources.',
  },
  {
    label: 'Authority',
    value: 'Official text controls',
    note: 'The certified ballot language published by the Commission is authoritative.',
  },
];

const questions = [
  {
    title: 'Whether Niwot should incorporate as a municipality',
    body: 'Whether the territory described in the petition should be organized as a Colorado municipality. Approval would begin the creation of a town government; rejection would leave the area unincorporated and administered by Boulder County.',
  },
  {
    title: 'Whether to form a nine-member home rule charter commission',
    body: 'Whether a commission of nine members should be formed to draft a proposed home rule charter for the new municipality. The commission drafts a charter; it does not adopt one.',
  },
  {
    title: 'Which nine charter commission candidates should be elected',
    body: 'Which candidates would serve on that charter commission if the applicable measures are approved. Candidates appear on the same ballot.',
  },
];

const fiscal = [
  {
    title: 'A 2.5% sales and use tax beginning January 1, 2028',
    body: 'Authorization to levy a municipal sales and use tax at 2.5%, with collection beginning January 1, 2028.',
  },
  {
    title: 'A four-mill property tax',
    body: 'Authorization to levy a property tax of four mills within the municipal boundary.',
  },
  {
    title: 'A 3% marijuana special sales tax',
    body: 'Authorization to levy a special sales tax of 3% on marijuana sales.',
  },
  {
    title: 'Authorization to retain and spend collected revenue',
    body: 'Authorization for the municipality to retain and spend the revenue it collects, rather than refunding amounts above a statutory limit.',
  },
  {
    title: 'Authorization for up to $15 million in debt for transportation infrastructure',
    body: 'Authorization to incur up to $15 million in debt for transportation infrastructure, with a maximum total repayment cost of up to $28 million.',
  },
];

const after = [
  { n: '01', text: 'If incorporation is rejected, no municipality is created and the process ends.' },
  { n: '02', text: 'If incorporation is approved, the court enters an order of incorporation.' },
  { n: '03', text: 'The elected charter commissioners draft a proposed home rule charter.' },
  { n: '04', text: 'The proposed charter returns to voters at a later election.' },
  { n: '05', text: 'No charter is being approved in the November 3, 2026 election.' },
];

const official = [
  { label: 'Niwot Election Commission', href: 'https://niwotelection.org/' },
  { label: 'Official ballot content', href: 'https://niwotelection.org/ballot' },
  { label: 'Election FAQ', href: 'https://niwotelection.org/faq' },
  { label: 'Boulder County Elections', href: 'https://bouldercounty.gov/elections/' },
  { label: 'Proposed boundary information', href: 'https://niwotelection.org/' },
  { label: 'Voter registration and address updates', href: 'https://bouldercounty.gov/elections/' },
  { label: 'Ballot drop-off and voting locations', href: 'https://bouldercounty.gov/elections/' },
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

export default { status, questions, fiscal, after, official, campaigns };
