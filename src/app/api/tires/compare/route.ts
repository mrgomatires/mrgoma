import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { jsonError } from '@/app/api/_lib/apiError';
import { withLogging } from '@/app/api/_lib/withLogging';
import { MAX_COMPARE } from '@/app/utils/compare';
import { isRemoved, isSoldStatus } from '@/app/utils/tireAvailability';
import { fetchTiresByIds } from '@/repositories/tiresRepository';

/**
 * Is each compared tire still for sale, and at what price? (feature 051, D6)
 *
 * The comparison is built from what the cards showed when each tire was picked;
 * on opening it asks this once. One parameterised `IN` query for at most three
 * ids, and the answer carries **only** `id`, `available` and `price` — none of
 * the record's other columns. Not cached: it answers "right now".
 */
const Ids = z
  .string()
  .transform(s => s.split(',').map(x => x.trim()))
  .pipe(
    z
      .array(z.string().regex(/^\d{1,10}$/))
      .min(1)
      .max(MAX_COMPARE)
  );

export const GET = withLogging('tires.compare.GET', async (req: NextRequest) => {
  const parsed = Ids.safeParse(new URL(req.url).searchParams.get('ids') ?? '');
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid ids' }, { status: 400 });
  }
  try {
    const records = await fetchTiresByIds(parsed.data);
    const byId = new Map(records.map(r => [String(r.TireId), r]));
    const tires = parsed.data.map(id => {
      const r = byId.get(id);
      const price = Number(r?.Price);
      const available =
        Boolean(r) &&
        !isSoldStatus(r?.Condition) &&
        !isRemoved(r) &&
        Number.isFinite(price) &&
        price > 0;
      return { id, available, price: Number.isFinite(price) && price > 0 ? price : null };
    });
    return NextResponse.json({ tires }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return jsonError(500, 'Failed to check tires', err);
  }
});
