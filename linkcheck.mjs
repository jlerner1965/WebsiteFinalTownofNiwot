/* External link check against the built site in _site/.

   Run `npm run build` first, then `node linkcheck.mjs`. Every external
   href in the built HTML is requested once (GET, following redirects, with
   a browser-like User-Agent, because several small-business hosts refuse
   HEAD or anonymous clients) and anything that does not answer 2xx is
   listed with the pages that link to it. Exits non-zero on any finding.

   Needs an unrestricted network. A sandbox that blocks outbound traffic
   reports every link as failed, which is a fact about the sandbox. */
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '_site');
const CONCURRENCY = 6;
const TIMEOUT_MS = 20000;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 townofniwot-linkcheck';

async function htmlFiles(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    if ((await stat(full)).isDirectory()) out.push(...(await htmlFiles(full)));
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

const links = new Map(); /* url → Set of pages */
for (const file of await htmlFiles(ROOT)) {
  const page = file.slice(ROOT.length).replace(/index\.html$/, '') || '/';
  const html = await readFile(file, 'utf8');
  for (const [, href] of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const url = href.replace(/&amp;/g, '&');
    if (!links.has(url)) links.set(url, new Set());
    links.get(url).add(page);
  }
}

async function check(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal, headers: { 'user-agent': UA, accept: 'text/html,*/*' } });
    return { url, status: res.status, final: res.url !== url ? res.url : null };
  } catch (error) {
    return { url, status: 0, error: error && (error.cause ? error.cause.message : error.message) };
  } finally {
    clearTimeout(timer);
  }
}

const queue = [...links.keys()];
const results = [];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) results.push(await check(queue.shift()));
  })
);
results.sort((a, b) => a.url.localeCompare(b.url));

const failed = results.filter((r) => r.status < 200 || r.status >= 300);
const redirected = results.filter((r) => r.final && r.status >= 200 && r.status < 300);

console.log(`${results.length} external links checked from ${ROOT}`);
for (const r of redirected) console.log(`  ↪ ${r.url} → ${r.final}`);
if (failed.length) {
  console.log(`\n${failed.length} FAILED:`);
  for (const r of failed) {
    console.log(`  ✗ ${r.status || r.error}  ${r.url}`);
    console.log(`      linked from ${[...links.get(r.url)].join(', ')}`);
  }
  process.exitCode = 1;
} else {
  console.log('All external links answer 2xx.');
}
