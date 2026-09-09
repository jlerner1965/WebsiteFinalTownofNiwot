/* Lighthouse against the built site in _site/.

   Run `npm run build` first, then `node lighthouse.mjs`. Serves _site with
   the vercel.json headers and audits the main pages on desktop, printing the
   four category scores. Exits non-zero if any page misses the targets:
   Performance 90, Accessibility 100, Best Practices 95, SEO 95.

   Google Fonts is blocked for the run (BLOCKED below) so the score does not
   depend on the network of the machine running it; the production site does
   load the fonts, so treat the performance number as a floor for the rest of
   the page, not a measurement of the font request. */
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '_site');
const PORT = 8098;
const ALL_PAGES = ['/', '/eat-shop/', '/events/', '/privacy/', '/civic/incorporation-election/', '/plan-a-visit/'];
/* LH_PAGES="/,/eat-shop/" limits a run to some pages. */
const PAGES = process.env.LH_PAGES ? process.env.LH_PAGES.split(',') : ALL_PAGES;
const TARGETS = { performance: 90, accessibility: 100, 'best-practices': 95, seo: 95 };
const BLOCKED = ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*'];

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.avif': 'image/avif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' };
const vercel = JSON.parse(await readFile(join(HERE, 'vercel.json'), 'utf8'));
const rules = vercel.headers.map((rule) => ({ test: new RegExp('^' + rule.source.replace(/\//g, '\\/') + '$'), headers: rule.headers }));

const server = createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  rules.forEach((r) => { if (r.test.test(p)) r.headers.forEach((h) => res.setHeader(h.key, h.value)); });
  let file = join(ROOT, p);
  let status = 200;
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(ROOT, '404.html');
    status = 404;
  }
  try {
    let body = await readFile(file);
    const type = TYPES[extname(file)] || 'application/octet-stream';
    const headers = { 'content-type': type };
    /* Vercel serves text compressed (Brotli or gzip); measure the same way. */
    if (/^(text\/|application\/(xml|json))/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '')) {
      body = gzipSync(body);
      headers['content-encoding'] = 'gzip';
    }
    res.writeHead(status, headers);
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(PORT, r));

const chrome = await launch({
  chromePath: process.env.CHROMIUM_PATH || process.env.CHROME_PATH,
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

let failed = false;
const rows = [];
try {
  for (const path of PAGES) {
    const result = await lighthouse(`http://localhost:${PORT}${path}`, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: Object.keys(TARGETS),
      blockedUrlPatterns: BLOCKED,
      formFactor: 'desktop',
      screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
      throttlingMethod: 'simulate',
    });
    const scores = Object.fromEntries(Object.entries(result.lhr.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
    const misses = Object.entries(TARGETS).filter(([k, min]) => scores[k] < min).map(([k]) => k);
    if (misses.length) failed = true;
    rows.push({ path, ...scores, misses: misses.join(', ') || '' });
    if (misses.length) {
      for (const cat of misses) {
        const audits = result.lhr.categories[cat].auditRefs
          .map((ref) => result.lhr.audits[ref.id])
          .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative')
          .map((a) => `${a.id} (${a.score})`);
        console.log(`  ${path} ${cat}: ${audits.join(', ')}`);
      }
    }
  }
} finally {
  await chrome.kill();
  server.close();
}

console.table(rows);
/* A page with no images and one stylesheet measures the machine more than
   the site. When it cannot reach the mid-90s, the CPU running Lighthouse is
   the ceiling for every other page too; confirm the numbers on production
   hardware (PageSpeed Insights) before reading a miss as a site defect. */
const plain = rows.find((r) => r.path === '/privacy/');
if (plain && plain.performance < 95) {
  console.log(`Note: the text-only privacy page scored ${plain.performance} — this machine's CPU caps the performance score near there for every page.`);
}
if (failed) {
  console.log('Targets missed: Performance 90, Accessibility 100, Best Practices 95, SEO 95.');
  process.exitCode = 1;
} else {
  console.log('All pages meet the Lighthouse targets.');
}
