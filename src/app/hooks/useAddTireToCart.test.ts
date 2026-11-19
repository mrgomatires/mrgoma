import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ addToCart: vi.fn(), track: vi.fn() }));
vi.mock('@/app/context/CartContext', () => ({ useCart: () => ({ addToCart: h.addToCart }) }));
vi.mock('@/app/utils/analytics', () => ({ trackEcommerce: h.track }));

import { useAddTireToCart } from './useAddTireToCart';

describe('useAddTireToCart (051: one function for cards and the comparison)', () => {
  it('writes the cart line with 047 facts and sends add_to_cart', () => {
    const add = renderHook(() => useAddTireToCart()).result.current;
    add({
      id: '7',
      name: '(7) | PIRELLI | P ZERO | 235/45/18',
      price: '120',
      condition: 'Used',
      imageSrc: '/x.webp',
      brand: 'PIRELLI',
      brandId: 1,
      model: 'P ZERO',
      size: '235/45/18',
      city: 'Miami',
      dot: '2324',
      features: [
        { name: 'Tread depth', value: '8.6' },
        { name: 'Remaining life', value: '86%' },
        { name: 'Patched', value: 'Yes' },
      ],
    });
    expect(h.addToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '7',
        size: '235/45/18',
        city: 'Miami',
        tread: 8.6,
        life: '86%',
        patched: true,
        dot: '2324',
      })
    );
    expect(h.track).toHaveBeenCalledWith(
      'add_to_cart',
      expect.objectContaining({ items: [expect.objectContaining({ item_id: '7' })] })
    );
  });
});
