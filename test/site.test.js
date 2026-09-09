/* Checks against the built site in _site/. Run `npm run build` first.

   These read the HTML the deploy would serve: every primary page exists and
   carries the right head, internal links resolve, the sitemap and robots
   files are well-formed, structured data parses and says what the page
   says, and nothing internal leaks. */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import listings from '../src/_data/listings.js';
import events from '../src/_data/events.js';
import site from '../src/_data/site.js';
import { buildUpcoming, expandEvents, instancesOn, dateLabel, parseIso, MONTHS } from '../src/assets/js/calendar-core.js';
import { HASHED_NAME } from '../lib/assets.js';

const ROOT = path.resolve('_site');
const PRIMARY = ['/', '/explore/', '/eat-shop/', '/events/', '/community/', '/our-story/', '/civic/incorporation-election/', '/plan-a-visit/'];
const INDEXABLE = [...PRIMARY, '/privacy/'];
const TITLES = {
  '/': 'Niwot, Colorado Community Guide | TownofNiwot.com',
  '/explore/': 'Things to Do in Niwot, Colorado | TownofNiwot.com',
  '/eat-shop/': 'Niwot Restaurants, Shops & Local Services | TownofNiwot.com',
  '/events/': 'Niwot Events Calendar | TownofNiwot.com',
  '/community/': 'Niwot Community Organizations & Resident Resources',
  '/our-story/': 'History of Niwot, Colorado | TownofNiwot.com',
  '/plan-a-visit/': 'Visit Niwot, Colorado: Directions, Parking & Accessibility',
  '/civic/incorporation-election/': '2026 Niwot Incorporation Election | TownofNiwot.com',
  '/privacy/': 'Privacy | TownofNiwot.com',
};

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#8217;/g, '’').replace(/&#8212;/g, '—').replace(/&quot;/g, '"');
const fileFor = (url) => (url.endsWith('/') ? path.join(ROOT, url, 'index.html') : path.join(ROOT, url));
const read = (url) => fs.readFileSync(fileFor(url), 'utf8');
const tag = (html, re) => (html.match(re) || [])[1];
const jsonLd = (html) => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));

before(() => {
  assert.ok(fs.existsSync(ROOT), '_site is missing — run `npm run build` first');
});

test('all eight primary pages, the privacy page, the 404 and the utility files are built', () => {
  for (const url of [...INDEXABLE, '/thanks/']) assert.ok(fs.existsSync(fileFor(url)), url);
  for (const file of ['404.html', 'sitemap.xml', 'robots.txt', 'favicon.svg']) assert.ok(fs.existsSync(path.join(ROOT, file)), file);
});

test('titles, descriptions, canonicals and Open Graph tags are unique and correct', () => {
  const descriptions = new Set();
  for (const url of INDEXABLE) {
    const html = read(url);
    assert.equal(decode(tag(html, /<title>([^<]*)<\/title>/)), TITLES[url], url);
    const description = tag(html, /<meta name="description" content="([^"]*)">/);
    assert.ok(description && description.length > 60, `${url} description`);
    assert.ok(!descriptions.has(description), `${url} description duplicates another page`);
    descriptions.add(description);
    assert.equal(tag(html, /<link rel="canonical" href="([^"]*)">/), site.url + url, `${url} canonical`);
    assert.equal(tag(html, /<meta property="og:url" content="([^"]*)">/), site.url + url);
    assert.equal(decode(tag(html, /<meta property="og:title" content="([^"]*)">/)), TITLES[url]);
    assert.ok(tag(html, /<meta property="og:image" content="([^"]*)">/).startsWith(site.url + '/assets/photos/'));
    assert.ok(tag(html, /<meta property="og:image:alt" content="([^"]*)">/));
    assert.ok(!/<meta name="robots"/.test(html), `${url} must be indexable`);
  }
});

