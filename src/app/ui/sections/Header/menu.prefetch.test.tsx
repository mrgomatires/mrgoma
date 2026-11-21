import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CartProvider } from '@/app/context/CartContext';

/**
 * 060: every menu link but the logo pre-loads only on hover / touch — the
 * visible items, the dropdowns (the desktop dropdowns are laid out invisibly,
 * so Next pre-loaded all of them on every page) and the phone submenus. In 059
 * only "Used tires", "New tires" and "Shop by size" did.
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

const links = (root: ParentNode) =>
  [...root.querySelectorAll('a[href^="/"]')].map(a => ({
    href: a.getAttribute('href')!,
    prefetch: a.getAttribute('data-prefetch'),
  }));

const MENU_HREFS = menuItems.flatMap(i => [i.href, ...(i.children ?? []).map(c => c.href)]);

describe('menu links pre-load on intent (060)', () => {
  it('desktop: every menu link waits for intent; only the logo keeps the default', () => {
    const { container } = render(
      <CartProvider>
        <Header />
      </CartProvider>
    );
    const all = links(container);
    const logo = all.filter(l => l.href === '/');
    expect(logo).toEqual([{ href: '/', prefetch: 'undefined' }]);
    const menu = all.filter(l => l.href !== '/');
    // Every item and child of the menu is there (plus "View all locations").
    expect(new Set(menu.map(l => l.href))).toEqual(new Set(MENU_HREFS));
    for (const l of menu) expect(l, l.href).toMatchObject({ prefetch: 'false' });
  });

  it('phone: an item with a submenu, and its children, wait for intent', () => {
    const shop = menuItems.find(i => i.children?.length)!;
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
    const all = links(container);
    expect(all.length).toBe(1 + shop.children!.length);
    for (const l of all) expect(l, l.href).toMatchObject({ prefetch: 'false' });
  });

  it('phone: a plain item waits for intent', () => {
    const plain = menuItems.find(i => !i.children?.length)!;
    const { container } = render(
      <MenuItem
        name={plain.name}
        href={plain.href}
        index={0}
        animationStage={9}
        onClick={() => {}}
      />
    );
    expect(links(container)).toEqual([{ href: plain.href, prefetch: 'false' }]);
  });
});
