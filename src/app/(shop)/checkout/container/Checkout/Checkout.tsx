'use client';

import React from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { useCart } from '@/app/context/CartContext';
import { useVisitorCity } from '@/app/context/VisitorCityContext';
import CityTag from '@/app/ui/components/CityTag/CityTag';
import GoogleRating from '@/app/ui/components/GoogleRating/GoogleRating';
import LoadingScreen from '@/app/ui/components/LoadingScreen/LoadingScreen';
import ProductMeta from '@/app/ui/components/ProductMeta/ProductMeta';
import ShippingStateGate from '@/app/ui/components/ShippingStateGate/ShippingStateGate';
import { locationsData } from '@/app/ui/sections/LocationsSlider/locationsData';
import { trackEcommerce, trackEvent } from '@/app/utils/analytics';
import { EVENTS } from '@/app/utils/analyticsEvents';
import { cartLine } from '@/app/utils/cartLine';
import { citiesLabel, groupCartLines, setUnitToLine, type SetProduct } from '@/app/utils/cartSets';
import { trackRemoval } from '@/app/utils/cartTracking';
import { hasConsent } from '@/app/utils/consent';
import { cartPayload, purchasePayload, type StripeLine } from '@/app/utils/ecommerce';
import { GENERIC_TIRE_IMAGE } from '@/app/utils/genericTireImage';
import { combinedRating } from '@/app/utils/googleRatings';
import type { SetUnit } from '@/app/utils/tireSets';
import { tireDetailHref } from '@/app/utils/tireSlug';

const TAX_RATE = (() => {
  if (typeof process !== 'undefined') {
    const fromEnv = process.env.NEXT_PUBLIC_TAX_RATE;
    const parsed = fromEnv ? parseFloat(fromEnv) : NaN;
    if (!Number.isNaN(parsed) && parsed >= 0) return parsed; // accepts 0 to disable
  }
  return 0;
})();

const currency = (n: number) => `$${n.toFixed(2)}`;

