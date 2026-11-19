import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ProductImage from './ProductImage';

vi.mock('next/image', () => ({
  default: ({ src, alt, onError }: { src: unknown; alt?: string; onError?: () => void }) => (
    <img
      src={typeof src === 'string' ? src : ''}
      alt={typeof alt === 'string' ? alt : ''}
      onError={onError}
    />
  ),
}));

describe('ProductImage', () => {
  it('uses a valid relative image source as-is', () => {
    render(
      <ProductImage
        product={{ imageSrc: '/tire.jpg', imageAlt: 'Michelin tire', brand: 'Michelin' }}
      />
    );
    expect(screen.getByRole('img', { name: 'Michelin tire' })).toHaveAttribute('src', '/tire.jpg');
  });

  it('accepts an absolute URL on a host next/image is configured for', () => {
    render(
      <ProductImage
        product={{ imageSrc: 'https://www.usedtires.online/t.jpg', imageAlt: 'a', brand: 'B' }}
      />
    );
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://www.usedtires.online/t.jpg');
  });

  /**
   * This test used to assert the opposite — that **any** absolute http(s) URL
   * was accepted — and it was green while the bug it describes was live.
   *
   * `next/image` throws during render for a host it is not configured for. It
   * does not fall back, and `onError` never fires because nothing loads. One
   * tire in the catalogue has an eBay-hosted photo: its detail page answered
   * **500**, and every filtered catalogue view containing it rendered the
   * loading skeleton instead of results — a buyer asking for new Pirellis saw
   * no tires at all.
   */
  it('falls back for a host next/image would throw on', () => {
    render(
      <ProductImage
        product={{
          imageSrc: 'https://i.ebayimg.com/images/g/x/s-l1600.webp',
          imageAlt: 'a',
          brand: 'B',
        }}
      />
    );
    expect(screen.getByRole('img')).toHaveAttribute('src', '/assets/images/generic-tire-image.webp');
  });

  it('falls back to the default image for the N/A sentinel', () => {
    render(<ProductImage product={{ imageSrc: 'N/A', imageAlt: 'x', brand: 'Toyo' }} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/assets/images/generic-tire-image.webp');
  });

  it('falls back to the default image for a malformed URL', () => {
    render(<ProductImage product={{ imageSrc: 'not a url', imageAlt: 'x', brand: 'Toyo' }} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/assets/images/generic-tire-image.webp');
  });

  it('falls back to the brand name when alt text is empty', () => {
    render(<ProductImage product={{ imageSrc: '/t.jpg', imageAlt: '', brand: 'Pirelli' }} />);
    expect(screen.getByRole('img', { name: 'Pirelli' })).toBeInTheDocument();
  });

  it('swaps to the default image when loading fails', () => {
    render(<ProductImage product={{ imageSrc: '/good.jpg', imageAlt: 'a', brand: 'B' }} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/good.jpg');
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', '/assets/images/generic-tire-image.webp');
  });
});
