/* Per-page computed data shared by every template. */
import path from 'node:path';
import site from './site.js';
import corrections from './corrections.js';
import { gitLastmod } from '../../lib/lastmod.js';
import { buildNow } from '../../lib/events.js';

/* Data files each page renders, for the sitemap's <lastmod>. */
const CORRECTIONS = 'src/_data/corrections.js';
const DEPS = {
  'index.njk': ['src/_data/events.js', 'src/_data/listings.js', 'src/_data/organizations.js'],
  'eat-shop.njk': ['src/_data/listings.js', CORRECTIONS],
  'events.njk': ['src/_data/events.js', CORRECTIONS],
  'community.njk': ['src/_data/organizations.js', 'src/_data/services.js', CORRECTIONS],
  'our-story.njk': ['src/_data/eras.js', CORRECTIONS],
  'incorporation-election.njk': ['src/_data/election.js', 'src/_data/site.js', CORRECTIONS],
  'privacy.njk': [CORRECTIONS],
};

const previewBuild = Boolean(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production');
const pinned = Boolean(process.env.NIWOT_NOW || process.env.NIWOT_TODAY);

export default {
  /* True on Vercel preview and branch deployments: pages carry noindex and
     robots.txt disallows everything, so a preview URL never competes with
     the production domain. */
  previewBuild: () => previewBuild,

  /* Only when a build is pinned to a date for testing; production pages
     leave it unset and the browser uses the real clock. */
  eventsNow: () => (pinned ? buildNow().toISOString() : null),

  /* The dated corrections that belong to this page, newest first. Our
     Story renders the whole log; other pages render their own entries. */
  pageCorrections: (data) => (data.page && data.page.url ? corrections.filter((c) => c.page === data.page.url) : []),

  lastmod: (data) => {
    if (!data.page || !data.page.inputPath) return null;
    const input = data.page.inputPath.replace(/^\.\//, '');
    const deps = data.lastmodDeps || DEPS[path.basename(input)] || [];
    return gitLastmod([input, ...deps]);
  },

  /* Home › Page, for every indexable page except the homepage. The visible
     trail in the layout and the BreadcrumbList are built from this list. */
  breadcrumbs: (data) => {
    if (!data.page || !data.page.url || data.page.url === '/' || data.noindex) return null;
    const items = [
      { name: 'Home', url: '/' },
      { name: data.crumbLabel || data.title, url: data.page.url },
    ];
    return {
      items,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: site.url + item.url,
        })),
      },
    };
  },
};
