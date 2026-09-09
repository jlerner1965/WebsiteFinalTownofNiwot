/* Resident resources. Niwot is unincorporated, so every public service is
   delivered by some other body. Each row names the one responsible and links
   to the page of its site that handles that service — not the site's front
   door — so a resident lands where the task is done.

   Destinations were confirmed as indexed pages on 2026-09-09; `npm run
   links` checks that each still answers. */
export default [
  { service: 'Land use and planning', handles: 'Zoning, subdivision and development review', who: 'Boulder County Planning', href: 'https://bouldercounty.gov/property-and-land/land-use/planning/' },
  { service: 'Roads and snow removal', handles: 'Maintenance, plowing and signage on county roads', who: 'County Road Maintenance', href: 'https://bouldercounty.gov/transportation/road-maintenance/' },
  { service: 'Building permits', handles: 'Permits and inspections', who: 'County Building Division', href: 'https://bouldercounty.gov/property-and-land/land-use/building/building-permits/' },
  { service: 'Law enforcement', handles: 'Patrol and response in unincorporated areas', who: 'County Sheriff', href: 'https://bouldercounty.gov/sheriff/' },
  { service: 'Fire and rescue', handles: 'Fire suppression, rescue and emergency medical response', who: 'Mountain View Fire Rescue', href: 'https://www.mvfpd.org/' },
  { service: 'Drinking water', handles: 'Water service, rates and meters', who: 'Left Hand Water District', href: 'https://lefthandwater.org/' },
  { service: 'Sewer', handles: 'Sanitary sewer service and billing where the district’s lines run; coverage depends on the address', who: 'Niwot Sanitation District', href: 'https://niwotsd.colorado.gov/' },
  { service: 'Schools', handles: 'Enrollment, boundaries and transportation', who: 'St. Vrain Valley Schools', href: 'https://www.svvsd.org/' },
  { service: 'Parks and open space', handles: 'Trail closures and alerts, open space rules and dog regulations', who: 'County Parks & Open Space', href: 'https://bouldercounty.gov/open-space/parks-and-trails/trail-closures/' },
  { service: 'Elections', handles: 'Registration, ballots, drop-off locations and results', who: 'County Elections', href: 'https://bouldercounty.gov/elections/' },
];
