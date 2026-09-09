/* Business directory: record schema, build-time validation and publication.

   The data lives in src/_data/listings.js. This module is the gate it passes
   through on every build: a record that fails validation stops the build with
   a message naming the record and the field, so a bad row cannot reach the
   page quietly.

   Record shape
   -----------
   slug           stable identifier, also the row's anchor (#slug)      required
   name                                                                  required
   category       slug of a category in CATEGORIES                       required
   description    one or two sentences from a source; omitted otherwise
   address        street address as published, with suite where unambiguous
   postalCode     only where a source publishes one
   area           district or landmark — Old Town, Cottonwood Square, …
   website        the business's own site (https)
   sourceUrl      where the record was checked (own site, Association
                  listing, or a dated Courier report)                    required
   verifiedAt     YYYY-MM-DD, the day the record was last checked        required
   status         active | temporarily_closed | closed | unverified      required
   editorialNote  internal — never rendered unless `publishNote` is true
   sharesAddress  true when the address is knowingly shared with another
                  published record (a shop inside the market, two suites)
   schemaType     the most specific Schema.org type that is reliable;
                  defaults to LocalBusiness

   Freshness
   ---------
   An active record is stale after FRESHNESS_DAYS. The build fails on a stale
   record rather than shipping a directory that claims to be checked. Re-check
   the row against its source and update `verifiedAt`, or change `status` to
   `unverified` with a note; there is no override. */

export const FRESHNESS_DAYS = 180;

export const STATUSES = ['active', 'temporarily_closed', 'closed', 'unverified'];
export const PUBLISHED_STATUSES = ['active', 'temporarily_closed'];

export const CATEGORIES = [
  { slug: 'restaurants-bars', label: 'Restaurants & Bars' },
  { slug: 'coffee-bakery', label: 'Coffee, Bakery & Sweets' },
  { slug: 'grocery-provisions', label: 'Grocery & Provisions' },
  { slug: 'shops-gifts', label: 'Shops & Gifts' },
  { slug: 'arts-makers', label: 'Arts & Makers' },
  { slug: 'health-wellness', label: 'Health & Wellness' },
  { slug: 'beauty-personal-care', label: 'Beauty & Personal Care' },
  { slug: 'everyday-services', label: 'Everyday Services' },
  { slug: 'professional-services', label: 'Professional Services' },
  { slug: 'stay-the-night', label: 'Stay the Night' },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(toIso + 'T00:00:00Z') - Date.parse(fromIso + 'T00:00:00Z')) / 86400000);
}

/* "September 9, 2026" from "2026-09-09". Rendered without a timezone so the
   date on the page is the date in the file. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function humanDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function normaliseName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[’'"]/g, '')
    .replace(/&/g, 'and')
    .replace(/\b(the|llc|llp|inc)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function normaliseAddress(address) {
  return String(address)
    .toLowerCase()
    .replace(/\bsecond\b/g, '2nd')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bstreet\b/g, 'st')
    .replace(/\broad\b/g, 'rd')
    .replace(/\b(suite|ste|unit|#)\s*/g, 'suite ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function checkUrl(value, field, record, errors) {
  if (value === undefined) return;
  let url;
  try {
    url = new URL(value);
  } catch {
    errors.push(`${record.slug || record.name}: ${field} is not a valid URL (${value})`);
    return;
  }
  if (url.protocol === 'http:') {
    errors.push(`${record.slug || record.name}: ${field} uses http:// — use the https:// address (${value})`);
  } else if (url.protocol !== 'https:') {
    errors.push(`${record.slug || record.name}: ${field} must be an https:// URL (${value})`);
  }
}

/* Validate a set of records. Returns { errors, warnings }; `errors` non-empty
   means the data must not be published. `today` is injectable for tests. */
