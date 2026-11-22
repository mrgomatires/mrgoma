'use client';

import Link from 'next/link';

import { TransformedTire } from '@/app/interfaces/tires';
import TireCard from '@/app/ui/sections/TireCard/TireCard';
import type { GaList } from '@/app/utils/ecommerce';

/**
 * 62rem − 2 × 1.5rem = 59rem = 944 px of cards, the width of `/tires`'s
 * results column on a desktop; `px-7` (28 px) on phones is `/tires`'s 16 px
 * page margin plus its 12 px list margin.
 */
export const CENTRED_LIKE_TIRES = 'mx-auto max-w-[62rem] px-7 sm:px-6';

interface TireGridProps {
  tires: TransformedTire[];
  totalCount: number;
  viewAllHref: string;
  viewAllLabel?: string;
  /** The listing, for GA4 list events (feature 046). */
  list?: GaList;
  /**
   * The list sits in a results column beside the filter rail (`/tires/used`):
   * take the column's whole width, as `/tires` does (`TireResults`) (059).
   *
   * Without a rail (`/tires/new`, brand and size pages) the list is centred
   * and sized to match `/tires` (061): cards 944 px wide on a desktop (the
   * results column of `max-w-7xl` beside the 15rem rail), and on phones the
   * same 28 px / 24 px side margins. It was a 768 px cap: 720 px cards, a
   * quarter narrower than the same card on `/tires`.
   */
  besideRail?: boolean;
}

export function TireGrid({
  tires,
  totalCount,
  viewAllHref,
  viewAllLabel,
  list,
  besideRail = false,
}: TireGridProps) {
  return (
    <div>
      {tires.length > 0 ? (
        <div className={besideRail ? 'px-3 sm:px-0' : CENTRED_LIKE_TIRES}>
          <TireCard products={tires} list={list} />
        </div>
      ) : (
        <p className="text-center text-gray-500 py-20 text-lg">
          No tires found in this category right now.
        </p>
      )}

      {totalCount > tires.length && (
        <div className="text-center mt-10 mb-16 px-4">
          <p className="text-gray-500 text-sm mb-5">
            Showing {tires.length} of {totalCount} tires
          </p>
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-2 bg-green-600 text-white font-bold px-10 py-3.5 rounded-full hover:bg-green-700 transition-colors duration-200 text-base"
          >
            {viewAllLabel ?? `View all ${totalCount} tires`}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              className="w-4 h-4"
            >
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
