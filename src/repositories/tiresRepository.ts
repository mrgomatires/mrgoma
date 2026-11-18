import { Int, VarChar } from 'mssql';

import { getPool } from '@/connection/db';
import { logQuery } from '@/connection/queryLogger';
import {
  STOREFRONT_SELLABLE_WHERE,
  buildFeedQuery,
  type FeedTireRecord,
} from '@/repositories/feedQuery';
import { buildFiltersClause } from '@/repositories/filtersClause';
import type { TireFilters } from '@/repositories/filtersClause';

// Re-exported: `TireFilters` and the clause builder are imported from here all
// over the app, and moving the file must not become a rename of the import.
export { buildFiltersClause };
export type { TireFilters };

export type DocumentRecord = {
  id?: number;
  ProductTypeId?: number;
  TireId: string;
  Code: string;
  DOT?: string;
  loadIndex?: string;
  Brand?: string;
  Model?: string;
  Model2?: string;
  Description?: string;
  Size?: string;
  Image1?: string;
  Image2?: string;
  Image3?: string;
  Image4?: string;
  Price?: string | number;
  BrandId?: number;
  Condition?: string;
  Patched?: string;
  RemainingLife?: string;
  Status?: string;
  speedIndex?: string;
  Tread?: string;
  RealSize?: string;
  VaultName?: string;
  /** The shelf code within a store — NOT a geographic location. See `026`. */
  Location?: string;
  /** Set when staff remove the record; such a tire is never published (045). */
  Trash?: boolean | number | string;
  KindSale?: string;
  KindSaleId?: number;
  Height?: string | number;
  Width?: string | number;
  LoadIndexId?: string | number;
};

export type TireRangeResult = {
  minPrice: number;
  maxPrice: number;
  minTreadDepth: number;
  maxTreadDepth: number;
  minRemainingLife: number;
  maxRemainingLife: number;
};

export async function fetchTires(
  offset: number,
  pageSize: number,
  filters: TireFilters = {}
): Promise<{ records: DocumentRecord[]; totalCount: number }> {
  return fetchTiresInternal(offset, pageSize, filters, STOREFRONT_SELLABLE_WHERE);
}

export async function fetchDashboardTires(
  offset: number,
  pageSize: number,
  filters: TireFilters = {}
): Promise<{ records: DocumentRecord[]; totalCount: number }> {
  return fetchTiresInternal(offset, pageSize, filters, "Trash = 'false'");
}

