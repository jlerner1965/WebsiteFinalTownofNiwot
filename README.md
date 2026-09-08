# TownofNiwot.com

An independent community guide to Niwot, Colorado — an unincorporated community
in Boulder County, between Boulder and Longmont.

Eight static pages serving two audiences at once: residents who need to know
which agency handles which service, and visitors deciding whether to make the
drive. It also carries neutral voter information for the November 3, 2026
incorporation election, which is why parts of it are held to a stricter
editorial standard than a typical destination site.

## Running it

```bash
npm install
npm start          # dev server with live reload, http://localhost:8080
npm run build      # static output into _site/
```

Output is plain static HTML in `_site/`. It needs no server-side runtime and
deploys to any static host.

```bash
node verify.mjs    # browser checks: see "Verification" below
```

`verify.mjs` needs a Chromium. `npx playwright install chromium` fetches one,
or set `CHROMIUM_PATH` to an existing binary. Screenshots land in
`.verify-shots/` unless `SHOTS_DIR` says otherwise.

## Stack

[Eleventy 3](https://www.11ty.dev/) with Nunjucks templates. No framework, no
client-side router, no build step for CSS or JS.

The site is mostly static content with three small pieces of interactive
state, so a generator that emits plain HTML is the right size for it. The only
JavaScript that ships is the mobile menu, the directory filter, the calendar
and the forms — each a small module, none of them required to read the page.

```
src/
  _data/            Content and configuration (see "Content model")
  _includes/
    layouts/base.njk   Head, chrome, structured data
    partials/          Header and footer
  assets/
    css/guide.css      Palette, chrome, grids, graphic devices
    js/                Mobile menu, calendar, directory, forms
api/contact.js        Form endpoint (Vercel Function)
    photos/            Eight licensed photographs
  *.njk               One file per page
eleventy.config.js
verify.mjs            Browser checks against the built site
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
| `listings.js` | Business directory, with category counts derived from the entries |
| `series.js` | Recurring event series (see "The calendar") |
| `organizations.js` | Community organizations |
| `services.js` | Resident resources — which body handles what |
| `eras.js` | The Our Story timeline, each entry with its source |
| `election.js` | 2026 election: status, ballot questions, fiscal issues, official resources |

Point these at a CMS and the templates take the new data unchanged.

### Forms

The two forms POST to `/api/contact` natively, so they work with JavaScript
absent or broken; the endpoint answers a normal form post with a 303 to
`/thanks/`. `forms.js` only upgrades that — it posts the same payload in the
background and renders the outcome in place. Outcome text comes from the
endpoint rather than the page, so a form that cannot deliver says why.

### The calendar

`src/assets/js/calendar-core.js` holds the occurrence logic and the markup for
the month grid, the detail rail and the "Coming up" strips. It is imported
twice:

- **At build time** by `src/_data/eventsBuild.js`, so the events page and the
  homepage ship complete markup for crawlers and for readers without
  JavaScript.
- **In the browser** by `page-events.js` and `page-home.js`, which re-render
  from the real current date — a static build goes stale as soon as the month
  turns over.

One implementation, two callers. Keep `calendar-core.js` free of DOM and Node
APIs so it stays usable from both.

Occurrences are generated from `{ months, weekday }` definitions rather than
stored dates, because the organizer sets each season's confirmed dates and
those were not confirmable at the time of writing. Every listing says so and
links to the organizer.

Build a fixed date for testing:

```bash
NIWOT_TODAY=2026-06-15 npm run build
```

In the browser, add `data-today="2026-06-15"` to `#niwot-series`.

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
- **Flipped Explore entries** are placed by explicit `grid-column`, never by
  `order: -1` — `order` moves the figure into the 64px numeral track and
  crushes the photo to 64px wide.

`verify.mjs` checks all four.

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
   so.
2. **Sources are named inline**, not collected in a footnote. Every timeline
   entry and factual claim carries its source.
3. **Neutrality on the ballot question.** No endorsement, no red/green coding,
   campaign material always labeled as advocacy, and the Election Commission
   never presented as an advocate.
4. **Dated verification.** "Last verified" stamps on civic content;
   corrections published with their date and what changed.
5. **The disclaimer appears on every page.** It is rendered from `site.js` by
   the shared layout so it cannot be dropped from one page by accident.

## Content status

Two areas are intentionally sparse. Both accept real data through `src/_data/`
with no template changes.

- **Directory** ships with four listings — the businesses whose signage is
  legible in the supplied photographs. Street addresses and phone numbers were
  deliberately not invented; each row links to the Business Association for
  current hours and contact details.
- **Events** carry organizer-published timing rather than specific dates,
  because per-season dates weren't confirmable.

## What still needs building

1. **Set the form's environment variables.** The endpoint is built
   (`api/contact.js`) but inert until these are set in Vercel → Project →
   Settings → Environment Variables:

   | Variable | Purpose |
   |---|---|
   | `CONTACT_EMAIL` | Where submissions are delivered. Required. |
   | `RESEND_API_KEY` | A [Resend](https://resend.com) API key. Required. |
   | `CONTACT_FROM` | Verified sender, e.g. `guide@townofniwot.com`. Defaults to `onboarding@resend.dev`, which only delivers to the address owning the Resend account — testing only. |

   Until both required variables are set the endpoint returns 503 and the
   forms say so, rather than showing a thank-you nothing earned. Swapping
   Resend for another provider is one `fetch` call in `api/contact.js`.

   Spam protection is a honeypot field plus length caps. Per-IP rate limiting
   would need a store (Vercel KV) and is not wired up.
2. **Content source.** Move `src/_data/` to a CMS when there is someone to
   maintain it.
3. **Responsive images.** Photographs are served as single JPEGs.
   Below-the-fold images are lazy-loaded, but WebP/AVIF with `srcset` would cut
   the payload substantially.
4. **Real map.** The schematic SVG on Plan a Visit is an orientation device. If
   an interactive map is wanted, keep the schematic as the no-JS fallback.
5. **Re-verify the ballot content** against
   [niwotelection.org](https://niwotelection.org/) after the September 11, 2026
   printer's-proof review, and update `verified` in `src/_data/site.js`.

## Verification

`verify.mjs` serves `_site/` and drives it in Chromium. Across all eight pages
at desktop and mobile widths it checks:

- no console errors or uncaught exceptions
- no horizontal overflow
- every image loads and carries alt text
- no rendered text below 12px
- no text ink painted outside the viewport (boxes alone miss clipped glyphs)
- no rounded corners
- the disclaimer present verbatim
- headings not collapsed to body size (the `clamp()` trap)

`widths.mjs` is a slower companion: it sweeps 26 viewport widths from 320 to
2560 across every page looking for horizontal overflow. `verify.mjs` runs at
two widths and is the gate; run the sweep after any layout change.

Plus targeted checks on the four known traps and on each interactive piece:
the hero photo aligned to the content edge and clear of the screen edge at 390
through 2560, the Explore flip not crushing its photo, anchor clearance under the sticky header, directory search / category /
no-match / clear, the calendar opening on the current month with a populated
detail rail, and the mobile menu's `aria-expanded`, Escape-to-close and focus
restoration.

## Assets

Eight photographs in `src/assets/photos/`, supplied by the client and licensed
for use on this site. Do not substitute stock photography. `old-town-aerial.jpg`
is only 547px wide — never display it wider than ~500px.
