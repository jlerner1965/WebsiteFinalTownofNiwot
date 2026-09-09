import Image from '@11ty/eleventy-img';
import path from 'node:path';
import { buildAssetManifest, writeAssets, assertHashedOnly } from './lib/assets.js';

/* Responsive photographs.

   Sources are the licensed originals in src/assets/photos. Each is emitted as
   AVIF, WebP and JPEG at several widths; the browser picks one from `sizes`.
   eleventy-img never upscales, so old-town-aerial.jpg (547px wide) simply
   yields fewer variants than the rest.

   The originals stay published because the Open Graph tags point at them —
   social scrapers want a stable JPEG URL, and they are not fetched by
   ordinary page visitors. */
const WIDTHS = [400, 560, 700, 1000, 1400, 1800];

/* The eager photographs on a page are its largest-contentful-paint
   candidates, so the layout preloads them: the browser starts the download
   from the <head> instead of after it has parsed down to the <picture>. At
   most two per page (the directory opens on a pair); more would only
   compete with each other. */
const PRELOADS_PER_PAGE = 2;
const preloads = new Map();

async function responsiveImage(file, alt, sizes, style, eager = false) {
  if (alt === undefined) {
    throw new Error(`Missing alt text for ${file} — every photograph on this site carries one.`);
  }

  const metadata = await Image(path.join('src/assets/photos', file), {
    widths: WIDTHS,
    formats: ['avif', 'webp', 'jpeg'],
    outputDir: '_site/img/',
    urlPath: '/img/',
    sharpJpegOptions: { quality: 78, mozjpeg: true },
    sharpWebpOptions: { quality: 74 },
    sharpAvifOptions: { quality: 58 },
  });

  const key = this && this.page ? this.page.inputPath : null;
  if (eager && key) {
    const list = preloads.get(key) || [];
    if (list.length < PRELOADS_PER_PAGE) {
      const srcset = metadata.avif.map((entry) => entry.srcset).join(', ');
      list.push(`<link rel="preload" as="image" type="image/avif" imagesrcset="${srcset}" imagesizes="${sizes}" fetchpriority="high">`);
      preloads.set(key, list);
    }
  }

  return Image.generateHTML(metadata, {
    alt,
    sizes,
    style,
    loading: eager ? 'eager' : 'lazy',
    decoding: 'async',
    ...(eager ? { fetchpriority: 'high' } : {}),
  });
}

export default function (eleventyConfig) {
  eleventyConfig.addAsyncShortcode('photo', responsiveImage);
  /* Rendered in <head> by the layout, after the page content has run its
     photo shortcodes — Eleventy renders content before layouts. */
  eleventyConfig.addShortcode('lcpPreload', function () {
    return ((this && this.page && preloads.get(this.page.inputPath)) || []).join('\n');
  });
  eleventyConfig.on('eleventy.before', () => preloads.clear());

  /* CSS and JavaScript are content-hashed (lib/assets.js) rather than
     passed through, so they can be served with an immutable cache policy.
     The manifest is rebuilt before every build, including each rebuild in
     --serve. */
  let manifest = buildAssetManifest();
  eleventyConfig.on('eleventy.before', ({ dir }) => {
    manifest = buildAssetManifest();
    writeAssets(manifest, dir.output);
  });
  eleventyConfig.on('eleventy.after', ({ dir }) => {
    assertHashedOnly(dir.output);
  });
  eleventyConfig.addFilter('asset', (url) => {
    const entry = manifest.get(url);
    if (!entry) throw new Error(`Unknown asset ${url} — it must live in src/assets/css or src/assets/js`);
    return entry.url;
  });
  eleventyConfig.addWatchTarget('src/assets/css/');
  eleventyConfig.addWatchTarget('src/assets/js/');

  eleventyConfig.addPassthroughCopy({ 'src/assets/photos': 'assets/photos' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/favicon.svg': 'favicon.svg' });

  // Directions links are composed the same way everywhere on the site.
  eleventyConfig.addFilter('directions', (query) =>
    'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(query)
  );

  /* JSON destined for a <script> element. Escaping `<` keeps a value that
     happens to contain "</script>" from closing the element early. */
  eleventyConfig.addFilter('jsonify', (value) =>
    JSON.stringify(value).replace(/</g, '\\u003c')
  );

  eleventyConfig.addFilter('isoDate', (value) => new Date(value).toISOString().slice(0, 10));

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      data: '_data',
    },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
  };
}
