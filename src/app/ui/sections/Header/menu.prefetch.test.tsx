import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CartProvider } from '@/app/context/CartContext';

/**
 * 059: the header's "Used tires", "New tires" and "Shop by size" pre-load only
 * on hover / touch. The desktop dropdown lays its children out invisibly, so
 * Next prefetched them on every page — and after every filter on `/tires` it
 * downloaded `/tires/new` and `/tires/size` again in full. Other menu links
 * keep Next's default.
 */

vi.mock('next/link', () => ({
  default: ({
    prefetch,
    href,
    children,
    ...rest
  }: {
    prefetch?: boolean | null;
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} data-prefetch={String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({ default: ({ alt }: { alt?: string }) => <img alt={alt ?? ''} /> }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/tires',
  useRouter: () => ({ push: vi.fn() }),
}));

const { menuItems } = await import('./MenuItems');
const { default: Header } = await import('./Header');
const { MenuItem } = await import('@/app/ui/sections/MenuMobile/components/MenuItem');

const shop = menuItems.find(i => i.name === 'Shop Tires')!;
const INTENT = ['/tires/used', '/tires/new', '/tires/size'];

const prefetchOf = (root: ParentNode, href: string) =>
  [...root.querySelectorAll(`a[href="${href}"]`)].map(a => a.getAttribute('data-prefetch'));

describe('header links that pre-load on intent (059)', () => {
  it('are exactly Used, New and Shop by size', () => {
    expect(shop.children!.filter(c => c.prefetchOnIntent).map(c => c.href)).toEqual(INTENT);
    const others = menuItems.flatMap(i => i.children ?? []).filter(c => !INTENT.includes(c.href));
    expect(others.every(c => !c.prefetchOnIntent)).toBe(true);
  });

  it('desktop dropdown: those three wait for intent, the rest keep the default', () => {
    const { container } = render(
      <CartProvider>
        <Header />
      </CartProvider>
    );
    for (const href of INTENT) {
      expect(prefetchOf(container, href), href).toContain('false');
    }
    expect(prefetchOf(container, '/locations/hialeah')).not.toContain('false');
  });

  it('phone submenu: the same three wait for intent', () => {
    const { container } = render(
      <MenuItem
        name={shop.name}
        href={shop.href}
        index={0}
        animationStage={9}
        onClick={() => {}}
        submenu={shop.children}
      />
    );
    for (const href of INTENT) expect(prefetchOf(container, href), href).toEqual(['false']);
    // "All tires" (the parent's own page) keeps the default.
    expect(prefetchOf(container, '/tires')).not.toContain('false');
  });
});
