import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIES,
  FRESHNESS_DAYS,
  validateListings,
  publishListings,
  normaliseAddress,
  humanDate,
} from '../lib/directory.js';
import listings from '../src/_data/listings.js';

const TODAY = '2026-09-09';
const good = {
  slug: 'good-place',
  name: 'Good Place',
  category: 'restaurants-bars',
  address: '1 Second Avenue',
  website: 'https://example.com/',
  sourceUrl: 'https://example.com/',
  verifiedAt: '2026-09-01',
  status: 'active',
};
const errorsOf = (records) => validateListings(records, { today: TODAY }).errors;

test('a complete record passes', () => {
  assert.deepEqual(errorsOf([good]), []);
});

test('missing name, category, source and verification date are each reported', () => {
  const { name, category, sourceUrl, verifiedAt, ...rest } = good;
  const errors = errorsOf([rest]);
  for (const field of ['name is missing', 'category is missing', 'sourceUrl is missing', 'verifiedAt is missing']) {
    assert.ok(errors.some((e) => e.includes(field)), `expected "${field}" in ${errors}`);
  }
});

test('an unknown category is rejected', () => {
  assert.ok(errorsOf([{ ...good, category: 'nightlife' }]).some((e) => e.includes('category "nightlife"')));
});

test('duplicate businesses are detected by slug and by normalised name', () => {
  const errors = errorsOf([good, { ...good, slug: 'good-place-2', name: 'The Good Place, LLC' }]);
  assert.ok(errors.some((e) => e.includes('duplicate business')));
  assert.ok(errorsOf([good, { ...good }]).some((e) => e.includes('duplicate slug')));
});

test('invalid and insecure URLs are rejected', () => {
  assert.ok(errorsOf([{ ...good, website: 'not a url' }]).some((e) => e.includes('not a valid URL')));
  assert.ok(errorsOf([{ ...good, website: 'http://example.com/' }]).some((e) => e.includes('http://')));
  assert.ok(errorsOf([{ ...good, sourceUrl: 'ftp://example.com/' }]).some((e) => e.includes('https://')));
});

test('a stale active record fails the freshness threshold; a closed one does not', () => {
  const stale = { ...good, verifiedAt: '2025-01-01' };
  assert.ok(errorsOf([stale]).some((e) => e.includes(`${FRESHNESS_DAYS}-day freshness threshold`)));
  assert.deepEqual(errorsOf([{ ...stale, status: 'closed', editorialNote: 'Closed, per the Courier.' }]), []);
  const edge = { ...good, verifiedAt: '2026-03-13' }; /* exactly 180 days */
  assert.deepEqual(errorsOf([edge]), []);
});

test('verification dates in the future are rejected beyond a one-day timezone tolerance', () => {
  assert.deepEqual(errorsOf([{ ...good, verifiedAt: '2026-09-10' }]), []);
  assert.ok(errorsOf([{ ...good, verifiedAt: '2026-09-11' }]).some((e) => e.includes('in the future')));
  assert.ok(errorsOf([{ ...good, verifiedAt: '2026-02-30' }]).some((e) => e.includes('not a YYYY-MM-DD')));
});

test('two published records at one address must both acknowledge the sharing', () => {
  const other = { ...good, slug: 'other-place', name: 'Other Place', address: '1 2nd Ave' };
  const errors = errorsOf([good, other]);
  assert.ok(errors.some((e) => e.includes('is used by Good Place, Other Place')));
  assert.deepEqual(errorsOf([{ ...good, sharesAddress: true }, { ...other, sharesAddress: true }]), []);
  /* A closed record at the same address is the replacement case, not a clash. */
  assert.deepEqual(errorsOf([good, { ...other, status: 'closed', editorialNote: 'Replaced.' }]), []);
});

test('closed and unverified records need an editorial note', () => {
  assert.ok(errorsOf([{ ...good, status: 'closed' }]).some((e) => e.includes('needs an editorialNote')));
  assert.ok(errorsOf([{ ...good, status: 'unverified' }]).some((e) => e.includes('needs an editorialNote')));
});

