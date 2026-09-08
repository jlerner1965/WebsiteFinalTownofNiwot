/* Events page: the month calendar and its detail rail.

   The build renders the current month at deploy time; this takes over on load
   and drives it from the real date, so the page is right whenever it is read
   rather than whenever it was built. */
import {
  MONTHS,
  buildCells,
  buildUpcoming,
  detailFor,
  renderCells,
  renderDetail,
  renderUpcoming,
  seriesOn,
} from './calendar-core.js';
import { readSeries, today } from './series-data.js';

const series = readSeries();
const grid = document.querySelector('[data-cal-grid]');
const label = document.querySelector('[data-cal-label]');
const detailRail = document.querySelector('[data-cal-detail]');
const strip = document.querySelector('[data-upcoming]');
const thisMonthBtn = document.querySelector('[data-cal-today]');
const prevBtn = document.querySelector('[data-cal-prev]');
const nextBtn = document.querySelector('[data-cal-next]');

if (series.length && grid && label && detailRail) {
  const now = today();
  const state = { year: now.getFullYear(), month: now.getMonth(), sel: null };

  function currentDetail() {
    if (state.sel != null) {
      const hits = seriesOn(series, state.year, state.month, state.sel);
      if (hits.length) {
        return detailFor(hits[0], new Date(state.year, state.month, state.sel));
      }
    }
    /* The rail is never empty: with nothing selected it shows the next
       occurrence anywhere in the series. */
    const upcoming = buildUpcoming(series, now, 1);
    return upcoming.length
      ? detailFor(upcoming[0].series, upcoming[0].date)
      : detailFor(series[0], null);
  }

  function render() {
    grid.innerHTML = renderCells(buildCells(series, state.year, state.month, state.sel));
    label.textContent = MONTHS[state.month] + ' ' + state.year;
    detailRail.innerHTML = renderDetail(currentDetail());
    if (thisMonthBtn) {
      const onCurrentMonth =
        state.year === now.getFullYear() && state.month === now.getMonth();
      thisMonthBtn.hidden = onCurrentMonth;
    }
  }

  function shift(step) {
    let month = state.month + step;
    let year = state.year;
    if (month > 11) { month = 0; year += 1; }
    if (month < 0) { month = 11; year -= 1; }
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
      state.year = now.getFullYear();
      state.month = now.getMonth();
      state.sel = null;
      render();
    });
  }

  /* "View details" in the Coming up strip jumps the calendar to that day. */
  if (strip) {
    strip.innerHTML = renderUpcoming(buildUpcoming(series, now, 3), 'select', now);
    strip.addEventListener('click', (event) => {
      const button = event.target.closest('[data-jump]');
      if (!button) return;
      const [year, month, day] = button.dataset.jump.split('-').map(Number);
      state.year = year;
      state.month = month;
      state.sel = day;
      render();
      grid.scrollIntoView({ block: 'center' });
    });
  }

  render();
}
