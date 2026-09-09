/* Events, as dated records checked against the organizer's own page.

   The rules and the editorial workflow are documented in lib/events.js.
   The short version:

   - A record is `confirmed` only when the organizer has published that
     date. `sourceUrl` is the page it was read from and `verifiedAt` the day
     it was read.
   - A season the organizer runs every year but has not yet announced is a
     `tentative` record: it carries the organizer's own wording in
     `expected`, no dates, and is shown under "Expected — date not
     confirmed". It never enters the upcoming list or structured data.
     Rock & Rails 2027 is the standing example: the season's dates are
     published in the spring, and none exist yet.
   - `recurrence` is for an organizer-confirmed season only — "every
     Friday, June 12 to September 18" — and expands to one instance a week.
   - Everything is in Niwot's own timezone, America/Denver.

   Reconciled against niwot.com (Niwot Business Association), niwotarts.org
   and the Left Hand Valley Courier on 2026-09-09. Two things were not
   published on purpose: the Niwot Farmers Market, for which no organizer
   source for a current season could be found, and third-party listings
   that gave Halloween and holiday dates matching an earlier year's calendar.

   Second pass, 2026-09-09: the external pre-launch audit checked four
   records against the dated occurrences on the organizers' pages and found
   the Art Walk and the Osmosis opening published with hours (5–9 pm), the
   awards night listed from 5:30 pm on the Business Association's calendar
   against 6 pm on the organizer's own page, and Enchanted Evening already
   dated November 27, 2026, 6–9 pm. Those readings are applied below. The
   audit environment could not open the organizer sites directly, so the
   editor should confirm each of the four on the cited page before the
   launch announcement — the description of each says where its time
   comes from. Where two organizer pages disagree, the record carries the
   organizer's own page and says that they disagree. */
import { assertValidEvents, buildNow } from '../../lib/events.js';
import { zonedParts } from '../assets/js/calendar-core.js';

const TZ = 'America/Denver';
const CHECKED = '2026-09-09';

const nba = { name: 'Niwot Business Association', url: 'https://niwot.com/' };
const ncaa = { name: 'Niwot Cultural Arts Association', url: 'https://niwotarts.org/' };

