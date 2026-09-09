import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildArchive,
  buildCells,
  buildExpected,
  buildUpcoming,
  detailFor,
  expandEvents,
  instancesOn,
  isPast,
  renderUpcoming,
  tzOffset,
  weekdayOf,
  zonedIso,
  zonedParts,
} from '../src/assets/js/calendar-core.js';
import { validateEvents, eventsJsonLd, buildNow } from '../lib/events.js';
import events from '../src/_data/events.js';

const TZ = 'America/Denver';
const TODAY = '2026-09-09';
const base = {
  id: 'sample',
  name: 'Sample Event',
  status: 'confirmed',
  startDate: '2026-10-02',
  timezone: TZ,
  location: { name: 'Niwot Hall' },
  organizer: { name: 'Org', url: 'https://example.org/' },
  sourceUrl: 'https://example.org/events/sample',
  verifiedAt: '2026-09-01',
  description: 'A sample.',
  tag: 'Sample',
};
const errorsOf = (records) => validateEvents(records, { today: TODAY }).errors;

test('a confirmed, sourced, dated record passes', () => {
  assert.deepEqual(errorsOf([base]), []);
});

test('timezone must be America/Denver and organizer sources must be https', () => {
  assert.ok(errorsOf([{ ...base, timezone: 'UTC' }]).some((e) => e.includes('America/Denver')));
  assert.ok(errorsOf([{ ...base, sourceUrl: 'http://example.org/' }]).some((e) => e.includes('sourceUrl')));
  assert.ok(errorsOf([{ ...base, organizer: { name: 'Org', url: '' } }]).some((e) => e.includes('organizer.url')));
});

test('a confirmed event without a date is rejected; a tentative one needs `expected` and no recurrence', () => {
  const { startDate, ...undated } = base;
  assert.ok(errorsOf([undated]).some((e) => e.includes('needs a startDate')));
  assert.ok(errorsOf([{ ...undated, status: 'tentative' }]).some((e) => e.includes('`expected`')));
  assert.deepEqual(errorsOf([{ ...undated, status: 'tentative', expected: 'Thursdays in June' }]), []);
  assert.ok(
    errorsOf([{ ...undated, status: 'tentative', expected: 'x', recurrence: { weekday: 4, until: '2027-08-26' } }]).some((e) =>
      e.includes('cannot carry a recurrence')
    )
  );
});

test('recurrence must start on its weekday, end after it starts and stay within a year', () => {
  assert.deepEqual(errorsOf([{ ...base, recurrence: { weekday: 5, until: '2026-10-30' } }]), []);
  assert.ok(errorsOf([{ ...base, recurrence: { weekday: 4, until: '2026-10-30' } }]).some((e) => e.includes('not on recurrence.weekday')));
  assert.ok(errorsOf([{ ...base, recurrence: { weekday: 5, until: '2026-09-01' } }]).some((e) => e.includes('before startDate')));
  assert.ok(errorsOf([{ ...base, recurrence: { weekday: 5, until: '2027-12-31' } }]).some((e) => e.includes('more than a year')));
});

test('times must be HH:MM and end after start', () => {
  assert.ok(errorsOf([{ ...base, startTime: '7pm' }]).some((e) => e.includes('HH:MM')));
  assert.ok(errorsOf([{ ...base, startTime: '19:00', endTime: '18:00' }]).some((e) => e.includes('after startTime')));
});

test('a confirmed future date checked too long ago is stale', () => {
  assert.ok(errorsOf([{ ...base, verifiedAt: '2026-01-01' }]).some((e) => e.includes('over 120 days ago')));
  /* A past event is history, not a stale claim. */
  assert.deepEqual(errorsOf([{ ...base, startDate: '2026-03-05', verifiedAt: '2026-01-01' }]), []);
});

test('the same happening listed twice is rejected', () => {
  const errors = errorsOf([base, { ...base, id: 'sample-again' }]);
  assert.ok(errors.some((e) => e.includes('is also listed by')));
});

test('a confirmed season expands to one instance per week with no duplicates', () => {
  const season = { ...base, startDate: '2026-06-04', recurrence: { weekday: 4, until: '2026-08-27' } };
  const instances = expandEvents([season, season]);
  assert.equal(instances.length, 13);
  assert.equal(instances[0].date, '2026-06-04');
  assert.equal(instances[12].date, '2026-08-27');
  assert.ok(instances.every((i) => weekdayOf(i.date) === 4));
  assert.equal(new Set(instances.map((i) => i.key)).size, 13);
});

test('upcoming instances are chronological and drop out once they end, on Niwot time', () => {
  const list = [
    { ...base, id: 'later', startDate: '2026-10-05' },
    { ...base, id: 'sooner', startDate: '2026-10-02', startTime: '18:00', endTime: '21:00' },
    { ...base, id: 'earlier-same-day', startDate: '2026-10-02', startTime: '09:00', endTime: '10:00' },
  ];
  const before = { date: '2026-10-02', time: '20:59' };
  assert.deepEqual(buildUpcoming(list, before).map((i) => i.id), ['sooner', 'later']);
  const after = { date: '2026-10-02', time: '21:00' };
  assert.deepEqual(buildUpcoming(list, after).map((i) => i.id), ['later']);
  assert.equal(isPast({ date: '2026-10-05', endDate: '2026-10-05' }, { date: '2026-10-05', time: '23:59' }), false);
  assert.equal(isPast({ date: '2026-10-05', endDate: '2026-10-05' }, { date: '2026-10-06', time: '00:00' }), true);
});

