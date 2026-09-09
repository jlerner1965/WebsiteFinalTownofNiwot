/* Events page: the month calendar and its detail rail.

   The build renders the current month at deploy time; this takes over on load
   and drives it from the real time in Niwot, so the page is right whenever it
   is read rather than whenever it was built.

   The rail always describes the month on screen. With no day chosen it shows
   the first day of that month still ahead; a month with nothing ahead says
   so and points at the next confirmed date. A day with several events lists
   them compactly and expands one. The chosen day and event live in the URL
   (?date=YYYY-MM-DD&event=id), which is how the homepage cards open one
   occurrence directly. */
import {
  MONTHS,
  buildCells,
  buildUpcoming,
  detailFor,
  instancesInMonth,
  instancesOn,
  isIsoDateString,
  isoDate,
  monthDefault,
  parseIso,
  renderCells,
  renderDetail,
  renderMonthEmpty,
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
  const state = { year: today.y, month: today.m, sel: null, pick: null };

  /* A deep link names a day (and optionally an event on it). It is honoured
     only when that day actually carries something; otherwise the calendar
     opens as usual. */
  function readUrl() {
    const params = new URLSearchParams(window.location.search);
    const date = params.get('date');
    if (!isIsoDateString(date) || !instancesOn(events, date).length) return;
    const { y, m, d } = parseIso(date);
    state.year = y;
    state.month = m;
    state.sel = d;
    state.pick = params.get('event') || null;
  }

  function writeUrl() {
    const params = new URLSearchParams();
    if (state.sel != null) {
      params.set('date', isoDate(state.year, state.month, state.sel));
      if (state.pick) params.set('event', state.pick);
    }
    const query = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (query ? '?' + query : '') + window.location.hash);
  }

  /* The day the rail describes: the chosen one if it carries an event,
     otherwise the month's first day still ahead, otherwise nothing. */
  function shownDay() {
    if (state.sel != null) {
      const hits = instancesOn(events, isoDate(state.year, state.month, state.sel));
      if (hits.length) return { day: state.sel, instances: hits };
    }
    return monthDefault(events, state.year, state.month, now);
  }

  function render() {
    const shown = shownDay();
    grid.innerHTML = renderCells(buildCells(events, state.year, state.month, shown ? shown.day : null));
    label.textContent = MONTHS[state.month - 1] + ' ' + state.year;
    if (shown) {
      detailRail.innerHTML = renderDetail(shown.instances.map((i) => detailFor(i, now)), { pick: state.pick, interactive: true });
    } else {
      const next = buildUpcoming(events, now, 1)[0] || null;
      detailRail.innerHTML = renderMonthEmpty(state.year, state.month, now, next, instancesInMonth(events, state.year, state.month).length > 0);
    }
    if (thisMonthBtn) {
      thisMonthBtn.hidden = state.year === today.y && state.month === today.m;
    }
    writeUrl();
  }

  function shift(step) {
    let month = state.month + step;
    let year = state.year;
    if (month > 12) { month = 1; year += 1; }
    if (month < 1) { month = 12; year -= 1; }
    state.year = year;
    state.month = month;
    state.sel = null;
    state.pick = null;
    render();
  }

  grid.addEventListener('click', (event) => {
    const cell = event.target.closest('[data-date]');
    if (!cell || cell.disabled) return;
    state.sel = Number(cell.dataset.date);
    state.pick = null;
    render();
    /* render() replaced the button, so restore focus to its replacement. */
    const restored = grid.querySelector('[data-date="' + state.sel + '"]');
    if (restored) restored.focus();
  });

  /* Choosing one event on a busy day. */
  detailRail.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pick]');
    if (!button) return;
    const shown = shownDay();
    if (shown) state.sel = shown.day;
    state.pick = button.dataset.pick;
    render();
    const restored = detailRail.querySelector('[data-pick="' + state.pick + '"]');
    if (restored) restored.focus();
  });

  if (prevBtn) prevBtn.addEventListener('click', () => shift(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => shift(1));
  if (thisMonthBtn) {
    thisMonthBtn.addEventListener('click', () => {
      state.year = today.y;
      state.month = today.m;
      state.sel = null;
      state.pick = null;
      render();
    });
  }

  /* "View details" in the Coming up strip jumps the calendar to that day
     and expands that event. */
  if (strip) {
    strip.innerHTML = renderUpcoming(buildUpcoming(events, now), 'select', now);
    strip.addEventListener('click', (event) => {
      const button = event.target.closest('[data-jump]');
      if (!button) return;
      const { y, m, d } = parseIso(button.dataset.jump);
      state.year = y;
      state.month = m;
      state.sel = d;
      state.pick = button.dataset.jumpEvent || null;
      render();
      grid.scrollIntoView({ block: 'center' });
      const cell = grid.querySelector('[data-date="' + d + '"]');
      if (cell) cell.focus();
    });
  }

  readUrl();
  render();
}
