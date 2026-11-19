import type { TransformedTire } from '@/app/interfaces/tires';
import type { GaList } from '@/app/utils/ecommerce';
import { treadDepthLabel } from '@/app/utils/tireSpecs';

/**
 * Comparing up to three tires (feature 051). Pure: the store, the tray and the
 * dialog build on these.
 */

export const MAX_COMPARE = 3;

/** The public snapshot of a card's tire kept for the comparison. */
export type CompareTire = Pick<
  TransformedTire,
  | 'id'
  | 'name'
  | 'model'
  | 'size'
  | 'brand'
  | 'brandId'
  | 'price'
  | 'condition'
  | 'city'
  | 'imageSrc'
  | 'features'
  | 'dot'
  | 'loadIndex'
  | 'speedIndex'
  | 'status'
>;

export type CompareItem = { tire: CompareTire; list?: GaList };

/** Only the fields the comparison uses — nothing else of the card is stored. */
export function snapshot(tire: TransformedTire, list?: GaList): CompareItem {
  const t: CompareTire = {
    id: String(tire.id),
    name: tire.name,
    model: tire.model,
    size: tire.size,
    brand: tire.brand,
    brandId: tire.brandId,
    price: tire.price,
    condition: tire.condition,
    city: tire.city,
    imageSrc: tire.imageSrc,
    features: tire.features,
    dot: tire.dot,
    loadIndex: tire.loadIndex,
    speedIndex: tire.speedIndex,
    status: tire.status,
  };
  return list ? { tire: t, list } : { tire: t };
}

export function addItem(
  items: readonly CompareItem[],
  item: CompareItem
): { items: CompareItem[]; result: 'added' | 'full' | 'present' } {
  if (items.some(i => i.tire.id === item.tire.id)) return { items: [...items], result: 'present' };
  if (items.length >= MAX_COMPARE) return { items: [...items], result: 'full' };
  return { items: [...items, item], result: 'added' };
}

export const removeItem = (items: readonly CompareItem[], id: string) =>
  items.filter(i => i.tire.id !== id);

/** All the same size (or a single tire). */
export const sameSize = (tires: readonly CompareTire[]) =>
  new Set(tires.map(t => t.size ?? '')).size <= 1;

/**
 * The DOT date code: `WWYY`, week then year (`2324` → week 23 of 2024). Every
 * sellable tire carried four digits on 2026-11-18. Anything else → `null`.
 */
export function parseDot(dot?: string | null): { week: number; year: number } | null {
  const m = /^(\d{2})(\d{2})$/.exec((dot ?? '').trim());
  if (!m) return null;
  const week = Number(m[1]);
  if (week < 1 || week > 53) return null;
  return { week, year: 2000 + Number(m[2]) };
}

const feature = (t: CompareTire, name: string) => {
  const v = t.features?.find(f => f.name.toLowerCase() === name.toLowerCase())?.value?.trim();
  return v && v !== '-' && v.toUpperCase() !== 'N/A' ? v : undefined;
};

const num = (v?: string) => {
  const n = Number.parseFloat((v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export type RowKey =
  | 'size'
  | 'condition'
  | 'price'
  | 'tread'
  | 'life'
  | 'patched'
  | 'dot'
  | 'load'
  | 'speed'
  | 'runFlat'
  | 'city';

export type CompareRow = {
  key: RowKey;
  label: string;
  values: string[];
  /** Indexes of the tires with the better value; empty when the row has no "better". */
  best: number[];
  /** Not every tire shows the same value. */
  differs: boolean;
};

type RowDef = {
  key: RowKey;
  label: string;
  display: (t: CompareTire) => string | undefined;
  /** A number where bigger is better (lower price → negated); none = no ranking. */
  score?: (t: CompareTire) => number | null;
};

const ROWS: RowDef[] = [
  { key: 'size', label: 'Size', display: t => t.size },
  { key: 'condition', label: 'Condition', display: t => t.condition },
  {
    key: 'price',
    label: 'Price',
    display: t => (num(t.price) !== null ? `$${t.price}` : undefined),
    score: t => {
      const n = num(t.price);
      return n === null ? null : -n;
    },
  },
  {
    key: 'tread',
    label: 'Tread',
    display: t => {
      const v = feature(t, 'Tread depth');
      return v ? treadDepthLabel(v) : undefined;
    },
    score: t => num(feature(t, 'Tread depth')),
  },
  {
    key: 'life',
    label: 'Remaining life',
    display: t => feature(t, 'Remaining life'),
    score: t => num(feature(t, 'Remaining life')),
  },
  {
    key: 'patched',
    label: 'Patched',
    display: t => feature(t, 'Patched'),
    score: t => {
      const v = feature(t, 'Patched');
      return v === 'No' ? 1 : v === 'Yes' ? 0 : null;
    },
  },
  {
    key: 'dot',
    label: 'Made (DOT)',
    display: t => {
      const d = parseDot(t.dot);
      return d ? `Week ${d.week}, ${d.year}` : undefined;
    },
    score: t => {
      const d = parseDot(t.dot);
      return d ? d.year * 100 + d.week : null;
    },
  },
  { key: 'load', label: 'Load index', display: t => t.loadIndex },
  { key: 'speed', label: 'Speed rating', display: t => t.speedIndex },
  { key: 'runFlat', label: 'Run-flat', display: t => feature(t, 'Run Flat') },
  { key: 'city', label: 'Location', display: t => t.city },
];

export const MISSING = '—';

/**
 * The comparison table, in the spec's order (FR4, FR5). Tires listed in
 * `unavailable` (sold since they were picked) are shown but never "Best".
 */
export function compareRows(
  tires: readonly CompareTire[],
  unavailable: ReadonlySet<number> = new Set()
): CompareRow[] {
  return ROWS.map(def => {
    const values = tires.map(t => def.display(t) ?? MISSING);
    const differs = new Set(values).size > 1;
    let best: number[] = [];
    if (def.score && differs) {
      const scores = tires.map((t, i) => (unavailable.has(i) ? null : def.score!(t)));
      const known = scores.filter((s): s is number => s !== null);
      // A "better" needs at least two tires to compare.
      if (known.length >= 2) {
        const top = Math.max(...known);
        best = scores.flatMap((s, i) => (s === top ? [i] : []));
        if (best.length === known.length) best = []; // all tied
      }
    }
    return { key: def.key, label: def.label, values, best, differs };
  });
}
