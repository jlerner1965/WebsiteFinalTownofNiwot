# Pre-launch audit — TownofNiwot.com

Audited September 9, 2026, on the `claude/pre-launch-audit-ljvsjb` branch,
against the state of `main` after PR #4. Everything below was either run or
read in full: every template, data file, script, the endpoint, the tests
and the deploy configuration.

**Verdict: launchable once the items under "Before launch" are done.** The
build, the 63-test suite, the browser checks (every page at desktop and
mobile, axe WCAG 2.2 AA, keyboard, forms, calendar, directory) and Lighthouse
all pass. The audit found no broken functionality. What it found were
content and launch-hygiene gaps, most of which this branch fixes; the rest
need a person with access to Vercel, the registrar, Resend or the ground in
Niwot.

## What was run

| Check | Result |
|---|---|
| `npm run build` | Clean. 13 files, 108 image variants, ~65s cold / <1s warm |
| `npm test` | 63 / 63 pass (data validation, event logic, endpoint, built site) |
| `npm run verify` | All checks pass: no console or CSP errors, no overflow at 320–2560, every image loaded with alt, no text under 12px, no rounded corners, disclaimer verbatim, axe WCAG 2.2 AA zero violations on 10 pages × 2 widths, skip link, focus rings, directory URL state and Back/Forward, calendar, form error wiring, mobile menu, touch targets |
| `node lighthouse.mjs` | Accessibility 100, Best Practices 100, SEO 100 on all six pages. Performance 85–91 on this sandbox, where the text-only privacy page also scores 91 — that is the machine's ceiling, not the site. Confirm on production with PageSpeed Insights after deploy |
| `node widths.mjs` | No horizontal overflow on any of nine pages at 26 widths from 320 to 2560. The script hung in this sandbox until it was given the same off-origin request isolation `verify.mjs` has (see fix 13) |
| HTML validation (`html-validate`) | Nothing of substance. It objects to inline `style` attributes (a deliberate design choice here) and to the id `2nd-nature-hair-lounge` starting with a digit, which HTML5 permits and nothing on the site selects by CSS |
| Spelling sweep | 14 British spellings in reader-facing copy — fixed (see below) |
| Dependency audit | 20 advisories, all in the Lighthouse → puppeteer → extract-zip chain. Development-only; nothing ships to the site or the function |
| Secrets scan | No keys, tokens or addresses in the repository |
| External links | **Not verifiable from this sandbox** — outbound requests to every site other than the search API are blocked by the network policy, so all 96 unique external URLs came back unreachable here. `linkcheck.mjs` was added; run `npm run links` from an ordinary connection before launch |

