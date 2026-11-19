/**
 * The tire-set engine (feature 041): which sets can be built around a tire, which
 * units to suggest, which swaps keep a set valid, and what replaces a unit that
 * sold. Pure — no React, no database — so every rule in the spec is a unit test.
 *
 * Every tire is a unique physical unit, so a "set" is never a quantity: it is a
 * choice of distinct units of the same brand, model, size, run-flat type and
 * condition (the query guarantees those). This module adds the last rule —
 * **the tread may differ by at most 2/32" across the set** — and the order in
 * which units are preferred (decision D6 of the spec):
 *
 *   1. tread closest to the tire the shopper is looking at,
 *   2. unpatched before patched,
 *   3. lower price,
 *   4. in the same city as the tire on the page (047, D3 — fewer trips).
 *
 * The city is never a filter (047, D1: the owner moves tires between Miami and
 * Orlando, and pickup is at any store). It only breaks ties, after 1–3.
 */

export type SetSize = 2 | 3 | 4;
export const SET_SIZES: readonly SetSize[] = [2, 3, 4];

/** Largest allowed tread difference inside a set, in 32nds of an inch (D2). */
export const MAX_TREAD_SPREAD = 2;

/**
 * Tread assumed for a **new** tire with no recorded value. New units of a model
 * are identical, so a missing figure is a data gap, not a worn tire (spec FR1).
 */
export const NEW_TIRE_TREAD = 10;

/**
 * Most units of a group a tire page loads (041). The chat (044) trims each group
 * to the same units, in the same order, so every tire it proposes is one the
 * page can see.
 */
export const SET_PAGE_CANDIDATES = 60;

/** Float tolerance: `9.6 → 7.6` is exactly 2/32" and must pass. */
const EPSILON = 1e-9;

export type TireCity = 'Miami' | 'Orlando';

/** One tire as the set builder sees it. Never carries warehouse names. */
export type SetUnit = {
  id: string;
  code?: string;
  price: number;
  /** In 32nds of an inch, or `null` when the record has no usable value. */
  tread: number | null;
  /** Remaining life as the record shows it, e.g. `"88%"`. */
  life?: string;
  patched: boolean;
  dot?: string;
  /** A real photo, or `null` — never the generic placeholder. */
  image?: string | null;
  condition: 'New' | 'Used';
  city: TireCity;
};

/** The fields of a detail-page tire this module needs (a subset of `SingleTire`). */
export type TireForSet = {
  id: string | number;
  code?: string;
  price: string;
  treadDepth: string;
  remainingLife?: string;
  patched?: string;
  dot?: string;
  images?: Array<{ src: string }>;
  condition?: string;
  city?: TireCity;
};

/** A detail-page tire as the set engine sees it. */
export function anchorFromTire(tire: TireForSet): SetUnit {
  const price = parseFloat(String(tire.price));
  const photo = (tire.images ?? []).find(i => i.src && !i.src.includes('generic-tire-image'));
  return {
    id: String(tire.id),
    code: tire.code,
    price: Number.isFinite(price) ? price : 0,
    tread: parseTread(tire.treadDepth),
    life: tire.remainingLife && tire.remainingLife !== '-' ? tire.remainingLife : undefined,
    patched: tire.patched === 'Yes',
    dot: tire.dot && tire.dot !== 'N/A' ? tire.dot : undefined,
    image: photo?.src ?? null,
    condition: tire.condition === 'New' ? 'New' : 'Used',
    city: tire.city ?? 'Miami',
  };
}

