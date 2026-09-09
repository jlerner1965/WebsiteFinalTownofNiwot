/* The timeline on Our Story. Every entry names what it rests on: sources are
   inline, not collected in a footnote, and each one is a page a reader can
   open or a record they can identify. Where a date is contested or
   unverified the entry says so rather than carrying an approximation. */
const SOCIETY = { source: 'Niwot Historical Society, history timeline', sourceHref: 'https://niwothistoricalsociety.org/history/' };

export default [
  {
    when: '1870s',
    ...SOCIETY,
    title: 'The railroad, and the 1875 town plat',
    body: 'A rail line built through the valley set the location of the town site. The plat was recorded in 1875 by Porter T. Hinman and Ambrose S. Murray, laid out on a diagonal grid straddling the tracks. That survey is why the street grid runs as it does, at an angle to the later county road pattern.',
  },
  {
    when: 'Late 1800s onward',
    ...SOCIETY,
    title: 'The commercial district takes shape',
    body: 'Brick and false-front commercial buildings went up along Second Avenue to serve the surrounding farms and the trains that carried their crops. The Niwot Tribune building is among the survivors of that period and still anchors the block.',
  },
  {
    when: '1907, arriving later',
    source: 'Niwot Cultural Arts Association, Whistle Stop Park',
    sourceHref: 'https://niwotarts.org/whistle-stop-park/',
    title: 'The caboose',
    body: 'CB&Q 14649, a Burlington Route caboose built in 1907, stands on a short length of track at Whistle Stop Park, the park the Cultural Arts Association built at the south-west corner of Murray Street and First Avenue. The park’s lawn is where the summer concert series is held.',
  },
  {
    when: 'Twentieth century',
    ...SOCIETY,
    title: 'Growth, and a preserved main street',
    body: 'Residential development spread around the original plat while the historic commercial buildings on Second Avenue were retained rather than replaced. Cottonwood Square later added a second cluster of shops and everyday services. Governance stayed with Boulder County and the special districts throughout.',
  },
  {
    when: 'Today',
    source: 'U.S. Census Bureau, 2020 Census, Niwot CDP',
    sourceHref: null,
    title: 'About four thousand people, still unincorporated',
    body: 'The census designated place recorded a population of 4,306 in 2020. Niwot remains unincorporated, with county and district services, and in November 2026 voters inside a proposed boundary decide whether it should become a municipality.',
  },
];
