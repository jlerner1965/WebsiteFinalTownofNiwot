/* Browser checks against the built site in _site/.

   Run `npm run build` first, then `node verify.mjs`. Exits non-zero on any
   finding. See README.md, "Verification", for what it covers.

   The local server applies the same response headers as vercel.json, so
   the Content-Security-Policy is exercised here: a violation surfaces as a
   console error and fails the run. Missing paths answer 404 with the
   custom page, as the deploy does.
*/
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import listings from './src/_data/listings.js';
import events from './src/_data/events.js';
import { buildUpcoming, zonedParts } from './src/assets/js/calendar-core.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '_site');
const SHOTS = process.env.SHOTS_DIR || join(HERE, '.verify-shots');
await mkdir(SHOTS, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.avif': 'image/avif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' };

/* The deploy's headers, from vercel.json, applied by source pattern. */
const vercel = JSON.parse(await readFile(join(HERE, 'vercel.json'), 'utf8'));
const headerRules = vercel.headers.map((rule) => ({
  test: new RegExp('^' + rule.source.replace(/\//g, '\\/') + '$'),
  headers: rule.headers,
}));
const REQUIRED_HEADERS = ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'strict-transport-security'];

const AXE_PATH = join(HERE, 'node_modules/axe-core/axe.min.js');
const AXE_URL = '/__axe.js';

const server = createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  for (const rule of headerRules) {
    if (rule.test.test(p)) rule.headers.forEach((h) => res.setHeader(h.key, h.value));
  }
  /* axe-core is served from this origin so the page's own CSP (script-src
     'self') admits it; an inline injection would be refused, as it should. */
  let file = p === AXE_URL ? AXE_PATH : join(ROOT, p);
  let status = 200;
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(ROOT, '404.html');
    status = 404;
  }
  try {
    const body = await readFile(file);
    res.writeHead(status, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('nf');
  }
});
await new Promise((r) => server.listen(8099, r));
const BASE = 'http://localhost:8099';

const now = zonedParts(new Date());
const upcoming = buildUpcoming(events, now);
const expectedCount = events.filter((e) => e.status === 'tentative').length;

/* Expected element counts per page. A data wiring mistake renders an empty
   loop and nothing else complains, so the count is asserted explicitly. */
const COUNTS = {
  home: { '[data-upcoming] article': Math.min(3, upcoming.length), '.n-quick a': 6, '.n-exp article': 4, 'a[href^="/eat-shop/?category="]': listings.categories.length - 1 },
  explore: { '.n-entry': 4, '.n-entry--flip': 2 },
  'eat-shop': { '[data-listing]': listings.entries.length, 'input[name="category"]': listings.categories.length, 'fieldset legend': 1 },
  events: { '[data-upcoming] article': upcoming.length, '[data-day]': 28, '[data-expected] li': expectedCount },
  community: { '.n-srow': 10, '#orgs li': 6, '[data-orgs-public] li': 2 },
  'our-story': { '.n-era': 5, '[data-corrections] dt': 1 },
  civic: { '.n-tasks > div': 3, '.n-strip > div': 4, '#ballot li': 3, '#fiscal li': 5, '#after li': 5, '#official a[data-official]': 4, '.n-toc a': 6, '[data-corrections] dt': 1 },
  'plan-a-visit': { '.n-g4 > div': 4, 'form [name]': 6, 'form a[href="/privacy/"]': 1 },
  privacy: { 'main h2': 7 },
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
  ['privacy', '/privacy/'],
  ['404', '/404.html'],
];

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/* Set CHROMIUM_PATH to point at an existing Chromium instead of the one
   `npx playwright install` would download. */
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const problems = [];
const externalBlocked = new Set();
const note = (m) => problems.push(m);

/* Nothing off-origin is fetched during a run: the only external dependency
   is Google Fonts, and a check that waits on it is slow in a sandbox and
   flaky anywhere. Aborted requests are listed at the end for the record. */
async function isolate(context, blockedExternal) {
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(BASE)) return route.continue();
    blockedExternal.push(url);
    return route.abort();
  });
}

function watch(page, errors, blockedExternal) {
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => {
    if (!r.url().startsWith(BASE)) blockedExternal.push(r.url());
    /* A navigation cancels whatever is still in flight — typically the
       favicon the browser fetches after load. That is the script moving
       on, not a request the server failed. */
    else if (!/ERR_ABORTED/.test((r.failure() || {}).errorText || '')) errors.push('request failed: ' + r.url());
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(BASE)) errors.push('HTTP ' + r.status() + ' ' + r.url());
  });
}

const realErrors = (errors) => errors.filter((e) => !/^Failed to load resource: net::/.test(e));

async function runAxe(page) {
  await page.addScriptTag({ url: BASE + AXE_URL });
  return page.evaluate(
    (tags) => window.axe.run(document, { runOnly: { type: 'tag', values: tags } }).then((r) => r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }))),
    AXE_TAGS
  );
}

