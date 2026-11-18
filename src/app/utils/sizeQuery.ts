import { bySize } from './sizeIndex';
import { parseSize } from './sizeTree';

/**
 * What a shopper types into the size search box (feature 050). Pure.
 *
 * People write a size the way it is printed on the sidewall or on a receipt:
 * `235/45R18`, `235/45ZR18`, `P235/45R18 94V`, `LT265/70R17`, `235 45 18`,
 * `235-45-18`, `2354518`, and truck flotation sizes as `35x12.50R20` or
 * `35/12.50/20`. All of them mean the catalog's `235/45/18` / `35/12.50/20`.
 *
 * Parsing never reaches the server: the page passes the sizes for sale and the
 * match happens here, in the browser.
 */

export type ParsedSize = { w: string; s: string; d: string };

const RIM = String.raw`(\d{2}(?:\.\d)?)`;

// 235/45R18 · 235/45ZR18 · 235-45-18 · 235 45 18 · 235/45/18 · 235/45 R18 · 235/45-18
const METRIC = new RegExp(
  String.raw`^(\d{3})\s*[/\-\s]\s*(\d{2})\s*(?:[/\-\s]?\s*Z?R\s*|[/\-\s]\s*)${RIM}$`
);
// 2354518 · 24570195 (no separators: 3 + 2 + rim)
const DIGITS = new RegExp(String.raw`^(\d{3})(\d{2})${RIM}$`);
// 35x12.50R20 · 35/12.50/20 · 35 12.50 20 · 35X12.5-20
const FLOTATION = new RegExp(
  String.raw`^(\d{2})\s*[X/\-\s]\s*(\d{1,2}(?:\.\d{1,2})?)\s*(?:[/\-\s]?\s*Z?R\s*|[/\-\s]\s*)${RIM}$`
);

/** A size typed in any common format, or `null` when it is not a size. */
export function parseSizeQuery(text: string): ParsedSize | null {
  let t = text.toUpperCase().replace(/×/g, 'X').replace(/\s+/g, ' ').trim();
  if (!t || t.length > 40) return null;
  // Service-type prefixes and a trailing load/speed index ("94V", "104H XL").
  t = t.replace(/^(P|LT|ST)\s*/, '');
  t = t.replace(/\s+\d{2,3}[A-Z]{1,2}(\s+XL)?$/, '').replace(/\s+XL$/, '');

  const m = METRIC.exec(t) ?? DIGITS.exec(t) ?? FLOTATION.exec(t);
  if (!m) return null;
  const [, w, s, d] = m;
  return { w: String(Number(w)), s, d: String(Number(d)) };
}

const same = (a: string, b: string) => Number(a) === Number(b);

/** The catalog size the shopper means, if we sell it (`12.5` ≡ `12.50`). */
export function findStocked(parsed: ParsedSize, sizes: readonly string[]): string | null {
  return (
    sizes.find(size => {
      const p = parseSize(size);
      return Boolean(p && same(p[0], parsed.w) && same(p[1], parsed.s) && same(p[2], parsed.d));
    }) ?? null
  );
}

/**
 * The closest sizes we sell to one we don't (D3): the same width on the same
 * rim (other aspect ratios); when there is none, every size on that rim; when
 * we sell nothing on that rim, nothing.
 */
export function closestSizes(parsed: ParsedSize, sizes: readonly string[]): string[] {
  const onRim = sizes.filter(size => {
    const p = parseSize(size);
    return Boolean(p && same(p[2], parsed.d));
  });
  const sameWidth = onRim.filter(size => same(parseSize(size)![0], parsed.w));
  return [...(sameWidth.length ? sameWidth : onRim)].sort(bySize);
}

/** `235/45R18`, `35x12.50R20` — how a size is read back to the shopper. */
export function sizeLabel(p: ParsedSize): string {
  return Number(p.w) < 100 ? `${p.w}x${p.s}R${p.d}` : `${p.w}/${p.s}R${p.d}`;
}
