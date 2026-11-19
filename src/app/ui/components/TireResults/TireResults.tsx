'use client';

import React, { FC } from 'react';

import { TransformedTire } from '@/app/interfaces/tires';
import TireCard from '@/app/ui/sections/TireCard/TireCard';
import type { GaList } from '@/app/utils/ecommerce';

interface TireResultsProps {
  products: TransformedTire[];
  /** The listing, for GA4 list events (feature 046). */
  list?: GaList;
  indexOffset?: number;
}

const TireResults: FC<TireResultsProps> = ({ products, list, indexOffset }) => {
  return (
    /*
     * No `mx-auto max-w-3xl` any more. The list used to be capped at 768 px and
     * centred inside a 1216 px container, leaving 224 px blank on each side; it
     * now takes the width the filter rail leaves it, which measured 944 px —
     * **wider than before, not narrower.**
     */
    <div className="px-3 sm:px-0">
      {products && products.length > 0 ? (
        <TireCard products={products} list={list} indexOffset={indexOffset} />
      ) : (
        <div className="text-center py-8">
          <p className="text-lg font-medium text-gray-700">
            No tires found with the specified criteria
          </p>
          <p className="text-sm text-gray-500 mt-2">Try different dimensions or filters.</p>
        </div>
      )}
    </div>
  );
};

export default TireResults;
