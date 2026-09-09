# Pre-launch audit — TownofNiwot.com

## Second pass: the external audit of September 9, 2026

An external reviewer audited the live site on September 9, 2026 and
delivered a thirteen-page report ("TownofNiwot.com prelaunch audit") whose
decision was: hold the promotional launch for a focused correction pass. It
found the visual identity and the technical foundation sound, and
concentrated its findings on event accuracy, civic clarity, access to
practical information and proof that the forms deliver. This section records
what the `claude/new-session-8ag6u8` branch does about each of its
identified items, what it deliberately does not do, and what still needs a
person. The first audit's record follows below, unchanged.

The sandbox this work was done in could not open niwot.com, niwotarts.org,
niwotelection.org or the county sites (the network policy refuses them), so
no primary page was read directly. Where a fact was changed, it rests on the
external audit's own dated primary-source reading, corroborated wherever
possible through search-engine snippets of the same pages; the relevant data
file says so beside the record. That is why several items below end with
"confirm on the cited page".

### Findings applied

| ID | Finding | What changed |
|---|---|---|
| C1 (P1) | Event records disagree with current listings | `events.js`: the Second Friday Art Walk and the Osmosis Gallery opening carry 5–9pm from the organizers' September 11 listings; Enchanted Evening is a confirmed record for November 27, 2026, 6–9pm, from the organizer's dated listing, with a note that the page's general description says 5pm; the Why Not Niwot? awards night keeps the organizer's 6pm and says the Business Association's calendar lists 5:30pm. Rock & Rails is credited to the Niwot Cultural Arts Association, which produces it with the Business Association (the site had credited the Association alone). Cards, calendar rail and JSON-LD render from the same records, so all three agree by construction. |
| F1 (P1) | October showed September 11 details | The detail rail now belongs to the month on screen: with no day chosen it shows that month's first day still ahead; a month with nothing ahead says so, names the month and points at the next confirmed date. A day with several events lists them compactly and expands one. Homepage cards link to `/events/?date=…&event=…` and the calendar opens on that day and event. `verify.mjs` pages forward three months and checks the rail each time. |
| C2 (P1) | Civic summaries omit material qualifications | `election.js`: the sales and use tax notes the food-for-domestic-consumption exemption; the marijuana tax is an additional 3% from January 1, 2028, applying only if retail marijuana businesses operate; revenue retention refers to the constitutional (TABOR) revenue and spending limits from 2027; the transportation debt says its proposed repayment is the sales and use tax; the charter commission's dependency on incorporation is explicit, and "approval of one does not automatically decide another" is gone. Three voting tasks (boundary via the Commission's FAQ, which names petition Exhibits A and B; the ballot; registration and ballot help) sit at the top, followed by a four-cell status strip in place of the six large cells, a table of contents, a plain-language section on what incorporation decides and how the proposed boundary differs from the census place, an official-text link beside every measure, one link per official destination, and a dated "Changes to this page" list. |
| T1 (P1) | Privacy contradictions; no editor contact | The opening now says the forms collect what you submit and the hosting and font providers process technical data; the sharing sentence names the two processors instead of denying any sharing. `site.editor` (name, email) is wired into the privacy page, the submission form's contact list and the footer, and is `null` until the owner supplies a monitored address — the pages say the form is the route until then. |
| A1 (P1) | Focus ring 2.02:1 on dark sections | The ring is the light gold on `.n-head`, `.n-foot`, `.n-bg-green`, the skip link and the directory's checked chip (5.4:1 on evergreen), and the lightened sky on the civic page's dark band. `verify.mjs` focuses every control on six pages and fails any ring under 3:1 against the ground behind it. |
| U1 (P2) | Useful actions too far down | Homepage: 42-word introduction, two actions, smaller wordmark, photo top-aligned; the caboose feature block, the separate parks section and the history photo band are gone; measured 5,497px tall at 1363×936 against the audit's 6,898px. Directory: search and categories directly under the title (search at y≈500 against the audit's 906), photographs below the listings, a one-sentence source note with the policy in an expandable block, and a strip naming any filter in force with a reset beside it. Civic: table of contents and the compact strip above. Community: jump links. |
| L1 (P2) | Misleading destinations | John's Dry Cleaners links to the company's locations page after its address page returned 404 (the row's note records it). Rows that could only be traced to the Business Association's directory as a whole say "Find in the Association directory" instead of "Hours & contact"; Pebble Art Jewelry now links to its own Association listing. Resident services link to the county page that handles each service (planning, road maintenance, building permits, trail closures) rather than the county homepage; Plan a Visit's direct contacts do the same. |
| C3 (P2) | Community guide thin | Organizations: the Cultural Arts Association, the Historical Society and the Community Association added, each described from its own site; the county's Niwot Local Improvement District added under a separate "public bodies" heading with the Election Commission, distinguishing public administration from volunteer groups; the unsourced "market" removed. Explore names the Longmont-to-Boulder (LoBo) Regional Trail with the county's trail page, its 2017 Niwot trails map and the closures page, and names the Niwot Sculpture Park as a verified art location; "Help us map it" is reworded. Plan a Visit names RTD's Route BOLT and its Niwot Road stop with a caveat about the CO 119 construction, replaces the vague "Niwot Trail" directions with the county trail page, and says plainly that restrooms and accessible parking are not yet confirmed. Community adds a sewer row for the Niwot Sanitation District with an address-coverage qualification and rewrites the "ask a neighbor" note. |
| History and trust | Vague citations; promised corrections with nowhere to publish them; newsletter wording | Every timeline entry links to its source (the Historical Society's timeline, the Cultural Arts Association's Whistle Stop Park page) or names an identifiable record (the 2020 Census, Niwot CDP); "county records" is gone, and the caboose has its own dated entry. `src/_data/corrections.js` is the dated log the site had been promising: Our Story renders it in full, and each page renders its own entries. The newsletter is described as occasional, never on a schedule. |
| Mobile | Menu label not reset on Escape; no fallback without scripting | `guide.js` routes every open and close through one function, so `aria-expanded` and the accessible name cannot disagree. Without scripting the navigation shows in full and the button is hidden (`@media (scripting: none)` in `guide.css` and a `<noscript>` rule in the header); `verify.mjs` checks both in a context with JavaScript off. |

### Not applied, and why

- **Official ballot numbering ("Question 1", "Issue 1").** The audit asks
  for the Commission's numbering beside each summary. The sandbox could not
  read the Commission's ballot page, the Courier reported that ballot content
  was still before the Commission with wording to be finalized by September
  11, and the previous PR removed this guide's own numerals precisely
  because they could be mistaken for the ballot's. `election.js` now has an
  `official` field on every question and issue and the template renders it;
  it stays unset until the civic editor has read the labels from the
  certified ballot after the proof review.
- **Chief Niwot and the Arapaho context on Our Story.** The audit calls the
  omission a material gap. The section, its timeline entry and its sources
  were removed at the client's request in the previous PR ("Remove the Chief
  Niwot material", commit `e499beb`), so this branch does not reverse that
  decision on its own. The material is recoverable from git history in one
  step if the decision changes.
- **Redrawing the schematic map** with Niwot Road, 79th Street, named parking
  and a north arrow. The first audit already questioned which side of the
  tracks the map puts Whistle Stop Park and the Diagonal on, and no ground
  truth or base map was available here; adding a north arrow to a map whose
  orientation is in doubt would make it more misleading, not less. A local
  needs to check it first (README item 12).
- **Restrooms, accessible parking, sidewalk and curb-ramp assertions, an
  itinerary.** On-the-ground facts; the page now says the first two are not
  yet confirmed rather than inventing them.
- **A "Call" action on listings.** The site deliberately publishes no phone
  numbers because they change faster than anything else; the policy stands.
- **Share and add-to-calendar actions.** The audit itself says to add them
  only once the dates, times and source URLs are reliable, which is the
  editor gate below.

### Still needs a person (the audit's gates)

1. **Confirm the four event readings on the organizers' pages** — the Art
   Walk and Osmosis hours, the awards night start (organizer 6pm, Business
   Association calendar 5:30pm), Enchanted Evening's date and hours — and
   keep `verifiedAt` and the descriptions honest. The records say where each
   time comes from.
2. **Prove the forms deliver (G1):** one real submission and one signup into
   an owner-controlled inbox, one unsubscribe processed, a failed delivery
   showing an honest error. Nothing was sent during either audit.
3. **Real devices and zoom (G2):** 320, 390, 768 and 1366 CSS pixels,
   portrait and landscape, 200% zoom, iPhone/Safari and Android/Chrome. The
   browser checks cover those widths in Chromium only.
4. **Editor identity and a monitored address** in `site.editor`.
5. **The ballot after the September 11 proof review:** re-verify every
   summary, add the official labels, bump `verified` in `site.js`, and add a
   `corrections.js` entry.
6. **Photo-rights records, the privacy descriptions against the actual
   Vercel and Resend settings, Search Console** — as in the first audit.
7. **`npm run links` from an open network.** This branch adds destinations
   confirmed only as indexed pages: the county planning, road maintenance,
   building-permit, trail-closure, regulations and LoBo pages, the 2017
   Niwot trails map, the Niwot LID page, the Sanitation District, the
   Historical Society, the Community Association, RTD's BOLT route page and
   John's Dry Cleaners' locations page.

### Checks run on this branch

| Check | Result |
|---|---|
| `npm run build` | Clean. 13 files; images from cache |
| `npm test` | 70 / 70 pass (63 before; the seven new tests cover the September 11 hours and Enchanted Evening, the homepage deep links, the calendar rail's month rule, the directory's link labels and layout, the civic page's tasks, qualifications and change note, the privacy wording and editor route, the services destinations and organization kinds, and the corrections log) |
| `npm run verify` | All checks pass with `CHROMIUM_PATH=/opt/pw-browsers/chromium`: no console or CSP errors, no overflow at 320–1440, every image loaded with alt, no text under 12px, no rounded corners, disclaimer verbatim, axe WCAG 2.2 AA zero violations on 10 pages × 2 widths, 337 focus rings on six pages all at 3:1 or better, the calendar rail following the month through three presses of Next, deep links and the day list selecting the event, the homepage cards deep-linking, the directory opening on its search with the active-filter strip, the menu label reset on Escape, and the navigation shown in full with JavaScript off. Note: the first audit's record below says `verify.mjs` passed in its sandbox; in this one the script could not launch Playwright's own browser until pointed at the installed Chromium, so the earlier "baseline passed" from this session was not a real run. This one is |
| `node widths.mjs` | No horizontal overflow on any page at 26 widths from 320 to 2560 |
| Page depth at 1363×936 (the audit's viewport) | Home 5,497px (audit: 6,898); directory search box at y=501 (audit: 906); events 4,581px; civic 5,075px |
| `node lighthouse.mjs` | Accessibility 100, Best Practices 100, SEO 100 on all six pages. Performance 88–91, with the text-only privacy page at 91 — this sandbox's ceiling, as in the first audit (85–91 then); the run also overlapped the browser checks. Confirm on production with PageSpeed Insights, which the audit also asks for (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 in the field) |
| External links | Still not checkable from this sandbox; run `npm run links` from an open network before launch (gate 7 above) |

---


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
