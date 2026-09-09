/* Site-wide configuration. Everything a deploy needs to change lives here. */
export default {
  name: 'TownofNiwot.com',
  shortName: 'Niwot',
  tagline: 'An independent community guide to Niwot, Colorado.',

  /* Canonical origin, used for canonical URLs and Open Graph tags. */
  url: 'https://townofniwot.com',

  /* The submission and newsletter forms POST to /api/contact, a Vercel
     Function. Its destination and provider key are environment variables,
     not build-time config, so they never enter the repository — see
     api/contact.js for the list. Until they are set the endpoint returns 503
     and the forms say so rather than swallowing what somebody typed. */

  /* Editorial stamps. `reviewed` is the sitewide content review; `verified` is
     the stricter, dated check applied to the election page only. */
  reviewed: 'September 2026',
  verified: 'September 8, 2026',

  /* The responsible editor and a monitored address. As soon as both are
     set here they are published on the privacy page, beside the submission
     form and in the footer; until then those pages say the form is the only
     route. Publishing an address nobody reads would be worse than none, so
     they stay null until the owner has confirmed one. */
  editor: {
    name: null,
    email: null,
  },

  /* Required verbatim in the footer of every page. This is an editorial rule,
     not a preference: the site publishes civic information during a live
     election and must not be mistaken for an official source. */
  disclaimer:
    'TownofNiwot.com is an independent community guide. It is not a municipal government website, the Niwot Election Commission, Boulder County, or an incorporation campaign.',
};
