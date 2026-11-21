import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CartProvider } from '@/app/context/CartContext';
import type { TransformedTire } from '@/app/interfaces/tires';

/**
 * Every link on a card pre-loads only on hover / touch. The secondary ones
 * (condition badge, size pill, brand logo, set offer) since 059: on sight,
 * every card fetched its size and brand pages, and each filter change fetched
 * them again. The detail links (photo, title) since 060: each pre-load of a
 * tire page was a database read — ~20 per scroll of /tires — and brought only
 * the page's loading screen. If someone swaps one back to a plain `Link`, its
 * `prefetch` stops being `false` and this fails.
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
vi.mock('@/app/utils/analytics', () => ({ trackEcommerce: vi.fn(() => Promise.resolve()) }));
vi.mock('@/app/hooks/useSetOffers', () => ({
  useSetOffers: () => ({ '42': { size: 4, total: 400, ids: ['42', '43', '44', '45'] } }),
}));

const { default: TireCard } = await import('./TireCard');

const product = {
  id: '42',
  name: '(ABC) | Michelin | Pilot | 225/40/18',
  color: 'Black',
  href: '#',
  imageSrc: '/tire.jpg',
  imageAlt: 'Michelin tire',
  price: '99',
  brand: 'Michelin',
  brandId: 7,
  condition: 'new',
  features: [],
} as unknown as TransformedTire;

function links() {
  const { container } = render(
    <CartProvider>
      <TireCard products={[product]} />
    </CartProvider>
  );
  return [...container.querySelectorAll('a')].map(a => ({
    href: a.getAttribute('href') ?? '',
    prefetch: a.getAttribute('data-prefetch'),
  }));
}

describe('TireCard pre-loads (059, 060)', () => {
  it('secondary links wait for intent', () => {
    const all = links();
    const secondary = all.filter(
      l =>
        l.href === '/tires/new' ||
        l.href.startsWith('/tires/size/') ||
        l.href.startsWith('/tires/brands/') ||
        l.href.includes('set=')
    );
    // Condition, size, brand and the set offer (rendered once per breakpoint).
    expect(secondary.map(l => l.href.split('?')[0])).toEqual(
      expect.arrayContaining(['/tires/new', '/tires/size/225-40-18', '/tires/brands/michelin'])
    );
    expect(secondary.some(l => l.href.includes('set='))).toBe(true);
    for (const l of secondary) expect(l, l.href).toMatchObject({ prefetch: 'false' });
  });

  it('detail links (photo, title) wait for intent too — no database read per card on sight', () => {
    const detail = links().filter(l => l.href.startsWith('/tires/42-') && !l.href.includes('set='));
    expect(detail).toHaveLength(2);
    for (const l of detail) expect(l.prefetch, l.href).toBe('false');
  });
});
