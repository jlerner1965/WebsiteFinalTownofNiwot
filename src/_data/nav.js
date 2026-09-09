/* Primary navigation, in the order it renders. `key` matches the `navKey` set
   in each page's front matter to mark the active item. Plan a Visit is not
   in it: the page is reached from the footer, the quick links and the many
   in-page links to its form and map. */
export default [
  { key: 'explore', label: 'Explore', href: '/explore/' },
  { key: 'eat-shop', label: 'Eat & Shop', href: '/eat-shop/' },
  { key: 'events', label: 'Events', href: '/events/' },
  { key: 'community', label: 'Community', href: '/community/' },
  { key: 'story', label: 'Our Story', href: '/our-story/' },
  { key: 'civic', label: 'Civic Information', href: '/civic/incorporation-election/' },
];
