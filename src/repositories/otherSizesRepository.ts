import { unstable_cache } from 'next/cache';

import { getPool } from '@/connection/db';
import { logQuery } from '@/connection/queryLogger';
import { STOREFRONT_SELLABLE_WHERE } from '@/repositories/feedQuery';

/**
 * "Other sizes of this tire" (feature 049): for every brand + model + size for
 * sale, how many units there are, the lowest price, and the cheapest tire —
 * the one the tire page links to (D4).
 *
 * **One query for the whole catalog, cached five minutes.** The tire page is
 * rendered fresh on every visit and the mssql pool (10 connections) has
 * saturated before, so the section must not add a query per page view. The
 * whole answer is ~1,900 rows (1,881 on 2026-11-18), well under the data
 * cache's 2 MB entry limit; every tire page reads it from memory.
 *
 * Whitelisted columns only — never `VaultName` (the store) or `Location`
 * (the shelf). The sellable rule is the catalog's own constant.
 */

export type ModelSizeGroup = {
  brand: string;
  model: string;
  /** `RealSize`, e.g. `235/45/18`. */
  size: string;
  /** Rim diameter, e.g. `18` or `19.5`. */
  rim: string;
  units: number;
  minPrice: number;
  /** The cheapest tire of the group (ties: lowest id). */
  tireId: string;
  /** `ProductTypeId === 1` (the mapper's rule for "New"). */
  isNew: boolean;
};

export const MODEL_SIZE_GROUPS_SQL = `
  SELECT Brand, Model2, RealSize, Size, units, minPrice, TireId, ProductTypeId
  FROM (
    SELECT Brand, Model2, RealSize, Size, TireId, ProductTypeId,
      COUNT(*) OVER (PARTITION BY Brand, Model2, RealSize) AS units,
      MIN(TRY_CAST(Price AS float)) OVER (PARTITION BY Brand, Model2, RealSize) AS minPrice,
      ROW_NUMBER() OVER (
        PARTITION BY Brand, Model2, RealSize
        ORDER BY TRY_CAST(Price AS float), TireId
      ) AS rn
    FROM dbo.View_Tires
    WHERE ${STOREFRONT_SELLABLE_WHERE}
      AND ISNULL(Brand, '') <> '' AND ISNULL(Model2, '') <> '' AND ISNULL(RealSize, '') <> ''
  ) AS g
  WHERE rn = 1`;

type Row = {
  Brand: string;
  Model2: string;
  RealSize: string;
  Size: string | number | null;
  units: number;
  minPrice: number | null;
  TireId: string | number;
  ProductTypeId: number | string | null;
};

export function toModelSizeGroup(r: Row): ModelSizeGroup | null {
  const minPrice = Number(r.minPrice);
  if (!Number.isFinite(minPrice) || minPrice <= 0) return null;
  const rim = String(r.Size ?? r.RealSize.split('/')[2] ?? '').trim();
  return {
    brand: r.Brand,
    model: r.Model2,
    size: r.RealSize,
    rim,
    units: Number(r.units) || 1,
    minPrice,
    tireId: String(r.TireId),
    isNew: Number(r.ProductTypeId) === 1,
  };
}

export async function fetchModelSizeGroups(): Promise<ModelSizeGroup[]> {
  const pool = await getPool();
  const result = await logQuery('tires.modelSizeGroups', () =>
    pool.request().query(MODEL_SIZE_GROUPS_SQL)
  );
  return (result.recordset as Row[]).map(toModelSizeGroup).filter(g => g !== null);
}

export const getCachedModelSizeGroups = unstable_cache(
  () => fetchModelSizeGroups(),
  ['model-size-groups'],
  { revalidate: 300, tags: ['other-sizes'] }
);