for (const [name, path] of PAGES) {
  for (const [label, width, height] of [['desktop', 1280, 900], ['mobile', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    const blockedExternal = [];
    await isolate(ctx, blockedExternal);
    const page = await ctx.newPage();
    watch(page, errors, blockedExternal);

    const response = await page.goto(BASE + path, { waitUntil: 'load' });
    if (name === 'home' && label === 'desktop') {
      const headers = response.headers();
      REQUIRED_HEADERS.forEach((h) => { if (!headers[h]) note(`headers: ${h} missing on ${path}`); });
      if (!/frame-ancestors 'none'/.test(headers['content-security-policy'] || '')) note('headers: CSP lacks frame-ancestors');
    }
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
    // of truth for anything same-origin. A CSP violation is a console error
    // and is reported here.
    const real = realErrors(errors);
    if (real.length) note(`${name}/${label}: console errors: ${real.join(' | ')}`);
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

    // Automated accessibility audit (axe-core, WCAG 2.2 AA tags).
    const violations = await runAxe(page);
    violations.forEach((v) => note(`${name}/${label}: axe ${v.impact} ${v.id} — ${v.help} :: ${v.nodes.join(' ; ')}`));

    await page.screenshot({ path: `${SHOTS}/${name}-${label}.png`, fullPage: label === 'desktop' });
    await ctx.close();
  }
}

/* Every page must fit at 320, 768 and 1440 as well as the two widths above. */
for (const width of [320, 768, 1440]) {
  const wctx = await browser.newContext({ viewport: { width, height: 900 } });
  await isolate(wctx, []);
  const wp = await wctx.newPage();
  for (const [name, path] of PAGES) {
    await wp.goto(BASE + path, { waitUntil: 'load' });
    await wp.waitForTimeout(80);
    const r = await wp.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
    if (r.doc > r.win + 1) note(`${name} @ ${width}px: horizontal overflow ${r.doc} > ${r.win}`);
  }
  await wctx.close();
}
console.log('✓ no horizontal overflow at 320, 390, 768, 1280 or 1440 on any page');

// --- Targeted checks the handoff flagged as real defects ---

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await isolate(ctx, []);
const page = await ctx.newPage();
const pageErrors = [];
watch(page, pageErrors, []);

// Unknown routes answer 404 with the custom page.
const missing = await page.goto(BASE + '/no-such-page/', { waitUntil: 'load' });
if (missing.status() !== 404) note(`404: /no-such-page/ answered ${missing.status()}`);
if (!(await page.textContent('h1')).includes('That page is not here')) note('404: custom page not served');
const noindex404 = await page.evaluate(() => (document.querySelector('meta[name="robots"]') || {}).content);
if (noindex404 !== 'noindex, follow') note('404: page is not noindex');
console.log('✓ unknown route: HTTP 404 with the custom, noindex page');

// The homepage hero photo sits inside the gutter, sharing its right edge
// with the nav and the body copy rather than bleeding off the screen.
const bleedWidths = [390, 768, 1024, 1280, 1440, 1920, 2560];
const bleedResults = [];
for (const w of bleedWidths) {
  const bctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  await isolate(bctx, []);
  const bp = await bctx.newPage();
  await bp.goto(BASE + '/', { waitUntil: 'load' });
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

// Keyboard: the skip link is first, visible when focused, and works; every
// control reached by Tab shows a focus indicator.
await page.goto(BASE + '/', { waitUntil: 'load' });
await page.keyboard.press('Tab');
const skip = await page.evaluate(() => {
  const el = document.activeElement;
  const r = el.getBoundingClientRect();
  return { isSkip: el.classList.contains('n-skip'), visible: r.top >= 0 && r.height > 0, outline: getComputedStyle(el).outlineStyle };
});
if (!skip.isSkip || !skip.visible) note(`keyboard: first Tab did not reach a visible skip link: ${JSON.stringify(skip)}`);
await page.keyboard.press('Enter');
await page.waitForTimeout(100);
const skipped = await page.evaluate(() => window.location.hash === '#main' || document.activeElement === document.getElementById('main'));
if (!skipped) note('keyboard: skip link did not move to #main');
const ringResults = [];
for (let i = 0; i < 12; i++) {
  await page.keyboard.press('Tab');
  const r = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const target = el.matches('.n-chip input') ? el.nextElementSibling : el;
    const cs = getComputedStyle(target);
    return { tag: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''), ok: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 };
  });
  if (r) ringResults.push(r);
}
ringResults.filter((r) => !r.ok).forEach((r) => note(`keyboard: no visible focus indicator on ${r.tag}`));
console.log(`✓ keyboard: skip link works, ${ringResults.length} tabbed controls all show a focus ring`);

/* Every focus ring must contrast with whatever is behind it — the audit
   measured the red ring at 2.0:1 on the evergreen bands. Each control is
   focused from the keyboard state (so :focus-visible applies) and the ring
   colour is compared with the ground found just outside the ring, or with
   the control's own ground when the ring is drawn inside it. */