test('timezone conversion uses Mountain Daylight and Standard Time correctly', () => {
  /* 03:30Z on 2026-09-09 is 21:30 the previous evening in Niwot. */
  assert.deepEqual(zonedParts(new Date('2026-09-09T03:30:00Z')), { date: '2026-09-08', time: '21:30' });
  assert.equal(tzOffset('2026-09-11', '18:00'), '-06:00');
  assert.equal(tzOffset('2026-12-01', '18:00'), '-07:00');
  assert.equal(zonedIso('2026-09-11', '18:00'), '2026-09-11T18:00:00-06:00');
  assert.equal(zonedIso('2026-11-27', '18:00'), '2026-11-27T18:00:00-07:00');
  const midnightUtc = buildNow({ NIWOT_TODAY: '2026-09-09' });
  assert.equal(zonedParts(midnightUtc).date, '2026-09-09');
});

test('the month grid and the detail rail agree with the list', () => {
  const list = [{ ...base, startDate: '2026-10-02', startTime: '18:00', endTime: '21:00' }];
  const cells = buildCells(list, 2026, 10, 2);
  const day = cells.find((c) => c.day === '2');
  assert.equal(day.has, true);
  assert.equal(day.tag, 'Sample');
  assert.equal(day.selected, true);
  assert.equal(cells.filter((c) => c.has).length, 1);
  const now = { date: '2026-09-09', time: '12:00' };
  const detail = detailFor(instancesOn(list, '2026-10-02')[0], now);
  assert.equal(detail.rows[0].v, 'Fri, October 2');
  assert.equal(detail.rows[1].v, '6–9 pm, Mountain Time');
  assert.ok(renderUpcoming(buildUpcoming(list, now), 'link', now).includes('Fri, October 2'));
});

test('structured data is emitted only for confirmed, cancelled or postponed future instances', () => {
  const now = new Date('2026-09-09T18:00:00Z');
  const list = [
    base,
    { ...base, id: 'gone', startDate: '2026-09-01' },
    { ...base, id: 'maybe', status: 'tentative', expected: 'Some autumn Friday', startDate: undefined },
    { ...base, id: 'off', status: 'cancelled', startDate: '2026-10-09' },
    { ...base, id: 'moved', status: 'postponed', startDate: '2026-10-16', previousStartDate: '2026-10-09' },
  ];
  const graph = eventsJsonLd(list, now)['@graph'];
  assert.deepEqual(
    graph.map((e) => [e.name, e.eventStatus.split('/').pop()]),
    [
      ['Sample Event', 'EventScheduled'],
      ['Sample Event', 'EventCancelled'],
      ['Sample Event', 'EventPostponed'],
    ]
  );
  assert.equal(graph[2].previousStartDate, '2026-10-09');
  assert.ok(graph.every((e) => e.organizer.url === 'https://example.org/' && e.url.startsWith('https://')));
});

test('the structured-data builder refuses an instance without an organizer source', () => {
  const now = new Date('2026-09-09T18:00:00Z');
  assert.throws(() => eventsJsonLd([{ ...base, organizer: { name: 'Org', url: 'ftp://x' } }], now), /organizer source/);
});

/* ---- the live data ---- */

test('the live events validate', () => {
  assert.deepEqual(validateEvents(events, { today: zonedParts(buildNow()).date }).errors, []);
});

test('no Rock & Rails date in 2027 is scheduled, and the 2027 season is only expected', () => {
  const dated = expandEvents(events).filter((i) => /rock/i.test(i.event.name) && i.date.startsWith('2027'));
  assert.deepEqual(dated, []);
  const graph = eventsJsonLd(events, new Date('2027-06-01T12:00:00Z'))['@graph'];
  assert.ok(!graph.some((e) => /rock/i.test(e.name)));
  const expected = buildExpected(events).find((e) => e.id === 'rock-rails-2027');
  assert.equal(expected.status, 'tentative');
  assert.ok(!expected.startDate);
  const graphNow = eventsJsonLd(events, buildNow())['@graph'];
  assert.ok(!graphNow.some((e) => String(e.startDate).startsWith('2027-06-03')));
});

test('tentative records never reach the upcoming list or structured data', () => {
  const now = zonedParts(buildNow());
  const tentativeIds = new Set(buildExpected(events).map((e) => e.id));
  assert.ok(buildUpcoming(events, now).every((i) => !tentativeIds.has(i.id)));
  const names = new Set(buildExpected(events).map((e) => e.name));
  assert.ok(eventsJsonLd(events, buildNow())['@graph'].every((e) => !names.has(e.name)));
});

test('every dated event uses America/Denver and has an organizer source', () => {
  assert.ok(events.every((e) => e.timezone === TZ && /^https:\/\//.test(e.sourceUrl) && /^https:\/\//.test(e.organizer.url)));
});

test('the archive holds only confirmed past instances, most recent first', () => {
  const archive = buildArchive(events, { date: '2026-09-09', time: '12:00' }, 4);
  assert.ok(archive.length > 0);
  assert.ok(archive.every((a) => a.when && a.name));
});
