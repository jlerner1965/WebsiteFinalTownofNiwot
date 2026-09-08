/* Browser checks against the built site in _site/.

   Run `npm run build` first, then `node verify.mjs`. Exits non-zero on any
   finding. See README.md, "Verification", for what it covers.
*/
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import listings from './src/_data/listings.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '_site');
const SHOTS = process.env.SHOTS_DIR || join(HERE, '.verify-shots');
await mkdir(SHOTS, { recursive: true });

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.xml': 'application/xml', '.txt': 'text/plain' };

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let file = join(ROOT, p);
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
  } catch { res.writeHead(404); return res.end('nf'); }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(8099, r));

/* Expected element counts per page. A data wiring mistake renders an empty
   loop and nothing else complains, so the count is asserted explicitly. */
const COUNTS = {
  home: { '[data-upcoming] article': 3, '.n-quick a': 6, '.n-exp article': 4 },
  explore: { '.n-entry': 4, '.n-entry--flip': 2 },
  'eat-shop': { '[data-listing]': listings.entries.length, '[data-chip]': listings.categories.length },
  events: { '[data-upcoming] article': 3, '[data-day]': 28 },
  community: { '.n-srow': 9, '#orgs li': 2 },
  'our-story': { '.n-era': 5 },
  civic: { '.n-status > div': 6, '#ballot li': 3, '#fiscal li': 5, '#after li': 5, '#official a.n-btn': 7 },
  'plan-a-visit': { '.n-g4 > div': 4, 'form [name]': 5 },
  404: { '.n-lost a': 6 },
};

const PAGES = [
  ['home', '/'],
  ['explore', '/explore/'],
  ['eat-shop', '/eat-shop/'],
  ['events', '/events/'],
  ['community', '/community/'],
  ['our-story', '/our-story/'],
  ['civic', '/civic/incorporation-election/'],
  ['plan-a-visit', '/plan-a-visit/'],
  ['404', '/404.html'],
];

/* Set CHROMIUM_PATH to point at an existing Chromium instead of the one
   `npx playwright install` would download. */
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const problems = [];
const externalBlocked = new Set();
const note = (m) => problems.push(m);