async function fetchTiresInternal(
  offset: number,
  pageSize: number,
  filters: TireFilters = {},
  baseWhereClause: string
): Promise<{ records: DocumentRecord[]; totalCount: number }> {
  const pool = await getPool();
  const request = pool.request();
  const countRequest = pool.request();

  request.input('offset', Int, offset).input('pageSize', Int, pageSize);
  countRequest.input('offset', Int, offset).input('pageSize', Int, pageSize);

  const { clause, params } = buildFiltersClause(filters);
  const whereClause = baseWhereClause + clause;
  for (const p of params) {
    request.input(p.name, p.type, p.value);
    countRequest.input(p.name, p.type, p.value);
  }

  const baseQuery = `FROM dbo.View_Tires WHERE ${whereClause}`;

  let orderBy = 'ModificationDate DESC';

  if (filters.sort) {
    switch (filters.sort) {
      case 'price-asc':
        orderBy = 'Price ASC';
        break;
      case 'price-desc':
        orderBy = 'Price DESC';
        break;
      /**
       * Most tread left first — the question a used-tire buyer actually asks
       * once price is settled. Numeric, not textual: `RemainingLife` is stored
       * as `'99%'`, and sorting that as text puts 9% above 80%.
       *
       * `TireId DESC` breaks ties so the order is stable across pages; without
       * it, rows sharing a life value can reshuffle between requests and a tire
       * appears twice or not at all while paging.
       */
      case 'life-desc':
        orderBy = "TRY_CAST(REPLACE(RemainingLife, '%', '') AS int) DESC, TireId DESC";
        break;
      case 'newest':
        orderBy = 'ModificationDate DESC, TireId DESC';
        break;
    }
  }

  const dataQuery = `SELECT * ${baseQuery} ORDER BY ${orderBy} OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;
  const countQuery = `SELECT COUNT(*) AS totalCount ${baseQuery}`;

  const [dataResult, countResult] = await Promise.all([
    logQuery('tires.list.data', () => request.query(dataQuery), { offset, pageSize }),
    logQuery('tires.list.count', () => countRequest.query(countQuery)),
  ]);

  const records = dataResult.recordset as DocumentRecord[];
  const totalCount = countResult.recordset[0]?.totalCount as number;

  return { records, totalCount };
}

export async function fetchTireRanges(): Promise<TireRangeResult> {
  // The same rule as the results, so the slider's bounds describe the set the
  // buyer is actually filtering. These were two separately written sentences.
  return fetchTireRangesInternal(STOREFRONT_SELLABLE_WHERE);
}

export async function fetchDashboardRanges(): Promise<TireRangeResult> {
  return fetchTireRangesInternal("Trash = 'false'");
}

async function fetchTireRangesInternal(baseWhereClause: string): Promise<TireRangeResult> {
  const pool = await getPool();

  const query = `SELECT
      MIN(Price) AS minPrice,
      MAX(Price) AS maxPrice,
      MIN(TRY_CAST(Tread AS float)) AS minTreadDepth,
      MAX(TRY_CAST(Tread AS float)) AS maxTreadDepth,
      MIN(TRY_CAST(REPLACE(RemainingLife, '%', '') AS int)) AS minRemainingLife,
      MAX(TRY_CAST(REPLACE(RemainingLife, '%', '') AS int)) AS maxRemainingLife
    FROM dbo.View_Tires
    WHERE ${baseWhereClause}`;

  const result = await logQuery('tires.ranges', () => pool.request().query(query));

  return result.recordset[0] as TireRangeResult;
}

export async function fetchBrands(filters: TireFilters = {}): Promise<string[]> {
  // The constant, not a second copy of it: this literal was character-identical
  // to STOREFRONT_SELLABLE_WHERE, which is exactly when a duplicate is cheap to
  // remove and impossible to notice.
  return fetchBrandsInternal(filters, STOREFRONT_SELLABLE_WHERE);
}

export async function fetchDashboardBrands(filters: TireFilters = {}): Promise<string[]> {
  return fetchBrandsInternal(filters, "Trash = 'false'");
}

async function fetchBrandsInternal(
  filters: TireFilters = {},
  baseWhereClause: string
): Promise<string[]> {
  const pool = await getPool();
  const request = pool.request();

  const { clause, params } = buildFiltersClause(filters);
  const whereClause = baseWhereClause + clause;
  for (const p of params) {
    request.input(p.name, p.type, p.value);
  }

  const query = `SELECT DISTINCT Brand
    FROM dbo.View_Tires
    WHERE ${whereClause} AND Brand IS NOT NULL AND Brand <> ''
    ORDER BY Brand`;

  const result = await logQuery('tires.brands', () => request.query(query));
  return result.recordset.map(row => row.Brand as string);
}

export async function fetchSizes(): Promise<string[]> {
  const pool = await getPool();
  const baseWhere = STOREFRONT_SELLABLE_WHERE;
  const query = `SELECT DISTINCT RealSize
    FROM dbo.View_Tires
    WHERE ${baseWhere} AND RealSize IS NOT NULL AND RealSize <> ''
    ORDER BY RealSize`;
  const result = await logQuery('tires.sizes', () => pool.request().query(query));
  return result.recordset.map(row => row.RealSize as string);
}

/**
 * Every size for sale with how many tires it has (feature 050, the size index).
 * Same rule as {@link fetchSizes}, so the two lists name the same sizes.
 */
export const SIZE_COUNTS_SQL = `SELECT RealSize, COUNT(*) AS units
    FROM dbo.View_Tires
    WHERE ${STOREFRONT_SELLABLE_WHERE} AND RealSize IS NOT NULL AND RealSize <> ''
    GROUP BY RealSize`;

export async function fetchSizeCounts(): Promise<{ size: string; units: number }[]> {
  const pool = await getPool();
  const result = await logQuery('tires.sizeCounts', () => pool.request().query(SIZE_COUNTS_SQL));
  return result.recordset.map(row => ({
    size: row.RealSize as string,
    units: Number(row.units) || 0,
  }));
}

export async function fetchDashboardStores(): Promise<string[]> {
  const pool = await getPool();
  const query = `SELECT DISTINCT VaultName
    FROM dbo.View_Tires
    WHERE Trash = 'false' AND VaultName IS NOT NULL AND VaultName <> ''
    ORDER BY VaultName DESC`;
  const result = await logQuery('tires.stores', () => pool.request().query(query));
  return result.recordset.map(row => row.VaultName as string);
}

/**
 * The shelf codes held by the given stores, each paired with its store.
 *
 * **Pairs, not codes.** A code is only unique inside a store: `IN`, `stkCesar`,
 * `+690A+`, `+692A+`, `+706D+`, `[183B]` and `+IN+` each exist in more than one.
 * Returning bare codes would let the caller build a filter that quietly matches
 * another store's shelf.
 *
 * With no store there is nothing to ask for, so this returns `[]` **without
 * querying** — the filter that consumes it is disabled in that state anyway, and
 * the unscoped list would be 675 values.
 *
 * The code is returned exactly as stored, not trimmed. No value in the catalog
 * has edge whitespace today, and trimming here while `buildFiltersClause`
 * compares with `=` is how an option would stop matching the rows it names.
 */
export async function fetchDashboardLocations(
  stores: string[]
): Promise<{ store: string; code: string }[]> {
  const wanted = Array.from(new Set(stores.map(store => store.trim()).filter(Boolean)));
  if (wanted.length === 0) return [];

  const pool = await getPool();
  const request = pool.request();
  const storeParams = wanted.map((store, i) => {
    request.input(`store${i}`, VarChar, store);
    return `@store${i}`;
  });

  const query = `SELECT DISTINCT VaultName, Location
    FROM dbo.View_Tires
    WHERE Trash = 'false'
      AND VaultName IN (${storeParams.join(',')})
      AND Location IS NOT NULL AND LTRIM(RTRIM(Location)) <> ''
    ORDER BY VaultName, Location`;

  const result = await logQuery('tires.locations', () => request.query(query), {
    stores: wanted.length,
  });

  return result.recordset.map(row => ({
    store: row.VaultName as string,
    code: row.Location as string,
  }));
}

export async function fetchTireById(tireId: string): Promise<DocumentRecord | null> {
  const pool = await getPool();
  const request = pool.request();
  request.input('tireId', VarChar, tireId);

  const query = `SELECT TOP 1 * FROM dbo.View_Tires WHERE TireId = @tireId`;

  const result = await logQuery('tires.byId', () => request.query(query), { tireId });
  const record = (result.recordset && result.recordset[0]) as DocumentRecord | undefined;
  return record || null;
}

export async function fetchTiresByIds(tireIds: string[]): Promise<DocumentRecord[]> {
  if (tireIds.length === 0) return [];

  const unique = Array.from(new Set(tireIds.map(id => id.trim()).filter(Boolean)));
  const pool = await getPool();
  const request = pool.request();

  const params = unique.map((id, idx) => {
    request.input(`tid${idx}`, VarChar, id);
    return `@tid${idx}`;
  });

  const result = await logQuery(
    'tires.byIds',
    () => request.query(`SELECT * FROM dbo.View_Tires WHERE TireId IN (${params.join(',')})`),
    { count: unique.length }
  );
  return (result.recordset as DocumentRecord[]) ?? [];
}

export async function fetchActiveTireIds(
  limit: number = 2000
): Promise<Array<{ id: string; modified?: Date; brand?: string; size?: string }>> {
  const pool = await getPool();
  const request = pool.request();
  // SQL Server allows TOP (@limit) with a variable
  request.input('limit', Int, limit);
  const query = `SELECT TOP (@limit) TireId, ModificationDate, Brand, RealSize
                 FROM dbo.View_Tires
                 WHERE Local = '0' AND Trash = 'false' AND Condition != 'sold' AND Price != 0
                 ORDER BY ModificationDate DESC`;
  const result = await logQuery('tires.activeIds', () => request.query(query), { limit });
  return (result.recordset || []).map(
    (row: { TireId: string; ModificationDate?: Date; Brand?: string; RealSize?: string }) => ({
      id: String(row.TireId),
      modified: row.ModificationDate,
      brand: row.Brand || undefined,
      size: row.RealSize || undefined,
    })
  );
}

/**
 * Fetches the full online-sellable lot for the Google Merchant feed — same
 * business rule as `fetchTires` (via the shared `buildFeedQuery`), whitelisted
 * columns, no pagination/cap.
 */
export async function fetchSellableTiresForFeed(): Promise<FeedTireRecord[]> {
  const pool = await getPool();
  const request = pool.request();
  const result = await logQuery('tires.merchantFeed', () => request.query(buildFeedQuery()));
  return (result.recordset as FeedTireRecord[]) ?? [];
}

export async function setTiresConditionIdToSoldByIds(
  tireIds: Array<string | number>,
  conditionId: number = 7
): Promise<{ updated: number }> {
  if (!Array.isArray(tireIds) || tireIds.length === 0) return { updated: 0 };

  const unique = Array.from(new Set(tireIds.map(id => String(id).trim()).filter(Boolean)));
  if (unique.length === 0) return { updated: 0 };

  const pool = await getPool();
  const request = pool.request();

  // Bind parameters for IN clause
  const params: string[] = [];
  unique.forEach((id, idx) => {
    const param = `id${idx}`;
    params.push(`@${param}`);
    request.input(param, VarChar, id);
  });

  request.input('condId', Int, conditionId);

  const sql = `UPDATE dbo.Tires SET ConditionId = @condId, Trash = 1 WHERE TireId IN (${params.join(', ')})`;
  const result = await logQuery('tires.markSold', () => request.query(sql), {
    count: unique.length,
  });

  const rows = result.rowsAffected.reduce((acc, n) => acc + n, 0);

  return { updated: rows || 0 };
}
