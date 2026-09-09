/* Content-hashed CSS and JavaScript.

   Each file in src/assets/css and src/assets/js is written to _site under a
   name carrying the first ten hex digits of its SHA-256, so a changed file
   gets a new URL and the old one can be cached forever. Relative imports
   between the modules are rewritten to the hashed names first, in
   dependency order, so a change deep in calendar-core.js renames every
   module that imports it. The templates never mention a hash: the `asset`
   filter maps the source path to the output path. */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const HASH_LENGTH = 10;
export const HASHED_NAME = /\.[0-9a-f]{10}\.(css|js)$/;

function hashOf(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, HASH_LENGTH);
}

export function buildAssetManifest(root = process.cwd()) {
  const manifest = new Map(); /* '/assets/js/x.js' → { url, code } */

  const jsDir = path.join(root, 'src/assets/js');
  const jsFiles = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'));
  const sources = new Map(jsFiles.map((f) => [f, fs.readFileSync(path.join(jsDir, f), 'utf8')]));
  const resolved = new Map();

  function resolve(file, stack = []) {
    if (resolved.has(file)) return resolved.get(file);
    if (stack.includes(file)) throw new Error(`Circular import: ${[...stack, file].join(' → ')}`);
    const source = sources.get(file);
    if (source === undefined) throw new Error(`${stack[stack.length - 1]} imports ./${file}, which does not exist`);
    const code = source.replace(
      /((?:from|import)\s*\(?\s*)(['"])\.\/([\w.-]+\.js)\2/g,
      (match, prefix, quote, dep) => prefix + quote + './' + resolve(dep, [...stack, file]).name + quote
    );
    const name = file.replace(/\.js$/, '.' + hashOf(code) + '.js');
    const entry = { name, code };
    resolved.set(file, entry);
    return entry;
  }

  for (const file of jsFiles) {
    const entry = resolve(file);
    manifest.set('/assets/js/' + file, { url: '/assets/js/' + entry.name, code: entry.code });
  }

  const cssDir = path.join(root, 'src/assets/css');
  for (const file of fs.readdirSync(cssDir).filter((f) => f.endsWith('.css'))) {
    const code = fs.readFileSync(path.join(cssDir, file), 'utf8');
    const name = file.replace(/\.css$/, '.' + hashOf(code) + '.css');
    manifest.set('/assets/css/' + file, { url: '/assets/css/' + name, code });
  }

  return manifest;
}

/* Write the hashed files and remove anything else in those two output
   directories, so a stale unhashed file can never sit under the immutable
   cache rule. */
export function writeAssets(manifest, outputDir) {
  const wanted = new Set();
  for (const { url, code } of manifest.values()) {
    const target = path.join(outputDir, url);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, code);
    wanted.add(path.resolve(target));
  }
  for (const dir of ['assets/css', 'assets/js']) {
    const full = path.join(outputDir, dir);
    if (!fs.existsSync(full)) continue;
    for (const file of fs.readdirSync(full)) {
      const target = path.resolve(full, file);
      if (!wanted.has(target)) fs.rmSync(target, { recursive: true, force: true });
    }
  }
}

/* Every file under the immutable directories must carry a hash. */
export function assertHashedOnly(outputDir) {
  const offenders = [];
  for (const dir of ['assets/css', 'assets/js']) {
    const full = path.join(outputDir, dir);
    if (!fs.existsSync(full)) continue;
    for (const file of fs.readdirSync(full)) {
      if (!HASHED_NAME.test(file)) offenders.push(dir + '/' + file);
    }
  }
  if (offenders.length) {
    throw new Error(`Unhashed files under an immutable cache path: ${offenders.join(', ')}`);
  }
}