for (const [name, path] of PAGES) {
  for (const [label, width, height] of [['desktop', 1280, 900], ['mobile', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    const blockedExternal = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('requestfailed', (r) => {
      if (!r.url().startsWith('http://localhost:8099')) blockedExternal.push(r.url());
      else errors.push('request failed: ' + r.url());
    });
    page.on('response', (r) => {
      if (r.status() >= 400 && r.url().startsWith('http://localhost:8099')) {
        errors.push('HTTP ' + r.status() + ' ' + r.url());
      }
    });

    await page.goto('http://localhost:8099' + path, { waitUntil: 'load' });
    // Below-the-fold images are lazy-loaded; scroll the page so they resolve
    // before the image and screenshot checks run.
    await page.evaluate(async () => {
      document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page
      .waitForFunction(() => Array.from(document.images).every((i) => i.complete), null, { timeout: 15000 })
      .catch(() => {});
    await page.waitForTimeout(200);

    // "Failed to load resource" with no URL is the blocked external request
    // above echoing into the console; the typed listeners above are the source
    // of truth for anything same-origin.
    const realErrors = errors.filter((e) => !/^Failed to load resource: net::/.test(e));
    if (realErrors.length) note(`${name}/${label}: console errors: ${realErrors.join(' | ')}`);
    blockedExternal.forEach((u) => externalBlocked.add(u));

    // No horizontal overflow.
    const overflow = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      win: window.innerWidth,
      culprits: Array.from(document.querySelectorAll('body *'))
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
        .slice(0, 5)
        .map((el) => el.tagName + '.' + (el.className || '').toString().slice(0, 40)),
    }));
    if (overflow.doc > overflow.win + 1) {
      note(`${name}/${label}: horizontal overflow ${overflow.doc} > ${overflow.win} :: ${overflow.culprits.join(', ')}`);
    }

    // Images all loaded and carry alt text.
    const imgs = await page.evaluate(() =>
      Array.from(document.images).map((i) => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0, alt: i.getAttribute('alt') }))
    );
    imgs.filter((i) => !i.ok).forEach((i) => note(`${name}/${label}: image failed: ${i.src}`));
    imgs.filter((i) => i.alt === null || i.alt.trim() === '').forEach((i) => note(`${name}/${label}: image missing alt: ${i.src}`));

    // Text ink, not just boxes. An unbreakable word paints outside its box
    // without widening it, so a box-only check reports clean while glyphs
    // are visibly clipped.
    const spills = await page.evaluate(() => {
      const out = [];
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const edge = document.documentElement.clientWidth;
      let n;
      while ((n = walk.nextNode())) {
        if (!n.textContent.trim()) continue;
        const r = document.createRange();
        r.selectNodeContents(n);
        const b = r.getBoundingClientRect();
        if (b.width === 0) continue;
        if (b.right > edge + 1 || b.left < -1) {
          out.push(n.textContent.trim().slice(0, 30) + ` (${Math.round(b.left)}..${Math.round(b.right)} vs ${edge})`);
        }
      }
      return out.slice(0, 4);
    });
    spills.forEach((t) => note(`${name}/${label}: text ink outside the viewport: ${t}`));

    // Minimum rendered text size 12px.
    const tiny = await page.evaluate(() => {
      const out = [];
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walk.nextNode())) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        if (!el || !el.getClientRects().length) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 12) out.push(el.tagName + ' ' + fs + 'px: ' + n.textContent.trim().slice(0, 30));
      }
      return out.slice(0, 5);
    });
    tiny.forEach((t) => note(`${name}/${label}: text under 12px: ${t}`));

    // No rounded corners anywhere: border-radius is 0 in this design.
    const rounded = await page.evaluate(() =>
      Array.from(document.querySelectorAll('body *'))
        .filter((el) => {
          const r = getComputedStyle(el).borderRadius;
          return r && r !== '0px' && !r.startsWith('0px 0px 0px 0px');
        })
        .slice(0, 5)
        .map((el) => el.tagName + '.' + (el.className || '').toString().slice(0, 30) + ' → ' + getComputedStyle(el).borderRadius)
    );
    rounded.forEach((r) => note(`${name}/${label}: rounded corner: ${r}`));

    // The disclaimer is required verbatim on every page.
    const disclaimer = await page.evaluate(() => {
      const el = document.querySelector('.n-disclaim');
      return el ? el.textContent.trim() : null;
    });
    const EXPECT = 'TownofNiwot.com is an independent community guide. It is not a municipal government website, the Niwot Election Commission, Boulder County, or an incorporation campaign.';
    if (disclaimer !== EXPECT) note(`${name}/${label}: disclaimer wrong or missing: ${disclaimer}`);

    // Headings must not collapse to body size — the clamp() whitespace trap.
    const h1 = await page.evaluate(() => {
      const el = document.querySelector('h1');
      return el ? parseFloat(getComputedStyle(el).fontSize) : null;
    });
    if (h1 !== null && h1 < 24) note(`${name}/${label}: h1 rendered at ${h1}px — check clamp() whitespace`);

    for (const [selector, min] of Object.entries(COUNTS[name] || {})) {
      const n = await page.locator(selector).count();
      if (n < min) note(`${name}/${label}: expected at least ${min} of "${selector}", found ${n}`);
    }

    await page.screenshot({ path: `${SHOTS}/${name}-${label}.png`, fullPage: label === 'desktop' });
    await ctx.close();
  }
}

// --- Targeted checks the handoff flagged as real defects ---

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// The homepage hero photo sits inside the gutter, sharing its right edge
// with the nav and the body copy rather than bleeding off the screen.
const bleedWidths = [390, 768, 1024, 1280, 1440, 1920, 2560];
const bleedResults = [];
for (const w of bleedWidths) {
  const bctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  const bp = await bctx.newPage();
  await bp.goto('http://localhost:8099/', { waitUntil: 'load' });
  await bp.waitForTimeout(120);
  const r = await bp.evaluate(() => {
    const img = document.querySelector('.n-hero figure img');
    const wrap = document.querySelector('.n-hero').closest('.n-wrap');
    const box = wrap.getBoundingClientRect();
    const contentRight = box.right - parseFloat(getComputedStyle(wrap).paddingRight);
    return {
      right: Math.round(img.getBoundingClientRect().right),
      contentRight: Math.round(contentRight),
      edge: document.documentElement.clientWidth,
      scrollW: document.documentElement.scrollWidth,
    };
  });
  if (Math.abs(r.right - r.contentRight) > 1) {
    note(`home @ ${w}px: hero photo is not aligned to the content edge (${r.right} vs ${r.contentRight})`);
  }
  if (r.right >= r.edge - 1) note(`home @ ${w}px: hero photo is touching the screen edge`);
  if (r.scrollW > r.edge + 1) note(`home @ ${w}px: horizontal scroll (${r.scrollW} vs ${r.edge})`);
  bleedResults.push(`${w}→${r.edge - r.right}px`);
  await bctx.close();
}
console.log(`✓ hero photo clears the screen edge at every width: ${bleedResults.join(', ')}`);