const FOCUS_PAGES = ['/', '/eat-shop/', '/events/', '/civic/incorporation-election/', '/plan-a-visit/', '/privacy/'];
const lowRings = [];
let ringsChecked = 0;
for (const fpath of FOCUS_PAGES) {
  await page.goto(BASE + fpath, { waitUntil: 'load' });
  await page.keyboard.press('Tab');
  const found = await page.evaluate(() => {
    const parse = (c) => { const m = String(c).match(/[\d.]+/g); return m ? m.slice(0, 4).map(Number) : null; };
    const opaque = (c) => c && (c.length < 4 || c[3] > 0.5);
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const bgOf = (start) => { let n = start; while (n && n !== document.documentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (opaque(c)) return c; n = n.parentElement; } return parse(getComputedStyle(document.body).backgroundColor) || [250, 248, 242]; };
    const groundOutside = (el, r, gap) => {
      const x = r.left - gap; const y = r.top + r.height / 2;
      if (x < 1 || y < 1 || y > window.innerHeight - 1) return bgOf(el.parentElement);
      const stack = document.elementsFromPoint(x, y).filter((n) => n !== el && !el.contains(n));
      return stack.length ? bgOf(stack[0]) : bgOf(el.parentElement);
    };
    const name = (el) => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : '') + ' «' + (el.textContent || el.value || el.type || '').trim().slice(0, 24) + '»';
    const out = { checked: 0, low: [] };
    const controls = Array.from(document.querySelectorAll('a[href], button:not([disabled]), input:not([type="hidden"]):not([tabindex="-1"]), select, textarea, summary'));
    for (const el of controls) {
      if (el.closest('.n-sr') || el.closest('[hidden]')) continue;
      const box = el.getBoundingClientRect();
      if (!box.width && !box.height) continue;
      el.scrollIntoView({ block: 'center' });
      el.focus({ preventScroll: true });
      if (document.activeElement !== el) continue;
      const target = el.matches('.n-chip input') ? el.nextElementSibling : el;
      const cs = getComputedStyle(target);
      out.checked += 1;
      if (cs.outlineStyle === 'none' || parseFloat(cs.outlineWidth) === 0) { out.low.push(name(el) + ' has no ring'); continue; }
      const ring = parse(cs.outlineColor);
      const offset = parseFloat(cs.outlineOffset) || 0;
      const r = target.getBoundingClientRect();
      const own = parse(cs.backgroundColor);
      const ground = offset < 0 ? (opaque(own) ? own : bgOf(target.parentElement)) : groundOutside(target, r, offset + parseFloat(cs.outlineWidth) + 1);
      const c = ratio(ring, ground);
      if (c < 3) out.low.push(name(el) + ' ring ' + cs.outlineColor + ' on rgb(' + ground.slice(0, 3).join(',') + ') = ' + c.toFixed(2) + ':1');
    }
    return out;
  });
  ringsChecked += found.checked;
  [...new Set(found.low)].forEach((f) => lowRings.push(`${fpath} ${f}`));
}
lowRings.forEach((f) => note(`focus: ${f}`));
if (!lowRings.length) console.log(`✓ focus rings: ${ringsChecked} controls across ${FOCUS_PAGES.length} pages, every ring at least 3:1 against its ground`);

// Explore flipped entries must not crush the photo into the 64px numeral track.
await page.goto(BASE + '/explore/', { waitUntil: 'load' });
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
   viewBox, and labels actually readable once rendered. See README. */