/** `'10.0'` → 10, `'9.6'` → 9.6; `'-'`, blank, garbage or ≤ 0 → `null`. */
export function parseTread(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** The tread a unit counts with: its own, or full tread for a new tire. */
export function effectiveTread(unit: SetUnit): number | null {
  if (unit.tread !== null && unit.tread !== undefined) return unit.tread;
  return unit.condition === 'New' ? NEW_TIRE_TREAD : null;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export type TreadRange = { min: number; max: number; spread: number; label: string };

/** "9–10/32, Δ1/32", or "10/32" when every tire is the same. */
export function treadRange(units: SetUnit[]): TreadRange | null {
  const treads = units.map(effectiveTread).filter((t): t is number => t !== null);
  if (treads.length === 0) return null;
  const min = Math.min(...treads);
  const max = Math.max(...treads);
  const spread = Math.round((max - min) * 10) / 10;
  const label = spread === 0 ? `${fmt(min)}/32` : `${fmt(min)}–${fmt(max)}/32, Δ${fmt(spread)}/32`;
  return { min, max, spread, label };
}

/** True when every unit has a tread and they differ by at most 2/32". */
export function isWithinTolerance(units: SetUnit[]): boolean {
  const treads = units.map(effectiveTread);
  if (treads.some(t => t === null)) return false;
  const nums = treads as number[];
  return Math.max(...nums) - Math.min(...nums) <= MAX_TREAD_SPREAD + EPSILON;
}

export function setTotal(units: SetUnit[]): number {
  return Math.round(units.reduce((sum, u) => sum + (u.price || 0), 0) * 100) / 100;
}

/** New tires are identical: the shopper picks a quantity, not units (D11). */
export function isQuantityMode(anchor: SetUnit): boolean {
  return anchor.condition === 'New';
}

/** Candidates that can ever join a set with `anchor`: a tread, not itself. Any city (047). */
function eligible(anchor: SetUnit, candidates: SetUnit[]): SetUnit[] {
  const seen = new Set<string>([anchor.id]);
  return candidates.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return effectiveTread(c) !== null;
  });
}

/** 1 when `unit` is outside `city` — the last tie-break (047, D3). */
const awayFrom = (unit: SetUnit, city?: TireCity) => (city && unit.city !== city ? 1 : 0);

/** D6 as a comparator, relative to a reference tread; `city` breaks the last tie. */
function byPreference(reference: number, city?: TireCity) {
  return (a: SetUnit, b: SetUnit) =>
    Math.abs((effectiveTread(a) as number) - reference) -
      Math.abs((effectiveTread(b) as number) - reference) ||
    Number(a.patched) - Number(b.patched) ||
    a.price - b.price ||
    awayFrom(a, city) - awayFrom(b, city) ||
    a.id.localeCompare(b.id);
}

/** How many other tires could join a valid set with `anchor` (spec FR4). */
export function countJoinable(anchor: SetUnit, candidates: SetUnit[]): number {
  const t = effectiveTread(anchor);
  if (t === null) return 0;
  return eligible(anchor, candidates).filter(
    c => Math.abs((effectiveTread(c) as number) - t) <= MAX_TREAD_SPREAD + EPSILON
  ).length;
}

/**
 * The best set of `size` tires that includes `anchor`, or `null`.
 *
 * Picking the closest treads greedily can overshoot (anchor 8, units 6 and 10:
 * each is 2 away, together 4 apart). So every 2/32" window that contains the
 * anchor is tried, the D6-best units are taken inside each, and the windows are
 * compared on (total tread distance, patched count, total price).
 */
export function suggestSet(
  anchor: SetUnit,
  candidates: SetUnit[],
  size: SetSize
): SetUnit[] | null {
  const anchorTread = effectiveTread(anchor);
  if (anchorTread === null) return null;
  const pool = eligible(anchor, candidates);
  const prefer = byPreference(anchorTread, anchor.city);

  const lowerBounds = new Set<number>([anchorTread]);
  for (const c of pool) {
    const t = effectiveTread(c) as number;
    if (t <= anchorTread && anchorTread - t <= MAX_TREAD_SPREAD + EPSILON) lowerBounds.add(t);
  }

  let best: { units: SetUnit[]; score: [number, number, number, number] } | null = null;
  for (const low of lowerBounds) {
    const high = low + MAX_TREAD_SPREAD + EPSILON;
    const inWindow = pool
      .filter(c => {
        const t = effectiveTread(c) as number;
        return t >= low - EPSILON && t <= high;
      })
      .sort(prefer);
    if (inWindow.length < size - 1) continue;
    const chosen = inWindow.slice(0, size - 1);
    const score: [number, number, number, number] = [
      chosen.reduce((s, c) => s + Math.abs((effectiveTread(c) as number) - anchorTread), 0),
      chosen.filter(c => c.patched).length,
      setTotal(chosen),
      chosen.filter(c => c.city !== anchor.city).length,
    ];
    if (
      !best ||
      score[0] < best.score[0] - EPSILON ||
      (Math.abs(score[0] - best.score[0]) <= EPSILON &&
        (score[1] < best.score[1] ||
          (score[1] === best.score[1] &&
            (score[2] < best.score[2] - EPSILON ||
              (Math.abs(score[2] - best.score[2]) <= EPSILON && score[3] < best.score[3])))))
    ) {
      best = { units: [anchor, ...chosen], score };
    }
  }
  return best ? best.units : null;
}

