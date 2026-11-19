import { unstable_cache } from 'next/cache';

import { fetchFacetsForRequest } from '@/repositories/tireFacets';
import { fetchTires } from '@/repositories/tiresRepository';

/**
 * `/tires/used` with no filter (052): its first 24 tires and its rail counts.
 *
 * The page reads `searchParams` now, so it cannot be ISR any more; the plain
 * URL — the one search engines and most visitors land on — still costs SQL
 * Server one round every five minutes instead of one per visit. Filtered views
 * query like `/tires` does and are closed to crawlers in `robots.txt`.
 *
 * Its own file, apart from `cachedCatalog`: the facet repository opens the
 * database on import, and the routes that read the catalog cache must not.
 */
export const getCachedUsedLanding = unstable_cache(
  async () => {
    const filters = { condition: ['used'] };
    const [result, facets] = await Promise.all([
      fetchTires(0, 24, filters),
      fetchFacetsForRequest(filters),
    ]);
    return { result, facets };
  },
  ['used-landing'],
  { revalidate: 300, tags: ['used-landing'] }
);
