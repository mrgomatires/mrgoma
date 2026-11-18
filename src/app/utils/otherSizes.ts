import type { ModelSizeGroup } from '@/repositories/otherSizesRepository';

import { isSoldStatus } from './tireAvailability';

/**
 * "Other sizes of this tire" (feature 049): the sizes in which the tire's
 * brand and model are for sale, grouped by rim.
 *
 * Pure — the page reads the cached groups, this decides what shows:
 *
 * - **The tire's own size** is always listed, highlighted and not linked, for
 *   a tire that is not sold — even one the catalog does not list (under 50%
 *   life, reached by its address), so the shopper sees where they are (FR10).
 *   For a sold tire it is listed only while units of that size are for sale
 *   (FR13).
 * - **Nothing to show** — no size but the tire's own — returns `null`, and the
 *   section is not rendered (FR12): 36% of tires on 2026-11-18.
 * - Rims and sizes in numeric order; the own rim's group open (FR11).
 */

export type OtherSize = {
  size: string;
  units: number;
  minPrice: number;
  /** The page to link to: the cheapest tire of that size (D4). */
  tireId: string;
  /** The cheapest tire is new (D5b). */
  isNew: boolean;
  /** The tire being viewed. */
  current: boolean;
};

export type OtherSizesRim = { rim: string; open: boolean; sizes: OtherSize[] };

export type OtherSizesView = { groups: OtherSizesRim[]; otherCount: number };

type Tire = {
  id: string;
  brand?: string;
  model2?: string;
  size?: string;
  status?: string;
};

const parts = (size: string) => size.split('/').map(Number);

/** Width, then ratio, then rim — `225/60/18` before `235/50/18`. */
const bySize = (a: OtherSize, b: OtherSize) => {
  const [aw, as, ad] = parts(a.size);
  const [bw, bs, bd] = parts(b.size);
  return aw - bw || as - bs || ad - bd;
};

const rimOf = (size: string) => size.split('/')[2] ?? '';

export function otherSizesFor(
  tire: Tire,
  groups: readonly ModelSizeGroup[]
): OtherSizesView | null {
  if (!tire.brand || !tire.model2 || !tire.size) return null;
  const mine = groups.filter(g => g.brand === tire.brand && g.model === tire.model2);

  const sold = isSoldStatus(tire.status);
  const rows: Array<OtherSize & { rim: string }> = mine.map(g => ({
    size: g.size,
    rim: g.rim || rimOf(g.size),
    units: g.units,
    minPrice: g.minPrice,
    tireId: g.tireId,
    isNew: g.isNew,
    current: g.size === tire.size,
  }));

  const others = rows.filter(r => !r.current);
  if (others.length === 0) return null;

  if (!sold && !rows.some(r => r.current)) {
    // Not in the catalog's list, but it is the page being read.
    rows.push({
      size: tire.size,
      rim: rimOf(tire.size),
      units: 0,
      minPrice: 0,
      tireId: tire.id,
      isNew: false,
      current: true,
    });
  }

  const ownRim = rimOf(tire.size);
  const byRim = new Map<string, OtherSize[]>();
  for (const { rim, ...row } of rows) {
    const list = byRim.get(rim) ?? [];
    list.push(row);
    byRim.set(rim, list);
  }

  const result = [...byRim.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([rim, sizes]) => ({ rim, open: rim === ownRim, sizes: sizes.sort(bySize) }));

  return { groups: result, otherCount: others.length };
}

/** "From $89" for several tires, "$89" for one (FR14). */
export function priceLabel(size: Pick<OtherSize, 'units' | 'minPrice'>): string {
  // As the tire page prints it: whole dollars stay whole, cents are kept.
  const amount = `$${size.minPrice.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(size.minPrice) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
  return size.units > 1 ? `From ${amount}` : amount;
}
