# TownofNiwot.com

An independent community guide to Niwot, Colorado — an unincorporated community
in Boulder County, between Boulder and Longmont.

Nine static pages serving two audiences at once: residents who need to know
which agency handles which service, and visitors deciding whether to make the
drive. It also carries neutral voter information for the November 3, 2026
incorporation election, which is why parts of it are held to a stricter
editorial standard than a typical destination site.

## Running it

```bash
npm install
npm start          # dev server with live reload, http://localhost:8080
npm run build      # static output into _site/
npm test           # data validation, event logic, endpoint and built-site checks
npm run verify     # browser checks against _site/ (see "Verification")
npm run check      # build, test and verify in one go
npm run links      # every external link in _site/ answers 2xx (needs an open network)
node lighthouse.mjs   # Lighthouse against _site/, six pages on desktop
```

The two September 2026 pre-launch audits — what was checked, what was fixed
and what still needs a person — are recorded in `PRE-LAUNCH-AUDIT.md`. The
second, an external review of the live site, is the source of most of the
"needs a human" items below.

Output is plain static HTML in `_site/`. It needs no server-side runtime and
deploys to any static host; the one function (`api/contact.js`) is a Vercel
Function for the two forms.

`verify.mjs` and `lighthouse.mjs` need a Chromium. `npx playwright install
chromium` fetches one, or set `CHROMIUM_PATH` to an existing binary.
Screenshots land in `.verify-shots/` unless `SHOTS_DIR` says otherwise.

## Stack

