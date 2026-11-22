/**
 * Every link in the filter rail is built here.
 *
 * This is the file whose bugs are invisible in a screenshot. A filter that
 * quietly drops another filter, or that leaves the buyer on page 7 of a
 * two-page result, renders exactly like one that works — so the tests for this
 * module are written over *relationships* (toggling twice returns the original;
 * removing one never touches the rest) rather than over example strings.
 *
 * **The URL vocabulary is not ours to change.** These parameter names are read
 * by `buildTireFilters`, written by the AI chat and by the home-page hero, and
 * appear in links Google has already indexed. Renaming one would break all three
 * at once, so this module only ever composes the names that already exist.
 */

/**
 * The two ends of one filter. Both bounds are set together, shown as one chip
 * and removed as one, so they must also *count* as one — a buyer who picked a
 * price band has applied one filter, and a collapsed control announcing "2
 * filters" would be describing the implementation rather than the choice.
 */
export const RANGE_PAIRS: readonly [string, string][] = [
  ['minPrice', 'maxPrice'],
  ['minRemainingLife', 'maxRemainingLife'],
  ['minTreadDepth', 'maxTreadDepth'],
];

/** Parameters that hold a comma-separated set. */
export const MULTI_PARAMS = ['brands', 'condition', 'patched', 'kindSale'] as const;

/** Everything "Clear all" removes. `view`, `sort` and `pageSize` are how the
 *  buyer is reading the list, not what they are looking for, so they survive. */
export const FILTER_PARAMS = [
  ...MULTI_PARAMS,
  'brand', // the singular alias `buildTireFilters` still accepts
  'w',
  's',
  'd',
  'minPrice',
  'maxPrice',
  'minTreadDepth',
  'maxTreadDepth',
  'minRemainingLife',
  'maxRemainingLife',
  'code',
] as const;

function params(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

/**
 * Any change to the filters puts the buyer back on the first page.
 *
 * The parameter is deleted rather than set to `1`: it means the same thing to
 * `buildTireFilters`, and it keeps the canonical URL of a filtered view free of
 * a parameter that says nothing — which matters on a route whose duplicate URLs
 * were the subject of `022`.
 */
function resetPage(next: URLSearchParams): void {
  next.delete('page');
}

function serialise(next: URLSearchParams): string {
  next.sort(); // stable ordering, so the same filter set is always the same URL
  const query = next.toString();
  return query ? `?${query}` : '';
}

function readSet(next: URLSearchParams, param: string): string[] {
  const raw = next.get(param);
  return raw ? raw.split(',').filter(Boolean) : [];
}

/**
 * Values are compared without regard to case.
 *
 * The catalogue stores brands in capitals and the rail writes them that way, but
 * the AI chat emits what a person typed — `brands=Michelin`. Compared exactly,
 * the results filtered correctly while the rail showed Michelin **unticked**,
 * and clicking it appended a second spelling: `brands=Michelin,MICHELIN`. SQL
 * matches these case-insensitively, so the URL must too, or the page and its own
 * controls disagree about what is applied.
 */
function sameValue(a: string, b: string): boolean {
  return a.toUpperCase() === b.toUpperCase();
}

function writeSet(next: URLSearchParams, param: string, values: string[]): void {
  if (values.length > 0) next.set(param, values.join(','));
  else next.delete(param);
}

/** Whether a value is currently selected in a set-valued parameter. */
export function hasValue(search: string, param: string, value: string): boolean {
  return readSet(params(search), param).some(existing => sameValue(existing, value));
}

/** Add one value to a set-valued parameter, leaving every other parameter alone. */
export function addValue(search: string, param: string, value: string): string {
  const next = params(search);
  const values = readSet(next, param);
  if (!values.some(existing => sameValue(existing, value))) values.push(value);
  writeSet(next, param, values);
  resetPage(next);
  return serialise(next);
}

/** Remove one value from a set-valued parameter. */
export function removeValue(search: string, param: string, value: string): string {
  const next = params(search);
  writeSet(
    next,
    param,
    readSet(next, param).filter(v => !sameValue(v, value))
  );
  resetPage(next);
  return serialise(next);
}

export function toggleValue(search: string, param: string, value: string): string {
  return hasValue(search, param, value)
    ? removeValue(search, param, value)
    : addValue(search, param, value);
}

/** Set or clear a single-valued parameter (`w`, `s`, `d`, `sort`, `view`). */
export function setParam(search: string, param: string, value: string | undefined): string {
  const next = params(search);
  if (value === undefined || value === '') next.delete(param);
  else next.set(param, value);
  resetPage(next);
  return serialise(next);
}

/**
 * Switch the list/table view, **keeping the page** (061). Unlike a filter, the
 * view does not change what the results are, so the buyer stays where they
 * were; `setParam` would have reset them to page 1. `undefined` = the default
 * (list), left out of the URL.
 */
export function setView(search: string, view: string | undefined): string {
  const next = params(search);
  if (view === undefined || view === '') next.delete('view');
  else next.set('view', view);
  return serialise(next);
}

export function toggleParam(search: string, param: string, value: string): string {
  return params(search).get(param) === value
    ? setParam(search, param, undefined)
    : setParam(search, param, value);
}

/**
 * Set both ends of a range at once.
 *
 * One call, because the two bounds are one filter: writing them separately is
 * how a bucket and a slider start disagreeing about the same state.
 */
export function setRange(
  search: string,
  minParam: string,
  maxParam: string,
  min: number | undefined,
  max: number | undefined
): string {
  const next = params(search);
  if (min === undefined) next.delete(minParam);
  else next.set(minParam, String(min));
  if (max === undefined) next.delete(maxParam);
  else next.set(maxParam, String(max));
  resetPage(next);
  return serialise(next);
}

/** Drop every filter, keeping how the buyer is reading the list. */
export function clearAll(search: string): string {
  const next = params(search);
  for (const param of FILTER_PARAMS) next.delete(param);
  resetPage(next);
  return serialise(next);
}

/** How many filters are applied — what the collapsed mobile control announces. */
export function activeFilterCount(search: string): number {
  const next = params(search);
  const counted = new Set<string>();
  let count = 0;

  // A range is one filter however many of its bounds are set.
  for (const [minParam, maxParam] of RANGE_PAIRS) {
    counted.add(minParam);
    counted.add(maxParam);
    if (next.get(minParam) || next.get(maxParam)) count += 1;
  }

  for (const param of FILTER_PARAMS) {
    if (counted.has(param)) continue;
    const value = next.get(param);
    if (!value) continue;
    count += (MULTI_PARAMS as readonly string[]).includes(param) ? readSet(next, param).length : 1;
  }

  return count;
}

/** A full path, ready for `href`. */
export function hrefFor(basePath: string, search: string): string {
  return `${basePath}${search}`;
}
