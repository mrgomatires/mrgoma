import { locationsConfig } from '@/app/(shop)/locations/locationsConfig';

export interface MenuChild {
  name: string;
  href: string;
  city?: 'Miami' | 'Orlando';
  /** A heading the child is listed under ("Miami, FL"); none = one plain list. */
  group?: string;
  /**
   * Pre-load the page only on hover / touch, not when the link is laid out
   * (059). The desktop dropdown renders its children invisibly, so Next
   * prefetched them on every page, and after every filter on `/tires` it
   * downloaded "New tires" and "Shop by size" again in full.
   */
  prefetchOnIntent?: true;
}

export interface MenuItem {
  name: string;
  href: string;
  children?: MenuChild[];
  /** A closing link to the parent page at the foot of the panel. */
  allLabel?: string;
}

/**
 * A submenu's children in display groups, first-seen order (050). Locations
 * groups by city; Shop Tires has no groups and renders one list.
 */
export function groupChildren(
  children: readonly MenuChild[]
): { label?: string; items: MenuChild[] }[] {
  const groups: { label?: string; items: MenuChild[] }[] = [];
  for (const child of children) {
    const found = groups.find(g => g.label === child.group);
    if (found) found.items.push(child);
    else groups.push({ label: child.group, items: [child] });
  }
  return groups;
}

/**
 * The submenu child that stands for the current page, if any (059).
 *
 * The most specific match wins, so on `/tires/used` it is "Used tires", not
 * "All tires" — whose href is the parent's own and therefore matches only
 * exactly. A deeper page counts for its section: `/tires/size/225-45-18` →
 * "Shop by size". `exact` says whether it is the page itself (for
 * `aria-current="page"`) or a page inside it (`aria-current="true"`).
 */
export function currentChild(
  pathname: string | null,
  children: readonly MenuChild[],
  parentHref: string
): { href: string; exact: boolean } | null {
  if (!pathname) return null;
  let best: { href: string; exact: boolean } | null = null;
  for (const { href } of children) {
    const exact = pathname === href;
    const inside = href !== parentHref && pathname.startsWith(href + '/');
    if ((exact || inside) && (!best || href.length > best.href.length)) best = { href, exact };
  }
  return best;
}

export const menuItems: MenuItem[] = [
  {
    name: 'Shop Tires',
    href: '/tires',
    // The size index (050) and the condition pages, which had few links in.
    children: [
      { name: 'All tires', href: '/tires' },
      { name: 'Used tires', href: '/tires/used', prefetchOnIntent: true },
      { name: 'New tires', href: '/tires/new', prefetchOnIntent: true },
      { name: 'Shop by size', href: '/tires/size', prefetchOnIntent: true },
    ],
  },
  { name: 'Services', href: '/services' },
  {
    name: 'Locations',
    href: '/locations',
    children: locationsConfig.map(l => ({
      name: l.name,
      href: `/locations/${l.slug}`,
      city: l.city,
      group: `${l.city}, FL`,
    })),
    allLabel: `View all ${locationsConfig.length} locations →`,
  },
  { name: 'About us', href: '/about-us' },
  { name: 'Guides', href: '/guides' },
  { name: 'Contact us', href: '/contact' },
];
