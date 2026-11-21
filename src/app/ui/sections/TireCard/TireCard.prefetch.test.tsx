import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CartProvider } from '@/app/context/CartContext';
import type { TransformedTire } from '@/app/interfaces/tires';

/**
 * 059: a card's secondary links (condition badge, size pill, brand logo, set
 * offer) pre-load only on hover / touch; the detail links (photo, title) keep
 * Next's default. On sight, every card used to fetch its size and brand
 * pages, and each filter change fetched them again. If someone swaps one back
 * to a plain `Link`, its `prefetch` stops being `false` and this fails.
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

describe('TireCard pre-loads (059)', () => {
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

  it("detail links keep Next's default (the card's main tap stays fast)", () => {
    const detail = links().filter(l => l.href.startsWith('/tires/42-') && !l.href.includes('set='));
    expect(detail).toHaveLength(2);
    for (const l of detail) expect(l.prefetch, l.href).toBe('undefined');
  });
});
