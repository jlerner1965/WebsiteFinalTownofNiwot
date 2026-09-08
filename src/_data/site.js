/* Site-wide configuration. Everything a deploy needs to change lives here. */
export default {
  name: 'TownofNiwot.com',
  shortName: 'Niwot',
  tagline: 'An independent community guide to Niwot, Colorado.',

  /* Canonical origin, used for canonical URLs and Open Graph tags. */
  url: 'https://townofniwot.com',

  /* Destination for the submission and newsletter forms.
     These forms compose a mailto: link, which is a stopgap — see README.md,
     "What still needs building". While this is empty the forms say so plainly
     rather than silently discarding what somebody typed. */
  contactEmail: '',

  /* Editorial stamps. `reviewed` is the sitewide content review; `verified` is
     the stricter, dated check applied to the election page only. */
  reviewed: 'September 2026',
  verified: 'September 8, 2026',

  /* Required verbatim in the footer of every page. This is an editorial rule,
     not a preference: the site publishes civic information during a live
     election and must not be mistaken for an official source. */
  disclaimer:
    'TownofNiwot.com is an independent community guide. It is not a municipal government website, the Niwot Election Commission, Boulder County, or an incorporation campaign.',
};
