import { FC } from 'react';

import GoogleRating from '@/app/ui/components/GoogleRating/GoogleRating';
import TrustStrip from '@/app/ui/components/TrustStrip/TrustStrip';
import { LOCATIONS_LABEL, SHIPPING, WARRANTY, onlineInventoryLabel } from '@/app/utils/brandClaims';
import { combinedRating } from '@/app/utils/googleRatings';

interface TiresHeroProps {
  /** `225/50/19` when all three parts are filtered, otherwise empty. */
  size: string;
  totalCount: number;
}

/**
 * The catalogue's hero.
 *
 * Lifted out of `SearchResults` so the page can put the filter rail beside the
 * results: the rail and the list are two columns of one grid, and the hero sits
 * above both. It holds no state and reads no parameters, so it stays on the
 * server.
 *
 * The city wording is asserted by `catalogHeadings.guard.test.ts` — **one tire
 * in five is in Orlando**, and a heading naming only Miami is wrong for every
 * one of them.
 */
const TiresHero: FC<TiresHeroProps> = ({ size, totalCount }) => (
  <section className="relative overflow-hidden border-b border-white/8 bg-[#0a0a0a] text-white">
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage:
          'linear-gradient(#9dfb40 1px, transparent 1px), linear-gradient(90deg, #9dfb40 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }}
    />
    <span
      className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 select-none text-[clamp(80px,14vw,180px)] font-black leading-none"
      style={{ color: 'rgba(157,251,64,0.04)', letterSpacing: '-4px' }}
      aria-hidden="true"
    >
      TIRES
    </span>
    <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mb-4 flex items-center gap-3">
        <span className="h-px w-8 bg-[#9dfb40]" />
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#9dfb40]">
          Miami &amp; Orlando, FL
        </span>
      </div>
      <h1 className="mb-5 text-4xl font-black leading-none tracking-tight sm:text-5xl lg:text-6xl">
        {size ? (
          <>
            Size <span className="text-[#9dfb40]">{size}</span>{' '}
            <span className="block text-3xl font-bold text-gray-400 sm:text-4xl">
              Tires in Miami &amp; Orlando
            </span>
          </>
        ) : (
          <>
            New &amp; Used{' '}
            <span className="block text-[#9dfb40]">Tires in Miami &amp; Orlando</span>
          </>
        )}
      </h1>
      <TrustStrip
        className="mt-6"
        // The stores' Google rating first (053, D2).
        lead={
          <GoogleRating
            figures={combinedRating()}
            variant="chip"
            href="/locations"
            track={{ event: 'google_rating_click', surface: 'tires' }}
          />
        }
        items={[
          // The live catalogue count, labelled for what it is. The "15,000+"
          // network claim describes physical stock across the stores and must
          // never appear unqualified next to this number.
          ...(totalCount > 0 ? [onlineInventoryLabel(totalCount)] : []),
          SHIPPING,
          LOCATIONS_LABEL,
          WARRANTY,
        ]}
      />
    </div>
  </section>
);

export default TiresHero;
