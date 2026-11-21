import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CartProvider } from '@/app/context/CartContext';

/**
 * 059: the submenu child for the page you are on is highlighted, like its
 * parent. On `/tires/used` the "Shop Tires" parent turned green but "Used
 * tires" inside it did not.
 */

const nav = vi.hoisted(() => ({ pathname: '/tires/used' }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('next/image', () => ({ default: ({ alt }: { alt?: string }) => <img alt={alt ?? ''} /> }));

const { currentChild, menuItems } = await import('./MenuItems');
const { default: Header } = await import('./Header');
const { MenuItem } = await import('@/app/ui/sections/MenuMobile/components/MenuItem');

const shop = menuItems.find(i => i.name === 'Shop Tires')!;
const locations = menuItems.find(i => i.name === 'Locations')!;
const kids = shop.children!;

describe('currentChild', () => {
  it.each([
    ['/tires', '/tires', true],
    ['/tires/used', '/tires/used', true],
    ['/tires/new', '/tires/new', true],
    ['/tires/size', '/tires/size', true],
    // A page inside a section counts for it, not as the page itself.
    ['/tires/size/225-45-18', '/tires/size', false],
  ])('%s → %s', (pathname, href, exact) => {
    expect(currentChild(pathname, kids, shop.href)).toEqual({ href, exact });
  });

  it('"All tires" (the parent\'s own page) only counts on /tires itself', () => {
    expect(currentChild('/tires/brands/pirelli', kids, shop.href)).toBeNull();
    expect(currentChild('/tires/514085-pirelli-225-45-19', kids, shop.href)).toBeNull();
  });

  it('finds a store page among Locations', () => {
    expect(currentChild('/locations/hialeah', locations.children!, locations.href)).toEqual({
      href: '/locations/hialeah',
      exact: true,
    });
    expect(currentChild('/locations', locations.children!, locations.href)).toBeNull();
  });

  it('is nothing off the menu or before the path is known', () => {
    expect(currentChild('/checkout', kids, shop.href)).toBeNull();
    expect(currentChild(null, kids, shop.href)).toBeNull();
  });
});

const marked = (root: ParentNode) =>
  [...root.querySelectorAll('a[aria-current]')].map(a => [
    a.getAttribute('href'),
    a.getAttribute('aria-current'),
  ]);

describe('the menus highlight it', () => {
  it('desktop dropdown on /tires/used: only "Used tires"', () => {
    nav.pathname = '/tires/used';
    const { container } = render(
      <CartProvider>
        <Header />
      </CartProvider>
    );
    expect(marked(container)).toEqual([['/tires/used', 'page']]);
    expect(container.querySelector('a[href="/tires/used"][aria-current]')).toHaveClass(
      'text-[#9dfb40]'
    );
    expect(container.querySelector('a[href="/tires/new"]')).toHaveClass('text-gray-300');
  });

  it('phone submenu on a size page: "Shop by size", as its section', () => {
    nav.pathname = '/tires/size/225-45-18';
    const { container } = render(
      <MenuItem
        name={shop.name}
        href={shop.href}
        index={0}
        animationStage={9}
        onClick={() => {}}
        submenu={kids}
      />
    );
    expect(marked(container)).toEqual([['/tires/size', 'true']]);
    expect(container.querySelector('a[href="/tires/size"]')).toHaveClass('text-[#9dfb40]');
  });
});
