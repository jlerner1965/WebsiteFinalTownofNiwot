/* Eat & Shop directory: search box and single-select category filter.

   Every listing is in the HTML already — the build renders the full list, so
   the page works without JavaScript and a crawler sees all of it. Filtering
   here only hides rows; it never fetches or rebuilds them.

   The category is a native radio group, so arrow keys and Tab behave as the
   platform's radios do. The chosen category (and the search text) is kept in
   the URL — /eat-shop/?category=restaurants-bars — so a filtered view can be
   shared, and Back and Forward restore it. The canonical URL stays
   /eat-shop/: a filtered view has no content of its own. */

const form = document.querySelector('[data-dir-filters]');
const search = document.getElementById('dir-q');
const rows = Array.from(document.querySelectorAll('[data-listing]'));
const radios = Array.from(document.querySelectorAll('input[name="category"]'));
const heading = document.querySelector('[data-dir-heading]');
const resultLabel = document.querySelector('[data-dir-count]');
const emptyState = document.querySelector('[data-dir-empty]');
const list = document.querySelector('[data-dir-list]');
const clearButtons = Array.from(document.querySelectorAll('[data-dir-clear]'));
const activeStrip = document.querySelector('[data-dir-active]');
const activeLabel = document.querySelector('[data-dir-active-label]');

if (rows.length && search && radios.length) {
  const known = new Map(radios.map((r) => [r.value, r.closest('label').querySelector('[data-chip-label]').textContent.trim()]));
  const state = { cat: 'all', q: '' };

  const haystack = (row) =>
    [row.dataset.name, row.dataset.category, row.dataset.note, row.dataset.area, row.dataset.address]
      .join(' ')
      .toLowerCase();

  /* Unknown category values fall back to all categories rather than to an
     empty page. */
  function readUrl() {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    return {
      cat: cat && known.has(cat) && cat !== 'all' ? cat : 'all',
      q: (params.get('q') || '').slice(0, 100),
    };
  }

  function writeUrl(push) {
    const params = new URLSearchParams();
    if (state.cat !== 'all') params.set('category', state.cat);
    if (state.q.trim()) params.set('q', state.q.trim());
    const query = params.toString();
    const url = window.location.pathname + (query ? '?' + query : '') + window.location.hash;
    const method = push ? 'pushState' : 'replaceState';
    window.history[method]({ cat: state.cat, q: state.q }, '', url);
  }

  function apply() {
    const query = state.q.trim().toLowerCase();
    let shown = 0;

    rows.forEach((row) => {
      const inCategory = state.cat === 'all' || row.dataset.cat === state.cat;
      const matches = !query || haystack(row).indexOf(query) !== -1;
      const visible = inCategory && matches;
      /* `hidden` removes the row from the layout and the accessibility tree. */
      row.hidden = !visible;
      if (visible) shown += 1;
    });

    radios.forEach((radio) => {
      radio.checked = radio.value === state.cat;
    });

    if (heading) {
      heading.textContent = state.cat === 'all' ? 'Local businesses' : known.get(state.cat);
    }
    if (resultLabel) {
      resultLabel.textContent =
        shown === 0 ? 'No matching businesses' : shown === 1 ? '1 listing' : shown + ' listings';
    }
    if (list) list.hidden = shown === 0;
    if (emptyState) emptyState.hidden = shown !== 0;

    /* Whenever a filter is in force, say which, with a reset beside it, so
       a reader who arrived on a filtered URL can see why the list is short. */
    const parts = [];
    if (state.cat !== 'all') parts.push(known.get(state.cat));
    if (query) parts.push('“' + state.q.trim() + '”');
    if (activeStrip) activeStrip.hidden = parts.length === 0;
    if (activeLabel) activeLabel.textContent = parts.join(' · ');
  }

  function sync(fromUrl) {
    Object.assign(state, fromUrl);
    search.value = state.q;
    apply();
  }

  if (form) {
    /* With JavaScript the filters apply as they change; a submit would only
       reload the page. Without JavaScript the form still works as a GET. */
    form.addEventListener('submit', (event) => event.preventDefault());
  }

  search.addEventListener('input', (event) => {
    state.q = event.target.value;
    writeUrl(false);
    apply();
  });

  radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      state.cat = radio.value;
      writeUrl(true);
      apply();
    });
  });

  clearButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.cat = 'all';
      state.q = '';
      search.value = '';
      writeUrl(true);
      apply();
      search.focus();
    });
  });

  window.addEventListener('popstate', () => sync(readUrl()));

  /* Initial state from the URL. An unknown category is normalised away so
     the history entry matches what is shown. */
  sync(readUrl());
  writeUrl(false);
}
