/* Eat & Shop directory: search box and single-select category rail.

   Every listing is in the HTML already — the build renders the full list, so
   the page works without JavaScript and a crawler sees all of it. Filtering
   here only hides rows; it never fetches or rebuilds them. */

const search = document.getElementById('dir-q');
const rows = Array.from(document.querySelectorAll('[data-listing]'));
const chips = Array.from(document.querySelectorAll('[data-chip]'));
const heading = document.querySelector('[data-dir-heading]');
const resultLabel = document.querySelector('[data-dir-count]');
const emptyState = document.querySelector('[data-dir-empty]');
const list = document.querySelector('[data-dir-list]');
const clearButton = document.querySelector('[data-dir-clear]');

if (rows.length && search) {
  const state = { cat: 'All', q: '' };

  const haystack = (row) =>
    [row.dataset.name, row.dataset.category, row.dataset.note, row.dataset.area, row.dataset.address]
      .join(' ')
      .toLowerCase();

  function apply() {
    const query = state.q.trim().toLowerCase();
    let shown = 0;

    rows.forEach((row) => {
      const inCategory = state.cat === 'All' || row.dataset.category === state.cat;
      const matches = !query || haystack(row).indexOf(query) !== -1;
      const visible = inCategory && matches;
      row.hidden = !visible;
      if (visible) shown += 1;
    });

    chips.forEach((chip) => {
      chip.setAttribute('aria-pressed', chip.dataset.chip === state.cat ? 'true' : 'false');
    });

    if (heading) {
      heading.textContent = state.cat === 'All' ? 'Local businesses' : state.cat;
    }
    if (resultLabel) {
      resultLabel.textContent = shown === 1 ? '1 listing' : shown + ' listings';
    }
    if (list) list.hidden = shown === 0;
    if (emptyState) emptyState.hidden = shown !== 0;
  }

  search.addEventListener('input', (event) => {
    state.q = event.target.value;
    apply();
  });

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      state.cat = chip.dataset.chip;
      apply();
    });
  });

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      state.cat = 'All';
      state.q = '';
      search.value = '';
      apply();
      search.focus();
    });
  }

  apply();
}