const records = [
  /* ---- 2026 season, confirmed by the organizer ---- */
  {
    id: 'rock-rails-2026',
    name: 'Rock & Rails concert series',
    status: 'confirmed',
    startDate: '2026-06-04',
    recurrence: { weekday: 4, until: '2026-08-27' },
    startTime: '17:00',
    endTime: '21:00',
    timezone: TZ,
    location: { name: 'Whistle Stop Park, Old Town' },
    organizer: ncaa,
    sourceUrl: 'https://niwotarts.org/rock-rails/',
    verifiedAt: CHECKED,
    cost: 'Free admission',
    tag: 'Concert',
    description:
      'The free Thursday-evening concert series on the lawn beside the caboose at Whistle Stop Park, produced by the Niwot Cultural Arts Association with the Niwot Business Association. The 2026 season ran June 4 to August 27, with happy hour and opening music from 5pm and the headline band from 6:30pm.',
  },
  {
    id: 'rise-benefit-concert-2026',
    name: 'Rise Benefit Concert at Whistle Stop Park',
    status: 'confirmed',
    startDate: '2026-09-03',
    startTime: '17:00',
    endTime: '21:00',
    timezone: TZ,
    location: { name: 'Whistle Stop Park, Old Town' },
    organizer: nba,
    sourceUrl: 'https://niwot.com/upcoming-events/',
    verifiedAt: CHECKED,
    cost: 'Free admission',
    tag: 'Concert',
    description:
      'A Rock & Rails-format evening after the regular season, held to celebrate and raise funds for the Jared Music Foundation.',
  },
  {
    id: 'dancing-under-the-stars-2026',
    name: 'Dancing Under the Stars',
    status: 'confirmed',
    startDate: '2026-06-12',
    recurrence: { weekday: 5, until: '2026-09-18' },
    startTime: '19:00',
    endTime: '21:30',
    timezone: TZ,
    location: { name: 'Cottonwood Square', address: 'Niwot Road and 79th Street' },
    organizer: nba,
    sourceUrl: 'https://niwot.com/events/dancing-under-the-stars-2026/',
    verifiedAt: CHECKED,
    cost: 'Free',
    tag: 'Dance',
    description:
      'A free dance lesson at 7pm, then social dancing with a DJ from 7:45pm, outdoors in Cottonwood Square. Every Friday evening of the season, June 12 to September 18.',
  },
  {
    id: 'second-friday-art-walk-2026-09-11',
    name: 'Second Friday Art Walk',
    status: 'confirmed',
    startDate: '2026-09-11',
    startTime: '17:00',
    endTime: '21:00',
    timezone: TZ,
    location: { name: 'Old Town and Cottonwood Square' },
    organizer: nba,
    sourceUrl: 'https://niwot.com/upcoming-events/',
    verifiedAt: CHECKED,
    cost: 'Free',
    tag: 'Art walk',
    description:
      'Shops through Old Town and Cottonwood Square stay open late, 5 to 9pm, with art, music and special features through the evening. Timed with the closing weekend of the Why Not Niwot? show at Niwot Hall. Hours are those on the organizer’s September 11 listing.',
  },
  {
    id: 'why-not-niwot-awards-night-2026',
    name: 'Why Not Niwot? Awards Night',
    status: 'confirmed',
    startDate: '2026-09-11',
    startTime: '18:00',
    endTime: '21:00',
    timezone: TZ,
    location: { name: 'Niwot Hall' },
    organizer: ncaa,
    sourceUrl: 'https://niwotarts.org/why-not-niwot/',
    verifiedAt: CHECKED,
    cost: 'Free',
    tag: 'Art',
    description:
      'Awards ceremony and artists’ reception closing the fifteenth Why Not Niwot? juried show — forty works by twenty Colorado artists — with the Niwot Community Semi-Marching Free Grange Band. Held during the Art Walk. The organizer’s page gives 6pm; the Business Association’s calendar lists the evening from 5:30pm, so check the organizer’s page before setting out.',
  },
  {
    id: 'osmosis-opening-diane-pike-2026-09-11',
    name: 'Opening: Peaks, Pines and a Raven',
    status: 'confirmed',
    startDate: '2026-09-11',
    startTime: '17:00',
    endTime: '21:00',
    timezone: TZ,
    location: { name: 'Osmosis Gallery', address: '290 Second Avenue' },
    organizer: { name: 'Osmosis Gallery', url: 'https://www.osmosisartgallery.com/' },
    sourceUrl: 'https://niwot.com/events/opening-peaks-pines-and-a-raven-feat-diane-pike/',
    verifiedAt: CHECKED,
    tag: 'Art',
    description:
      'Opening reception for an exhibition of work by Diane Pike, 5 to 9pm during the Second Friday Art Walk. The show runs at the gallery through the end of November.',
  },
  {
    id: 'enchanted-evening-2026',
    name: 'Enchanted Evening',
    status: 'confirmed',
    startDate: '2026-11-27',
    startTime: '18:00',
    endTime: '21:00',
    timezone: TZ,
    location: { name: 'Old Town and Cottonwood Square' },
    organizer: nba,
    sourceUrl: 'https://niwot.com/events/enchanted-evening/',
    verifiedAt: CHECKED,
    cost: 'Free',
    tag: 'Holiday',
    description:
      'The community tree lighting, Santa’s arrival by horse-drawn sleigh, carols and live music through Old Town and Cottonwood Square, on the evening after Thanksgiving. The date and 6 to 9pm hours are from the organizer’s dated 2026 listing; the same page’s general description says the evening starts at 5pm, so check it before setting out.',
  },

  /* ---- Expected: annual events the organizer has not yet dated ---- */
  {
    id: 'great-pumpkin-party-2026',
    name: 'Niwot’s Great Pumpkin Party',
    status: 'tentative',
    expected: 'Late October — the organizer says details are still to come',
    timezone: TZ,
    location: { name: 'Second Avenue, Old Town' },
    organizer: nba,
    sourceUrl: 'https://niwot.com/events/niwots-great-pumpkin-party/',
    verifiedAt: CHECKED,
    tag: 'Family',
    description:
      'Costume parade, trick-or-treating along Second Avenue, hay rides, magic shows and a petting zoo, co-hosted with The Niwot Group at Compass. Held the Saturday before Halloween in past years; the 2026 date is not yet published.',
  },
  {
    id: 'holiday-parade-2026',
    name: 'Niwot Holiday Parade',
    status: 'tentative',
    expected: 'Late November — usually the Saturday morning after Thanksgiving',
    timezone: TZ,
    location: { name: 'Second Avenue, Murray Street to Niwot Road' },
    organizer: nba,
    sourceUrl: 'https://niwot.com/upcoming-events/holidays-and-parades/',
    verifiedAt: CHECKED,
    tag: 'Holiday',
    description:
      'A morning parade down Second Avenue from Murray Street to Niwot Road, with Santa. The 2026 date is not yet published.',
  },
  {
    id: 'rock-rails-2027',
    name: 'Rock & Rails concert series, 2027 season',
    status: 'tentative',
    expected: 'Thursday evenings, June to August 2027 — dates published by the organizer each spring',
    timezone: TZ,
    location: { name: 'Whistle Stop Park, Old Town' },
    organizer: ncaa,
    sourceUrl: 'https://niwotarts.org/rock-rails/',
    verifiedAt: CHECKED,
    cost: 'Free admission',
    tag: 'Concert',
    description:
      'The free outdoor concert series beside the caboose returns each summer, produced by the Cultural Arts Association with the Business Association. The season’s dates and line-up are published in the spring; none are confirmed for 2027 yet.',
  },
];

const now = buildNow();
assertValidEvents(records, { today: zonedParts(now).date });

export default records;
