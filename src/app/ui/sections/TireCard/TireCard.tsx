import { FC, SyntheticEvent } from 'react';

import Link from 'next/link';

import { useCart } from '@/app/context/CartContext';
import { useAddTireToCart } from '@/app/hooks/useAddTireToCart';
import { useSetOffers } from '@/app/hooks/useSetOffers';
import { TransformedTire } from '@/app/interfaces/tires';
import { BrandImage, FreeShippingBadge, ProductImage, StockBadge } from '@/app/ui/components';
import CompareToggle from '@/app/ui/components/CompareToggle/CompareToggle';
import { useViewItemList } from '@/app/ui/components/ViewItemList/useViewItemList';
import { trackEcommerce } from '@/app/utils/analytics';
import { EVENTS } from '@/app/utils/analyticsEvents';
import { setHref } from '@/app/utils/chatSets';
import { selectPayload, type GaList } from '@/app/utils/ecommerce';
import { brandName, modelName, parseTireName } from '@/app/utils/tireNaming';
import { buildTireSlug, slugify } from '@/app/utils/tireSlug';
import { patchedNote, treadDepthLabel } from '@/app/utils/tireSpecs';

interface TireCardProps {
  products: TransformedTire[];
  /**
   * The listing these cards belong to (feature 046). With it the cards report
   * `view_item_list` and `select_item`; without it they report nothing.
   */
  list?: GaList;
  /** Tires before this page in the whole result, so positions continue (page 2 → 21). */
  indexOffset?: number;
}

const SPEC_KEYS = ['Remaining life', 'Tread depth', 'Patched', 'Run Flat'] as const;
type SpecKey = (typeof SPEC_KEYS)[number];

const SPEC_LABELS: Record<SpecKey, string> = {
  'Remaining life': 'Life',
  'Tread depth': 'Tread',
  Patched: 'Patched',
  'Run Flat': 'Run Flat',
};

const CartIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

/** Stacked tires: "a set". Decoration — the words carry the meaning. */
const SetIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <ellipse cx="9" cy="12" rx="5" ry="8" />
    <path d="M14 4.5c2.9.6 5 3.7 5 7.5s-2.1 6.9-5 7.5" />
  </svg>
);

