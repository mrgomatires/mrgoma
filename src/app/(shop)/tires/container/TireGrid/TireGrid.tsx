'use client';

import Link from 'next/link';

import { TransformedTire } from '@/app/interfaces/tires';
import TireCard from '@/app/ui/sections/TireCard/TireCard';
import type { GaList } from '@/app/utils/ecommerce';

interface TireGridProps {
  tires: TransformedTire[];
  totalCount: number;
  viewAllHref: string;
  viewAllLabel?: string;
  /** The listing, for GA4 list events (feature 046). */
  list?: GaList;
}

export function TireGrid({ tires, totalCount, viewAllHref, viewAllLabel, list }: TireGridProps) {
  return (
    <div>
      {tires.length > 0 ? (
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
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