Facts checked against outside sources during the audit: the 2020 census
population (4,306 — confirmed), the caboose (CB&Q 14649, built 1907,
donated by the Boulder County Railroad Historical Society — confirmed via
the Niwot Cultural Arts Association), the fiscal measures on the ballot
(2.5% sales and use tax, four mills, 3% marijuana tax, $15 million road
bond, revenue retention, nine charter commissioners — all match the Left
Hand Valley Courier's July 29, 2026 report). Not independently confirmed
here: the January 1, 2028 collection start, the $28 million maximum
repayment and the post-election court order — re-verify these against
niwotelection.org after the September 11 printer's proof, as the README
already says.

## Fixed in this branch

1. **Election page listed two campaign committees; there are three.** The
   Left Hand Valley Courier reported first campaign-finance filings for
   Neighbors for Niwot (August 5, 2026) and for Niwot Together (August 12,
   2026), an issue committee supporting incorporation, alongside the Niwot
   Incorporation Committee. A neutral page that omits a registered committee
   is not neutral. Niwot Together is now listed with the same "campaign
   material" label as the other two, and the sentence beside the list says
   three. (`src/_data/election.js`, `src/civic/incorporation-election.njk`)
2. **The homepage's empty-calendar notice pointed at a list that is not
   there.** From September 18, when the last Dancing Under the Stars ends,
   nothing confirmed remains on the calendar and both pages show "Nothing is
   confirmed…". The shared wording said "the expected seasonal events are
   listed below" — true on the events page, false on the homepage. The
   homepage now links to the events page's Expected section instead.
   Confirmed with a build pinned to `NIWOT_TODAY=2026-09-20`.
   (`src/assets/js/calendar-core.js`)
3. **British spellings in a Colorado guide.** neighbourhood, programme,
   jewellery, colour, flavours, specialising, enrolment, travelling, cosy,
   storey, ageing, neighbour, and the endpoint's "Unrecognised" — all now
   American. "Cancelled" was left; both forms are standard in the US.
4. **Date labels were in day-month order.** Cards and the detail rail said
   "Fri 11 September" while the line below them said "Checked September 9,
   2026". Labels now read "Fri, September 11" (and "Fri, September 11,
   2026" outside the current year); the calendar cells' accessible names
   follow. Two test assertions updated. If the old order was a deliberate
   editorial choice, `dayLabel` and `longDate` in `calendar-core.js` are the
   only two places to change back.
5. **Screen readers announced "north east arrow" after every outbound link
   — 65 times on the directory alone.** The ↗ and → glyphs are now wrapped in
   `aria-hidden` spans wherever they follow link text. Arrows that already
   sat in hidden spans, and the Prev/Next buttons (which carry aria-labels),
   were left as they were.
6. **Our Story's share image was 547px wide.** `old-town-aerial.jpg` is well
   under the 1200×630 social cards expect, so the page now shares the valley
   photograph the homepage's history section uses. Every page also now
   declares `og:image:width`, `og:image:height` and `og:image:type`, read
   from the photograph at build time; without them Facebook does not render
   the image on a link's first share.
7. **No `favicon.ico` or Apple touch icon.** Browsers and crawlers that
   request the legacy path got a 404, and an iOS home-screen bookmark would
   have had no icon. Both are rasterised from the SVG wordmark and linked
   from the layout, with a `theme-color` for mobile browser chrome. The
   built-site test now expects both files.
8. **Meta descriptions over Google's ~160-character cut-off** on the home,
   directory, events and election pages (176–211 characters). Trimmed to
   146–159 without losing the sense.
9. **The events lead promised "markets"** and the calendar lists none (the
   README records that no organizer source for a market could be found). It
   now says "art walks", which is what is listed.
10. **The 404 page said everything on the site was one of six links**; Our
    Story, Community organizations and Privacy are not among them. Now
    "Most of what this guide holds".
11. **robots.txt began with a blank line** — a whitespace-control slip in
    the template. Harmless, now gone.
12. **`linkcheck.mjs` / `npm run links`**: fetches every external href in
    `_site/` and lists anything that does not answer 2xx with the pages that
    link to it.
13. **`widths.mjs` waited on Google Fonts and reported the hidden honeypot
    as overflow.** It now aborts off-origin requests like `verify.mjs` does,
    so it finishes anywhere the network is closed, and it ignores boxes
    inside a clipped ancestor, which cannot paint past the edge. Result: no
    overflow at any of 26 widths on any page.

## Before launch (needs a person)

These are in rough priority order. Items 1–4 are blockers; the rest are
strongly recommended.

1. **Wire up the forms.** Set `CONTACT_EMAIL`, `RESEND_API_KEY` and
   `CONTACT_FROM` in Vercel → Project → Settings → Environment Variables
   (Production, and Preview if you want to test there). In Resend, verify
   `townofniwot.com` as a sending domain and add the SPF and DKIM records it
   gives you, plus a DMARC record (`v=DMARC1; p=none; rua=mailto:…` is a
   safe start). Then, on the live site: send one real submission with
   JavaScript on, one with it off (the browser should land on `/thanks/`),
   and one newsletter signup, and confirm all three arrive with a working
   Reply-To. Until the variables are set the forms say they are not
   connected, which is correct behaviour but not a launch state.
2. **Run the link check from an open network**: `npm run build && npm run
   links`. 96 external URLs, 65 of them business sites that change without
   notice; none could be reached from the audit sandbox. Fix or remove
   anything dead before the directory goes public.
3. **Decide what the calendar shows on launch day.** After September 18 the
   confirmed list is empty until the Business Association publishes October
   dates (Great Pumpkin Party) and the holiday events. The empty state is
   honest and now correctly worded, but a launch with an empty "What's
   happening" strip is a choice worth making deliberately. Check niwot.com
   the week of launch and add anything dated.
4. **Re-verify the election page after the September 11 printer's proof**
   and bump `verified` in `src/_data/site.js`. While there:
   - Confirm the wording under "Ballot administrator" and in the
     Organizations list. The Courier's reporting describes the six
     court-appointed commissioners as having *called* the election,
     *certifying ballot content* and running the charter-commission
     candidate process, with the Boulder County Clerk and Recorder
     *administering the vote* under an intergovernmental agreement. The
     page's "in coordination with" is not wrong but "administers this
     election" may overstate the Commission's role. A more precise line:
     "The Niwot Election Commission, appointed by the Boulder County District
     Court, called the election and certifies the ballot content; the
     Boulder County Clerk and Recorder administers the vote as part of the
     coordinated election."
   - Decide whether each campaign committee should carry its position
     ("supports incorporation" / "opposes incorporation"). Identical labels
     are neutral; stating positions is also neutral if done for all three
     and more useful to a reader who does not know the groups. Check the
     Secretary of State's TRACER database for any further committees
     before mailing begins.
5. **Domains and transport.** Attach both `townofniwot.com` and
   `www.townofniwot.com` to the Vercel project so the `www` → apex redirect
   in `vercel.json` can fire. After deploy: `curl -I http://townofniwot.com/`
   (expect 308 to https), `curl -I https://www.townofniwot.com/` (expect 308
   to the apex), `curl -I https://townofniwot.com/` (expect the CSP, HSTS and
   the other headers). Add a CAA record if the registrar supports it. Leave
   HSTS preload for later, as the README says.
6. **Confirm the API route survives `trailingSlash: true`.** Vercel documents
   the redirect as applying to paths without a file extension; `/api/contact`
   is one. On a preview deployment, `curl -X POST -H 'Content-Type:
   application/json' -d '{}' -i https://<preview>/api/contact` should answer
   400 (validation), not 308. If it redirects, add
   `{ "source": "/api/contact/", "destination": "/api/contact" }` as a
   rewrite or point the forms at `/api/contact/`.
7. **Share cards.** Paste the home, events, directory and election URLs into
   Facebook's Sharing Debugger, LinkedIn's Post Inspector and an X card
   validator. The images are 550–770KB JPEGs at 1400–1700px wide, within
   every platform's limits.
8. **Search Console and Bing** — see "Submitting the sitemap" in the README.
9. **A local should glance at the schematic map** on Plan a Visit. The
   Cultural Arts Association places Whistle Stop Park at the south-west
   corner of Murray Street and First Avenue; the schematic draws the park and
   the rail corridor on opposite sides of Second Avenue. Since the park is
   named for the tracks beside it, confirm the sides are right before print
   or social use of that image. It is labelled "not to scale" and carries a
   full text description, so this is a correctness question, not an
   accessibility one.
10. **Set two calendar reminders.** The build refuses to publish a directory
    row last checked more than 180 days ago and a confirmed future event
    checked more than 120 days ago. With every row stamped September 8–9,
    2026, any deploy after about **March 7, 2027** fails until the directory
    is re-checked. Put a reminder in early February 2027, and another for
    the day after the November 3 election to retire the civic notice on the
    homepage and re-frame the election page as a record.

## Soon after launch

- **The Community page lists two organizations.** The Niwot Cultural Arts
  Association (already cited on the site as an event organizer, and the
  body behind Whistle Stop Park and the Why Not Niwot? show), the Niwot
  Community Association (niwot.org) and the Niwot Historical Society
  (niwothistoricalsociety.org) are the obvious additions. Each needs a
  sentence drawn from its own site, per the site's sourcing rule; none was
  added here because those sites could not be read from the sandbox.
- **The site promises published corrections and has nowhere to publish
  them.** Our Story, the election page, the thank-you page and the
  accessibility panel all say corrections are "published with their date and
  a note describing what changed". A small `corrections.js` data file
  rendered under Our Story's "Editorial standards" section — "No corrections
  have been published yet" until there are some — would make the promise
  concrete.
- **"The market."** The Community page's closing section and
  `organizations.js` say the Business Association runs a market; the events
  data could not source one. Confirm with the Association or drop the word.
- **A copyright line.** The footer names the photography licence but no
  rights holder for the site. "© 2026 TownofNiwot.com" (or the editor's
  name) belongs in the footer meta row.
- **Self-host the two typefaces.** Google Fonts is the only third-party
  request, it is render-blocking CSS from another origin, and it is the
  reason the privacy page has a Google paragraph. Instrument Serif and
  Instrument Sans are OFL-licensed; two woff2 files each in `src/assets/`
  (served under the immutable cache rule) removes the dependency, shortens
  the privacy page and tightens the CSP. Lighthouse's render-blocking
  finding is this plus `guide.css` (3.9KB gzipped, which could be inlined
  like the page styles if the score matters).
- **Analytics.** There are none, and the privacy page says so. If you want
  visit counts, Vercel Web Analytics is cookieless and served from the same
  origin (so the CSP admits it), but the privacy page's "runs no analytics"
  sentence and the "only requests that leave the site" sentence must change
  the same day.
- **A calendar feed.** An `.ics` file generated from the same records would
  let residents subscribe; the data already carries timezone-aware start and
  end instants.
- **The endpoint's rate limiter is per warm instance** (README item 4). Also
  minor: `clientIp` trusts the first `x-forwarded-for` entry, which a client
  can set; on Vercel, `x-vercel-forwarded-for` or `x-real-ip` are the
  trustworthy ones. Harmless for a best-effort limiter, worth switching when
  the shared store is added.
- **`/.well-known/security.txt`** with a contact address once a privacy
  contact exists (README item 5).
- **Upgrade Lighthouse to 13** at leisure to clear the dev-dependency
  advisories (`npm audit fix --force`; check `lighthouse.mjs` still runs).
- **Two design nits, not defects.** On Our Story at desktop the title block
  sits low beside the tall aerial photograph, leaving a large empty area
  above "OUR STORY"; `align-items:center` on `.n-open` would balance it. The
  directory page is about 12,000px tall at desktop with all 65 rows
  expanded — the category filter handles it, but a "Jump to category" row
  under the heading would help readers who arrive from search.
- **The rasterised favicon uses DejaVu Serif** (the sandbox's serif), not
  Georgia. Open `/favicon.ico` and `/apple-touch-icon.png` on a Mac and
  regenerate from the SVG if the N looks off.

## What was reviewed and found sound

**Content and editorial.** Every page carries the masthead identifier and
the verbatim disclaimer; the tests enforce both. Sources are inline on every
directory row, event and timeline entry. Verification stamps are per row
and honest about the range. The election page uses no red or green, labels
advocacy as advocacy, and defers to the Commission's text. Directory notes
that are internal never reach the HTML (tested). No invented hours, prices,
phone numbers or dates anywhere. The privacy page matches what the code
actually does: two forms, Vercel, Resend, Google Fonts, no cookies, no
analytics.

**Function.** The forms work without JavaScript (303 to `/thanks/`) and
with it (in-place outcome, field errors tied to inputs and announced). The
endpoint checks method, content type, origin, body size, a honeypot, a
per-IP limit and field validity, and says so when it cannot deliver rather
than swallowing input. The calendar keeps dates as strings and converts
"now" to Niwot's clock once, so the build machine, the visitor and the town
being in three timezones cannot shift a date; instances leave the list at
their own end time. The directory renders every row in HTML and only hides
them; category and search live in the URL and survive Back and Forward.
The mobile menu manages `aria-expanded`, Escape and focus return.

**Design.** Screenshots of every page at 1280px and 390px match the design
rules: editorial serif headlines, thin rules, square corners everywhere,
documentary photographs with captions, the palette drawn from the place,
and the election page held to evergreen, charcoal, soft white and muted
blue. The hero photo stays inside the gutter at every width from 390 to
2560. The schematic map switches to its portrait version below 720px and
never renders a label under 12px.

**Accessibility.** axe reports zero WCAG 2.2 AA violations on all ten pages
at both widths. One H1 per page, no skipped levels, a working skip link
first in tab order, visible focus rings on every control, 40px touch
targets on phones, labelled fields, a hidden honeypot out of the tab order,
a native radio group for the filter with a live result count, calendar
cells with full accessible names, reduced-motion respected. Repeated link
texts ("Website", "Directions", "Visit site") rely on their row for context,
which WCAG 2.4.4 allows.

**SEO.** Unique titles (25–59 characters) and descriptions, canonical URLs,
Open Graph and Twitter card tags, structured data for the site, the
directory (ItemList of active businesses with stable anchors and no
invented fields), confirmed events (Event graph with timezone-aware dates,
organizer URLs and `EventScheduled`), and breadcrumbs that match the visible
trail. The sitemap lists the nine indexable pages with git-derived
`lastmod`; the thank-you and 404 pages are `noindex`; preview deployments
are `noindex` and disallowed in robots.txt.

**Performance.** AVIF/WebP/JPEG at six widths, `sizes` per placement, the
LCP image preloaded from `<head>`, lazy loading below the fold, page CSS
inlined, shared CSS and JS content-hashed and immutable, HTML 5–18KB
gzipped (the directory is the largest at 18KB), calendar JS 5.8KB gzipped.
Nothing render-blocking except the shared stylesheet and the fonts.

**Security and privacy.** CSP with `script-src 'self'` and no inline
scripts, `frame-ancestors 'none'`, HSTS with `includeSubDomains`,
`nosniff`, a strict referrer policy, a conservative Permissions-Policy —
all set in `vercel.json` and exercised by `verify.mjs` on every run.
Data files and templates escape output; JSON in `<script>` blocks has `<`
escaped. No CORS headers on the endpoint; cross-site origins get 403. No
secrets in the repository; the function reads its configuration from the
environment.

**Deploy configuration.** `vercel.json` builds with `npm run build` into
`_site`, serves the custom 404, applies the headers and cache rules, and
redirects `www`. Eleventy is a devDependency, which Vercel installs by
default — do not set `NODE_ENV=production` in the project's build
environment or the build will lose it. Node 22 was used for this audit;
the endpoint's `\p{Cc}` regex needs Node 20 or newer.

## Sources consulted

- Left Hand Valley Courier, "Niwot Together reports $4,600 in contributions
  in first campaign finance filing", August 12, 2026;
  "Neighbors for Niwot reports $5,770 in first campaign finance filing",
  August 5, 2026; "Niwot Election Commission reviews November ballot
  process", July 29, 2026; "Court names Election Commissioners for Niwot
  incorporation vote", May 27, 2026.
- Yellow Scene Magazine, "Neighbors for Niwot Officially Registers as
  Campaign Committee", May 11, 2026.
- Niwot Cultural Arts Association, "Whistle Stop Park" (caboose history and
  park location).
- Census Reporter, Niwot CDP profile (2020 population 4,306).
- Vercel documentation, `vercel.json` `trailingSlash`.