/** Sizes for which a valid set exists (spec FR3). */
export function availableSetSizes(anchor: SetUnit, candidates: SetUnit[]): SetSize[] {
  return SET_SIZES.filter(size => suggestSet(anchor, candidates, size) !== null);
}

/**
 * Units that can replace `set[index]` without breaking the 2/32" rule, best
 * first. The anchor (index 0) is never swapped: it is the tire on the page.
 */
export function swapOptions(set: SetUnit[], index: number, candidates: SetUnit[]): SetUnit[] {
  if (index <= 0 || index >= set.length) return [];
  const anchor = set[0];
  const anchorTread = effectiveTread(anchor);
  if (anchorTread === null) return [];
  const others = set.filter((_, i) => i !== index);
  const inSet = new Set(set.map(u => u.id));
  return eligible(anchor, candidates)
    .filter(c => !inSet.has(c.id) && isWithinTolerance([...others, c]))
    .sort(byPreference(anchorTread, anchor.city));
}

/**
 * The best unit to replace one that sold, given the units the shopper keeps
 * (spec FR13). Within 2/32" of all of them, D6 order relative to the first
 * kept unit, in any city; on a full tie, the first kept unit's city wins (047,
 * D3). `null` when nothing fits.
 */
export function pickReplacement(keep: SetUnit[], candidates: SetUnit[]): SetUnit | null {
  if (keep.length === 0) return null;
  const reference = effectiveTread(keep[0]);
  if (reference === null) return null;
  const kept = new Set(keep.map(u => u.id));
  const options = candidates
    .filter(c => !kept.has(c.id) && effectiveTread(c) !== null && isWithinTolerance([...keep, c]))
    .sort(byPreference(reference, keep[0].city));
  return options[0] ?? null;
}

/**
 * The unit most like a tire with tread `reference`, in 041's order (closest
 * tread → unpatched → cheaper → id). No tread limit: used by feature 043 to
 * point a visitor at "the same tire" in their own city. Units without a tread
 * come last; `null` for an empty list.
 */
export function closestMatch(reference: number | null, candidates: SetUnit[]): SetUnit | null {
  if (candidates.length === 0) return null;
  const withTread = candidates.filter(c => effectiveTread(c) !== null);
  const without = candidates.filter(c => effectiveTread(c) === null);
  const ref = reference ?? Math.max(0, ...withTread.map(c => effectiveTread(c) as number));
  const ordered = [
    ...withTread.sort(byPreference(ref)),
    ...without.sort((a, b) => Number(a.patched) - Number(b.patched) || a.price - b.price),
  ];
  return ordered[0] ?? null;
}

/**
 * The best valid set of `size` units from one group, with no tire "being looked
 * at" — what the AI chat proposes (feature 044, D1). Same rule as the page:
 * tread within 2/32", any city (047). Every 2/32" window starting at a unit's
 * tread is tried; inside it **unpatched units come first** (owner, 2026-11-10:
 * patched tires are often the cheapest, and a set of patched tires is not what
 * "the best price" should mean), then the cheapest, then — on a full tie — the
 * `preferCity` (047), then id. Windows compare on patched count, then total,
 * then how many tires are outside `preferCity`. `null` when no window holds
 * `size` units.
 */