const MAP_WIDTHS = [320, 390, 620, 720, 721, 900, 1024, 1199, 1200, 1440, 2560];
let mapMin = Infinity;
for (const width of MAP_WIDTHS) {
  const mctx = await browser.newContext({ viewport: { width, height: 900 } });
  await isolate(mctx, []);
  const mpage = await mctx.newPage();
  await mpage.goto(BASE + '/plan-a-visit/', { waitUntil: 'load' });
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

// --- Directory filtering ---
/* Visible means laid out, not merely lacking the attribute: a display rule
   that beat `hidden` would leave a filtered-out row on screen. */
const visible = () =>
  page.evaluate(() => Array.from(document.querySelectorAll('[data-listing]')).filter((r) => !r.hidden && getComputedStyle(r).display !== 'none').length);
const state = () =>
  page.evaluate(() => ({
    search: window.location.search,
    heading: document.querySelector('[data-dir-heading]').textContent.trim(),
    count: document.querySelector('[data-dir-count]').textContent.trim(),
    checked: (document.querySelector('input[name="category"]:checked') || {}).value,
    emptyShown: !document.querySelector('[data-dir-empty]').hidden,
    listHidden: document.querySelector('[data-dir-list]').hidden,
  }));
const countOf = (slug) => listings.categories.find((c) => c.slug === slug).count;
const labelOf = (slug) => listings.categories.find((c) => c.slug === slug).label;
/* Expectations come from the data, not from a number typed here. The
   haystack matches directory.js field for field. */
const matching = (term, slug = 'all') =>
  listings.entries.filter(
    (e) =>
      (slug === 'all' || e.category === slug) &&
      [e.name, e.categoryLabel, e.description, e.area, e.address].join(' ').toLowerCase().includes(term)
  ).length;
const totalListings = listings.entries.length;

// Semantics: a radio group in a fieldset with a legend, one checked.
await page.goto(BASE + '/eat-shop/', { waitUntil: 'load' });
await page.waitForTimeout(300);
const semantics = await page.evaluate(() => ({
  radios: document.querySelectorAll('fieldset input[type="radio"][name="category"]').length,
  checkboxes: document.querySelectorAll('input[type="checkbox"]').length,
  legend: (document.querySelector('fieldset > legend') || {}).textContent,
  checked: document.querySelectorAll('input[name="category"]:checked').length,
  live: document.querySelector('[data-dir-count]').getAttribute('aria-live'),
}));
if (semantics.radios !== listings.categories.length || semantics.checkboxes !== 0) note(`eat-shop: expected ${listings.categories.length} radios and no checkboxes: ${JSON.stringify(semantics)}`);
if ((semantics.legend || '').trim() !== 'Filter by category') note(`eat-shop: legend is "${semantics.legend}"`);
if (semantics.checked !== 1) note(`eat-shop: ${semantics.checked} radios checked`);
if (semantics.live !== 'polite') note('eat-shop: result count is not aria-live="polite"');
if ((await visible()) !== totalListings) note(`eat-shop: expected ${totalListings} listings on load`);

// URL-driven filtering.
await page.goto(BASE + '/eat-shop/?category=coffee-bakery', { waitUntil: 'load' });
await page.waitForTimeout(300);
let s = await state();
if (s.checked !== 'coffee-bakery' || s.heading !== labelOf('coffee-bakery') || (await visible()) !== countOf('coffee-bakery')) {
  note(`eat-shop: ?category=coffee-bakery did not load the filtered state: ${JSON.stringify(s)}`);
}
if (s.count !== `${countOf('coffee-bakery')} listings`) note(`eat-shop: count label "${s.count}" for coffee-bakery`);
/* Scroll so the filter rail and the first rows are in frame, instantly —
   the page's smooth scrolling would otherwise still be moving. */
await page.evaluate(() => window.scrollTo({ top: document.querySelector('#dir-h').getBoundingClientRect().top + window.scrollY - 110, behavior: 'instant' }));
await page.waitForTimeout(150);
await page.screenshot({ path: `${SHOTS}/eat-shop-filtered-desktop.png`, fullPage: false });

// The filter in force is named, with a reset beside it, and the page opens
// on the search rather than on the photographs.
const order = await page.evaluate(() => ({
  search: document.getElementById('dir-q').getBoundingClientRect().top + window.scrollY,
  firstRow: document.querySelector('[data-listing]:not([hidden])').getBoundingClientRect().top + window.scrollY,
  photos: document.querySelector('.n-pair').getBoundingClientRect().top + window.scrollY,
  lastRow: Array.from(document.querySelectorAll('[data-listing]')).pop().getBoundingClientRect().top + window.scrollY,
  h1: document.querySelector('h1').getBoundingClientRect().bottom + window.scrollY,
}));
if (!(order.search > order.h1 && order.search < order.firstRow)) note(`eat-shop: search is not between the title and the first listing: ${JSON.stringify(order)}`);
if (!(order.photos > order.lastRow)) note('eat-shop: the photographs are not below the listings');
if (order.search - order.h1 > 200) note(`eat-shop: ${Math.round(order.search - order.h1)}px between the title and the search box`);
const strip = await page.evaluate(() => {
  const el = document.querySelector('[data-dir-active]');
  return { shown: !el.hidden && getComputedStyle(el).display !== 'none', label: document.querySelector('[data-dir-active-label]').textContent.trim() };
});
if (!strip.shown || strip.label !== labelOf('coffee-bakery')) note(`eat-shop: active-filter strip wrong for coffee-bakery: ${JSON.stringify(strip)}`);
await page.click('[data-dir-active] [data-dir-clear]');
await page.waitForTimeout(150);
s = await state();
const stripHidden = await page.evaluate(() => document.querySelector('[data-dir-active]').hidden);
if (!stripHidden || (await visible()) !== totalListings || s.search !== '') note(`eat-shop: the strip's Clear filters did not reset: ${JSON.stringify(s)}`);
await page.goto(BASE + '/eat-shop/', { waitUntil: 'load' });
await page.waitForTimeout(200);
if (!(await page.evaluate(() => document.querySelector('[data-dir-active]').hidden))) note('eat-shop: active-filter strip shown with no filter in force');

// Unknown category falls back to all, and the URL is normalised.
await page.goto(BASE + '/eat-shop/?category=bogus', { waitUntil: 'load' });
await page.waitForTimeout(300);
s = await state();
if (s.checked !== 'all' || (await visible()) !== totalListings || s.search !== '') note(`eat-shop: unknown category did not fall back: ${JSON.stringify(s)}`);

// Choosing categories writes the URL; Back and Forward restore the state.
await page.click(`label:has(input[value="restaurants-bars"])`);
await page.waitForTimeout(150);
s = await state();
if (s.search !== '?category=restaurants-bars' || (await visible()) !== countOf('restaurants-bars') || s.heading !== 'Restaurants & Bars') {
  note(`eat-shop: choosing Restaurants & Bars: ${JSON.stringify(s)}`);
}
await page.click(`label:has(input[value="health-wellness"])`);
await page.waitForTimeout(150);
if ((await state()).search !== '?category=health-wellness') note('eat-shop: choosing Health & Wellness did not update the URL');
await page.goBack();
await page.waitForTimeout(250);
s = await state();
if (s.search !== '?category=restaurants-bars' || s.checked !== 'restaurants-bars' || (await visible()) !== countOf('restaurants-bars')) {
  note(`eat-shop: Back did not restore Restaurants & Bars: ${JSON.stringify(s)}`);
}
await page.goForward();
await page.waitForTimeout(250);
s = await state();
if (s.search !== '?category=health-wellness' || s.checked !== 'health-wellness' || (await visible()) !== countOf('health-wellness')) {
  note(`eat-shop: Forward did not restore Health & Wellness: ${JSON.stringify(s)}`);
}

// Search and category coexist.
await page.click(`label:has(input[value="restaurants-bars"])`);
await page.fill('#dir-q', 'pizza');
await page.waitForTimeout(150);
s = await state();
if ((await visible()) !== matching('pizza', 'restaurants-bars')) note(`eat-shop: search within a category showed ${await visible()}, expected ${matching('pizza', 'restaurants-bars')}`);
if (!s.search.includes('category=restaurants-bars') || !s.search.includes('q=pizza')) note(`eat-shop: URL does not carry both filters: ${s.search}`);

// Zero-result state is announced and the hidden rows leave the tree.
await page.fill('#dir-q', 'zzzz');
await page.waitForTimeout(150);
s = await state();
const hiddenFromTree = await page.evaluate(() => Array.from(document.querySelectorAll('[data-listing]')).every((r) => r.hidden && getComputedStyle(r).display === 'none'));
if (!s.emptyShown || !s.listHidden || s.count !== 'No matching businesses' || !hiddenFromTree) note(`eat-shop: zero-result state wrong: ${JSON.stringify(s)}`);
await page.click('[data-dir-clear]');
await page.waitForTimeout(150);
s = await state();
if ((await visible()) !== totalListings || s.search !== '' || s.checked !== 'all') note(`eat-shop: Clear filters did not restore everything: ${JSON.stringify(s)}`);

// Search by street, and plain search.
await page.fill('#dir-q', 'coffee');
await page.waitForTimeout(120);
if ((await visible()) !== matching('coffee')) note(`eat-shop: search "coffee" showed ${await visible()}, expected ${matching('coffee')}`);
await page.fill('#dir-q', 'second avenue');
await page.waitForTimeout(120);
if ((await visible()) !== matching('second avenue')) note(`eat-shop: street search showed ${await visible()}, expected ${matching('second avenue')}`);
await page.fill('#dir-q', '');

// Native radio keyboard behaviour: arrows move within the group, the chip
// shows a focus ring, and Tab leaves the group in one stop.
await page.focus('input[name="category"]:checked');
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(150);
const arrowed = await page.evaluate(() => {
  const el = document.activeElement;
  const chip = el.nextElementSibling;
  const cs = getComputedStyle(chip);
  return { value: el.value, checked: el.checked, ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0, search: window.location.search };
});
if (arrowed.value !== listings.categories[1].slug || !arrowed.checked || !arrowed.ring || arrowed.search !== `?category=${listings.categories[1].slug}`) {
  note(`eat-shop: ArrowDown did not select the next category with a visible focus ring: ${JSON.stringify(arrowed)}`);
}
if ((await visible()) !== countOf(listings.categories[1].slug)) note('eat-shop: ArrowDown did not apply the filter');
await page.keyboard.press('Tab');
const left = await page.evaluate(() => document.activeElement.name !== 'category');
if (!left) note('eat-shop: Tab did not leave the radio group in one stop');
console.log('✓ directory: radio semantics, URL state, back/forward, combined search, zero results and keyboard all behave');

const fctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await isolate(fctx, []);
const fp = await fctx.newPage();
await fp.goto(BASE + '/eat-shop/?category=restaurants-bars', { waitUntil: 'load' });
await fp.waitForTimeout(300);
await fp.evaluate(() => window.scrollTo({ top: document.querySelector('fieldset.n-cats').getBoundingClientRect().top + window.scrollY - 90, behavior: 'instant' }));
await fp.waitForTimeout(150);
await fp.screenshot({ path: `${SHOTS}/eat-shop-filtered-mobile.png` });
await fctx.close();

// --- Calendar ---
await page.goto(BASE + '/events/', { waitUntil: 'load' });
await page.waitForTimeout(400);
const monthNow = await page.textContent('[data-cal-label]');
const expectedMonth = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'America/Denver' }) + ' ' + new Date().toLocaleString('en-US', { year: 'numeric', timeZone: 'America/Denver' });
if (monthNow.trim() !== expectedMonth) note(`events: calendar opened on ${monthNow.trim()}, expected ${expectedMonth}`);
const todayHidden = await page.evaluate(() => document.querySelector('[data-cal-today]').hidden);
if (!todayHidden) note('events: "This month" button visible while on the current month');
const cards = await page.evaluate(() => Array.from(document.querySelectorAll('[data-upcoming] article')).map((a) => a.dataset.eventId + '@' + a.dataset.eventDate));
const expectedCards = upcoming.map((i) => i.key);
if (JSON.stringify(cards) !== JSON.stringify(expectedCards)) note(`events: upcoming cards ${JSON.stringify(cards)} differ from the records ${JSON.stringify(expectedCards)}`);
const noTentative = await page.evaluate(() => !document.querySelector('[data-upcoming] [data-event-status="tentative"]'));
if (!noTentative) note('events: a tentative record reached the upcoming list');

