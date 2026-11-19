import { FC } from 'react';

import { TireInformationProps } from '@/app/interfaces/tires';
import {
  ProductName,
  ProductPrice,
  ProductDescription,
  BrandImage,
  FreeShippingBadge,
} from '@/app/ui/components';
import AddToCartButton from '@/app/ui/components/AddToCartButton/AddToCartButton';
import GoogleRating from '@/app/ui/components/GoogleRating/GoogleRating';
import OtherCityMatch from '@/app/ui/components/OtherCityMatch/OtherCityMatch';
import ViewItemTracker from '@/app/ui/components/ViewItemTracker/ViewItemTracker';
import { WhatsAppEnquiryButton } from '@/app/ui/components/WhatsAppEnquiryButton/WhatsAppEnquiryButton';
import { combinedRating } from '@/app/utils/googleRatings';
import { generateTireDescription } from '@/app/utils/tireDescription';
import { brandName, modelName, tireTitle } from '@/app/utils/tireNaming';
import { patchedNote, treadDepthLabel } from '@/app/utils/tireSpecs';

// Server Component: renders the product info from props. The only interactive
// piece (add-to-cart) is delegated to the `AddToCartButton` client island.
const TireInformation: FC<TireInformationProps> = ({ singleTire, setSlot, soldSlot }) => {
  // Determine availability from DB Condition (exposed as status)
  const isSold =
    typeof singleTire.status === 'string' && singleTire.status.trim().toLowerCase() === 'sold';

  // Extract tire size from name format: "(CODE) | BRAND | SIZE"
  const nameParts = singleTire.name.split(' | ');
  const size = nameParts.length >= 2 ? nameParts[nameParts.length - 1] : undefined;

  // Extract technical specs from details items (e.g. "Load Index: 92")
  const detailItems: string[] = (singleTire.details?.[0]?.items as string[]) || [];
  const findDetail = (prefix: string) =>
    detailItems
      .find(i => i.startsWith(prefix))
      ?.split(': ')[1]
      ?.trim();

  const isNew = singleTire.condition?.toLowerCase() === 'new';
  const lifePct = parseInt((singleTire.remainingLife || '').replace('%', ''), 10) || 0;
  const lifeColor = lifePct >= 70 ? 'bg-[#9dfb40]' : lifePct >= 40 ? 'bg-amber-400' : 'bg-red-500';

  const tireDescription = generateTireDescription({
    brand: brandName(singleTire.brand),
    model: modelName(singleTire.model2),
    size,
    condition: singleTire.condition,
    remainingLife: singleTire.remainingLife,
    treadDepth: singleTire.treadDepth,
    patched: singleTire.patched,
    loadIndex: findDetail('Load Index'),
    speedIndex: findDetail('Speed Index'),
    city: singleTire.city,
  });

  return (
    <section aria-labelledby={`product-name-${singleTire.id}`}>
      <div role="group" aria-label="Product header">
        <div>
          <div className="mb-3">
            <div className="mb-4">
              <BrandImage
                product={{
                  brand: singleTire.brand,
                  brandId: singleTire.brandId,
                }}
              />
            </div>
            {/*
              The same name the card showed, so the tire does not change identity
              between the list and its own page. The stock code moves to the line
              below, where it is useful for support rather than sitting in the
              middle of the product name.
            */}
            <ProductName
              id={`product-name-${singleTire.id}`}
              type={2}
              size="3xl"
              weight="bold"
              name={tireTitle({ brand: singleTire.brand, model: singleTire.model2 })}
            />
            {singleTire.code && <p className="text-sm text-gray-500 mt-1">#{singleTire.code}</p>}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <h2 className="sr-only">Product information</h2>
            {/* A sold tire shows no price (045): sold records often carry 0, and a
                price for something not for sale only invites the wrong question. */}
            {isSold ? (
              <div
                className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                role="status"
                aria-live="polite"
              >
                Not available
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ProductPrice price={singleTire.price} />
                <FreeShippingBadge />
              </div>
            )}
            {/* Every tire, sold included: the page was still viewed, and leaving
                sold stock out would hide demand for what sold out (040). */}
            <ViewItemTracker
              tire={{
                id: singleTire.id,
                name: singleTire.name,
                price: singleTire.price,
                brand: singleTire.brand,
                model: singleTire.model2,
                size: singleTire.size ?? size,
                condition: singleTire.condition,
              }}
            />
            {/* Sold: "Not available" took the price's place, on the left. */}
            {isSold ? null : <AddToCartButton product={singleTire} />}
          </div>
          {/* The stores' Google rating by the price and the buy button (053, D3),
              where a first-time buyer decides whether to trust the shop. */}
          {!isSold && (
            <GoogleRating
              figures={combinedRating()}
              variant="inline"
              href="/locations"
              track={{ event: 'google_rating_click', surface: 'tire_page' }}
              className="mt-2 block"
            />
          )}
          {/* Beneath the primary action, never beside it: Add to cart already
              renders as an outlined green button, so a second outlined button on
              the same row would read as an equal choice rather than a quieter
              one. Present on a sold tire too — that is the moment a customer is
              most likely to want to ask for another in the same size. */}
          {/* Feature 045: the same tire in stock, given by the page (see `soldSlot`). */}
          {isSold && soldSlot}
          <WhatsAppEnquiryButton product={singleTire} />
          <div
            aria-label="Key specifications"
            className={`mt-4 grid grid-cols-2 ${
              singleTire.runFlat ? 'sm:grid-cols-5' : 'sm:grid-cols-4'
            } divide-x divide-y sm:divide-y-0 divide-gray-100 border border-gray-200 rounded-xl overflow-hidden`}
          >
            <div className="px-3 py-3 bg-gray-50">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Condition
              </p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${isNew ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
              >
                {isNew ? 'New' : 'Used'}
              </span>
            </div>
            <div className="px-3 py-3 bg-gray-50">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Life
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-gray-900">
                  {singleTire.remainingLife || '—'}
                </span>
                {lifePct > 0 && (
                  <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden max-w-[36px]">
                    <div
                      className={`h-full rounded-full ${lifeColor}`}
                      style={{ width: `${lifePct}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="px-3 py-3 bg-gray-50">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Tread
              </p>
              <span className="text-sm font-bold text-gray-900">
                {treadDepthLabel(singleTire.treadDepth)}
              </span>
            </div>
            <div className="px-3 py-3 bg-gray-50">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Patched
              </p>
              <span className="text-sm font-bold text-gray-900">{singleTire.patched || '—'}</span>
              {/*
                This is where a used-tire buyer hesitates. The fact stays; the
                context is what turns it from a warning into a reassurance.
              */}
              {patchedNote(singleTire.patched) && (
                <p className="mt-1 text-[11px] leading-snug text-gray-500">
                  {patchedNote(singleTire.patched)}
                </p>
              )}
            </div>
            {singleTire.runFlat && (
              <div className="col-span-2 sm:col-span-1 px-3 py-3 bg-gray-50">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Run Flat
                </p>
                <span className="text-sm font-bold text-gray-900">
                  {/^y/i.test(singleTire.runFlat) ? 'Yes' : 'No'}
                </span>
              </div>
            )}
          </div>
          {/* Feature 043: where the tire is — the same line for every visitor
              (no personalised HTML). The match in the visitor's own city, when
              it differs, is appended on this line in the browser. */}
          {!isSold && singleTire.city && (
            <p className="mt-3 flex flex-wrap items-center gap-x-1 text-sm text-gray-700">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 shrink-0 text-gray-500"
              >
                <path
                  fillRule="evenodd"
                  d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                Located in <strong className="font-semibold">{singleTire.city}</strong>
                <OtherCityMatch tireId={String(singleTire.id)} tireCity={singleTire.city} />
              </span>
            </p>
          )}
          {/* Feature 041. After the specs, so the tire's own state is read first.
              The block is given by the page (see `setSlot`); none for a sold tire. */}
          {!isSold && setSlot}
        </div>
      </div>
      <div className="my-6">
        <ProductDescription description={tireDescription} />
      </div>
    </section>
  );
};

export default TireInformation;
