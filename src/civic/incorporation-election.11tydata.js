export default {
  eleventyComputed: {
    /* The election page carries the stricter dated stamp rather than the
       sitewide review date. */
    footMetaLeft: (data) => 'Last verified ' + data.site.verified,
  },
};
