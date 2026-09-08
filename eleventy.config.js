export default function (eleventyConfig) {
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