/* The rail belongs to the month on screen: the first day still ahead in
   it, or a note naming that month and pointing at the next date. */
const railState = () =>
  page.evaluate(() => {
    const pressed = document.querySelector('[data-day][aria-pressed="true"]');
    const empty = document.querySelector('[data-cal-detail] [data-cal-empty]');
    const expanded = document.querySelector('[data-cal-detail] h4');
    const pick = document.querySelector('[data-cal-detail] [data-pick][aria-pressed="true"]');
    return {
      label: document.querySelector('[data-cal-label]').textContent.trim(),
      pressed: pressed ? pressed.dataset.iso : null,
      empty: empty ? empty.dataset.calEmpty : null,
      emptyText: empty ? empty.textContent : '',
      expanded: expanded ? expanded.textContent : null,
      pick: pick ? pick.dataset.pick : null,
      picks: document.querySelectorAll('[data-cal-detail] [data-pick]').length,
      text: document.querySelector('[data-cal-detail]').textContent,
      url: window.location.search,
    };
  });
const thisMonth = now.date.slice(0, 7);
const aheadNow = upcoming.filter((i) => i.date.startsWith(thisMonth));
let rail = await railState();
if (aheadNow.length) {
  if (rail.pressed !== aheadNow[0].date || !rail.text.includes(aheadNow[0].event.name)) note(`events: on load the rail should show ${aheadNow[0].date}: ${JSON.stringify({ pressed: rail.pressed, empty: rail.empty })}`);
} else if (rail.empty !== monthNow.trim() || rail.pressed) {
  note(`events: with nothing ahead this month the rail should say so: ${JSON.stringify({ pressed: rail.pressed, empty: rail.empty })}`);
}