const TireCard: FC<TireCardProps> = ({ products, list, indexOffset = 0 }) => {
  const { isInCart } = useCart();
  useViewItemList(list, products, indexOffset);
  // The set each card can offer, asked for after the cards are on screen (054).
  const setOffers = useSetOffers(products.map(p => p.id));

  // Any link that opens the tire's page is a selection (046, D2). The card's
  // brand, size and condition links go elsewhere, and Add to Cart is its own event.
  const handleSelect = (product: TransformedTire, position: number) => {
    if (!list) return;
    void trackEcommerce(EVENTS.SELECT_ITEM, selectPayload(list, [product], position));
  };

  const addTireToCart = useAddTireToCart();
  const handleAddToCart = (event: SyntheticEvent, product: TransformedTire) => {
    event.preventDefault();
    addTireToCart(product);
  };

  return (
    <ul className="mt-3 space-y-6">
      {products.map((product: TransformedTire, index: number) => {
        const productInCart = isInCart(product.id);
        const isSold =
          typeof product?.status === 'string' && product.status.trim().toLowerCase() === 'sold';
        const isNew = (product.condition || '').trim().toLowerCase() === 'new';
        const { size: tireSize, displayName } = parseTireName(product.name);
        const setOffer = isSold ? undefined : setOffers[String(product.id)];

        const slug = product.id
          ? buildTireSlug(String(product.id), product.brand || '', tireSize)
          : '';
        const detailUrl = slug ? `/tires/${slug}` : '/tires';
        const brandSlug = product.brand ? slugify(product.brand) : '';
        const sizeSlug = tireSize ? slugify(tireSize) : '';

        const specMap: Partial<Record<SpecKey, string>> = {};
        if (Array.isArray(product?.features)) {
          for (const f of product.features as Array<{ name: string; value: string }>) {
            if ((SPEC_KEYS as readonly string[]).includes(f.name))
              specMap[f.name as SpecKey] = f.value;
          }
        }

        const lifePct = parseInt((specMap['Remaining life'] || '').replace('%', ''), 10) || 0;
        const lifeColor =
          lifePct >= 70 ? 'bg-[#9dfb40]' : lifePct >= 40 ? 'bg-amber-400' : 'bg-red-500';

        const accentColor = isNew ? '#22c55e' : '#f59e0b';

        const condBadgeClass = isNew
          ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-600 hover:text-white hover:border-green-600 transition-colors duration-150'
          : 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-colors duration-150';
        const condLabel = isNew ? 'New' : 'Used';

        const titleText = [brandName(product.brand), modelName(displayName)]
          .filter(Boolean)
          .join(' ');

        return (
          <li
            key={product.id}
            className="isolate bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-200 overflow-hidden group"
            style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}
          >
            {/* ── Mobile: flex-col  /  Desktop: flex-row ── */}
            <div className="flex flex-col sm:flex-row">
              {/* ── Image ── */}
              <Link
                href={detailUrl}
                onClick={() => handleSelect(product, indexOffset + index + 1)}
                className="block bg-gray-50 sm:w-52 md:w-64 shrink-0 overflow-hidden"
                tabIndex={-1}
              >
                <div className="relative h-48 sm:h-full sm:min-h-[180px] group-hover:scale-105 transition-transform duration-300 origin-center">
                  <ProductImage product={product} priority={index < 2} />
                </div>
              </Link>

              {/* ── Content ── */}
              <div className="flex-1 min-w-0 flex flex-col px-4 pt-3 pb-4 sm:px-6 sm:py-5 gap-2.5 sm:gap-2">
                {/* Desktop: meta row + CTA */}
                <div className="hidden sm:flex items-start justify-between gap-3">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider pt-0.5">
                    {/* With a set on offer the tire is not only sold singly (054). */}
                    {setOffer ? 'Single or set · Free Shipping' : 'Single · Free Shipping'}
                  </span>
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={e => handleAddToCart(e, product)}
                      disabled={productInCart}
                      className="flex items-center gap-2 pl-3 pr-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-full cursor-pointer hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      <CartIcon />
                      {productInCart ? '✓ In Cart' : 'Add to Cart'}
                    </button>
                  </div>
                </div>

                {/* Condition + size + stock — all screen sizes */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={isNew ? '/tires/new' : '/tires/used'}
                      onClick={e => e.stopPropagation()}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide ${condBadgeClass}`}
                    >
                      {condLabel}
                    </Link>
                    {tireSize && sizeSlug && (
                      <Link
                        href={`/tires/size/${sizeSlug}`}
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#0a0a0a] text-[#9dfb40] text-xs font-black tracking-wider hover:bg-[#9dfb40] hover:text-[#0a0a0a] transition-colors duration-150"
                      >
                        {tireSize}
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!isSold && <StockBadge />}
                    {/* Side by side with up to two more (051). */}
                    {!isSold && <CompareToggle tire={product} list={list} />}
                  </div>
                </div>

                {/* Title */}
                <Link
                  href={detailUrl}
                  onClick={() => handleSelect(product, indexOffset + index + 1)}
                  className="group/title"
                >
                  {/*
                    An <h3>, not an <h2>. Each card sits under the results
                    section's own heading, so twenty tire names as <h2> put
                    twenty siblings beside it instead of children under it — a
                    screen reader's outline of the page becomes a flat list of
                    product names with no section to leave.
                  */}
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 leading-snug line-clamp-2 group-hover/title:text-green-700 transition-colors">
                    {titleText}
                  </h3>
                </Link>

                {/* Price + brand logo */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 leading-none">
                    <span className="text-green-600">$</span>
                    {product.price}
                  </span>
                  <FreeShippingBadge />
                  {product.brandId && brandSlug && (
                    <Link
                      href={`/tires/brands/${brandSlug}`}
                      onClick={e => e.stopPropagation()}
                      className="flex h-8 overflow-hidden items-center opacity-70 ml-1 hover:opacity-100 transition-opacity"
                    >
                      <BrandImage product={{ brand: product.brand, brandId: product.brandId }} />
                    </Link>
                  )}
                </div>

                {/* The set this tire can be part of (054): "Set of 4 · $640 total",
                    to the tire page with the builder open on exactly that set.
                    The line's height is reserved, so it arriving after the cards
                    moves nothing (D6). */}
                <div className="flex h-7 items-center">
                  {setOffer && (
                    <Link
                      href={setHref(
                        String(product.id),
                        product.brand || '',
                        tireSize,
                        setOffer.ids
                      )}
                      data-track="set_offer_select"
                      data-track-category="sets"
                      data-track-set-size={setOffer.size}
                      data-track-list={list?.id}
                      data-track-tire-id={String(product.id)}
                      className="inline-flex min-h-6 items-center gap-1.5 rounded-sm text-sm font-semibold text-green-700 underline-offset-2 hover:text-green-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                    >
                      <SetIcon />
                      <span>Set of {setOffer.size}</span>{' '}
                      <span
                        aria-hidden="true"
                        className="h-1 w-1 rounded-full bg-current opacity-60"
                      />{' '}
                      <span>
                        ${setOffer.total.toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
                        total
                      </span>{' '}
                      <span className="sr-only">— build this set</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  )}
                </div>

                {/* Mobile CTA */}
                <div className="sm:hidden mt-0.5">
                  <button
                    type="button"
                    onClick={e => handleAddToCart(e, product)}
                    disabled={productInCart}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white text-sm font-semibold rounded-full cursor-pointer hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <CartIcon />
                    {productInCart ? '✓ IN CART' : 'ADD TO CART'}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Spec strip — dark ── */}
            <div className="grid grid-cols-4 divide-x divide-white/10 border-t border-white/10 bg-[#0a0a0a]">
              {SPEC_KEYS.map(key => {
                const raw = specMap[key] ?? '—';
                // Tread is measured in thirty-seconds of an inch. A bare "8.0"
                // is unreadable to the buyer it is meant to reassure.
                const value = key === 'Tread depth' ? treadDepthLabel(raw) : raw;
                // "Patched: Yes" reads as a warning on its own, at the moment a
                // used-tire buyer hesitates.
                const note = key === 'Patched' ? patchedNote(raw) : undefined;
                return (
                  <div key={key} className="flex flex-col gap-0.5 px-2 py-2 sm:px-3 sm:py-2.5">
                    <span className="text-[10px] font-bold text-[#9dfb40]/60 uppercase tracking-wider">
                      {SPEC_LABELS[key]}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-sm font-bold text-white leading-none"
                        title={note}
                        aria-label={note ? `${SPEC_LABELS[key]}: ${value}. ${note}` : undefined}
                      >
                        {value}
                      </span>
                      {note && (
                        <span
                          aria-hidden="true"
                          title={note}
                          className="grid h-3.5 w-3.5 shrink-0 cursor-help place-items-center rounded-full border border-[#9dfb40]/50 text-[9px] font-bold leading-none text-[#9dfb40]/80"
                        >
                          i
                        </span>
                      )}
                      {key === 'Remaining life' && lifePct > 0 && (
                        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden max-w-[48px]">
                          <div
                            className={`h-full rounded-full ${lifeColor}`}
                            style={{ width: `${lifePct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default TireCard;
