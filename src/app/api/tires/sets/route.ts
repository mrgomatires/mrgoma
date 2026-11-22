import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { jsonError } from '@/app/api/_lib/apiError';
import { withLogging } from '@/app/api/_lib/withLogging';
import type { SingleTire } from '@/app/interfaces/tires';
import { anchorFromTire, cardSetOffer, type CardSetOffer } from '@/app/utils/tireSets';
import { mapTireRecordToSingleTire } from '@/repositories/mapTireRecordToSingleTire';
import { getCachedSetCandidates, setGroupOf } from '@/repositories/tireSetsRepository';
import { fetchTiresByIds } from '@/repositories/tiresRepository';

/** The most cards one listing page shows (`/tires/used` shows 24). */
export const MAX_SET_OFFER_IDS = 24;

/** Groups fetched at once on a cold cache: a few of the pool's ten connections, never all. */
const CONCURRENCY = 4;

const Ids = z
  .string()
  .transform(s => [...new Set(s.split(',').map(x => x.trim()))])
  .pipe(
    z
      .array(z.string().regex(/^\d{1,10}$/))
      .min(1)
      .max(MAX_SET_OFFER_IDS)
  );

const isSold = (tire: SingleTire) =>
  typeof tire.status === 'string' && tire.status.trim().toLowerCase() === 'sold';

/**
 * Runs `work` over `items`, at most `limit` at a time. Stops starting new work
 * once `signal` is aborted (061): the browser drops this request when the
 * buyer changes the results before it answers, and each item here can be a
 * database query on a cold cache — no point finishing them for nobody.
 */
async function mapLimited<T, R>(
  items: T[],
  limit: number,
  work: (item: T) => Promise<R>,
  signal?: AbortSignal
) {
  const out: (R | undefined)[] = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      if (signal?.aborted) return;
      const i = next++;
      out[i] = await work(items[i]);
    }
  });
  await Promise.all(lanes);
  return out;
}

/**
 * The set each listing card can offer (feature 054): for each id, the cheapest
 * set of 4 that includes that tire, else of 2 — `{ size, total, ids }` — or
 * nothing.
 *
 * Everything is decided here from the ids alone, never from what the client
 * says about a tire: each tire goes through the tire page's own mapper and set
 * group, and its candidates come from **the same cache the tire page's set
 * builder reads** (`getCachedSetCandidates`), so a card can never price a set
 * the builder cannot open. The answer is only public facts (ids, a size, a
 * total). `/api/` is closed to crawlers in `robots.txt`; the CDN keeps a page's
 * answer for a minute.
 */
export const GET = withLogging('tires.sets.GET', async (req: NextRequest) => {
  const parsed = Ids.safeParse(new URL(req.url).searchParams.get('ids') ?? '');
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid ids' }, { status: 400 });
  }
  try {
    const records = await fetchTiresByIds(parsed.data);
    // The buyer moved on while the ids were read: answer nobody, query no more.
    if (req.signal?.aborted) return new NextResponse(null, { status: 499 });
    const tires = records.map(mapTireRecordToSingleTire).filter(t => !isSold(t));

    // One candidate fetch per distinct set group, shared by the cards in it.
    const groups = new Map<string, ReturnType<typeof setGroupOf>>();
    const keyOf = new Map<string, string>();
    for (const tire of tires) {
      const group = setGroupOf(tire);
      if (!group) continue;
      const key = JSON.stringify(group);
      groups.set(key, group);
      keyOf.set(String(tire.id), key);
    }
    const keys = [...groups.keys()];
    const pools = await mapLimited(
      keys,
      CONCURRENCY,
      key => getCachedSetCandidates(groups.get(key)!).catch(() => []),
      req.signal
    );
    if (req.signal?.aborted) return new NextResponse(null, { status: 499 });
    const poolOf = new Map(keys.map((k, i) => [k, pools[i]]));

    const offers: Record<string, CardSetOffer> = {};
    for (const tire of tires) {
      const key = keyOf.get(String(tire.id));
      if (!key) continue;
      const offer = cardSetOffer(anchorFromTire(tire), poolOf.get(key) ?? []);
      if (offer) offers[String(tire.id)] = offer;
    }

    return NextResponse.json(
      { offers },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' } }
    );
  } catch (err) {
    return jsonError(500, 'Failed to build set offers', err);
  }
});