/* Page forward until the rail has had to change: it must never keep a day
   from the month that was left. */
const shownMonthOf = (iso) => new Date(iso + 'T12:00:00Z').toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
for (let step = 1; step <= 3; step++) {
  await page.click('[data-cal-next]');
  await page.waitForTimeout(120);
  rail = await railState();
  if (rail.pressed && shownMonthOf(rail.pressed) !== rail.label) note(`events: after ${step} × Next the heading says ${rail.label} but the rail shows ${rail.pressed}`);
  if (!rail.pressed && rail.empty !== rail.label) note(`events: after ${step} × Next, ${rail.label} has no selection and no empty-month note (${JSON.stringify(rail.empty)})`);
  if (rail.pressed) {
    const inst = upcoming.find((i) => i.date === rail.pressed);
    if (!inst || !rail.text.includes(inst.event.name)) note(`events: rail for ${rail.pressed} does not show its event`);
  } else if (upcoming.length && !upcoming.some((i) => rail.emptyText.includes(i.event.name))) {
    note(`events: the empty-month note for ${rail.label} does not point at the next confirmed date`);
  }
}
const shown = await page.evaluate(() => document.querySelector('[data-cal-today]').hidden === false);
if (!shown) note('events: "This month" did not appear after moving off the current month');
await page.click('[data-cal-today]');
await page.waitForTimeout(120);
rail = await railState();
if (rail.label !== monthNow.trim()) note('events: "This month" did not return to the current month');
const disabledNonEvent = await page.evaluate(() => document.querySelector('[data-day][data-has="no"][data-empty="no"]').disabled);
if (!disabledNonEvent) note('events: days without events are not disabled');