[Eleventy 3](https://www.11ty.dev/) with Nunjucks templates. No framework, no
client-side router, no bundler. CSS and JavaScript are content-hashed at build
time (`lib/assets.js`) so they can be cached forever; that is the whole build
step for them.

The site is mostly static content with three small pieces of interactive
state, so a generator that emits plain HTML is the right size for it. The only
JavaScript that ships is the mobile menu, the directory filter, the calendar
and the forms — each a small module, none of them required to read the page.

```
src/
  _data/            Content and configuration (see "Content model")
  _includes/
    layouts/base.njk   Head, chrome, breadcrumbs, structured data
    partials/          Header and footer
  assets/
    css/guide.css      Palette, chrome, grids, graphic devices
    js/                Mobile menu, calendar, directory, forms
    photos/            Eight licensed photographs
  *.njk               One file per page
lib/
  directory.js      Directory schema, validation and publication
  events.js         Event schema, validation and Event structured data
  assets.js         Content hashing for CSS and JS
  lastmod.js        Sitemap dates from git
api/contact.js      Form endpoint (Vercel Function)
test/               node:test suites (data, events, endpoint, built site)
eleventy.config.js
vercel.json         Redirects, security headers, cache policy
verify.mjs          Browser checks against the built site
lighthouse.mjs      Lighthouse against the built site
linkcheck.mjs       External link check against the built site
```

Page-specific CSS stays in each page's `pageStyles` front matter and is
inlined into `<head>`, so a page paints without waiting on a second stylesheet.
Shared identity lives in `guide.css`.

## Content model

Everything editable lives in `src/_data/`. No content is hardcoded in a
template except the prose that belongs to a specific page.

| File | Holds |
|---|---|
| `site.js` | Name, canonical URL, review dates, the legal disclaimer |
| `nav.js` | Primary navigation, in render order |
| `listings.js` | Business directory records (see "The directory") |
| `events.js` | Event records (see "The calendar") |
| `organizations.js` | Community organizations |
| `services.js` | Resident resources — which body handles what |
| `eras.js` | The Our Story timeline, each entry with its source |
| `election.js` | 2026 election: voting tasks, status strip, plain-language summary, ballot questions, fiscal issues, official resources |
| `corrections.js` | The dated corrections log: every change to a published fact, with the page it belongs to |
| `eleventyComputed.js` | Per-page breadcrumbs, per-page corrections, sitemap dates, preview-build flag |

Point these at a CMS and the templates take the new data unchanged. Data
files export a single default value — Eleventy 3 treats a file with named
exports as a module namespace, and a template would then see nothing.

### The directory

`src/_data/listings.js` holds one record per business. The schema, the
validation rules and the freshness threshold are documented at the top of
`lib/directory.js`; the short version:

- Every record has `slug`, `name`, `category`, `sourceUrl`, `verifiedAt` and
  `status`. `description`, `address`, `postalCode`, `area`, `website` and
  `schemaType` are present only where a source stated them.
- `status` is `active`, `temporarily_closed`, `closed` or `unverified`. Only
  the first two render. Closed and unverified records stay in the file as the
  record of what was checked, with an `editorialNote` that is never published
  (a note is published only with `publishNote: true`).
- `verifiedAt` is the day that row was last checked against its source. The
  page shows it row by row and summarises the range at the top, so a
  directory checked over several days never claims a single date.
- Validation runs on every import and fails the build on: a missing name,
  category, source or date; an unknown category; a duplicate business; an
  invalid or `http://` URL; an active record older than the 180-day
  freshness threshold; two published records at one address without
  `sharesAddress: true` on each; a closed or unverified record without a
  note. Category counts are derived from the published records, and the
  built-site tests assert the rendered counts match.

Phone numbers are deliberately not reproduced. They change more often than
anything else on a listing, so every row links out — to the business's own
site ("Website"), to its Association listing page ("Hours & contact"), or,
for the few businesses that could only be traced to the Association's
directory as a whole, to that directory with a label that says the reader
will have to search there (`linkLabelFor` in `lib/directory.js`). A row
never calls a homepage "Hours & contact".

The page opens on the search box and the category filter; the photographs
sit below the listings. Whenever a category or search is in force, a strip
under the heading names it with a reset beside it.

Category filtering is a native radio group (one category at a time) and the
chosen category lives in the URL: `/eat-shop/?category=restaurants-bars`.
The homepage category links open those URLs, Back and Forward restore the
state, and search text is carried as `?q=`. The canonical URL stays
`/eat-shop/`: a filtered view has no content of its own and is not meant to
be indexed separately. Unknown category values fall back to all categories.
Category slugs are defined in `lib/directory.js`; changing one changes the
shareable URL, so treat them as stable.

### The calendar

`src/_data/events.js` holds one record per event or organizer-confirmed
season. The schema and the editorial workflow are at the top of
`lib/events.js`; the short version:

- A record is `confirmed` only when the organizer has published that date.
  `sourceUrl` is the page it was read from and `verifiedAt` the day it was
  read. Times are `HH:MM` in `timezone`, which must be `America/Denver`.
- `recurrence: { weekday, until }` describes an organizer-confirmed season
  ("every Friday, June 12 to September 18") and expands to one instance a
  week. It is never used to project a season that has not been announced.
- A season that recurs but is not yet dated is a `tentative` record with
  `expected` text and no dates. It appears under "Expected — date not
  confirmed" and never in the upcoming list, the month grid or structured
  data. Rock & Rails 2027 is the standing example.
- `cancelled` and `postponed` records keep their dates, are labelled in the
  list, and carry the matching Schema.org `eventStatus`.
- Validation fails the build on a missing date, source, organizer or
  timezone; a recurrence that starts on the wrong weekday or spans more than
  a year; a confirmed future date last checked more than 120 days ago; and
  the same happening listed twice.

There is no scraper. When an organizer publishes dates, add or update the
record and cite the page. Past instances leave the upcoming list on their own
— on Niwot's clock, at their end time — and the last four are kept under
"Recently held".

The month view's detail rail always belongs to the month on screen. With no
day chosen it shows that month's first day still ahead, with everything on
that day; a month with nothing ahead says so and points at the next confirmed
date rather than showing a day from another month. A day with several events
lists them compactly and expands one. The chosen day and event live in the
URL — `/events/?date=2026-09-11&event=second-friday-art-walk-2026-09-11` —
which is how the homepage cards open one occurrence directly (`eventUrl` in
`calendar-core.js`). A deep link to a day with nothing on it opens the
calendar as usual.

`src/assets/js/calendar-core.js` holds the occurrence logic and the markup for
the month grid, the detail rail and the "Coming up" strips. It is imported
twice: at build time by `src/_data/eventsBuild.js`, so the pages ship complete
markup for crawlers and for readers without JavaScript; and in the browser by
`page-events.js` and `page-home.js`, which re-render from the real current
time. One implementation, two callers. Keep it free of DOM and Node APIs, and
keep dates as strings: the build machine, the visitor and Niwot are in three
different timezones.

Build a fixed moment for testing:

```bash
NIWOT_TODAY=2026-06-15 npm run build        # noon in Niwot on that day
NIWOT_NOW=2026-06-15T02:00:00Z npm run build   # an exact instant
```

A pinned build stamps `data-now` on the `#niwot-events` element so the browser
uses the same moment.

### Photographs

Templates never reference `/assets/photos/` directly — they call the `photo`
shortcode, which runs the source through
[eleventy-img](https://www.11ty.dev/docs/plugins/image/):

```njk
{% raw %}{% photo "second-avenue-patios.jpg", "alt text", "sizes", "style", true %}{% endraw %}
```

The last argument marks an above-the-fold image (eager + `fetchpriority`);
omit it and the image is lazy-loaded. The first two eager images on a page
are also preloaded from `<head>` (the `lcpPreload` shortcode in the layout),
so the largest paint starts downloading before the parser reaches the
`<picture>`. The shortcode throws if alt text is missing, so an unlabelled
photograph cannot reach the build.

Each source is emitted as AVIF, WebP and JPEG at five widths, and `width`
/`height` are set from the source so nothing shifts as images load. Nothing
is ever upscaled — `old-town-aerial.jpg` is 547px wide and simply yields
fewer variants, which is also why the handoff says never to display it wider
than ~500px. `sizes` is per-instance and describes the grid slot the image
occupies; update it when a layout changes.

Measured on the homepage: **3.9MB → 0.43MB** at 1280px, **0.13MB** at 390px.
Image processing adds roughly 45 seconds to a cold build and is cached in
`.cache/` after that.

The originals stay published because the Open Graph tags point at them —
social scrapers want a stable JPEG URL, and page visitors never fetch them.
The layout's `ogImageDimensions` shortcode reads each share image's size at
build time and emits `og:image:width` and `og:image:height`, which is what
lets Facebook render the image on the first share rather than the second.
`old-town-aerial.jpg` is too small for a share card (547px wide against the
1200×630 social platforms expect), so no page uses it as `ogImage`.

### Forms

The two forms POST to `/api/contact` natively, so they work with JavaScript
absent or broken; the endpoint answers a normal form post with a 303 to
`/thanks/`. `forms.js` only upgrades that — it posts the same payload in the
background and renders the outcome in place. Outcome text comes from the
endpoint rather than the page, so a form that cannot deliver says why, and
field errors are written under the field they belong to, tied to it with
`aria-describedby`, and announced.

The endpoint checks method and content type, refuses cross-site origins
(no CORS headers are ever sent), caps the body size, drops honeypot
submissions with a 200 so the sender learns nothing, rate-limits bursts per
IP (in memory, so per warm instance — a shared store would make it a
guarantee), then validates with everything trimmed, control characters
stripped and lengths capped. Newsletter responses never say whether an
address is already on the list. Newsletter consent is the notices form
itself; sending a correction never signs anyone up.

The privacy page (`/privacy/`) is linked beside both forms and in the footer.
It names the providers involved (Vercel, Resend, Google Fonts), retention,
unsubscribe behaviour and how to ask for access or deletion. Update its
effective date when it changes, and add an entry to `corrections.js`.

`site.editor` in `site.js` holds the responsible editor's name and a
monitored address. Both are `null` until the owner supplies them; once set
they are published on the privacy page, beside the submission form and in
the footer, and the tests check that they are.

### Titles, breadcrumbs and structured data

`title` is the short editorial name used in the browser tab fallback and the
breadcrumb; `seoTitle` is the full `<title>` and Open Graph title. Every
internal page renders a visible `Home / Page` trail from
`eleventyComputed.js`, and the `BreadcrumbList` markup is built from the
same list. `crumbLabel` overrides the breadcrumb text where the page title is
long.

Structured data is emitted from the same records the page renders: an
`ItemList` of active businesses (most specific Schema.org type per record,
stable `#slug` URLs, no invented phone numbers, hours, coordinates, ratings
or prices), `Event` objects only for confirmed, cancelled or postponed future
instances with timezone-aware dates and the organizer's direct URL, and the
`WebSite` and `BreadcrumbList` blocks. `test/site.test.js` parses every block
and checks it against the page.

### Sitemap, robots and previews

`sitemap.xml` lists only canonical, indexable pages, each with a `<lastmod>`
from the most recent git commit touching its template or the data it renders
(`lib/lastmod.js`; the build date when there is no history). On a shallow
clone — which is how some hosts check out a deploy — every page carries the
deploy commit's date, which is later than the truth but never earlier. `thanks/` and
the 404 page are `noindex` and stay out of it.

On Vercel preview and branch deployments (`VERCEL_ENV` other than
`production`) every page carries `noindex` and `robots.txt` disallows
everything, so a preview URL never competes with the production domain.
Vercel also adds `X-Robots-Tag: noindex` to preview deployments itself.

### Headers and caching

`vercel.json` sets on every response:

- `Content-Security-Policy` — `default-src 'self'; script-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src
  'self' https://fonts.gstatic.com; img-src 'self'; connect-src 'self';
  form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src
  'none'; manifest-src 'self'`. Scripts are strict: there is no inline
  JavaScript, and the JSON-LD and event-data blocks are data blocks the
  policy does not apply to. Styles need `'unsafe-inline'` because the design
  is built on per-element `style` attributes, which hashes cannot cover
  (adding a hash would in fact switch `'unsafe-inline'` off for the
  attributes). `verify.mjs` serves the site with this policy and fails on any
  violation.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, a conservative `Permissions-Policy`, and
  `X-Frame-Options: DENY` alongside `frame-ancestors`.
- `Cache-Control: public, max-age=31536000, immutable` on `/assets/css/`,
  `/assets/js/` and `/img/`, all of which hold content-hashed files only —
  the build fails if an unhashed file lands there. HTML keeps Vercel's
  default revalidation. `/api/` is `no-store`.

`www.townofniwot.com` redirects permanently to the apex; Vercel upgrades HTTP
to HTTPS itself.

## Design rules that are load-bearing

Three ideas drive the design. Preserve them.

1. **A local magazine crossed with a Colorado field guide.** Editorial serif
   headlines, thin rules, structured grids, documentary photography with real
   captions. Square corners throughout — no rounded cards anywhere.
2. **Materials from the actual place.** The palette comes from Niwot's brick
   storefronts, the red caboose at Whistle Stop Park, cottonwoods and
   agricultural fields, the Front Range, and dark printing ink.
3. **The record stands in for the building.** Niwot has no town hall, so the
   site does that work: sourced, dated, and clear about who is responsible for
   what.

Avoid: rounded-card grids, gradient backgrounds, glassmorphism, generic
mountain illustrations, stock lifestyle photography, pill buttons, fake
government seals, marketing text over photographs, pure black body text.

### Traps that have already cost time

- **`clamp()` requires whitespace around `+`.** `clamp(2rem, 1.6rem+2vw, 4rem)`
  is invalid and the browser silently drops the entire `font-size` declaration,
  with no console warning. Always write `1.6rem + 2vw`. If a heading renders at
  body size, this is why.
- **`[id] { scroll-margin-top: 80px }`** in `guide.css` is required. Without
  it the sticky header covers every in-page anchor target.
- **The homepage hero photo is contained, not bled.** The design handoff
  specified it bleeding off the screen edge; the client asked for it inside
  the gutter, sharing a right edge with the nav and body copy. `verify.mjs`
  asserts that alignment, so re-introducing a bleed will fail the checks.
- **The schematic map is two SVGs, not one.** An SVG scales to its column, so
  a 12-unit label in a 640-unit viewBox only renders at 12px when the map is
  drawn 640px wide. The landscape map is used where the column can give it
  that; below 720px a portrait version with a 300-unit viewBox takes over, and
  `.n-maprow` stays one column until 1200px so the landscape one is never
  squeezed into half a narrow page. Only one is displayed, so each carries its
  own `aria-label` and a screen reader hears a single map. `verify.mjs`
  measures the rendered label size at eleven widths from 320 to 2560.
- **Flipped Explore entries** are placed by explicit `grid-column`, never by
  `order: -1` — `order` moves the figure into the 64px numeral track and
  crushes the photo to 64px wide.
- **Focus rings on the dark grounds are gold, not red.** `guide.css` sets
  the ring to `--n-gold-lt` inside `.n-head`, `.n-foot`, `.n-bg-green` and
  on the skip link, and the directory's checked chip does the same; the
  civic page uses `--n-sky-lt` there. Caboose red measures 2.0:1 on
  evergreen, and `verify.mjs` fails any ring under 3:1.
- **The menu is shown in full without JavaScript.** `guide.css` (under
  `@media (scripting: none)`) and a `<noscript>` rule in the header partial
  both show the list and hide the button. Do not hide the nav with
  JavaScript instead: `guide.js` is deferred, and the menu would flash
  open on every load.
- **The masthead identifier wraps below 600px.** "Independent community
  guide" is wider than a phone can give it beside the menu button, so
  `guide.css` lets it take two lines there. Shortening it is not the fix; the
  identifier is an editorial requirement.
- **Data files export one default value.** See "Content model".

### Color

Four base colors fail 4.5:1 as small text on one or more grounds in this
palette, so each has a text-only variant: `--n-red-ink`, `--n-sky-ink`,
`--n-sage-lt`, `--n-sky-lt`, `--n-gold-lt`. Base `--n-red` is for rails, rules
and borders only, where the minimum does not apply. Using a base color for
small text will fail accessibility.

Nav uses `--n-gold-lt` for its active state rather than caboose red, because
red on evergreen measures 2.0:1.

**The election page is a neutral palette by constraint, not preference.** It
uses evergreen, charcoal, soft white and muted blue only. No caboose red and no
green/red pairing anywhere — on a ballot page those colors read as *oppose* and
*support*. The overrides are scoped under `.n-civic` in that page's
`pageStyles`, including the focus ring.

## Editorial rules

This site publishes civic information during a live election. These are part
of the design, not a content-team preference:

1. **No invented content.** No business hours, event dates, historical claims
   or quotations that aren't sourced. Where the record is silent, the page says
   so. A recurring event's next season is "expected", never a date.
2. **Sources are named inline**, not collected in a footnote. Every timeline
   entry, listing and event carries its source.
3. **Neutrality on the ballot question.** No endorsement, no red/green coding,
   campaign material always labeled as advocacy, and the Election Commission
   never presented as an advocate. Ballot language is summarised from the
   Commission's published text and never paraphrased from a secondary source;
   the official text controls, and the page says so beside its title.
4. **Dated verification.** "Last verified" stamps on civic content and on
   every directory row; "Checked" dates on every event; corrections published
   with their date and what changed, in `src/_data/corrections.js`, which
   Our Story renders in full and each page renders for itself.
5. **The disclaimer appears on every page.** It is rendered from `site.js` by
   the shared layout so it cannot be dropped from one page by accident, and
   the masthead on every page reads "Independent community guide".

## Content status

- **Directory** — 65 published records across ten categories, plus two held
  back (one closed, one unverified), compiled from each business's own site,
  the Niwot Business Association directory and the *Left Hand Valley
  Courier*. Rows dated 2026-09-08 were compiled on the first pass; rows dated
  2026-09-09 were re-checked or added in the September 2026 audit. The
  header comment in `src/_data/listings.js` records the closures dropped and
  each record's `editorialNote` records where sources disagreed. Coverage is
  not a claim of completeness — the Association directory was searched rather
  than crawled, and a sole trader with no public listing will not be in it —
  and the page says so.
- **Events** — seven confirmed 2026 records read from niwot.com, niwotarts.org
  and the Courier, and three expected annual events without dates. The Niwot
  Farmers Market is not listed: no organizer source for a current season was
  found. The hours on the September 11 records and the Enchanted Evening date
  were taken from the external audit's reading of the organizers' dated
  listings on September 9, 2026 (the audit sandbox could not open those
  sites); each record's description says where its time comes from and the
  editor should confirm them on the cited pages before promotion.

Both accept real data through `src/_data/` with no template changes.

## What still needs a human

1. **Set the form's environment variables.** The endpoint is built
   (`api/contact.js`) but inert until these are set in Vercel → Project →
   Settings → Environment Variables:

   | Variable | Purpose |
   |---|---|
   | `CONTACT_EMAIL` | Where submissions are delivered. Required. |
   | `RESEND_API_KEY` | A [Resend](https://resend.com) API key. Required. |
   | `CONTACT_FROM` | Verified sender, e.g. `guide@townofniwot.com`. Defaults to `onboarding@resend.dev`, which only delivers to the address owning the Resend account — testing only. |

   Until both required variables are set the endpoint returns 503 and the
   forms say so, rather than showing a thank-you nothing earned.
2. **Search Console and Bing Webmaster Tools.** See "Submitting the sitemap".
3. **Confirm the domain redirects on the live host.** `vercel.json` redirects
   `www` to the apex and Vercel upgrades HTTP to HTTPS; confirm both with
   `curl -I http://townofniwot.com/` and `curl -I https://www.townofniwot.com/`
   after deploying, and check that `www.townofniwot.com` is attached to the
   project so the redirect can fire. Consider HSTS preload only after the
   `includeSubDomains` setting has run without incident.
4. **Per-IP rate limiting with a shared store.** The endpoint's limiter is in
   memory; Vercel KV would make it hold across instances.
5. **A privacy contact address.** The privacy page routes questions through
   the submission form. A dedicated address, once one exists, belongs on that
   page.
6. **Content source.** Move `src/_data/` to a CMS when there is someone to
   maintain it.
7. **Re-verify the ballot content** against
   [niwotelection.org](https://niwotelection.org/) after the September 11, 2026
   printer's-proof review, and update `verified` in `src/_data/site.js`.
8. **Re-check the directory rows** flagged in their `editorialNote` — The
   Wheel House's address, La Musette's status and John's Dry Cleaners'
   address page in particular — on the next pass, and keep `verifiedAt`
   current; the build fails on a row older than 180 days.
9. **Name an editor and a monitored address** in `site.editor`
   (`src/_data/site.js`). Until then the privacy page says the form is the
   only route, which the external audit flagged: if the form fails, the
   fallback contacts beside it are public bodies that do not run this site.
10. **Confirm the four event readings on the organizers' pages** — the
    Art Walk and Osmosis opening hours, the awards night start (the
    organizer's page says 6pm, the Business Association's calendar 5:30pm)
    and Enchanted Evening's date and hours — and prove the forms deliver:
    one real submission and one signup into an inbox you control, one
    unsubscribe processed. Neither could be done from the audit sandbox.
11. **Add the Commission's own labels** ("Question 1", "Issue 1") to
    `election.js` once they have been read from the certified ballot after
    the September 11 proof review. The field exists (`official`) and the
    template renders it; it is unset because this guide's order is not
    evidence of the ballot's.
12. **Ground the Plan a Visit schematic** in real geography before it is
    used anywhere else: a local should confirm which side of the tracks
    Whistle Stop Park and the Diagonal sit on, and add Niwot Road, 79th
    Street, named parking and a north arrow. Public restrooms and designated
    accessible parking are not claimed on the page until someone has
    confirmed them on the ground.
13. **Decide on the Chief Niwot material.** The external audit calls its
    absence from Our Story a material gap; it was removed at the client's
    request in the previous PR. The section and its sources are in git
    history (commit `e499beb^`) if the decision is reversed.
14. **Run a real-device pass** at 320, 390, 768 and 1366 CSS pixels,
    portrait and landscape, at 200% zoom, on an iPhone with Safari and an
    Android phone with Chrome. The browser checks cover those widths in
    Chromium only.

### Submitting the sitemap

Submission tells the engines where the sitemap is; it does not guarantee
indexing, and a page can be indexed without it.

1. **Google Search Console** — <https://search.google.com/search-console>.
   Add `townofniwot.com` as a Domain property (verify with the DNS TXT record
   Google provides, added at the registrar or in Vercel → Domains). Under
   *Indexing → Sitemaps*, enter `https://townofniwot.com/sitemap.xml` and
   submit. Check *Pages* after a few days for anything reported as excluded.
2. **Bing Webmaster Tools** — <https://www.bing.com/webmasters>. Either
   import the verified Search Console property or add the site and verify
   with the DNS CNAME or meta-tag option. Under *Sitemaps*, submit the same
   URL.
3. Re-submission is not needed after ordinary content changes; `<lastmod>`
   updates on each deploy. Re-submit only if the sitemap URL changes.

## Verification

`npm test` runs the node:test suites: the directory and event validators
against fixtures and against the live data (including that 1914 House is not
active, that Taverna Laudisio, Love Ice Cream, Emory Jane's and 2nd Nature
are present, that The Wheel House carries one address and its direct site,
that no Rock & Rails date in 2027 is scheduled, and that tentative records
never reach structured data); the endpoint's validation, origin check,
honeypot, rate limit and no-JavaScript path; and the built site — every
primary page present, titles and descriptions unique, canonicals and Open
Graph correct, one H1 and no skipped heading levels, internal links and
anchors resolving, hashed assets present, sitemap and robots well-formed,
breadcrumbs matching their markup, directory counts and radio semantics,
editorial notes absent from the HTML, and the event list, month grid, detail
rail and structured data all agreeing.

`verify.mjs` serves `_site/` with the vercel.json headers and drives it in
Chromium. Across all nine pages and the 404 at desktop and mobile widths it
checks: no console errors (a CSP violation counts), no horizontal overflow at
320, 390, 768, 1280 or 1440, every image loaded with alt text, no text under
12px, no text ink painted outside the viewport, no rounded corners, the
disclaimer verbatim, headings not collapsed to body size, expected element
counts, and an axe-core audit against the WCAG 2.2 AA rule set.

Then the targeted checks: HTTP 404 with the custom noindex page for an unknown
route; the skip link first in tab order, visible when focused and working;
a visible focus ring on every tabbed control, and on six pages every
control's ring measured against the ground behind it at 3:1 or better (the
external audit found the red ring at 2.0:1 on the evergreen bands, so those
grounds use the light gold); the hero photo aligned to the
content edge at 390 through 2560; the Explore flip not crushing its photo;
anchor clearance under the sticky header; the schematic map's labels at
eleven widths; the directory's radio semantics, URL-driven filtering, Back and
Forward restoration, combined search-and-category state, zero-result
announcement with hidden rows out of the accessibility tree, and native
arrow-key behaviour; the calendar opening on the current Niwot month with
cards matching the records, the detail rail following the month through
three presses of Next (a day from the month shown, or a note naming the
month), "View details" selecting the day and the event, a homepage-style
deep link opening its day and event, the day list on a busy day switching the
expanded event, and the homepage cards carrying those deep links; the
directory opening on its search with the photographs below the listings and
the active-filter strip naming the filter and clearing it; form labels,
`autocomplete="email"`, the honeypot hidden and out of tab order, and a
mocked server error tied to its field and announced (nothing is ever sent);
the mobile menu's `aria-expanded` and accessible name, Tab into the menu,
Escape-to-close with the name reset and focus restored, and the navigation
shown in full when JavaScript is off; no sticky rails in stacked layouts;
calendar day labels
inside their cells; and every standalone control at least 40px tall.

`widths.mjs` is a slower companion: it sweeps 26 viewport widths from 320 to
2560 across every page looking for horizontal overflow.

`lighthouse.mjs` audits six pages on desktop against Performance 90,
Accessibility 100, Best Practices 95 and SEO 95, with Google Fonts blocked so
the number does not depend on the network of the machine running it, and
text compressed as Vercel serves it. `LH_PAGES="/,/eat-shop/"` limits a run.
The performance score is also a measurement of the machine: the text-only
privacy page is reported as that machine's ceiling, and a miss below it
should be confirmed on production hardware (PageSpeed Insights) before it is
read as a site defect.

## Assets

Eight photographs in `src/assets/photos/`, supplied by the client and licensed
for use on this site. Do not substitute stock photography. `old-town-aerial.jpg`
is only 547px wide — never display it wider than ~500px.

The site icon is `src/assets/favicon.svg` (the wordmark's evergreen ground,
caboose-red rule and serif N). `favicon.ico` (32px, for crawlers and browsers
that request the legacy path or do not read SVG icons) and
`apple-touch-icon.png` (180px, the iOS home-screen bookmark) are rasterised
from it; regenerate both if the SVG changes.