test('address normalisation treats Second Avenue and 2nd Ave alike', () => {
  assert.equal(normaliseAddress('121 Second Avenue'), normaliseAddress('121 2nd Ave'));
  assert.notEqual(normaliseAddress('300 Second Avenue'), normaliseAddress('300 Second Avenue, Suite 102'));
});

test('publication drops closed and unverified rows, derives counts and never exposes notes', () => {
  const rows = [
    good,
    { ...good, slug: 'closed-place', name: 'Closed Place', status: 'closed', editorialNote: 'Secret note', address: '2 Second Avenue' },
    { ...good, slug: 'maybe-place', name: 'Maybe Place', status: 'unverified', editorialNote: 'Secret note', address: '3 Second Avenue' },
    { ...good, slug: 'cafe', name: 'Cafe', category: 'coffee-bakery', address: '4 Second Avenue', verifiedAt: '2026-08-01', editorialNote: 'Internal' },
  ];
  const out = publishListings(rows);
  assert.deepEqual(out.entries.map((e) => e.slug), ['good-place', 'cafe']);
  assert.deepEqual(out.categories.map((c) => [c.slug, c.count]), [['all', 2], ['restaurants-bars', 1], ['coffee-bakery', 1]]);
  assert.ok(out.entries.every((e) => !('editorialNote' in e) && e.publicNote === undefined));
  assert.equal(out.verified.uniform, false);
  assert.match(out.verified.summary, /between August 1, 2026 and September 1, 2026/);
  assert.equal(humanDate('2026-09-09'), 'September 9, 2026');
});

test('an editorial note is published only when explicitly designated', () => {
  const out = publishListings([{ ...good, editorialNote: 'Say this', publishNote: true }]);
  assert.equal(out.entries[0].publicNote, 'Say this');
});

/* ---- the live data ---- */

test('the live directory validates and its category counts add up', () => {
  assert.deepEqual(validateListings(listings.records, { today: TODAY }).errors, []);
  const total = listings.categories.find((c) => c.slug === 'all').count;
  const sum = listings.categories.filter((c) => c.slug !== 'all').reduce((n, c) => n + c.count, 0);
  assert.equal(total, listings.entries.length);
  assert.equal(sum, listings.entries.length);
  assert.ok(listings.categories.every((c) => c.count > 0));
  assert.ok(CATEGORIES.every((c) => typeof c.slug === 'string' && /^[a-z-]+$/.test(c.slug)));
});

test('no active listing duplicates another', () => {
  const names = listings.entries.map((e) => e.name.toLowerCase());
  assert.equal(new Set(names).size, names.length);
});

test('1914 House is no longer an active listing', () => {
  const record = listings.records.find((r) => r.slug === '1914-house');
  assert.equal(record.status, 'closed');
  assert.ok(!listings.entries.some((e) => e.name === '1914 House'));
});

test('Taverna Laudisio and Love Ice Cream are published with the verified details', () => {
  const taverna = listings.entries.find((e) => e.slug === 'taverna-laudisio');
  assert.equal(taverna.address, '121 Second Avenue');
  assert.equal(taverna.postalCode, '80544');
  assert.equal(taverna.website, 'https://tavernalaudisio.com/');
  const love = listings.entries.find((e) => e.slug === 'love-ice-cream');
  assert.equal(love.address, '240 Second Avenue');
  assert.equal(love.sourceUrl, 'https://niwot.com/listing/love-ice-cream/');
});

test('Emory Jane’s and 2nd Nature Hair Lounge are present', () => {
  assert.ok(listings.entries.some((e) => e.slug === 'emory-janes-coffee-co'));
  assert.ok(listings.entries.some((e) => e.slug === '2nd-nature-hair-lounge' && e.address === '300 Second Avenue, Suite 101'));
});

test('The Wheel House has one verified address and its direct website', () => {
  const wheel = listings.entries.find((e) => e.slug === 'the-wheel-house');
  assert.equal(wheel.address, '101 Second Avenue, Suite B');
  assert.equal(wheel.website, 'https://www.niwotwheelhouse.com/');
  assert.equal(wheel.href, 'https://www.niwotwheelhouse.com/');
  assert.ok(!JSON.stringify(wheel).includes('300 Second'));
  const raw = listings.records.find((r) => r.slug === 'the-wheel-house');
  assert.match(raw.editorialNote, /124 2nd Ave/);
});