// Explore flipped entries must not crush the photo into the 64px numeral track.
await page.goto('http://localhost:8099/explore/', { waitUntil: 'load' });
const flip = await page.evaluate(() =>
  Array.from(document.querySelectorAll('.n-entry--flip figure img')).map((i) => Math.round(i.getBoundingClientRect().width))
);
flip.forEach((w, i) => {
  if (w < 200) note(`explore: flipped photo ${i} crushed to ${w}px — check grid-column placement`);
});
console.log('✓ explore flipped photo widths:', flip.join(', '));

// Anchor targets must clear the sticky header.
const anchor = await page.evaluate(() => {
  document.querySelector('#outdoors').scrollIntoView();
  return { top: Math.round(document.querySelector('#outdoors').getBoundingClientRect().top), header: Math.round(document.querySelector('.n-head').getBoundingClientRect().height) };
});
if (anchor.top < anchor.header) note(`explore: anchor #outdoors lands under the sticky header (top=${anchor.top}, header=${anchor.header})`);
else console.log(`✓ anchor clearance: #outdoors top ${anchor.top} >= header ${anchor.header}`);

/* The schematic map, at every width. Two things to hold: labels inside the
   viewBox, and labels actually readable once rendered.

   The second is the one that hid for a long time. An SVG scales to its
   column, so a 12-unit label in a 640-unit viewBox lands at 12px only when
   the map is drawn 640px wide — below that it shrinks, and the page-level
   "text under 12px" check never sees it, because the computed font-size on an
   SVG <text> is the attribute value, not what reaches the screen. On a phone
   the landscape map was painting its labels at 7px. There are now two maps,
   landscape and portrait, and only the displayed one can be measured —
   getBBox() throws on a display:none element. */
const MAP_WIDTHS = [320, 390, 620, 720, 721, 900, 1024, 1199, 1200, 1440, 2560];
let mapMin = Infinity;
for (const width of MAP_WIDTHS) {
  const mctx = await browser.newContext({ viewport: { width, height: 900 } });
  const mpage = await mctx.newPage();
  await mpage.goto('http://localhost:8099/plan-a-visit/', { waitUntil: 'load' });
  await mpage.waitForTimeout(150);
  const r = await mpage.evaluate(() => {
    const svg = Array.from(document.querySelectorAll('#map svg')).find(
      (s) => getComputedStyle(s).display !== 'none'
    );
    if (!svg) return null;
    const vb = svg.viewBox.baseVal;
    const scale = svg.getBoundingClientRect().width / vb.width;
    const texts = Array.from(svg.querySelectorAll('text'));
    return {
      outside: texts
        .map((t) => ({ text: t.textContent, box: t.getBBox() }))
        .filter(({ box }) => box.x < vb.x || box.y < vb.y || box.x + box.width > vb.x + vb.width || box.y + box.height > vb.y + vb.height)
        .map(({ text, box }) => `${text} @ ${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.width)}x${Math.round(box.height)}`),
      smallest: texts.reduce(
        (min, t) => Math.min(min, parseFloat(getComputedStyle(t).fontSize) * scale),
        Infinity
      ),
      smallestText: texts
        .map((t) => ({ t: t.textContent, px: parseFloat(getComputedStyle(t).fontSize) * scale }))
        .sort((a, b) => a.px - b.px)[0].t,
    };
  });
  await mctx.close();
  if (!r) { note(`plan-a-visit/${width}: no map is displayed`); continue; }
  r.outside.forEach((o) => note(`plan-a-visit/${width}: map label outside viewBox: ${o}`));
  if (r.smallest < 12) {
    note(`plan-a-visit/${width}: map label "${r.smallestText}" renders at ${r.smallest.toFixed(1)}px`);
  }
  mapMin = Math.min(mapMin, r.smallest);
}
console.log(`✓ map: labels inside the viewBox and never under ${mapMin.toFixed(1)}px, 320 through 2560`);

// Directory filtering.
await page.goto('http://localhost:8099/eat-shop/', { waitUntil: 'load' });
await page.waitForTimeout(400);
const visible = () => page.evaluate(() => Array.from(document.querySelectorAll('[data-listing]')).filter((r) => !r.hidden).length);
/* Expectations come from the data, not from a number typed here: the
   directory grows, and a hardcoded count turns every new listing into a
   failing check. The haystack matches directory.js field for field. */
