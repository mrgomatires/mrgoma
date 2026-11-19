import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { jsonError } from '@/app/api/_lib/apiError';
import { withLogging } from '@/app/api/_lib/withLogging';
import { buildTireFilters } from '@/app/utils/filterUtils';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  validatePageSize,
} from '@/app/utils/paginationUtils';
import { normalizeUsedFilters } from '@/app/utils/usedFilters';
import { pickTireListFields } from '@/repositories/tireListFields';
import { TireFilters, fetchTires } from '@/repositories/tiresRepository';
import { logger } from '@/utils/logger';

const getCachedTires = unstable_cache(
  (offset: number, pageSize: number, filters: TireFilters) => fetchTires(offset, pageSize, filters),
  ['tires'],
  { revalidate: 120, tags: ['tires'] }
);

export const GET = withLogging('tires.GET', async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);

  // Get and validate pagination parameters
  const pageParam = searchParams.get('page') ?? DEFAULT_PAGE.toString();
  const pageSizeParam = searchParams.get('pageSize') ?? DEFAULT_PAGE_SIZE.toString();

  // Convert to numbers and apply validation
  const page = Math.max(1, parseInt(pageParam, 10) || DEFAULT_PAGE);
  const pageSize = validatePageSize(parseInt(pageSizeParam, 10) || DEFAULT_PAGE_SIZE);

  // Log for detecting manipulation attempts
  if (parseInt(pageSizeParam, 10) > MAX_PAGE_SIZE) {
    logger.warn(`Attempted to use large page size: ${pageSizeParam}. Limited to ${pageSize}.`);
  }

  const offset = (page - 1) * pageSize;

  // Build filters from search parameters
  // Same reading of the used filters as the server-rendered page (052).
  const filters = normalizeUsedFilters(buildTireFilters(searchParams));

  try {
    const result = await getCachedTires(offset, pageSize, filters);
    // Whitelist each record to the fields the storefront consumes, so internal
    // DB columns (VaultName, Local, Trash, Amount, …) never reach the client.
    // Shape unchanged: `{ records, totalCount }` — the client still transforms.
    return NextResponse.json({
      records: result.records.map(pickTireListFields),
      totalCount: result.totalCount,
    });
  } catch (err: unknown) {
    return jsonError(500, 'Failed to fetch tires', err);
  }
});
