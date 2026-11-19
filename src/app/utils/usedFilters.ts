import type { TireFilters } from '@/repositories/filtersClause';

import { setParam } from './filterHref';

/**
 * Used-tire filters (feature 052): tread depth, remaining life and patched.
 *
 * **They describe used tires only** (D3). Every new tire is 10/32" and
 * unpatched, so offering them on new tires filters nothing — or, combined with
 * New, empties the list. Hence one rule, applied at two layers:
 *
 * - **Links** — applying one writes `condition=used`; a condition change keeps
 *   them only if the next set is exactly `used` (`conditionHref`).
 * - **The server** — `normalizeUsedFilters` catches URLs typed or kept from
 *   before, in the storefront only (the seller dashboard shares
 *   `buildTireFilters` and filters new tires by tread on purpose).
 */

/** The URL parameters that only mean something for used tires. */
export const USED_ONLY_PARAMS = [
  'minTreadDepth',
  'maxTreadDepth',
  'minRemainingLife',
  'maxRemainingLife',
  'patched',
] as const;

/**
 * The tread steps, "at least N/32"". The used stock on 2026-11-18 sat between
 * 6 and 10/32" (2,072 at 6–7.9, 1,508 at 8–9.9, 223 at 10), so 10+ would be the
 * new-tire tread and 5 or less would hold four tires.
 */
export const TREAD_STEPS = [6, 7, 8, 9] as const;

/** The step quick chips offer: the middle of the used stock. */
export const QUICK_TREAD_STEP = 8;

/** `8/32"+` — what a buyer reads. */
export const treadLabel = (step: number) => `${step}/32"+`;

/**
 * Read after the visible `8/32"+` by screen readers only, so the name is
 * `8/32"+ minimum tread`: it *starts* with what is on screen (WCAG 2.5.3 —
 * a voice user says what they see), then says what the shorthand means.
 */
export const TREAD_SR_HINT = 'minimum tread';

function read(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

function write(next: URLSearchParams): string {
  next.sort();
  const query = next.toString();
  return query ? `?${query}` : '';
}

/** The same query narrowed to used tires: `condition=used`, nothing else touched. */
export function withUsed(search: string): string {
  return setParam(search, 'condition', 'used');
}

/** `/tires/used`'s "View all": the same filters, on the paginated catalog (052). */
export const usedCatalogHref = (search: string) => `/tires${withUsed(search)}`;

/** The same query without any used-only filter. */
export function withoutUsedFilters(search: string): string {
  const next = read(search);
  for (const param of USED_ONLY_PARAMS) next.delete(param);
  next.delete('page');
  return write(next);
}

const isExactlyUsed = (values: readonly string[]) =>
  values.length === 1 && values[0].toLowerCase() === 'used';

/**
 * Where a condition link leads: the next `condition` set, and the used filters
 * kept only if that set is exactly `used`. Adding New to a used view with a
 * tread filter must *drop* the tread filter — keeping it would let
 * `normalizeUsedFilters` turn the view back into used only, and "New" would
 * appear to do nothing.
 */
export function conditionHref(search: string, nextConditions: readonly string[]): string {
  const next = read(isExactlyUsed(nextConditions) ? search : withoutUsedFilters(search));
  if (nextConditions.length > 0) next.set('condition', nextConditions.join(','));
  else next.delete('condition');
  next.delete('page');
  return write(next);
}

/** Only new tires are being browsed. */
export const isNewOnly = (filters: Pick<TireFilters, 'condition'>) =>
  (filters.condition ?? []).length > 0 &&
  (filters.condition ?? []).every(c => c.toLowerCase() === 'new');

export const hasUsedFilter = (filters: TireFilters) =>
  filters.minTreadDepth !== undefined ||
  filters.maxTreadDepth !== undefined ||
  filters.minRemainingLife !== undefined ||
  filters.maxRemainingLife !== undefined ||
  (filters.patched ?? []).length > 0;

const validTread = (n: number | undefined) =>
  n !== undefined && Number.isInteger(n) && n >= 1 && n <= 32 ? n : undefined;

/**
 * The storefront's reading of the used filters, for any URL:
 *
 * - a tread bound outside 1–32 is ignored;
 * - with New only, the used filters are dropped (the list shows new tires);
 * - with a used filter and no condition, or both, the view is used only.
 */
export function normalizeUsedFilters(filters: TireFilters): TireFilters {
  const next: TireFilters = { ...filters };
  const minTread = validTread(next.minTreadDepth);
  const maxTread = validTread(next.maxTreadDepth);
  if (minTread === undefined) delete next.minTreadDepth;
  else next.minTreadDepth = minTread;
  if (maxTread === undefined) delete next.maxTreadDepth;
  else next.maxTreadDepth = maxTread;

  if (isNewOnly(next)) {
    for (const key of [
      'minTreadDepth',
      'maxTreadDepth',
      'minRemainingLife',
      'maxRemainingLife',
      'patched',
    ] as const) {
      delete next[key];
    }
    return next;
  }

  if (hasUsedFilter(next)) next.condition = ['used'];
  return next;
}