const matching = (term) =>
  listings.entries.filter((e) =>
    [e.name, e.category, e.note, e.area, e.address].join(' ').toLowerCase().includes(term)
  ).length;
const totalListings = listings.entries.length;
const restaurants = listings.entries.filter((e) => e.category === 'Restaurants & Bars').length;
if ((await visible()) !== totalListings) note(`eat-shop: expected ${totalListings} listings on load`);
await page.fill('#dir-q', 'coffee');
await page.waitForTimeout(120);
const afterSearch = await visible();
if (afterSearch !== matching('coffee')) note(`eat-shop: search "coffee" showed ${afterSearch}, expected ${matching('coffee')}`);
await page.fill('#dir-q', 'zzzz');
await page.waitForTimeout(120);
const emptyShown = await page.evaluate(() => !document.querySelector('[data-dir-empty]').hidden);
if (!emptyShown) note('eat-shop: no-match state did not appear');
await page.click('[data-dir-clear]');
await page.waitForTimeout(120);
if ((await visible()) !== totalListings) note('eat-shop: Clear filters did not restore all listings');
/* The directory is searched by street as well as by name. */
await page.fill('#dir-q', 'second avenue');
await page.waitForTimeout(120);
const byStreet = await visible();
if (byStreet !== matching('second avenue')) note(`eat-shop: street search showed ${byStreet}, expected ${matching('second avenue')}`);
/* "Clear filters" only exists inside the no-match state, so empty the box. */
await page.fill('#dir-q', '');
await page.waitForTimeout(120);
await page.click('[data-chip="Restaurants & Bars"]');
await page.waitForTimeout(120);
const byCat = await visible();
if (byCat !== restaurants) note(`eat-shop: category filter showed ${byCat}, expected ${restaurants}`);
const heading = await page.textContent('[data-dir-heading]');
if (heading.trim() !== 'Restaurants & Bars') note(`eat-shop: heading did not update (${heading})`);
console.log('✓ directory: search, no-match, clear and category filter all behave');
await page.screenshot({ path: `${SHOTS}/eat-shop-filtered.png` });

// Calendar.
await page.goto('http://localhost:8099/events/', { waitUntil: 'load' });
await page.waitForTimeout(400);
const monthNow = await page.textContent('[data-cal-label]');
const expectedMonth = new Date().toLocaleString('en-US', { month: 'long' }) + ' ' + new Date().getFullYear();
if (monthNow.trim() !== expectedMonth) note(`events: calendar opened on ${monthNow.trim()}, expected ${expectedMonth}`);
const todayHidden = await page.evaluate(() => document.querySelector('[data-cal-today]').hidden);
if (!todayHidden) note('events: "This month" button visible while on the current month');
const detailFilled = (await page.textContent('[data-cal-detail]')).trim().length > 40;
if (!detailFilled) note('events: detail rail is empty on load');
await page.click('[data-cal-next]');
await page.waitForTimeout(120);
const shown = await page.evaluate(() => document.querySelector('[data-cal-today]').hidden === false);
if (!shown) note('events: "This month" did not appear after moving off the current month');
await page.click('[data-cal-today]');
await page.waitForTimeout(120);
// Select an event-bearing day.
const picked = await page.evaluate(() => {
  const cell = document.querySelector('[data-day][data-has="yes"]');
  if (!cell) return null;
  cell.click();
  return cell.getAttribute('data-date');
});
await page.waitForTimeout(150);
if (picked) {
  const pressed = await page.evaluate((d) => document.querySelector(`[data-date="${d}"]`).getAttribute('aria-pressed'), picked);
  if (pressed !== 'true') note('events: selecting a day did not set aria-pressed');
}
const disabledNonEvent = await page.evaluate(() => document.querySelector('[data-day][data-has="no"][data-empty="no"]').disabled);
if (!disabledNonEvent) note('events: days without events are not disabled');
console.log(`✓ calendar: opens on ${monthNow.trim()}, detail rail filled, day selection and month nav work`);
await page.screenshot({ path: `${SHOTS}/events-selected.png` });

