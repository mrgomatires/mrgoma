'use client';

import React, { FC, useEffect, useRef } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { useCart, type CartItem } from '@/app/context/CartContext';
import CityTag from '@/app/ui/components/CityTag/CityTag';
import { Dialog, DialogBackdrop, DialogPanel } from '@/app/ui/components/Dialog/Dialog';
import GoogleRating from '@/app/ui/components/GoogleRating/GoogleRating';
import { XMarkIcon } from '@/app/ui/components/Icons/Icons';
import IntentPrefetchLink from '@/app/ui/components/IntentPrefetchLink/IntentPrefetchLink';
import { factsParts } from '@/app/utils/cartFacts';
import { cartLine } from '@/app/utils/cartLine';
import { citiesLabel, groupCartLines } from '@/app/utils/cartSets';
import { trackRemoval, trackViewCart } from '@/app/utils/cartTracking';
import { GENERIC_TIRE_IMAGE } from '@/app/utils/genericTireImage';
import { combinedRating } from '@/app/utils/googleRatings';
import { tireDetailHref } from '@/app/utils/tireSlug';

import { useCartTireHovercard } from './CartTireHovercard';

/**
 * One tire in the drawer — the same markup for single tires and set members.
 *
 * Kept short (owner review, 047): what a shopper compares — tread, life, patch
 * — stays on the line, because phones have no hover; the rest (DOT, stock
 * code, the full list) lives in the card beside the drawer and on the tire's
 * page. A set member drops the size and condition its set header already says,
 * and "Qty" shows only when it is not 1 (every tire is a unique unit).
 */