function formatCents(amountInCents: number, currencyCode: string | undefined) {
  const code = (currencyCode || 'USD').toUpperCase();
  const amount = (amountInCents || 0) / 100;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export default function Checkout() {
  const { cartItems, removeFromCart, removeSet, replaceInCart, cartTotal, clearCart, isCartReady } =
    useCart();

  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showCancelBanner, setShowCancelBanner] = React.useState(false);
  const [orderState, setOrderState] = React.useState<'idle' | 'success' | 'whatsapp'>('idle');
  // Stripe session details when returning from Stripe
  const [sessionDetails, setSessionDetails] = React.useState<null | {
    id: string;
    created: string | null;
    customer_email: string | null;
    payment_status: string | null;
    amount_total: number | null;
    currency: string | null;
    receipt_url: string | null;
    payment_method: string | null;
    items: Array<
      StripeLine & {
        id: string;
        currency: string;
      }
    >;
    shipping_total?: number | null;
    tax_total?: number | null;
  }>(null);

  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [detailsError, setDetailsError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Avoid hydration mismatch by rendering cart content after mount
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const taxes = Math.max(0, cartTotal * TAX_RATE);
  const total = cartTotal + taxes;

  const isEmpty = cartItems.length === 0;

  const stripeEnabled = (process.env.NEXT_PUBLIC_ENABLE_STRIPE || '').toLowerCase() === 'true';

  // Shipping state gating
  const [selectedState, setSelectedState] = React.useState<string>('');
  const blockedStates = React.useMemo(() => new Set(['AK', 'HI', 'PR']), []);
  const isBlockedState = selectedState ? blockedStates.has(selectedState) : false;

  // Fulfillment selection: delivery vs. pickup in store
  // No method preselected: the shopper chooses first, and each choice reveals
  // only what it needs — the state for delivery, the store (or why pickup is
  // impossible) for pickup.
  const [fulfillmentMethod, setFulfillmentMethod] = React.useState<'delivery' | 'pickup' | null>(
    null
  );
  const [pickupStoreId, setPickupStoreId] = React.useState<string>('');

  // Pickup at any of the stores, whatever city the tires are in (feature 047,
  // D2): the owner moves tires between Miami and Orlando.
  const pickupStores = locationsData;

  // Feature 043 (FR6), widened by 047 (D9): with pickup chosen, preselect the
  // store nearest to the visitor whenever their city is known, and nothing was
  // picked yet. Once per visit, so a shopper who clears the choice is not
  // overruled.
  const visitor = useVisitorCity();
  const preselectedRef = React.useRef(false);
  React.useEffect(() => {
    if (preselectedRef.current || fulfillmentMethod !== 'pickup' || pickupStoreId) return;
    const store = visitor.nearestStoreId;
    if (!store || !visitor.city) return;
    if (!pickupStores.some(s => s.id === store)) return;
    preselectedRef.current = true;
    setPickupStoreId(store);
  }, [fulfillmentMethod, pickupStoreId, pickupStores, visitor.city, visitor.nearestStoreId]);

  /**
   * A set tire that sold before payment, and what can replace it (feature 041,
   * FR13). `replacement: null` means none was found and the tire was removed.
   */
  const [soldOffers, setSoldOffers] = React.useState<
    Array<{
      soldId: string;
      soldLabel: string;
      setSize: number;
      replacement: SetUnit | null;
      product: SetProduct | null;
    }>
  >([]);

  const offerReplacements = async (soldIds: string[]) => {
    const offers = await Promise.all(
      soldIds.map(async soldId => {
        const line = cartItems.find(i => String(i.id) === soldId);
        const siblings = line?.setId
          ? cartItems.filter(i => i.setId === line.setId && String(i.id) !== soldId)
          : [];
        const soldLabel = line
          ? `${cartLine(line).title}${line.code ? ` #${line.code}` : ''}`
          : soldId;
        let replacement: SetUnit | null = null;
        let product: SetProduct | null = null;
        try {
          const keep = siblings
            .slice(0, 3)
            .map(s => String(s.id))
            .join(',');
          const res = await fetch(
            `/api/tire-sets/replacement?sold=${encodeURIComponent(soldId)}&keep=${encodeURIComponent(keep)}`,
            { cache: 'no-store' }
          );
          if (res.ok) {
            const data = await res.json();
            replacement = data?.replacement ?? null;
            product = data?.product ?? null;
          }
        } catch {
          // No replacement is a valid outcome; the tire is removed below.
        }
        if (!replacement) removeFromCart(soldId);
        return { soldId, soldLabel, setSize: siblings.length + 1, replacement, product };
      })
    );
    setSoldOffers(offers);
  };

  const acceptReplacement = (soldId: string) => {
    const offer = soldOffers.find(o => o.soldId === soldId);
    if (!offer?.replacement || !offer.product) return;
    replaceInCart(soldId, setUnitToLine(offer.replacement, offer.product));
    setSoldOffers(prev => prev.filter(o => o.soldId !== soldId));
    setError(null);
  };

  // Detect checkout return states
  const success = (searchParams.get('success') || '') === '1';
  const canceled = (searchParams.get('canceled') || '') === '1';
  const whatsappFlag = (searchParams.get('whatsapp') || '') === '1';
  const sessionId = searchParams.get('session_id') || '';
  const [resolvingReturn, setResolvingReturn] = React.useState<boolean>(
    success || canceled || whatsappFlag
  );

  const clearedRef = React.useRef(false);
  React.useEffect(() => {
    // Show the cancel banner if canceled
    setShowCancelBanner(canceled);

    // On success (Stripe) or whatsapp=1, clear cart and set success state
    if ((success || whatsappFlag) && !clearedRef.current) {
      const key = `order-cleared-key`;
      if (success) {
        // Deduplicate via session id
        const token = `stripe:${sessionId || 'ok'}`;
        const last = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        if (last !== token) {
          clearCart();
          if (typeof window !== 'undefined') localStorage.setItem(key, token);
        }
        setOrderState('success');
      } else if (whatsappFlag) {
        // Always clear for WhatsApp to avoid blocking future orders
        clearCart();
        setOrderState('whatsapp');
      }
      clearedRef.current = true;
    } else if (!success && !whatsappFlag) {
      setOrderState('idle');
    }
    // End of initial URL param resolving
    setResolvingReturn(false);
  }, [success, whatsappFlag, sessionId, canceled, clearCart]);

  // Load Stripe session details on success
  React.useEffect(() => {
    let active = true;
    async function load() {
      if (orderState !== 'success' || !sessionId) return;
      try {
        setDetailsLoading(true);
        setDetailsError(null);
        const res = await fetch(
          `/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || `Failed to load order details (${res.status})`);
        }
        const json = await res.json();

        if (active) {
          setSessionDetails(json);
        }
      } catch (e: unknown) {
        if (active) {
          const message = e instanceof Error ? e.message : 'Unable to load order details';
          setDetailsError(message);
        }
      } finally {
        if (active) setDetailsLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [orderState, sessionId]);

  /**
   * `begin_checkout` — the checkout page opened with a non-empty cart, however
   * the shopper got here (feature 040, D4). Once per page load; never on the
   * confirmation views, and never before the stored cart has been read, when
   * `cartItems` is still the empty first render.
   */
  const beginCheckoutSent = React.useRef(false);
  React.useEffect(() => {
    if (beginCheckoutSent.current) return;
    if (!mounted || !isCartReady || resolvingReturn) return;
    if (orderState !== 'idle' || success || whatsappFlag) return;
    if (cartItems.length === 0) return;
    beginCheckoutSent.current = true;
    void trackEcommerce(EVENTS.BEGIN_CHECKOUT, cartPayload(cartItems));
  }, [mounted, isCartReady, resolvingReturn, orderState, success, whatsappFlag, cartItems]);

  /**
   * `purchase` to GA4 — from the browser, so the sale joins this visit's session
   * and channel (feature 040, D1). Vercel already counts it on the server, once
   * per recorded order, so it is skipped here.
   *
   * Only a settled payment counts, and only once per Stripe session: reloading,
   * going back or opening a shared confirmation link must not add revenue. GA4
   * also de-duplicates on `transaction_id`; this guard spares it the work. The
   * marker is written only when consent allowed a send, so a shopper who accepts
   * analytics later is not marked as already reported.
   */
  React.useEffect(() => {
    if (!sessionDetails || (sessionDetails.payment_status || '').toLowerCase() !== 'paid') return;
    const key = `ga-purchase:${sessionDetails.id}`;
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      // Storage unavailable: fall back on GA4's own transaction_id de-duplication.
    }
    void trackEcommerce(EVENTS.PURCHASE, purchasePayload(sessionDetails), { vercel: false });
    if (hasConsent()) {
      try {
        localStorage.setItem(key, '1');
      } catch {
        // no-op
      }
    }
  }, [sessionDetails]);

  // Loading overlay logic
  const showLoader = !mounted || resolvingReturn || detailsLoading || loading;
  const loaderMsg = (() => {
    if (resolvingReturn) {
      if (success) return 'Finalizing your payment...';
      if (canceled) return 'Confirming cancellation...';
      if (whatsappFlag) return 'Confirming your order...';
      return 'Please wait...';
    }
    if (detailsLoading) return 'Loading order details...';
    if (loading) return stripeEnabled ? 'Redirecting to payment...' : 'Opening WhatsApp...';
    return 'Loading...';
  })();

  const proceedToPayment = async () => {
    if (isEmpty || loading) return;
    setError(null);
    if (!fulfillmentMethod) {
      setError('Choose delivery or store pickup to continue.');
      return;
    }
    if (fulfillmentMethod === 'delivery') {
      if (!selectedState) {
        setError('Please select your state to continue.');
        return;
      }
      if (isBlockedState) {
        setError('Sorry, we currently do not ship to Alaska, Hawaii, or Puerto Rico.');
        return;
      }
    } else {
      if (!pickupStoreId) {
        setError('Please choose a store for pick-up.');
        return;
      }
    }
    const selectedStore =
      fulfillmentMethod === 'pickup' ? locationsData.find(l => l.id === pickupStoreId) : undefined;
    setLoading(true);
    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map(i => ({ id: i.id, quantity: i.quantity })),
          shippingState: selectedState,
          fulfillmentMethod,
          pickupStoreId: fulfillmentMethod === 'pickup' ? pickupStoreId : undefined,
          pickupStoreName: selectedStore?.name,
          pickupStoreAddress: selectedStore?.address,
        }),
      });

      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        const unavailable: Array<{ id: string; code?: string }> = data?.unavailable ?? [];

        // A set tire that sold → offer a compatible replacement (feature 041).
        const soldInSet = unavailable
          .filter(u => u.code === 'sold')
          .map(u => String(u.id))
          .filter(id => cartItems.some(i => String(i.id) === id && i.setId));
        if (soldInSet.length > 0) {
          await offerReplacements(soldInSet);
          setError('Some tires in your set sold while you were shopping. Review them below.');
          return;
        }

        const details = unavailable.map(u => u.id).join(', ');
        setError(
          details
            ? `Some items in your cart are unavailable: ${details}`
            : 'Some items are unavailable.'
        );
        return;
      }

      if (res.status === 501) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || 'Payment gateway is not configured.');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || 'Failed to start payment. Please try again.');
        return;
      }

      const data = await res.json();

      // The server accepted the order. Only now is the shipping step reported:
      // before feature 040 it fired on the button press, so an order rejected
      // above still counted (feature 040, D3).
      const accepted = data?.whatsappUrl || data?.url;
      const payload = cartPayload(cartItems);
      if (accepted) {
        void trackEcommerce(EVENTS.ADD_SHIPPING_INFO, {
          ...payload,
          shipping_tier: fulfillmentMethod,
        });
      }

      if (data?.whatsappUrl) {
        // The order left the site. Recorded separately from `purchase` on
        // purpose: we can see the hand-off but never whether it was completed,
        // and folding an unconfirmed order into the paid ones would reintroduce
        // exactly the inflation this instrumentation exists to remove.
        trackEvent({
          action: EVENTS.WHATSAPP_ORDER_SENT,
          category: 'checkout',
          label: fulfillmentMethod,
        });
        window.open(data.whatsappUrl, '_blank', 'noopener,noreferrer');
        // Reflect order initiation on the current page
        router.replace('/checkout?whatsapp=1');
        return;
      }
      if (data?.url) {
        // Card details are typed on Stripe's page, which we cannot see: this is
        // the last moment we can honestly report (feature 040, D2). Navigation
        // can cut a pending hit, so wait for GA's acknowledgement — at most
        // 600 ms, behind the "Redirecting to payment…" screen already showing.
        await trackEcommerce(
          EVENTS.ADD_PAYMENT_INFO,
          { ...payload, payment_type: 'card' },
          { waitMs: 600 }
        );
        window.location.assign(data.url);
        return;
      }
      setError('Failed to start checkout. Please try again.');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unexpected error. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Success / WhatsApp confirmation view
  if (orderState !== 'idle') {
    if (orderState === 'success') {
      return (
        <main className="min-h-[70vh] bg-white">
          {showLoader && <LoadingScreen message={loaderMsg} />}
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-start gap-3">
              <div
                className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center"
                aria-hidden
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-7 w-7 text-green-600"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-2.59a.75.75 0 1 0-1.22-.86l-3.724 5.29-2.02-2.02a.75.75 0 1 0-1.06 1.06l2.625 2.625a.75.75 0 0 0 1.13-.094l4.27-6.001Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payment successful</h1>
                <p className="mt-1 text-gray-600">
                  Thank you for your purchase. Your order has been received and is being processed.
                </p>
              </div>
            </div>

            {/* Reference row with copy */}
            <div className="mt-6 flex flex-wrap items-center gap-2 min-w-0">
              <span className="text-sm text-gray-500">Reference:</span>
              <span className="font-mono text-sm bg-gray-50 border border-gray-200 rounded px-2 py-0.5 break-all max-w-full w-full sm:w-auto">
                {sessionId}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(sessionId);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    // no-op
                  }
                }}
                className="text-xs font-medium text-green-700 hover:text-green-800 border border-green-200 rounded px-2 py-1 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                aria-label="Copy reference"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Details */}
            <div className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="p-4 sm:p-5">
                {detailsLoading && <p className="text-sm text-gray-600">Loading order details…</p>}
                {detailsError && (
                  <div
                    className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-sm p-3"
                    role="alert"
                  >
                    {detailsError}
                  </div>
                )}
                {sessionDetails && (
                  <div className="space-y-6">
                    {/* Summary header */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center justify-between sm:justify-start sm:gap-3">
                        <span className="text-gray-600">Payment status</span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sessionDetails.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}
                        >
                          {sessionDetails.payment_status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-start sm:gap-3">
                        <span className="text-gray-600">Customer</span>
                        <span className="text-gray-900">
                          {sessionDetails.customer_email || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-start sm:gap-3">
                        <span className="text-gray-600">Date</span>
                        <span className="text-gray-900">
                          {sessionDetails.created
                            ? new Date(sessionDetails.created).toLocaleString('en-US')
                            : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-start sm:gap-3">
                        <span className="text-gray-600">Total</span>
                        <span className="text-gray-900 font-semibold">
                          {formatCents(
                            sessionDetails.amount_total || 0,
                            sessionDetails.currency || undefined
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-start sm:gap-3">
                        <span className="text-gray-600">Shipping</span>
                        <span className="text-gray-900">
                          {formatCents(
                            sessionDetails.shipping_total ?? 0,
                            sessionDetails.currency || undefined
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Items */}
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900 mb-2">Items</h2>
                      <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
                        {sessionDetails.items.map(it => (
                          <li key={it.id} className="p-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm text-gray-900">{it.description}</p>
                              <div className="text-xs text-gray-500 flex flex-wrap gap-2 items-center mt-1">
                                <span>Qty {it.quantity}</span>
                                {it.condition && (
                                  <span
                                    className={
                                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset ' +
                                      (((it.condition || '') as string)
                                        .toString()
                                        .trim()
                                        .toLowerCase() === 'new' ||
                                      ((it.condition || '') as string)
                                        .toString()
                                        .trim()
                                        .toLowerCase() === 'mrgomatiresnew'
                                        ? 'bg-green-50 text-green-700 ring-green-200'
                                        : 'bg-slate-50 text-slate-700 ring-slate-200')
                                    }
                                  >
                                    {(() => {
                                      const c = (it.condition || '').toString().toLowerCase();
                                      if (c === 'new') return 'NEW';
                                      if (c === 'mrgomatiresnew') return 'NEW';
                                      if (c === 'used') return 'USED';
                                      if (c === 'sold') return 'SOLD';
                                      return (it.condition || '').toString();
                                    })()}
                                  </span>
                                )}
                                {it.productId && (
                                  <span className="font-mono bg-gray-50 border border-gray-200 rounded px-1 py-0.5">
                                    ID: {it.productId}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatCents(it.amount_total, it.currency)}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Receipt link */}
                    {sessionDetails.receipt_url && (
                      <div>
                        <a
                          href={sessionDetails.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-md border border-green-200 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                        >
                          View receipt
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/tires"
                className="inline-flex items-center justify-center rounded-md bg-green-600 px-5 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                Continue shopping
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md border border-green-200 px-5 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                Go to home
              </Link>
            </div>
          </div>
        </main>
      );
    }

    // WhatsApp confirmation view remains simple
    return (
      <main className="min-h-[70vh] bg-white">
        {showLoader && <LoadingScreen message={loaderMsg} />}
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div
            className="mx-auto h-14 w-14 rounded-full bg-green-100 flex items-center justify-center"
            aria-hidden
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-8 w-8 text-green-600"
            >
              <path
                fillRule="evenodd"
                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-2.59a.75.75 0 1 0-1.22-.86l-3.724 5.29-2.02-2.02a.75.75 0 1 0-1.06 1.06l2.625 2.625a.75.75 0 0 0 1.13-.094l4.27-6.001Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-gray-900">
            Order sent via WhatsApp
          </h1>
          <p className="mt-2 text-gray-600">
            We opened WhatsApp in a new tab with your order details. Our team will reach out to
            confirm your request.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/tires"
              className="inline-flex items-center justify-center rounded-md bg-green-600 px-5 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              Continue shopping
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-green-200 px-5 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              Go to home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-white">
      {showLoader && <LoadingScreen message={loaderMsg} />}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Checkout</h1>
          <p className="mt-1 text-sm text-gray-500">Review your cart and complete your order.</p>
        </header>

        {showCancelBanner && (
          <div
            className="mb-6 flex items-start justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            role="status"
            aria-live="polite"
          >
            <p className="pr-2">Checkout was canceled. You can review your cart and try again.</p>
            <button
              type="button"
              onClick={() => setShowCancelBanner(false)}
              className="shrink-0 inline-flex items-center justify-center rounded-md border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              aria-label="Dismiss cancel message"
            >
              Dismiss
            </button>
          </div>
        )}

        {!mounted ? (
          <section
            aria-live="polite"
            className="rounded-lg border border-dashed border-gray-200 p-10 text-center"
          >
            <p className="text-gray-600">Loading cart…</p>
          </section>
        ) : isEmpty ? (
          <section
            aria-live="polite"
            className="rounded-lg border border-dashed border-gray-200 p-10 text-center"
          >
            <p className="text-gray-600">Your cart is empty.</p>
            <div className="mt-4">
              <Link
                href="/tires"
                className="inline-flex items-center px-5 py-2.5 rounded-md bg-green-600 text-white font-semibold shadow-sm hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                Browse products
              </Link>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Item table */}
            <section className="lg:col-span-8 xl:col-span-8" aria-labelledby="cart-heading">
              <h2 id="cart-heading" className="sr-only">
                Items in cart
              </h2>
              <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
                        >
                          Product
                        </th>
                        {/*
                          No ID column. It printed the internal TireId beside the
                          stock code already shown under the product name — two
                          numbers for one line, neither of which a buyer quotes.
                          The stock code is the one staff search by.
                        */}
                        <th
                          scope="col"
                          className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600"
                        >
                          Price
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600"
                        >
                          Quantity
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600"
                        >
                          Subtotal
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600"
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    {groupCartLines(cartItems).map(group => {
                      // Feature 041: each set is its own framed <tbody> — a
                      // header row, then its tires on a green rail — so a
                      // single tire after it cannot be read as part of it.
                      const isSet = group.kind === 'set';
                      const items = isSet ? group.items : [group.item];
                      // A set may mix cities (047): its header says both, and
                      // then each tire shows its own city too (D5).
                      const setCities = isSet ? citiesLabel(group.items.map(i => i.city)) : '';
                      const mixedSet = setCities.includes(' and ');
                      const header =
                        group.kind === 'set' ? (
                          <tr key={`set-${group.setId}`} className="bg-green-600/10">
                            <td colSpan={5} className="border-l-4 border-green-600 px-4 py-2">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                <p className="font-semibold text-green-900">
                                  {`Set of ${group.items.length} · ${currency(group.total)}`}
                                  {group.range ? (
                                    <span className="ml-1 font-normal text-green-900/80">
                                      {` · tread ${group.range}`}
                                    </span>
                                  ) : null}
                                  <CityTag
                                    cities={group.items.map(i => i.city)}
                                    className="ml-2 align-middle"
                                  />
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // The shopper's removal (046, D4).
                                    trackRemoval(group.items);
                                    removeSet(group.setId);
                                  }}
                                  className="inline-flex min-h-[44px] items-center rounded-md px-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                  aria-label={`Remove set of ${group.items.length} from cart`}
                                >
                                  Remove set
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : null;
                      return (
                        <tbody
                          key={isSet ? `set-${group.setId}` : String(group.item.id)}
                          className={
                            isSet
                              ? 'divide-y divide-green-100 border-y-2 border-green-600/60 bg-green-50/40'
                              : 'divide-y divide-gray-100 bg-white'
                          }
                        >
                          {header}
                          {items.map(item => {
                            const lineTotal = item.price * item.quantity;
                            // Canonical product URL directly (no /detail redirect hop).
                            const detailHref = tireDetailHref(item);
                            return (
                              <tr
                                key={item.id}
                                className={isSet ? 'hover:bg-green-50' : 'hover:bg-gray-50'}
                              >
                                <td
                                  className={`px-4 py-4 ${isSet ? 'border-l-4 border-green-600' : ''}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white">
                                      <Image
                                        src={item.image || GENERIC_TIRE_IMAGE}
                                        alt={item.name}
                                        width={64}
                                        height={64}
                                        className="h-full w-full object-cover object-center"
                                      />
                                    </div>
                                    <div>
                                      <Link
                                        href={detailHref}
                                        className="font-medium text-gray-900 hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                                      >
                                        {cartLine(item).title}
                                      </Link>
                                      {cartLine(item).size && (
                                        <p className="text-sm text-gray-500">
                                          {cartLine(item).size}
                                        </p>
                                      )}
                                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                        <ProductMeta condition={item.condition} className="mt-0!" />
                                        {/* A one-city set shows its city once, in its header. */}
                                        {(!isSet || mixedSet) && <CityTag city={item.city} />}
                                      </div>
                                      {cartLine(item).code && (
                                        <p className="text-xs text-gray-600">
                                          {cartLine(item).code}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-right text-gray-700">
                                  {currency(item.price)}
                                </td>
                                <td className="px-4 py-4 text-center text-gray-700">
                                  {item.quantity}
                                </td>
                                <td className="px-4 py-4 text-right font-medium text-gray-900">
                                  {currency(lineTotal)}
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      trackRemoval([item]);
                                      removeFromCart(item.id);
                                    }}
                                    className="inline-flex items-center cursor-pointer rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                    aria-label={`Remove ${item.name} from cart`}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      );
                    })}
                  </table>
                </div>
              </div>
            </section>

            {/* Order summary */}
            <aside
              className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-4"
              aria-labelledby="summary-heading"
            >
              <h2 id="summary-heading" className="text-lg font-semibold text-gray-900">
                Order summary
              </h2>
              <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600">Subtotal</dt>
                    <dd className="font-medium text-gray-900">{currency(cartTotal)}</dd>
                  </div>
                  <div className="flex items-start justify-between">
                    <dt className="text-gray-600">
                      Taxes{' '}
                      {TAX_RATE > 0 && (
                        <span className="text-xs text-gray-500">
                          (VAT {Math.round(TAX_RATE * 100)}%)
                        </span>
                      )}
                    </dt>
                    <dd className="font-medium text-gray-900">
                      <span className="text-gray-700">Calculated at checkout</span>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600">Shipping</dt>
                    <dd className="font-medium text-gray-900">Free</dd>
                  </div>
                  <div className="mt-2 border-t border-gray-200 pt-2 flex items-center justify-between text-base">
                    <dt className="font-semibold text-gray-900">Total</dt>
                    <dd className="font-semibold text-gray-900">{currency(total)}</dd>
                  </div>
                </dl>
                {/* Fulfillment method first (2026-11-10): each choice reveals only
                    what it needs, so the shopper is not shown a state for a
                    pickup, or told pickup is impossible before choosing it. */}
                <div className="mt-4">
                  <p id="fulfillment-label" className="block text-sm font-medium text-gray-900">
                    How would you like to receive your tires?
                  </p>
                  <div
                    className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
                    role="radiogroup"
                    aria-labelledby="fulfillment-label"
                  >
                    <label
                      className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${fulfillmentMethod === 'delivery' ? 'border-green-300 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                      <input
                        type="radio"
                        name="fulfillment"
                        value="delivery"
                        className="h-4 w-4 text-green-600 focus:ring-green-500"
                        checked={fulfillmentMethod === 'delivery'}
                        onChange={() => setFulfillmentMethod('delivery')}
                        aria-label="Delivery to my address"
                      />
                      <span>Delivery to my address</span>
                    </label>
                    <label
                      className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${fulfillmentMethod === 'pickup' ? 'border-green-300 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                      <input
                        type="radio"
                        name="fulfillment"
                        value="pickup"
                        className="h-4 w-4 text-green-600 focus:ring-green-500"
                        checked={fulfillmentMethod === 'pickup'}
                        onChange={() => setFulfillmentMethod('pickup')}
                        aria-label="Pick up in store"
                      />
                      <span>Pick up in store</span>
                    </label>
                  </div>

                  {fulfillmentMethod === 'delivery' && (
                    <ShippingStateGate
                      selectedState={selectedState}
                      onChange={setSelectedState}
                      isBlockedState={isBlockedState}
                    />
                  )}

                  {fulfillmentMethod === 'pickup' && (
                    <div className="mt-3">
                      <label
                        htmlFor="pickup-store"
                        className="block text-sm font-medium text-gray-900"
                      >
                        Choose a store for pick-up
                      </label>
                      <select
                        id="pickup-store"
                        value={pickupStoreId}
                        onChange={e => setPickupStoreId(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select a store…</option>
                        {pickupStores.map(loc => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} — {loc.address}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Most orders are ready within 24–48 business hours. You will receive
                        confirmation before pickup.
                      </p>
                    </div>
                  )}
                </div>

                {error && (
                  <div
                    className="my-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm p-3"
                    role="alert"
                  >
                    {error}
                  </div>
                )}
                {soldOffers.length > 0 && (
                  <ul className="my-3 space-y-2" aria-label="Sold tires">
                    {soldOffers.map(offer => (
                      <li
                        key={offer.soldId}
                        className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-gray-900"
                      >
                        <p>{`${offer.soldLabel} sold.`}</p>
                        {offer.replacement ? (
                          <>
                            <p className="mt-1 text-gray-700">
                              {`A matching tire is available: ${
                                offer.replacement.tread !== null
                                  ? `${offer.replacement.tread}/32`
                                  : 'tread n/a'
                              } · ${offer.replacement.patched ? 'patched' : 'no patch'} · ${currency(
                                offer.replacement.price
                              )}`}
                            </p>
                            <button
                              type="button"
                              onClick={() => acceptReplacement(offer.soldId)}
                              className="mt-2 inline-flex min-h-[44px] items-center rounded-md bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                            >
                              Use this tire instead
                            </button>
                          </>
                        ) : (
                          <p className="mt-1 text-gray-700">
                            {`No matching tire is left, so it was removed. Your set is now ${
                              offer.setSize - 1
                            } ${offer.setSize - 1 === 1 ? 'tire' : 'tires'}.`}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={proceedToPayment}
                    className="inline-flex w-full cursor-pointer items-center justify-center rounded-md bg-green-600 px-5 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      isEmpty ||
                      loading ||
                      !fulfillmentMethod ||
                      (fulfillmentMethod === 'delivery' && (!selectedState || isBlockedState)) ||
                      (fulfillmentMethod === 'pickup' && !pickupStoreId)
                    }
                    aria-disabled={
                      isEmpty ||
                      loading ||
                      !fulfillmentMethod ||
                      (fulfillmentMethod === 'delivery' && (!selectedState || isBlockedState)) ||
                      (fulfillmentMethod === 'pickup' && !pickupStoreId)
                    }
                  >
                    {loading
                      ? 'Processing…'
                      : stripeEnabled
                        ? 'Proceed to payment'
                        : 'Send order via WhatsApp'}
                  </button>
                  <Link
                    href="/tires"
                    className="inline-flex w-full items-center justify-center rounded-md border border-green-200 px-5 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                  >
                    Continue shopping
                  </Link>
                </div>
              </div>

              <p className="mt-2 text-xs text-gray-500">
                Taxes are estimates and may vary at checkout.
              </p>
              {/* The stores' Google rating by the order summary (053, D3). Text,
                  not a link: no reason to send a paying buyer elsewhere. */}
              <p className="mt-3">
                <GoogleRating figures={combinedRating()} variant="inline" />
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