// Mobile menu.
const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await m.newPage();
await mp.goto('http://localhost:8099/', { waitUntil: 'load' });
const navHiddenAtStart = await mp.evaluate(() => getComputedStyle(document.querySelector('.n-nav')).display === 'none');
if (!navHiddenAtStart) note('mobile: nav is not collapsed below 1080px');
await mp.click('.n-burger');
await mp.waitForTimeout(150);
const opened = await mp.evaluate(() => ({
  shown: getComputedStyle(document.querySelector('.n-nav')).display !== 'none',
  expanded: document.querySelector('.n-burger').getAttribute('aria-expanded'),
  label: document.querySelector('.n-burger').getAttribute('aria-label'),
}));
if (!opened.shown || opened.expanded !== 'true' || opened.label !== 'Close menu') note(`mobile: menu open state wrong: ${JSON.stringify(opened)}`);
await mp.screenshot({ path: `${SHOTS}/mobile-menu.png` });
await mp.keyboard.press('Escape');
await mp.waitForTimeout(150);
const closed = await mp.evaluate(() => ({
  shown: getComputedStyle(document.querySelector('.n-nav')).display !== 'none',
  expanded: document.querySelector('.n-burger').getAttribute('aria-expanded'),
  focused: document.activeElement.classList.contains('n-burger'),
}));
if (closed.shown || closed.expanded !== 'false' || !closed.focused) note(`mobile: Escape did not close and restore focus: ${JSON.stringify(closed)}`);
console.log('✓ mobile menu: collapses, toggles aria state, Escape closes and restores focus');

/* Sticky rails are for two-column layouts. Once a page stacks into one
   column the rail has nothing to scroll against and pins itself on top of
   the content it belongs to — which is exactly what the directory filter
   did. Below the breakpoint the sticky header is the only sticky thing. */
const MOBILE_PAGES = ['/', '/explore/', '/eat-shop/', '/events/', '/community/', '/our-story/', '/civic/incorporation-election/', '/plan-a-visit/'];
const stuck = [];
for (const path of MOBILE_PAGES) {
  await mp.goto('http://localhost:8099' + path, { waitUntil: 'load' });
  await mp.waitForTimeout(200);
  const found = await mp.evaluate(() =>
    Array.from(document.querySelectorAll('body *'))
      .filter((el) => getComputedStyle(el).position === 'sticky' && !el.classList.contains('n-head'))
      .map((el) => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : ''))
  );
  found.forEach((f) => stuck.push(`${path} ${f}`));
}
stuck.forEach((f) => note(`mobile: sticky element in a stacked layout: ${f}`));
if (!stuck.length) console.log('✓ mobile: no sticky rails pinned over stacked content');

/* A seventh of a phone screen is not wide enough for a series name, and an
   overflowing label is painted over by the next cell's background rather
   than clipped — no scrollbar, no console warning, just "MARKI". */
await mp.goto('http://localhost:8099/events/', { waitUntil: 'load' });
await mp.waitForTimeout(300);
const spilledTags = await mp.evaluate(() =>
  Array.from(document.querySelectorAll('.n-daytag'))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 1) return false; // visually hidden, read aloud instead
      const cell = el.closest('button').getBoundingClientRect();
      return r.right > cell.right + 0.5 || r.left < cell.left - 0.5;
    })
    .map((el) => el.textContent)
);
spilledTags.forEach((t) => note(`mobile: calendar day label "${t}" overflows its cell`));
if (!spilledTags.length) console.log('✓ mobile: calendar day labels stay inside their cell');

/* Touch targets. Standalone controls need height under a fingertip; links
   sitting inside a sentence are exempt, as they are in WCAG 2.2. */
const smallTargets = [];
for (const path of MOBILE_PAGES) {
  await mp.goto('http://localhost:8099' + path, { waitUntil: 'load' });
  await mp.waitForTimeout(200);
  const found = await mp.evaluate(() =>
    Array.from(document.querySelectorAll('button, .n-btn, .n-link, input:not([tabindex="-1"]), select, textarea'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) return false;
        if (el.closest('.n-sr')) return false;
        return r.height < 40;
      })
      .map((el) => `${el.tagName.toLowerCase()} «${(el.textContent || el.type || '').trim().slice(0, 24)}» ${Math.round(el.getBoundingClientRect().height)}px`)
  );
  [...new Set(found)].forEach((f) => smallTargets.push(`${path} ${f}`));
}
smallTargets.forEach((t) => note(`mobile: control below a 40px touch target: ${t}`));
if (!smallTargets.length) console.log('✓ mobile: every standalone control clears a 40px touch target');

await m.close();

await ctx.close();
await browser.close();
server.close();

console.log('\n' + '='.repeat(60));
if (externalBlocked.size) {
  console.log('Note — blocked by the sandbox, not a site defect:');
  externalBlocked.forEach((u) => console.log('  · ' + u.slice(0, 90)));
  console.log('');
}
if (problems.length) {
  console.log(`${problems.length} PROBLEM(S):`);
  problems.forEach((p) => console.log('  ✗ ' + p));
  process.exitCode = 1;
} else {
  console.log('All checks passed.');
}
