/* Sweep viewport widths looking for horizontal overflow on every page. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '_site');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  let file = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch { res.writeHead(404); return res.end(); }
  try {
    const b = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(b);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(8097, r));

const WIDTHS = [320, 360, 375, 390, 414, 480, 540, 560, 600, 620, 700, 768, 820, 900, 960, 1000, 1024, 1080, 1200, 1280, 1366, 1440, 1512, 1600, 1920, 2560];
const PAGES = ['/', '/explore/', '/eat-shop/', '/events/', '/community/', '/our-story/', '/civic/incorporation-election/', '/plan-a-visit/', '/404.html'];

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const findings = [];

for (const path of PAGES) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:8097' + path, { waitUntil: 'load' });
    await page.waitForTimeout(120);

    const result = await page.evaluate(() => {
      const doc = document.documentElement;
      const win = window.innerWidth;
      const over = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.right > win + 1 || r.left < -1) {
          over.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.getAttribute('class') || '').slice(0, 42),
            left: Math.round(r.left),
            right: Math.round(r.right),
          });
        }
      }
      return { scrollWidth: doc.scrollWidth, win, bodyScroll: document.body.scrollWidth, over: over.slice(0, 6) };
    });

    const scrolls = result.scrollWidth > result.win + 1;
    if (scrolls || result.over.length) {
      findings.push({ path, width, ...result, scrolls });
    }
    await ctx.close();
  }
}

await browser.close();
server.close();

if (!findings.length) {
  console.log('No horizontal overflow at any tested width.');
} else {
  for (const f of findings) {
    const flag = f.scrolls ? 'SCROLLS' : 'paints past edge';
    console.log(`${f.path} @ ${f.width}px — ${flag} (scrollWidth ${f.scrollWidth} vs window ${f.win})`);
    for (const o of f.over) console.log(`    ${o.tag}.${o.cls}  left=${o.left} right=${o.right}`);
  }
  console.log(`\n${findings.length} width/page combination(s) with something past the edge.`);
}
