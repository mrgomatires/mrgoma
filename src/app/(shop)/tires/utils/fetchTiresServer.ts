import { TiresData, TransformedTire } from '@/app/interfaces/tires';
import { buildTireFilters } from '@/app/utils/filterUtils';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, validatePageSize } from '@/app/utils/paginationUtils';
import { createPaginatedResponse } from '@/app/utils/transformTireData';
import { pickTireListFields } from '@/repositories/tireListFields';
import { fetchTires } from '@/repositories/tiresRepository';

export interface PaginatedTiresResponse {
  tires: TransformedTire[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

/**
 * Server-side tire fetcher — calls the repository directly (no HTTP hop).
 * Used by the /tires page Server Component to pre-render the first page.
 */
export async function fetchTiresServer(
  params: Record<string, string | string[] | undefined>
): Promise<PaginatedTiresResponse> {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      sp.set(key, Array.isArray(value) ? value[0] : value);
    }
  });

  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || DEFAULT_PAGE);
  const pageSize = validatePageSize(
    parseInt(sp.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE
  );
  const offset = (page - 1) * pageSize;
  const filters = buildTireFilters(sp);

  try {
    const result = await fetchTires(offset, pageSize, filters);
    return createPaginatedResponse(
      // Same whitelist as `/api/tires`: public fields plus the city (051).
      result.records.map(pickTireListFields) as TiresData[],
      page,
      pageSize,
      result.totalCount
    ) as PaginatedTiresResponse;
  } catch {
    return createPaginatedResponse([], page, pageSize, 0) as PaginatedTiresResponse;
  }
}
