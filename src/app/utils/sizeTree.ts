/**
 * The size picker's data: every size for sale, as a three-level tree
 * (width → aspect ratio → rim). Feature 049.
 *
 * Built from the catalog's own list of sizes for sale (`RealSize`, always
 * `Height/Width/Size` — verified on 2026-11-18), so the picker offers exactly
 * what the catalog sells: every complete choice finds at least one tire, and
 * no size for sale is unreachable (the three drop-down queries used a stricter
 * life rule and missed 7 of 293).
 *
 * **Values are the parts of `RealSize`, verbatim** (`235`, `12.50`, `19.5`).
 * `/tires` matches a complete size as the exact string `w/s/d` against
 * `RealSize`, so any reformatting (the old queries turned `19.5` into `19.50`)
 * would find nothing.
 *
 * Pure: no fetch, no React.
 */

export type SizeTree = Map<string, Map<string, string[]>>;

export type WidthGroupId = '100s' | '200s' | '300s' | 'flotation';

export type WidthGroup = { id: WidthGroupId; label: string; widths: string[] };

const SIZE = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/;

const byNumber = (a: string, b: string) => Number(a) - Number(b);

/** Parse `235/45/18` into its parts, or `null` for anything else. */
export function parseSize(realSize: string): [string, string, string] | null {
  const m = SIZE.exec(realSize.trim());
  return m ? [m[1], m[2], m[3]] : null;
}

export function buildSizeTree(realSizes: readonly string[]): SizeTree {
  const tree: SizeTree = new Map();
  for (const raw of realSizes) {
    const parts = parseSize(raw);
    if (!parts) continue;
    const [w, s, d] = parts;
    let ratios = tree.get(w);
    if (!ratios) tree.set(w, (ratios = new Map()));
    const rims = ratios.get(s) ?? [];
    if (!rims.includes(d)) rims.push(d);
    ratios.set(s, rims);
  }
  for (const ratios of tree.values()) for (const rims of ratios.values()) rims.sort(byNumber);
  return tree;
}

/**
 * Truck flotation sizes (`35x12.50R20`) put the overall diameter in inches
 * where a metric size puts the width in millimetres, so any "width" under 100
 * is one of them.
 */
export const isFlotation = (width: string) => Number(width) < 100;

const GROUPS: ReadonlyArray<{ id: WidthGroupId; label: string; test: (n: number) => boolean }> = [
  { id: '100s', label: '100s', test: n => n >= 100 && n < 200 },
  { id: '200s', label: '200s', test: n => n >= 200 && n < 300 },
  { id: '300s', label: '300s', test: n => n >= 300 },
  { id: 'flotation', label: 'Truck flotation', test: n => n < 100 },
];

/** The widths for sale in the picker's four rows (D2), empty rows dropped. */
export function widthGroups(tree: SizeTree): WidthGroup[] {
  const widths = [...tree.keys()].sort(byNumber);
  return GROUPS.map(g => ({
    id: g.id,
    label: g.label,
    widths: widths.filter(w => g.test(Number(w))),
  })).filter(g => g.widths.length > 0);
}

export function ratiosFor(tree: SizeTree, width: string): string[] {
  return [...(tree.get(width)?.keys() ?? [])].sort(byNumber);
}

export function rimsFor(tree: SizeTree, width: string, ratio: string): string[] {
  return [...(tree.get(width)?.get(ratio) ?? [])];
}

/** Every complete size the tree offers, as `w/s/d`. */
export function allSizes(tree: SizeTree): string[] {
  const out: string[] = [];
  for (const [w, ratios] of tree)
    for (const [s, rims] of ratios) for (const d of rims) out.push(`${w}/${s}/${d}`);
  return out;
}

/**
 * What survives a change of an earlier step: a later value is kept only while
 * it still exists (FR5).
 */
export function reconcile(
  tree: SizeTree,
  pick: { w: string; s: string; d: string }
): { w: string; s: string; d: string } {
  const w = tree.has(pick.w) ? pick.w : '';
  const s = w && tree.get(w)?.has(pick.s) ? pick.s : '';
  const d = s && rimsFor(tree, w, s).includes(pick.d) ? pick.d : '';
  return { w, s, d };
}
