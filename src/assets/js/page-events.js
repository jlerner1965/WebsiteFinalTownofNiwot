/* Events page: the month calendar and its detail rail.

   The build renders the current month at deploy time; this takes over on load
   and drives it from the real time in Niwot, so the page is right whenever it
   is read rather than whenever it was built. */
import {
  MONTHS,
  buildCells,
  buildUpcoming,
  detailFor,
  instancesOn,
  isoDate,
  parseIso,
  renderCells,
  renderDetail,
  renderUpcoming,
} from './calendar-core.js';
import { readEvents, now as nowInNiwot } from './events-data.js';

const events = readEvents();
const grid = document.querySelector('[data-cal-grid]');
const label = document.querySelector('[data-cal-label]');
const detailRail = document.querySelector('[data-cal-detail]');
const strip = document.querySelector('[data-upcoming]');
const thisMonthBtn = document.querySelector('[data-cal-today]');
const prevBtn = document.querySelector('[data-cal-prev]');
const nextBtn = document.querySelector('[data-cal-next]');

if (events.length && grid && label && detailRail) {
  const now = nowInNiwot();
  const today = parseIso(now.date);
  const state = { year: today.y, month: today.m, sel: null };

  function currentDetail() {
    if (state.sel != null) {
      const hits = instancesOn(events, isoDate(state.year, state.month, state.sel));
      if (hits.length) return hits.map((i) => detailFor(i, now));
    }
    /* The rail is never empty: with nothing selected it shows the next
       occurrence and everything else on that day. */
    const upcoming = buildUpcoming(events, now, 1);
    if (!upcoming.length) return null;
    return instancesOn(events, upcoming[0].date).map((i) => detailFor(i, now));
  }

  function render() {
    grid.innerHTML = renderCells(buildCells(events, state.year, state.month, state.sel));
    label.textContent = MONTHS[state.month - 1] + ' ' + state.year;
    const detail = currentDetail();
    if (detail) detailRail.innerHTML = renderDetail(detail);
    if (thisMonthBtn) {
      thisMonthBtn.hidden = state.year === today.y && state.month === today.m;
    }
  }

  function shift(step) {
    let month = state.month + step;
    let year = state.year;
    if (month > 12) { month = 1; year += 1; }
    if (month < 1) { month = 12; year -= 1; }
    state.year = year;
    state.month = month;
    state.sel = null;
    render();
  }

  grid.addEventListener('click', (event) => {
    const cell = event.target.closest('[data-date]');
    if (!cell || cell.disabled) return;
    state.sel = Number(cell.dataset.date);
    render();
    /* render() replaced the button, so restore focus to its replacement. */
    const restored = grid.querySelector('[data-date="' + state.sel + '"]');
    if (restored) restored.focus();
  });

  if (prevBtn) prevBtn.addEventListener('click', () => shift(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => shift(1));
  if (thisMonthBtn) {
    thisMonthBtn.addEventListener('click', () => {
      state.year = today.y;
      state.month = today.m;
      state.sel = null;
      render();
    });
  }

  /* "View details" in the Coming up strip jumps the calendar to that day. */
  if (strip) {
    strip.innerHTML = renderUpcoming(buildUpcoming(events, now), 'select', now);
    strip.addEventListener('click', (event) => {
      const button = event.target.closest('[data-jump]');
      if (!button) return;
      const { y, m, d } = parseIso(button.dataset.jump);
      state.year = y;
      state.month = m;
      state.sel = d;
      render();
      grid.scrollIntoView({ block: 'center' });
      const cell = grid.querySelector('[data-date="' + d + '"]');
      if (cell) cell.focus();
    });
  }

  render();
}