export function validateListings(records, { today = new Date().toISOString().slice(0, 10), freshnessDays = FRESHNESS_DAYS, categories = CATEGORIES } = {}) {
  const errors = [];
  const warnings = [];
  const categorySlugs = new Set(categories.map((c) => c.slug));
  const seenSlugs = new Map();
  const seenNames = new Map();

  if (!Array.isArray(records)) return { errors: ['listings: expected an array of records'], warnings };

  records.forEach((r, i) => {
    const id = r.slug || r.name || `#${i}`;
    if (!r.slug || !SLUG.test(r.slug)) errors.push(`${id}: slug is missing or not lower-case-hyphenated`);
    if (!r.name || typeof r.name !== 'string' || !r.name.trim()) errors.push(`${id}: name is missing`);
    if (!r.category) errors.push(`${id}: category is missing`);
    else if (!categorySlugs.has(r.category)) errors.push(`${id}: category "${r.category}" is not one of ${[...categorySlugs].join(', ')}`);
    if (!r.sourceUrl) errors.push(`${id}: sourceUrl is missing — every record names where it was checked`);
    if (!r.verifiedAt) errors.push(`${id}: verifiedAt is missing`);
    else if (!isIsoDate(r.verifiedAt)) errors.push(`${id}: verifiedAt "${r.verifiedAt}" is not a YYYY-MM-DD date`);
    /* One day of tolerance: an editor east of Colorado, or a build running
       after midnight UTC, may legitimately stamp tomorrow's Niwot date. */
    else if (daysBetween(today, r.verifiedAt) > 1) errors.push(`${id}: verifiedAt ${r.verifiedAt} is in the future`);
    if (!r.status) errors.push(`${id}: status is missing`);
    else if (!STATUSES.includes(r.status)) errors.push(`${id}: status "${r.status}" is not one of ${STATUSES.join(', ')}`);

    checkUrl(r.website, 'website', r, errors);
    checkUrl(r.sourceUrl, 'sourceUrl', r, errors);

    if (r.description !== undefined && typeof r.description !== 'string') errors.push(`${id}: description must be a string`);
    if (r.editorialNote !== undefined && typeof r.editorialNote !== 'string') errors.push(`${id}: editorialNote must be a string`);
    if ((r.status === 'closed' || r.status === 'unverified') && !r.editorialNote) {
      errors.push(`${id}: a ${r.status} record needs an editorialNote saying why and citing the source`);
    }

    if (r.slug) {
      if (seenSlugs.has(r.slug)) errors.push(`${id}: duplicate slug (also record #${seenSlugs.get(r.slug)})`);
      seenSlugs.set(r.slug, i);
    }
    if (r.name) {
      const key = normaliseName(r.name);
      if (seenNames.has(key)) errors.push(`${id}: duplicate business — "${r.name}" also appears as record #${seenNames.get(key)}`);
      seenNames.set(key, i);
    }

    if (PUBLISHED_STATUSES.includes(r.status) && r.verifiedAt && isIsoDate(r.verifiedAt)) {
      const age = daysBetween(r.verifiedAt, today);
      if (age > freshnessDays) {
        errors.push(`${id}: verified ${age} days ago (${r.verifiedAt}), over the ${freshnessDays}-day freshness threshold. Re-check it against ${r.sourceUrl || 'its source'} and update verifiedAt, or set status to "unverified" with a note.`);
      }
    }
  });

  /* Two published records at one address usually means one replaced the
     other. Where the sharing is real — a counter inside the market, two
     suites in one building — each record says so with `sharesAddress`. */
  const byAddress = new Map();
  records
    .filter((r) => PUBLISHED_STATUSES.includes(r.status) && r.address)
    .forEach((r) => {
      const key = normaliseAddress(r.address);
      if (!byAddress.has(key)) byAddress.set(key, []);
      byAddress.get(key).push(r);
    });
  for (const [, group] of byAddress) {
    if (group.length < 2) continue;
    const unflagged = group.filter((r) => r.sharesAddress !== true);
    if (unflagged.length) {
      errors.push(
        `Address "${group[0].address}" is used by ${group.map((r) => r.name).join(', ')}. If one replaced another, close the old record; if they genuinely share the address, set sharesAddress: true on each (missing on: ${unflagged.map((r) => r.slug).join(', ')}).`
      );
    }
  }

  return { errors, warnings };
}

export function assertValidListings(records, options) {
  const { errors } = validateListings(records, options);
  if (errors.length) {
    throw new Error(`Business directory failed validation (${errors.length}):\n  - ${errors.join('\n  - ')}`);
  }
}

/* Where a row's link goes, said plainly. A business with a site of its own
   gets "Website"; one whose record is its Association listing page gets
   "Hours & contact", which is what that page holds; one that could only be
   traced to the Association's directory as a whole says so, since the reader
   will have to search there. */
const ASSOCIATION_HOME = 'https://niwot.com/';
const ASSOCIATION_LISTING = /^https:\/\/niwot\.com\/listing\//;
export function linkLabelFor(record) {
  if (record.website) return 'Website';
  if (ASSOCIATION_LISTING.test(record.sourceUrl || '')) return 'Hours & contact';
  if (record.sourceUrl === ASSOCIATION_HOME) return 'Find in the Association directory';
  return 'Source';
}

/* The published view: active and temporarily-closed records, grouped in
   category order, each carrying its display label and link. Closed and
   unverified records stay in the data as a record of what was checked but
   are never rendered. */
export function publishListings(records, categories = CATEGORIES) {
  const order = new Map(categories.map((c, i) => [c.slug, i]));
  const labels = new Map(categories.map((c) => [c.slug, c.label]));
  const entries = records
    .filter((r) => PUBLISHED_STATUSES.includes(r.status))
    .map((r, i) => ({
      ...r,
      categoryLabel: labels.get(r.category),
      href: r.website || r.sourceUrl,
      linkLabel: linkLabelFor(r),
      verifiedLabel: humanDate(r.verifiedAt),
      publicNote: r.publishNote === true ? r.editorialNote : undefined,
      _i: i,
    }))
    .sort((a, b) => order.get(a.category) - order.get(b.category) || a._i - b._i)
    .map(({ _i, editorialNote, ...rest }) => rest);

  const counts = categories
    .map((c) => ({ ...c, count: entries.filter((e) => e.category === c.slug).length }))
    .filter((c) => c.count > 0);

  const dates = [...new Set(entries.map((e) => e.verifiedAt))].sort();
  const earliest = dates[0];
  const latest = dates[dates.length - 1];
  const verifiedSummary =
    dates.length === 1
      ? `Every listing was last checked on ${humanDate(latest)}.`
      : `Listings were last checked between ${humanDate(earliest)} and ${humanDate(latest)}; each row shows its own date.`;

  return {
    entries,
    categories: [{ slug: 'all', label: 'All categories', count: entries.length }].concat(counts),
    verified: { earliest, latest, uniform: dates.length === 1, summary: verifiedSummary, latestLabel: humanDate(latest) },
  };
}