test('every page has exactly one H1 and no skipped heading levels', () => {
  for (const url of [...INDEXABLE, '/thanks/', '/404.html']) {
    const html = read(url);
    const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    assert.equal(levels.filter((l) => l === 1).length, 1, `${url} h1 count`);
    let previous = 0;
    for (const level of levels) {
      assert.ok(level <= previous + 1, `${url} skips from h${previous} to h${level}`);
      previous = level;
    }
  }
});

test('the 404 and thank-you pages are noindex and carry no canonical', () => {
  for (const url of ['/404.html', '/thanks/']) {
    const html = read(url);
    assert.match(html, /<meta name="robots" content="noindex, follow">/, url);
    assert.ok(!/rel="canonical"/.test(html), url);
  }
});

test('the masthead identifier, footer disclaimer and privacy links are on every page', () => {
  for (const url of [...INDEXABLE, '/thanks/', '/404.html']) {
    const html = read(url);
    assert.match(html, /<small>Independent community guide<\/small>/, url);
    assert.ok(html.includes(site.disclaimer), `${url} disclaimer`);
    assert.match(html, /href="\/privacy\/"/, url);
  }
  assert.ok(read('/').split('href="/privacy/"').length >= 3, 'privacy link beside the newsletter form');
  assert.ok(read('/plan-a-visit/').includes('How submissions are handled'), 'privacy link beside the submission form');
});

test('internal links and in-page anchors all resolve', () => {
  const ids = new Map();
  for (const url of [...INDEXABLE, '/thanks/', '/404.html']) {
    ids.set(url, new Set([...read(url).matchAll(/ id="([^"]+)"/g)].map((m) => m[1])));
  }
  for (const url of [...INDEXABLE, '/thanks/', '/404.html']) {
    const html = read(url);
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (!href.startsWith('/')) continue;
      if (href.startsWith('/api/')) continue;
      const [pathPart, hash] = href.split('#');
      const [pathname] = pathPart.split('?');
      const target = pathname || url;
      assert.ok(fs.existsSync(fileFor(target)), `${url} links to ${href} which is not built`);
      if (hash) assert.ok(ids.get(target).has(hash), `${url} links to ${href} but #${hash} is not on that page`);
    }
    for (const [, src] of html.matchAll(/(?:src|href)="(\/assets\/(?:css|js)\/[^"]+)"/g)) {
      assert.ok(fs.existsSync(path.join(ROOT, src)), `${url} references ${src}`);
      assert.match(path.basename(src), HASHED_NAME, `${src} is not content-hashed`);
    }
  }
});

test('the sitemap lists only canonical, indexable pages with a lastmod each', () => {
  const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, [...INDEXABLE].sort().map((u) => site.url + u));
  const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
  assert.equal(lastmods.length, locs.length);
  assert.ok(lastmods.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d))));
  assert.ok(!xml.includes('/thanks/') && !xml.includes('404'));
});

