/* Last-modified dates for the sitemap, from git.

   A page's date is the most recent commit touching its template or any of
   the data files it renders. When git is unavailable or a file has no
   commit yet (a fresh checkout without history, an uncommitted page), the
   build date is used instead, which is never earlier than the truth. */
import { execFileSync } from 'node:child_process';

const cache = new Map();

export function gitLastmod(paths, fallback = new Date()) {
  const key = paths.join('|');
  if (cache.has(key)) return cache.get(key);
  let value = null;
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...paths], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (out) value = out;
  } catch {
    value = null;
  }
  const iso = (value ? new Date(value) : fallback).toISOString().slice(0, 10);
  cache.set(key, iso);
  return iso;
}
