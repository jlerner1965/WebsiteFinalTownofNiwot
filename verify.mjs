/* Browser checks against the built site in _site/.

   Run `npm run build` first, then `node verify.mjs`. Exits non-zero on any
   finding. See README.md, "Verification", for what it covers.
*/
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  'eat-shop': { '[data-listing]': 4, '[data-chip]': 7 },
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

// The homepage hero photo must reach the right edge of the screen at every
// width — including above the 1440px container, where cancelling only the
// gutter leaves it short and it reads as an unfinished edge.
const bleedWidths = [768, 1024, 1280, 1440, 1920, 2560];
const bleedResults = [];
for (const w of bleedWidths) {
  const bctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  const bp = await bctx.newPage();
  await bp.goto('http://localhost:8099/', { waitUntil: 'load' });
  await bp.waitForTimeout(120);
  const r = await bp.evaluate(() => {
    const img = document.querySelector('.n-bleed img');
    return {
      right: Math.round(img.getBoundingClientRect().right),
      edge: document.documentElement.clientWidth,
      scrollW: document.documentElement.scrollWidth,
    };
  });
  if (Math.abs(r.right - r.edge) > 1) note(`home @ ${w}px: hero photo stops ${r.edge - r.right}px short of the edge`);
  if (r.scrollW > r.edge + 1) note(`home @ ${w}px: bleed caused horizontal scroll (${r.scrollW} vs ${r.edge})`);
  bleedResults.push(`${w}→${r.right}`);
  await bctx.close();
}
console.log(`✓ hero bleed reaches the screen edge at every width: ${bleedResults.join(', ')}`);

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

// Every label in the schematic map must sit inside its viewBox.
await page.goto('http://localhost:8099/plan-a-visit/', { waitUntil: 'load' });
const outside = await page.evaluate(() => {
  const svg = document.querySelector('#map svg');
  const vb = svg.viewBox.baseVal;
  return Array.from(svg.querySelectorAll('text'))
    .map((t) => ({ text: t.textContent, box: t.getBBox() }))
    .filter(({ box }) => box.x < vb.x || box.y < vb.y || box.x + box.width > vb.x + vb.width || box.y + box.height > vb.y + vb.height)
    .map(({ text, box }) => `${text} @ ${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.width)}x${Math.round(box.height)}`);
});
outside.forEach((o) => note(`plan-a-visit: map label outside viewBox: ${o}`));
if (!outside.length) console.log('✓ map: every label sits inside the viewBox');

// Directory filtering.
await page.goto('http://localhost:8099/eat-shop/', { waitUntil: 'load' });
await page.waitForTimeout(400);
const visible = () => page.evaluate(() => Array.from(document.querySelectorAll('[data-listing]')).filter((r) => !r.hidden).length);
if ((await visible()) !== 4) note('eat-shop: expected 4 listings on load');
await page.fill('#dir-q', 'coffee');
await page.waitForTimeout(120);
const afterSearch = await visible();
if (afterSearch !== 1) note(`eat-shop: search "coffee" showed ${afterSearch}, expected 1`);
await page.fill('#dir-q', 'zzzz');
await page.waitForTimeout(120);
const emptyShown = await page.evaluate(() => !document.querySelector('[data-dir-empty]').hidden);
if (!emptyShown) note('eat-shop: no-match state did not appear');
await page.click('[data-dir-clear]');
await page.waitForTimeout(120);
if ((await visible()) !== 4) note('eat-shop: Clear filters did not restore all listings');
await page.click('[data-chip="Restaurants & Bars"]');
await page.waitForTimeout(120);
const byCat = await visible();
if (byCat !== 3) note(`eat-shop: category filter showed ${byCat}, expected 3`);
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
