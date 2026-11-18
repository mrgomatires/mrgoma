import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}));

import { MenuItem } from '@/app/ui/sections/MenuMobile/components/MenuItem';

import { groupChildren, menuItems } from './MenuItems';

const shop = menuItems.find(i => i.name === 'Shop Tires')!;
const locations = menuItems.find(i => i.name === 'Locations')!;

describe('"Shop Tires" menu (050)', () => {
  it('lists All, Used, New and Shop by size, in one group', () => {
    expect(shop.children!.map(c => [c.name, c.href])).toEqual([
      ['All tires', '/tires'],
      ['Used tires', '/tires/used'],
      ['New tires', '/tires/new'],
      ['Shop by size', '/tires/size'],
    ]);
    expect(groupChildren(shop.children!)).toEqual([{ label: undefined, items: shop.children }]);
  });

  it('keeps Locations grouped by city with its closing link', () => {
    const groups = groupChildren(locations.children!);
    expect(groups.map(g => g.label)).toEqual(['Miami, FL', 'Orlando, FL']);
    expect(groups.flatMap(g => g.items)).toHaveLength(7);
    expect(locations.allLabel).toBe('View all 7 locations →');
  });
});

describe('phone submenu', () => {
  const renderItem = (item = shop) =>
    render(
      <MenuItem
        name={item.name}
        href={item.href}
        index={0}
        animationStage={9}
        onClick={() => {}}
        submenu={item.children}
      />
    );

  it('keeps collapsed links out of the tab order, and opens them on demand (AC7c)', () => {
    const { container } = renderItem();
    const panel = container.querySelector('[inert]');
    expect(panel).not.toBeNull();
    expect(
      within(panel as HTMLElement).getByRole('link', { name: 'Shop by size', hidden: true })
    ).toHaveAttribute('href', '/tires/size');

    fireEvent.click(screen.getByRole('button', { name: 'Show Shop Tires list' }));
    expect(container.querySelector('[inert]')).toBeNull();
    expect(screen.getByRole('link', { name: 'Shop by size' })).toBeVisible();
  });

  it('still shows Locations under Miami and Orlando headings', () => {
    renderItem(locations);
    expect(screen.getByText('Miami, FL', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Orlando, FL', { exact: true })).toBeInTheDocument();
  });
});
