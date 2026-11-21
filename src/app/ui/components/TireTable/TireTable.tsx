'use client';

import { FC } from 'react';

import { TransformedTire } from '@/app/interfaces/tires';
import CompareToggle from '@/app/ui/components/CompareToggle/CompareToggle';
import IntentPrefetchLink from '@/app/ui/components/IntentPrefetchLink/IntentPrefetchLink';
import StockBadge from '@/app/ui/components/StockBadge/StockBadge';
import type { GaList } from '@/app/utils/ecommerce';
import { brandName, modelName, parseTireName } from '@/app/utils/tireNaming';
import { buildTireSlug } from '@/app/utils/tireSlug';
import { patchedNote, treadDepthLabel } from '@/app/utils/tireSpecs';

interface TireTableProps {
  products: TransformedTire[];
  /** The listing, carried into the comparison (051). */
  list?: GaList;
}

const SPEC_KEYS = ['Remaining life', 'Tread depth', 'Patched', 'Run Flat'] as const;

function specs(product: TransformedTire): Partial<Record<(typeof SPEC_KEYS)[number], string>> {
  const map: Partial<Record<(typeof SPEC_KEYS)[number], string>> = {};
  if (Array.isArray(product?.features)) {
    for (const feature of product.features) {
      if ((SPEC_KEYS as readonly string[]).includes(feature.name)) {
        map[feature.name as (typeof SPEC_KEYS)[number]] = feature.value;
      }
    }
  }
  return map;
}

/**
 * The catalogue as a table.
 *
 * **2.089 of 4.149 sellable tires — 50,3% — have no photo.** The row view is
 * built around an image, so for every second listing it spends its widest
 * column on a placeholder. This shows the facts a buyer actually decides on and
 * fits three or four times as many tires on a screen.
 *
 * It **adds** a way to read the results; it does not restyle `TireCard`. That
 * boundary is what keeps this out of the TireCard redesign, which is its own
 * roadmap item and owns the row's design.
 */
const TireTable: FC<TireTableProps> = ({ products, list }) => {
  if (products.length === 0) return null;

  return (
    // The table scrolls inside its own box; the page never scrolls sideways.
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[46rem] text-sm">
        <caption className="sr-only">
          Tires matching your filters, with condition, size, price, remaining life and tread depth
        </caption>
        <thead>
          <tr className="border-b border-gray-200 text-left text-[10px] uppercase tracking-[0.14em] text-gray-500">
            <th scope="col" className="px-4 py-2.5 font-bold">
              Tire
            </th>
            <th scope="col" className="px-3 py-2.5 font-bold">
              Size
            </th>
            <th scope="col" className="px-3 py-2.5 font-bold">
              Condition
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-bold">
              Life
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-bold">
              Tread
            </th>
            <th scope="col" className="px-3 py-2.5 font-bold">
              Patched
            </th>
            <th scope="col" className="px-3 py-2.5 font-bold">
              Run-flat
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-bold">
              Price
            </th>
            <th scope="col" className="px-4 py-2.5 font-bold">
              Stock
            </th>
            <th scope="col" className="px-3 py-2.5 font-bold">
              <span className="sr-only">Compare</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => {
            const { size, displayName } = parseTireName(product.name);
            const spec = specs(product);
            const isNew = (product.condition || '').trim().toLowerCase() === 'new';
            const slug = product.id
              ? buildTireSlug(String(product.id), product.brand || '', size)
              : '';
            const title = [brandName(product.brand), modelName(displayName)]
              .filter(Boolean)
              .join(' ');

            return (
              <tr
                key={product.id}
                className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <IntentPrefetchLink
                    href={slug ? `/tires/${slug}` : '/tires'}
                    className="font-semibold text-gray-900 underline-offset-2 hover:text-green-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                  >
                    {title || product.name}
                  </IntentPrefetchLink>
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-gray-700">{size}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isNew
                        ? 'border border-green-300 bg-green-100 text-green-700'
                        : 'border border-amber-300 bg-amber-100 text-amber-700'
                    }`}
                  >
                    {isNew ? 'New' : 'Used'}
                  </span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                  {spec['Remaining life'] ?? '—'}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                  {treadDepthLabel(spec['Tread depth'])}
                </td>
                <td className="px-3 py-3 text-gray-700">
                  <span title={patchedNote(spec.Patched)}>{spec.Patched ?? '—'}</span>
                </td>
                <td className="px-3 py-3 text-gray-700">{spec['Run Flat'] ?? '—'}</td>
                <td className="px-3 py-3 text-right font-bold tabular-nums text-gray-900">
                  {product.price}
                </td>
                <td className="px-4 py-3">
                  <StockBadge />
                </td>
                <td className="px-3 py-1">
                  <CompareToggle tire={product} list={list} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TireTable;
