import { Float, Int, VarChar } from 'mssql';

/**
 * Turning a filter into SQL, in one place, importable without a database.
 *
 * It lives apart from `tiresRepository` for the same reason `feedQuery` does:
 * that module opens a connection pool at import time, so anything it holds is
 * unreachable from a test. The results, the facet counts and the feed must all
 * agree about what a filter *means*, and the only way to assert that is to be
 * able to load the builder on its own.
 */

type MssqlType = typeof VarChar | typeof Int | typeof Float;
export type SqlParam = { name: string; type: MssqlType; value: unknown };

export type TireFilters = {
  condition?: string[];
  patched?: string[];
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  minTreadDepth?: number;
  maxTreadDepth?: number;
  minRemainingLife?: number;
  maxRemainingLife?: number;
  sort?: string;
  width?: string; // Ancho del neumático (w)
  sidewall?: string; // Relación de aspecto (s)
  diameter?: string; // Diámetro (d)
  stores?: string[];
  /**
   * Shelf codes, each bound to the store it belongs to. A bare code would be
   * ambiguous — seven of them exist in more than one store.
   */
  locations?: { store: string; code: string }[];
  kindSale?: string[];
  local?: string[];
  tireCode?: string;
};

/**
 * Exported so the facet counts are built from the *same* WHERE as the results.
 * Two hand-written translations of "what this filter means" would eventually
 * disagree, and the symptom would be a count that promises tires the next page
 * does not show — the least debuggable kind of wrong.
 */
export function buildFiltersClause(filters: TireFilters): { clause: string; params: SqlParam[] } {
  let clause = '';
  const params: SqlParam[] = [];

  if (filters.width || filters.sidewall || filters.diameter) {
    if (filters.width && filters.sidewall && filters.diameter) {
      clause += ' AND RealSize = @realSize';
      params.push({
        name: 'realSize',
        type: VarChar,
        value: `${filters.width}/${filters.sidewall}/${filters.diameter}`,
      });
    } else {
      if (filters.width) {
        clause += ' AND RealSize LIKE @widthPattern';
        params.push({ name: 'widthPattern', type: VarChar, value: `${filters.width}/%` });
      }
      if (filters.sidewall) {
        clause += ' AND RealSize LIKE @sidewallPattern';
        params.push({ name: 'sidewallPattern', type: VarChar, value: `%/${filters.sidewall}/%` });
      }
      if (filters.diameter) {
        clause += ' AND RealSize LIKE @diameterPattern';
        params.push({ name: 'diameterPattern', type: VarChar, value: `%/${filters.diameter}` });
      }
    }
  }

  if (filters.condition && filters.condition.length > 0) {
    const normalized = filters.condition.map(c => c.toLowerCase());
    if (normalized.includes('new') && !normalized.includes('used')) {
      clause += ' AND ProductTypeId = 1';
    } else if (!normalized.includes('new') && normalized.includes('used')) {
      clause += ' AND ProductTypeId <> 1';
    }
  }

  if (filters.patched && filters.patched.length > 0) {
    const normalized = filters.patched.map(p => p.toLowerCase());
    if (normalized.includes('yes') && !normalized.includes('no')) {
      clause += " AND Patched <> '0'";
    } else if (!normalized.includes('yes') && normalized.includes('no')) {
      clause += " AND Patched = '0'";
    }
  }

  if (filters.brands && filters.brands.length > 0) {
    const brandParams = filters.brands.map((_, i) => `@brand${i}`).join(',');
    clause += ` AND Brand IN (${brandParams})`;
    filters.brands.forEach((brand, i) =>
      params.push({ name: `brand${i}`, type: VarChar, value: brand })
    );
  }

  if (filters.stores && filters.stores.length > 0) {
    const storeParams = filters.stores.map((_, i) => `@store${i}`).join(',');
    clause += ` AND VaultName IN (${storeParams})`;
    filters.stores.forEach((store, i) =>
      params.push({ name: `store${i}`, type: VarChar, value: store })
    );
  }

  /**
   * Store-and-code pairs, not `Location IN (…)`.
   *
   * The neighbouring `stores` branch above is the obvious model and the wrong
   * one here: `IN`, `stkCesar`, `+690A+`, `+692A+`, `+706D+`, `[183B]` and
   * `+IN+` each exist in more than one store, so a flat match would return
   * another store's shelf of the same name without saying so.
   */
  if (filters.locations && filters.locations.length > 0) {
    const pairs = filters.locations.map((pair, i) => {
      params.push({ name: `locStore${i}`, type: VarChar, value: pair.store });
      params.push({ name: `locCode${i}`, type: VarChar, value: pair.code });
      return `(VaultName = @locStore${i} AND Location = @locCode${i})`;
    });
    clause += ` AND (${pairs.join(' OR ')})`;
  }

  if (filters.kindSale && filters.kindSale.length > 0) {
    const normalized = filters.kindSale.map(k => k.toLowerCase());
    if (normalized.includes('yes') && !normalized.includes('no')) {
      clause += " AND KindSale = 'Yes'";
    } else if (!normalized.includes('yes') && normalized.includes('no')) {
      clause += " AND KindSale = 'No'";
    }
  }

  if (filters.local && filters.local.length > 0) {
    const normalized = filters.local.map(l => l.toLowerCase());
    if (normalized.includes('yes') && !normalized.includes('no')) {
      clause += " AND Local = '1'";
    } else if (!normalized.includes('yes') && normalized.includes('no')) {
      clause += " AND Local = '0'";
    }
  }

  if (typeof filters.minPrice === 'number') {
    clause += ' AND Price >= @minPrice';
    params.push({ name: 'minPrice', type: Int, value: filters.minPrice });
  }
  if (typeof filters.maxPrice === 'number') {
    clause += ' AND Price <= @maxPrice';
    params.push({ name: 'maxPrice', type: Int, value: filters.maxPrice });
  }
  if (typeof filters.minTreadDepth === 'number') {
    // `Tread` is text ('7.6'): compared bare, one malformed value anywhere in the
    // view would make SQL Server raise a conversion error (052).
    clause += ' AND TRY_CAST(Tread AS float) >= @minTreadDepth';
    params.push({ name: 'minTreadDepth', type: Float, value: filters.minTreadDepth });
  }
  if (typeof filters.maxTreadDepth === 'number') {
    clause += ' AND TRY_CAST(Tread AS float) <= @maxTreadDepth';
    params.push({ name: 'maxTreadDepth', type: Float, value: filters.maxTreadDepth });
  }
  if (typeof filters.minRemainingLife === 'number') {
    clause += " AND TRY_CAST(REPLACE(RemainingLife, '%', '') AS int) >= @minRemainingLife";
    params.push({ name: 'minRemainingLife', type: Int, value: filters.minRemainingLife });
  }
  if (typeof filters.maxRemainingLife === 'number') {
    clause += " AND TRY_CAST(REPLACE(RemainingLife, '%', '') AS int) <= @maxRemainingLife";
    params.push({ name: 'maxRemainingLife', type: Int, value: filters.maxRemainingLife });
  }

  if (filters.tireCode) {
    clause += ' AND Code = @tireCode';
    params.push({ name: 'tireCode', type: VarChar, value: filters.tireCode });
  }

  return { clause, params };
}