export function cheapestSet(
  units: SetUnit[],
  size: SetSize,
  preferCity?: TireCity | null
): SetUnit[] | null {
  const seen = new Set<string>();
  const pool = units.filter(u => {
    if (seen.has(u.id) || effectiveTread(u) === null) return false;
    seen.add(u.id);
    return true;
  });
  const city = preferCity ?? undefined;
  const byCheapest = (a: SetUnit, b: SetUnit) =>
    Number(a.patched) - Number(b.patched) ||
    a.price - b.price ||
    awayFrom(a, city) - awayFrom(b, city) ||
    a.id.localeCompare(b.id);

  let best: { units: SetUnit[]; total: number; patched: number; away: number } | null = null;
  const lows = new Set(pool.map(u => effectiveTread(u) as number));
  for (const low of lows) {
    const high = low + MAX_TREAD_SPREAD + EPSILON;
    const chosen = pool
      .filter(u => {
        const t = effectiveTread(u) as number;
        return t >= low - EPSILON && t <= high;
      })
      .sort(byCheapest)
      .slice(0, size);
    if (chosen.length < size) continue;
    const total = setTotal(chosen);
    const patched = chosen.filter(u => u.patched).length;
    const away = chosen.reduce((n, u) => n + awayFrom(u, city), 0);
    if (
      !best ||
      patched < best.patched ||
      (patched === best.patched &&
        (total < best.total - EPSILON ||
          (Math.abs(total - best.total) <= EPSILON && away < best.away)))
    ) {
      best = { units: chosen, total, patched, away };
    }
  }
  return best ? best.units : null;
}

/**
 * The cheapest set **that includes `anchor`** (feature 054): `cheapestSet`'s
 * rule — fewest patched, then lowest total, then fewest tires outside the
 * anchor's city, then id — over the 2/32" windows that contain the anchor.
 *
 * The anchor is the tire on a listing card. The card promises a set *with
 * that tire*, because a tap opens that tire's page with exactly this set; the
 * cheapest set of the model elsewhere would be a different tire's offer. The
 * candidate pool may include the anchor itself (the builder's pool does);
 * `eligible` drops it so it is counted once. `null` when no window holds
 * `size` tires.
 */
export function cheapestSetWith(
  anchor: SetUnit,
  candidates: SetUnit[],
  size: SetSize
): SetUnit[] | null {
  const anchorTread = effectiveTread(anchor);
  if (anchorTread === null) return null;
  const pool = eligible(anchor, candidates);
  const city = anchor.city;
  const byCheapest = (a: SetUnit, b: SetUnit) =>
    Number(a.patched) - Number(b.patched) ||
    a.price - b.price ||
    awayFrom(a, city) - awayFrom(b, city) ||
    a.id.localeCompare(b.id);

  // Every window [low, low + 2] that contains the anchor starts at the anchor's
  // tread or at a candidate's tread up to 2/32" below it.
  const lows = new Set<number>([anchorTread]);
  for (const c of pool) {
    const t = effectiveTread(c) as number;
    if (t <= anchorTread + EPSILON && anchorTread - t <= MAX_TREAD_SPREAD + EPSILON) lows.add(t);
  }

  let best: { units: SetUnit[]; patched: number; total: number; away: number } | null = null;
  for (const low of lows) {
    const high = low + MAX_TREAD_SPREAD + EPSILON;
    const others = pool
      .filter(c => {
        const t = effectiveTread(c) as number;
        return t >= low - EPSILON && t <= high;
      })
      .sort(byCheapest)
      .slice(0, size - 1);
    if (others.length < size - 1) continue;
    const units = [anchor, ...others];
    const patched = units.filter(u => u.patched).length;
    const total = setTotal(units);
    const away = others.reduce((n, u) => n + awayFrom(u, city), 0);
    if (
      !best ||
      patched < best.patched ||
      (patched === best.patched &&
        (total < best.total - EPSILON ||
          (Math.abs(total - best.total) <= EPSILON && away < best.away)))
    ) {
      best = { units, patched, total, away };
    }
  }
  return best ? best.units : null;
}

/** What a listing card offers: a set of 4 with this tire, else of 2, else none (054, D1). */
export type CardSetOffer = { size: SetSize; total: number; ids: string[] };

export function cardSetOffer(anchor: SetUnit, candidates: SetUnit[]): CardSetOffer | null {
  for (const size of [4, 2] as const) {
    const set = cheapestSetWith(anchor, candidates, size);
    if (set) return { size, total: setTotal(set), ids: set.map(u => u.id) };
  }
  return null;
}