if (upcoming.length) {
  /* "View details" in the strip selects that day and that event. */
  const last = upcoming[upcoming.length - 1];
  await page.click(`[data-jump="${last.date}"][data-jump-event="${last.id}"]`);
  await page.waitForTimeout(200);
  rail = await railState();
  if (rail.pressed !== last.date || rail.expanded !== last.event.name) note(`events: View details did not open ${last.id} on ${last.date}: ${JSON.stringify({ pressed: rail.pressed, expanded: rail.expanded })}`);
  if (!rail.url.includes('date=' + last.date) || !rail.url.includes('event=' + encodeURIComponent(last.id))) note(`events: the URL does not carry the selection: ${rail.url}`);
  const focusedCell = await page.evaluate(() => document.activeElement.hasAttribute('data-day'));
  if (!focusedCell) note('events: focus did not move to the selected day');

  /* A deep link from the homepage opens on its day and event. */
  const first = upcoming[0];
  const sameDay = upcoming.filter((i) => i.date === first.date);
  await page.goto(BASE + '/events/?date=' + first.date + '&event=' + encodeURIComponent(first.id) + '#cal-h', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  rail = await railState();
  if (rail.pressed !== first.date || rail.expanded !== first.event.name) note(`events: deep link did not select ${first.id}: ${JSON.stringify({ pressed: rail.pressed, expanded: rail.expanded })}`);
  if (sameDay.length > 1) {
    if (rail.picks !== sameDay.length || rail.pick !== first.id) note(`events: a day with ${sameDay.length} events should list them with ${first.id} chosen: ${JSON.stringify({ picks: rail.picks, pick: rail.pick })}`);
    const other = sameDay.find((i) => i.id !== first.id);
    await page.click(`[data-pick="${other.id}"]`);
    await page.waitForTimeout(150);
    rail = await railState();
    if (rail.expanded !== other.event.name || rail.pick !== other.id || !rail.url.includes('event=' + encodeURIComponent(other.id))) note(`events: choosing ${other.id} in the day list did not expand it: ${JSON.stringify({ expanded: rail.expanded, pick: rail.pick, url: rail.url })}`);
    const focusedPick = await page.evaluate(() => document.activeElement.hasAttribute('data-pick'));
    if (!focusedPick) note('events: focus did not stay on the chosen event');
  }
  /* A deep link to a day with nothing on it opens the calendar as usual. */
  await page.goto(BASE + '/events/?date=2031-01-01&event=nothing', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  rail = await railState();
  if (rail.label !== monthNow.trim()) note(`events: a deep link to an empty day moved the calendar to ${rail.label}`);
}
console.log(`✓ calendar: opens on ${monthNow.trim()}, the rail follows the month, cards match the records, deep links and the day list select the event`);
await page.screenshot({ path: `${SHOTS}/events-selected.png` });

/* The homepage cards open the calendar on their own day and event. */
await page.goto(BASE + '/', { waitUntil: 'load' });
await page.waitForTimeout(300);
const homeLinks = await page.evaluate(() => Array.from(document.querySelectorAll('[data-upcoming] article')).map((a) => ({ id: a.dataset.eventId, date: a.dataset.eventDate, href: (a.querySelector('a') || {}).getAttribute('href') })));
homeLinks.forEach((l) => {
  if (l.href !== '/events/?date=' + l.date + '&event=' + encodeURIComponent(l.id) + '#cal-h') note(`home: card ${l.id} links to ${l.href}`);
});
if (homeLinks.length) console.log(`✓ home: ${homeLinks.length} event cards deep-link to their day and event`);

// --- Forms: labels, and server-side field errors announced and associated ---
await page.goto(BASE + '/plan-a-visit/', { waitUntil: 'load' });
const unlabelled = await page.evaluate(() =>
  Array.from(document.querySelectorAll('form input:not([type="hidden"]), form select, form textarea'))
    .filter((el) => !(el.labels && el.labels.length) && !el.getAttribute('aria-label'))
    .map((el) => el.name)
);
unlabelled.forEach((n) => note(`plan-a-visit: field "${n}" has no label`));
const autocompletes = await page.evaluate(() => Array.from(document.querySelectorAll('input[type="email"]')).map((i) => i.getAttribute('autocomplete')));
if (!autocompletes.every((a) => a === 'email')) note(`plan-a-visit: email inputs lack autocomplete="email": ${autocompletes}`);
const honeypot = await page.evaluate(() => {
  const el = document.getElementById('v-company');
  const wrap = el.closest('[aria-hidden="true"]');
  const r = wrap ? wrap.getBoundingClientRect() : el.getBoundingClientRect();
  const cs = wrap ? getComputedStyle(wrap) : null;
  return {
    tabindex: el.getAttribute('tabindex'),
    hidden: !!wrap,
    clipped: !!cs && r.width <= 1 && r.height <= 1 && cs.overflow === 'hidden',
    autocomplete: el.getAttribute('autocomplete'),
  };
});
if (honeypot.tabindex !== '-1' || !honeypot.hidden || !honeypot.clipped || honeypot.autocomplete !== 'off') note(`plan-a-visit: honeypot is exposed: ${JSON.stringify(honeypot)}`);
await page.route('**/api/contact', (route) =>
  route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ ok: false, message: 'That email address does not look right.', errors: [{ field: 'email', message: 'That email address does not look right.' }] }),
  })
);
await page.fill('#v-name', 'Verification run');
await page.fill('#v-detail', 'Automated check — nothing is sent; the endpoint is mocked.');
await page.fill('#v-email', 'someone@example.com');
await page.click('form[action="/api/contact"] button[type="submit"]');
await page.waitForTimeout(400);
const fieldError = await page.evaluate(() => {
  const email = document.getElementById('v-email');
  const described = document.getElementById(email.getAttribute('aria-describedby') || '');
  return {
    invalid: email.getAttribute('aria-invalid'),
    described: described ? described.textContent : null,
    alert: (document.querySelector('[role="alert"]') || {}).textContent,
    focused: document.activeElement === email,
  };
});
if (fieldError.invalid !== 'true' || !fieldError.described || !fieldError.alert || !fieldError.focused) note(`plan-a-visit: field error not associated and announced: ${JSON.stringify(fieldError)}`);
await page.unroute('**/api/contact');
console.log('✓ forms: every field labelled, email autocomplete set, honeypot hidden, server errors tied to their field');

