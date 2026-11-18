import { unstable_cache } from 'next/cache';

import { fetchSizeCounts, fetchSizes, fetchTireRanges } from '@/repositories/tiresRepository';

/**
 * Catalog reads that take no input, cached across requests.
 *
 * Both answer the same question on every visit — the price and remaining-life
 * bounds of the sellable stock, and the list of sizes in stock — yet `/tires`
 * used to ask SQL Server again each time. Measured in production on
 * 2026-09-25, `tires.ranges` was among the slowest of the 9–11 queries a single
 * `/tires` render fires (0,8–2,3 s), and each render holds a connection from a
 * pool of ten for as long as its slowest query runs.
 *
 * Five minutes is well inside what the stock can tolerate: the ranges only set
 * where the sliders start and end, and the sizes only decide whether a complete
 * size has a landing page. Neither decides whether a tire is shown or sold.
 */

/**
 * Keyed `['ranges']` on purpose — the same key `/api/ranges` already used, so
 * the page and the endpoint share one cache entry instead of keeping two.
 */
export const getCachedTireRanges = unstable_cache(() => fetchTireRanges(), ['ranges'], {
  revalidate: 300,
  tags: ['ranges'],
});

export const getCachedStockedSizes = unstable_cache(() => fetchSizes(), ['stocked-sizes'], {
  revalidate: 300,
  tags: ['sizes'],
});

/** Sizes for sale with their tire counts — the size index (050). Same tag as the list. */
export const getCachedSizeCounts = unstable_cache(() => fetchSizeCounts(), ['size-counts'], {
  revalidate: 300,
  tags: ['sizes'],
});
