import { parseSize } from './sizeTree';

/**
 * The size index page's lists (feature 050). Pure.
 *
 * Sizes are the catalog's `RealSize` strings (`235/45/18`); ordering is numeric
 * part by part, so `19.5` sits between `19` and `20`.
 */

export type SizeCount = { size: string; units: number };

export type RimGroup = { rim: string; sizes: SizeCount[] };

const key = (size: string) => (parseSize(size) ?? ['0', '0', '0']).map(Number);

/** Width, then ratio, then rim. */
export const bySize = (a: string, b: string) => {
  const [aw, as, ad] = key(a);
  const [bw, bs, bd] = key(b);
  return aw - bw || as - bs || ad - bd;
};

/** The sizes with the most tires (D1); ties in size order. */
export function popularSizes(counts: readonly SizeCount[], n = 12): SizeCount[] {
  return [...counts]
    .filter(c => parseSize(c.size) && c.units > 0)
    .sort((a, b) => b.units - a.units || bySize(a.size, b.size))
    .slice(0, n);
}

/** Every size, grouped by rim, rims ascending, sizes in order inside each. */
export function sizesByRim(counts: readonly SizeCount[]): RimGroup[] {
  const groups = new Map<string, SizeCount[]>();
  for (const c of counts) {
    const parts = parseSize(c.size);
    if (!parts || c.units <= 0) continue;
    const list = groups.get(parts[2]) ?? [];
    list.push(c);
    groups.set(parts[2], list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([rim, sizes]) => ({ rim, sizes: sizes.sort((a, b) => bySize(a.size, b.size)) }));
}

/** "12 tires" / "1 tire" (D2). */
export const tireCountLabel = (n: number) =>
  `${n.toLocaleString('en-US')} ${n === 1 ? 'tire' : 'tires'}`;