const CartLine: FC<{
  item: CartItem;
  onRemove: (id: string | number) => void;
  onOpen: () => void;
  /** Show the city (members of a one-city set show it once, in the set header). */
  city?: boolean;
  /** A member of a set: its header carries the size and condition. */
  inSet?: boolean;
  /** Hover / focus handlers that show the tire's card beside the drawer (047). */
  interest?: React.HTMLAttributes<HTMLLIElement>;
}> = ({ item, onRemove, onOpen, city, inSet, interest }) => {
  const line = cartLine(item);
  const meta = inSet ? [] : [line.size, item.condition].filter(Boolean);
  const facts = factsParts({ tread: item.tread, life: item.life, patched: item.patched });
  return (
    <li
      className="py-3 flex gap-3 -mx-2 px-2 rounded-md hover:bg-gray-50 transition-colors group"
      {...interest}
    >
      {/* Product Image — a second, mouse-only way into the tire's page */}
      <IntentPrefetchLink
        href={tireDetailHref(item)}
        onClick={onOpen}
        tabIndex={-1}
        aria-hidden="true"
        className="shrink-0 w-14 h-14 border border-gray-200 rounded-md overflow-hidden group-hover:ring-1 group-hover:ring-green-200"
      >
        <Image
          src={item.image || GENERIC_TIRE_IMAGE}
          alt={line.title}
          width={56}
          height={56}
          className="w-full h-full object-center object-cover"
        />
      </IntentPrefetchLink>

      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-3 font-medium text-gray-900">
          <h3 className="min-w-0">
            <IntentPrefetchLink
              href={tireDetailHref(item)}
              onClick={onOpen}
              className="underline-offset-2 hover:text-green-700 hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              {line.title}
            </IntentPrefetchLink>
          </h3>
          <p className="shrink-0">${item.price.toFixed(2)}</p>
        </div>
        {meta.length > 0 && <p className="text-sm text-gray-500">{meta.join(' · ')}</p>}
        {/* What shoppers compare between tires, always visible (047). */}
        {facts.length > 0 && <p className="mt-0.5 text-sm text-gray-700">{facts.join(' · ')}</p>}
        <div className="mt-1 flex items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            {city ? <CityTag city={item.city} /> : null}
            {item.quantity > 1 ? <span className="text-gray-500">Qty {item.quantity}</span> : null}
          </div>
          <button
            type="button"
            className="font-medium text-gray-500 hover:text-red-600 transition-colors cursor-pointer inline-flex items-center min-h-[44px] py-2 -my-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.name} from cart`}
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
};

const CartModal: FC<{ footer?: React.ReactNode }> = ({ footer }) => {
  const { cartItems, removeFromCart, removeSet, cartTotal, showCartModal, setShowCartModal } =
    useCart();
  const hovercard = useCartTireHovercard();

  // `view_cart` when the drawer opens with tires (046, D3) — once per opening.
  const itemsRef = useRef(cartItems);
  itemsRef.current = cartItems;
  useEffect(() => {
    if (showCartModal) trackViewCart(itemsRef.current);
  }, [showCartModal]);

  // The shopper's own removals (046, D4). Reported here, not in the cart
  // context, which the checkout also calls when a tire sold.
  const removeOne = (id: string | number) => {
    trackRemoval(cartItems.filter(i => String(i.id) === String(id)));
    removeFromCart(id);
  };
  const removeWholeSet = (setId: string, items: CartItem[]) => {
    trackRemoval(items);
    removeSet(setId);
  };

  const closeModal = () => {
    setShowCartModal(false);
  };

  return (
    <Dialog
      open={showCartModal}
      onCloseAction={closeModal}
      ariaLabelledby="cart-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <DialogBackdrop
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        transition={true}
      />
      <div className="flex h-full justify-end">
        <DialogPanel
          className="w-full sm:max-w-md bg-white shadow-xl h-full overflow-y-auto animate-slide-in-right sm:rounded-l-2xl ring-1 ring-black/5"
          transition={true}
        >
          <div className="flex flex-col h-full" data-cart-panel>
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75">
              <h2 id="cart-modal-title" className="text-lg font-semibold text-gray-900">
                Your Cart
              </h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                onClick={closeModal}
                title="Close cart"
                aria-label="Close cart"
              >
                <XMarkIcon className="h-6 w-6" aria-hidden />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-grow overflow-y-auto p-4">
              {cartItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div
                    className="sr-only"
                    aria-live="polite"
                  >{`Items in cart: ${cartItems.length}`}</div>
                  <ul className="divide-y divide-gray-200" aria-label="Cart items">
                    {groupCartLines(cartItems).map(group =>
                      group.kind === 'single' ? (
                        <CartLine
                          key={group.item.id}
                          item={group.item}
                          onRemove={removeOne}
                          onOpen={closeModal}
                          city
                          interest={hovercard.bind(group.item)}
                        />
                      ) : (
                        <li key={group.setId} className="py-3">
                          {/* A set is one framed card, so a single tire after it
                              cannot be read as part of it. */}
                          <div className="rounded-lg border-2 border-green-600/70 bg-green-50/50">
                            <div className="flex items-center justify-between gap-2 rounded-t-md bg-green-600/10 px-3 text-sm">
                              <div className="py-1.5">
                                <p className="font-semibold text-green-900">
                                  {`Set of ${group.items.length} · $${group.total.toFixed(2)}`}
                                </p>
                                {/* What every tire of the set shares, said once (047). */}
                                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-green-900/80">
                                  <span>
                                    {[
                                      cartLine(group.items[0]).size,
                                      group.items[0].condition,
                                      group.range ? `tread ${group.range}` : null,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </span>
                                  <CityTag cities={group.items.map(i => i.city)} />
                                </p>
                              </div>
                              <button
                                type="button"
                                className="inline-flex min-h-[44px] items-center rounded-md font-medium text-gray-600 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                                onClick={() => removeWholeSet(group.setId, group.items)}
                                aria-label={`Remove set of ${group.items.length} from cart`}
                              >
                                Remove set
                              </button>
                            </div>
                            <ul
                              className="divide-y divide-green-100 px-3"
                              aria-label={`Set of ${group.items.length}`}
                            >
                              {group.items.map(item => (
                                <CartLine
                                  key={item.id}
                                  item={item}
                                  onRemove={removeOne}
                                  onOpen={closeModal}
                                  inSet
                                  interest={hovercard.bind(item)}
                                  // A set across cities: each tire says where it is (047, D5).
                                  city={citiesLabel(group.items.map(i => i.city)).includes(' and ')}
                                />
                              ))}
                            </ul>
                          </div>
                        </li>
                      )
                    )}
                  </ul>
                </>
              )}
            </div>

            {/* Footer */}
            {footer !== undefined ? (
              footer
            ) : (
              <div className="sticky bottom-0 z-10 border-t border-gray-200 p-4 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75">
                <div
                  className="flex items-center justify-between text-base font-semibold text-gray-900 mb-3"
                  aria-live="polite"
                >
                  <p>Subtotal</p>
                  <p>${cartTotal.toFixed(2)}</p>
                </div>
                <Link
                  href="/checkout"
                  aria-disabled={cartItems.length === 0}
                  role={cartItems.length === 0 ? 'link' : undefined}
                  tabIndex={cartItems.length === 0 ? -1 : 0}
                  className={`flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-semibold text-white bg-green-600 hover:bg-green-700 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                    cartItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={e => {
                    if (cartItems.length === 0) {
                      e.preventDefault();
                    } else {
                      closeModal();
                    }
                  }}
                >
                  Checkout
                </Link>
                {/* The stores' Google rating under Checkout (053, D3), only with
                    something to pay for. Text, not a link: the moment before
                    paying is no time to send the buyer elsewhere. */}
                {cartItems.length > 0 && (
                  <p className="mt-2 flex justify-center">
                    <GoogleRating figures={combinedRating()} variant="inline" />
                  </p>
                )}
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    className="text-sm font-semibold text-green-700 hover:text-green-800 cursor-pointer px-4 py-2 rounded-md border border-green-200 hover:bg-green-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                    onClick={closeModal}
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogPanel>
      </div>
      {showCartModal ? hovercard.card : null}
    </Dialog>
  );
};

export default CartModal;
