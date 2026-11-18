import { NextResponse } from 'next/server';

import { jsonError } from '@/app/api/_lib/apiError';
import { withLogging } from '@/app/api/_lib/withLogging';
import { getCachedStockedSizes } from '@/repositories/cachedCatalog';

/**
 * Every size for sale, for the size picker (feature 049).
 *
 * The same list the sitemap and `/tires/size/[size]` use — the catalog's
 * sellable rule, cached five minutes — so the picker offers exactly what the
 * catalog sells. ~300 short strings; the picker derives its three steps from
 * it, with no request per step.
 *
 * Takes no input, so there is nothing to validate and nothing an outsider can
 * make expensive; the CDN answers repeat requests.
 */
export const GET = withLogging('dimensions.stocked.GET', async () => {
  try {
    const sizes = await getCachedStockedSizes();
    return NextResponse.json(
      { sizes },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (err: unknown) {
    return jsonError(500, 'Failed to fetch tire sizes', err);
  }
});