// --- Mobile menu ---
const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
await isolate(m, []);
const mp = await m.newPage();
await mp.goto(BASE + '/', { waitUntil: 'load' });
const navHiddenAtStart = await mp.evaluate(() => getComputedStyle(document.querySelector('.n-nav')).display === 'none');
if (!navHiddenAtStart) note('mobile: nav is not collapsed below 1080px');
await mp.focus('.n-burger');
await mp.keyboard.press('Enter');
await mp.waitForTimeout(150);
const opened = await mp.evaluate(() => ({
  shown: getComputedStyle(document.querySelector('.n-nav')).display !== 'none',
  expanded: document.querySelector('.n-burger').getAttribute('aria-expanded'),
  label: document.querySelector('.n-burger').getAttribute('aria-label'),
}));
if (!opened.shown || opened.expanded !== 'true' || opened.label !== 'Close menu') note(`mobile: menu open state wrong: ${JSON.stringify(opened)}`);
await mp.keyboard.press('Tab');
const intoMenu = await mp.evaluate(() => document.activeElement.closest('.n-nav') !== null);
if (!intoMenu) note('mobile: Tab from the open menu button did not move into the menu');
await mp.screenshot({ path: `${SHOTS}/mobile-menu.png` });
await mp.keyboard.press('Escape');
await mp.waitForTimeout(150);
const closed = await mp.evaluate(() => ({
  shown: getComputedStyle(document.querySelector('.n-nav')).display !== 'none',
  expanded: document.querySelector('.n-burger').getAttribute('aria-expanded'),
  label: document.querySelector('.n-burger').getAttribute('aria-label'),
  focused: document.activeElement.classList.contains('n-burger'),
}));
if (closed.shown || closed.expanded !== 'false' || closed.label !== 'Open menu' || !closed.focused) note(`mobile: Escape did not close, reset the label and restore focus: ${JSON.stringify(closed)}`);
console.log('✓ mobile menu: collapses, toggles aria state and label, Tab enters it, Escape closes and restores focus');

/* Without a script the menu cannot open, so the list is shown in full and
   the button that could not open it is not. */
const nojs = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
await isolate(nojs, []);
const np = await nojs.newPage();
await np.goto(BASE + '/', { waitUntil: 'load' });
const fallback = await np.evaluate(() => ({
  nav: getComputedStyle(document.querySelector('.n-nav')).display,
  burger: getComputedStyle(document.querySelector('.n-burger')).display,
  links: Array.from(document.querySelectorAll('.n-nav a')).filter((a) => a.getBoundingClientRect().height > 0).length,
  overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
}));
if (fallback.nav === 'none' || fallback.burger !== 'none' || fallback.links < 7 || fallback.overflow) note(`mobile: no-script navigation fallback wrong: ${JSON.stringify(fallback)}`);
else console.log('✓ mobile: without JavaScript the navigation is shown in full');
await nojs.close();

/* Sticky rails are for two-column layouts. Once a page stacks into one
   column the rail has nothing to scroll against and pins itself on top of
   the content it belongs to. Below the breakpoint the sticky header is the
   only sticky thing. */
const MOBILE_PAGES = PAGES.filter(([n]) => n !== '404').map(([, p]) => p);
const stuck = [];
for (const path of MOBILE_PAGES) {
  await mp.goto(BASE + path, { waitUntil: 'load' });
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
   than clipped. */
await mp.goto(BASE + '/events/', { waitUntil: 'load' });
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
  await mp.goto(BASE + path, { waitUntil: 'load' });
  await mp.waitForTimeout(200);
  const found = await mp.evaluate(() =>
    Array.from(document.querySelectorAll('button, .n-btn, .n-link, input:not([tabindex="-1"]):not([type="radio"]), .n-chip-l, select, textarea, .n-crumbs a, .n-foot a'))
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

/* The 404 probe and the mocked 400 from the endpoint are expected here. */
const pageReal = realErrors(pageErrors).filter(
  (e) => !/no-such-page|api\/contact|^Failed to load resource: the server responded with a status of (400|404)/.test(e)
);
if (pageReal.length) note(`targeted checks: console errors: ${pageReal.join(' | ')}`);

await ctx.close();
await browser.close();
server.close();

console.log('\n' + '='.repeat(60));
if (externalBlocked.size) {
  console.log('Note — off-origin requests aborted by this script, not a site defect:');
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
