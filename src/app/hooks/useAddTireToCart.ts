'use client';

import { useCallback } from 'react';

import { useCart } from '@/app/context/CartContext';
import type { TransformedTire } from '@/app/interfaces/tires';
import { trackEcommerce } from '@/app/utils/analytics';
import { EVENTS } from '@/app/utils/analyticsEvents';
import { factsFromCardTire } from '@/app/utils/cartFacts';
import { cartPayload } from '@/app/utils/ecommerce';

/** What a card (or the comparison, 051) knows about a tire it can add to the cart. */
export type CartableTire = Pick<
  TransformedTire,
  | 'id'
  | 'name'
  | 'price'
  | 'condition'
  | 'imageSrc'
  | 'brand'
  | 'brandId'
  | 'model'
  | 'size'
  | 'city'
  | 'features'
  | 'dot'
>;

/**
 * "Add to cart" as a tire card does it — one function for the card and the
 * comparison (051), so both write the same cart line and send the same event.
 *
 * The line carries 047's facts (tread, life, patch, DOT) for the cart's
 * compare card. The event is sent here, not inside `addToCart`: the sellers'
 * dashboard calls that too, and staff activity must not read as shopper demand
 * (feature 040).
 */
export function useAddTireToCart() {
  const { addToCart } = useCart();
  return useCallback(
    (tire: CartableTire) => {
      addToCart({
        ...tire,
        model: tire.model,
        size: tire.size,
        city: tire.city,
        ...factsFromCardTire(tire),
      });
      void trackEcommerce(EVENTS.ADD_TO_CART, cartPayload([tire]));
    },
    [addToCart]
  );
}