test('robots.txt is open to crawlers and names the sitemap', () => {
  const txt = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  assert.match(txt, /User-agent: \*\nAllow: \//);
  assert.match(txt, /Sitemap: https:\/\/townofniwot\.com\/sitemap\.xml/);
  assert.ok(!/Disallow: \/\s*$/m.test(txt.split('Disallow: /api/').join('')));
});

test('breadcrumbs are visible and their structured data matches on every internal page', () => {
  for (const url of INDEXABLE.filter((u) => u !== '/')) {
    const html = read(url);
    const crumb = jsonLd(html).find((d) => d['@type'] === 'BreadcrumbList');
    assert.ok(crumb, `${url} BreadcrumbList`);
    assert.equal(crumb.itemListElement[0].item, site.url + '/');
    assert.equal(crumb.itemListElement[1].item, site.url + url);
    const visible = decode(tag(html, /<span aria-current="page">([^<]*)<\/span>/));
    assert.equal(visible, crumb.itemListElement[1].name, `${url} visible crumb`);
    assert.match(html, /<nav class="n-crumbs" aria-label="Breadcrumb">/);
  }
  assert.ok(!read('/').includes('n-crumbs'), 'no breadcrumb on the homepage');
});

/* ---- directory ---- */

test('the directory renders every published listing, the right counts and no closed business', () => {
  const html = read('/eat-shop/');
  const rows = [...html.matchAll(/<li class="n-row" id="([^"]+)" data-listing data-cat="([^"]+)"/g)];
  assert.equal(rows.length, listings.entries.length);
  assert.deepEqual(rows.map((m) => m[1]), listings.entries.map((e) => e.slug));
  for (const c of listings.categories) {
    const shown = new RegExp(`<span data-chip-label>${c.label.replace(/[&]/g, '&amp;')}</span> <span class="n-chip-n">(\\d+)</span>`);
    assert.equal(Number(tag(html, shown)), c.count, `${c.label} count`);
    if (c.slug !== 'all') assert.equal(rows.filter((m) => m[2] === c.slug).length, c.count, `${c.label} rows`);
  }
  assert.match(html, new RegExp(`data-dir-count>${listings.entries.length} listings<`));
  for (const record of listings.records.filter((r) => r.status === 'closed' || r.status === 'unverified')) {
    assert.ok(!html.includes(`data-name="${record.name}"`), `${record.name} must not be listed`);
    assert.ok(!html.includes(`id="${record.slug}"`), `${record.name} must not have a row`);
  }
});

test('the directory filter is a radio group in a fieldset with a legend and a live result count', () => {
  const html = read('/eat-shop/');
  assert.match(html, /<fieldset class="n-cats">\s*<legend[^>]*>Filter by category<\/legend>/);
  const radios = [...html.matchAll(/<input type="radio" name="category" value="([^"]+)"( checked)?>/g)];
  assert.deepEqual(radios.map((m) => m[1]), listings.categories.map((c) => c.slug));
  assert.deepEqual(radios.filter((m) => m[2]).map((m) => m[1]), ['all']);
  assert.match(html, /<span aria-live="polite" aria-atomic="true"[^>]*data-dir-count>/);
  assert.ok(!html.includes('type="checkbox"'));
});

test('editorial notes never reach the page, and the verification wording is per-row', () => {
  const html = read('/eat-shop/');
  for (const record of listings.records) {
    if (record.editorialNote && !record.publishNote) assert.ok(!html.includes(record.editorialNote), `${record.slug} note leaked`);
  }
  assert.ok(!html.includes('Every Niwot business we can source'));
  assert.match(html, /A curated directory of Niwot businesses, checked against business-owned and community sources/);
  assert.ok(html.includes(listings.verified.summary.replace(/&/g, '&amp;')));
  assert.equal([...html.matchAll(/data-verified="\d{4}-\d{2}-\d{2}"/g)].length, listings.entries.length);
});

test('the directory ItemList carries only active businesses with stable URLs and no invented fields', () => {
  const html = read('/eat-shop/');
  const list = jsonLd(html).find((d) => d['@type'] === 'ItemList');
  const active = listings.entries.filter((e) => e.status === 'active');
  assert.equal(list.numberOfItems, active.length);
  assert.equal(list.itemListElement.length, active.length);
  list.itemListElement.forEach((li, i) => {
    assert.equal(li.position, i + 1);
    assert.equal(li.url, `${site.url}/eat-shop/#${active[i].slug}`);
    assert.ok(html.includes(`id="${active[i].slug}"`));
    for (const forbidden of ['telephone', 'openingHours', 'geo', 'aggregateRating', 'priceRange']) assert.ok(!(forbidden in li.item));
    assert.equal(li.item.address.addressLocality, 'Niwot');
  });
  assert.ok(!list.itemListElement.some((li) => li.item.name === '1914 House'));
  const wheel = list.itemListElement.find((li) => li.item.name === 'The Wheel House');
  assert.equal(wheel.item.address.streetAddress, '101 Second Avenue, Suite B');
  assert.equal(wheel.item.url, 'https://www.niwotwheelhouse.com/');
});

test('the homepage category links open the matching filtered directory', () => {
  const html = read('/');
  const links = [...html.matchAll(/href="\/eat-shop\/\?category=([a-z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(links, listings.categories.filter((c) => c.slug !== 'all').map((c) => c.slug));
});

/* ---- events ---- */

function buildClock(html) {
  const [date, time] = tag(html, /id="niwot-events" data-built="([^"]+)"/).split(' ');
  return { date, time };
}

test('event list, month calendar, detail panel and structured data agree', () => {
  const html = read('/events/');
  const now = buildClock(html);
  const expected = buildUpcoming(events, now);

  const cards = [...html.matchAll(/<article data-event-id="([^"]+)" data-event-date="([^"]+)"/g)].map((m) => m[1] + '@' + m[2]);
  assert.deepEqual(cards, expected.map((i) => i.key), 'list matches the records');
  assert.deepEqual([...cards].sort((a, b) => a.split('@')[1].localeCompare(b.split('@')[1])), cards, 'list is chronological');
  assert.equal(new Set(cards).size, cards.length, 'no duplicate instances');
  assert.ok(expected.every((i) => i.date > now.date || (i.date === now.date && (i.endTime || '23:59') >= now.time)), 'nothing expired');

  const { y, m } = parseIso(now.date);
  const monthDays = new Set(expandEvents(events).filter((i) => i.date.startsWith(now.date.slice(0, 7))).map((i) => i.date));
  const cellDays = new Set([...html.matchAll(/data-has="yes"[^>]*data-iso="([^"]+)"/g)].map((mm) => mm[1]));
  assert.deepEqual(cellDays, monthDays, 'calendar cells match the records');
  assert.match(html, new RegExp(`data-cal-label[^>]*>${MONTHS[m - 1]} ${y}<`));

  const detail = html.slice(html.indexOf('data-cal-detail'), html.indexOf('</aside>'));
  const firstDay = instancesOn(events, expected[0].date);
  for (const inst of firstDay) {
    assert.ok(detail.includes(inst.event.name.replace(/&/g, '&amp;').replace(/'/g, '&#39;')) || detail.includes(inst.event.name), `detail shows ${inst.event.name}`);
  }
  assert.ok(detail.includes(dateLabel(expected[0], now)), 'detail date matches the card date');

  const graph = jsonLd(html).find((d) => d['@graph'])['@graph'];
  assert.deepEqual(
    graph.map((e) => e.name + '@' + String(e.startDate).slice(0, 10)),
    expected.map((i) => i.event.name + '@' + i.date),
    'structured data matches the list'
  );
  for (const e of graph) {
    assert.equal(e.eventStatus, 'https://schema.org/EventScheduled');
    assert.match(String(e.startDate), /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}-0[67]:00)?$/);
    assert.ok(e.organizer.url.startsWith('https://'));
    assert.ok(e.url.startsWith('https://'));
  }
});

test('expected events are labelled, listed separately and kept out of structured data', () => {
  const html = read('/events/');
  const expectedIds = [...html.matchAll(/data-expected-id="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(expectedIds, events.filter((e) => e.status === 'tentative').map((e) => e.id));
  assert.ok(expectedIds.includes('rock-rails-2027'));
  assert.match(html, /Expected &#8212; date not confirmed/);
  const graph = jsonLd(html).find((d) => d['@graph'])['@graph'];
  assert.ok(!graph.some((e) => /2027/.test(e.name) || String(e.startDate).startsWith('2027')));
  assert.ok(!html.includes('2027-06-03'));
});

test('the homepage "Coming up" cards are the first three upcoming instances', () => {
  const html = read('/');
  const now = buildClock(html);
  const cards = [...html.matchAll(/<article data-event-id="([^"]+)" data-event-date="([^"]+)"/g)].map((m) => m[1] + '@' + m[2]);
  assert.deepEqual(cards, buildUpcoming(events, now, 3).map((i) => i.key));
});
