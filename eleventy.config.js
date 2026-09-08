import Image from '@11ty/eleventy-img';
import path from 'node:path';

/* Responsive photographs.

   Sources are the licensed originals in src/assets/photos. Each is emitted as
   AVIF, WebP and JPEG at several widths; the browser picks one from `sizes`.
   eleventy-img never upscales, so old-town-aerial.jpg (547px wide) simply
   yields fewer variants than the rest.

   The originals stay published because the Open Graph tags point at them —
   social scrapers want a stable JPEG URL, and they are not fetched by
   ordinary page visitors. */
const WIDTHS = [400, 700, 1000, 1400, 1800];

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
    sharpWebpOptions: { quality: 76 },
    sharpAvifOptions: { quality: 62 },
  });

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

  eleventyConfig.addPassthroughCopy({ 'src/assets/photos': 'assets/photos' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/css': 'assets/css' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/js': 'assets/js' });
  eleventyConfig.addPassthroughCopy({ 'src/robots.txt': 'robots.txt' });
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
