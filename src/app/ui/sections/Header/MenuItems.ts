import { locationsConfig } from '@/app/(shop)/locations/locationsConfig';

export interface MenuChild {
  name: string;
  href: string;
  city?: 'Miami' | 'Orlando';
  /** A heading the child is listed under ("Miami, FL"); none = one plain list. */
  group?: string;
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

export const menuItems: MenuItem[] = [
  {
    name: 'Shop Tires',
    href: '/tires',
    // The size index (050) and the condition pages, which had few links in.
    children: [
      { name: 'All tires', href: '/tires' },
      { name: 'Used tires', href: '/tires/used' },
      { name: 'New tires', href: '/tires/new' },
      { name: 'Shop by size', href: '/tires/size' },
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
