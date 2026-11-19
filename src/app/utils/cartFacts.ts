import type { SingleTire, TransformedTire } from '@/app/interfaces/tires';
import { parseTread } from '@/app/utils/tireSets';

/**
 * What a shopper compares between tires in the cart (feature 047, owner
 * review): tread, remaining life, patch and DOT. Stored on each cart line when
 * the tire is added; lines saved before carry none and show none.
 */
export type TireFacts = {
  /** In 32nds of an inch. */
  tread?: number | null;
  /** As the record shows it, e.g. `"86%"`. */
  life?: string;
  patched?: boolean;
  dot?: string;
};

const clean = (v?: string | null) => {
  const t = (v ?? '').trim();
  return t && t !== '-' && t.toUpperCase() !== 'N/A' ? t : undefined;
};

const yesNo = (v?: string) => (v === 'Yes' ? true : v === 'No' ? false : undefined);

/** Every fact present as a key, so spreading it over a tire replaces the tire's own fields. */
type AllFacts = {
  tread: number | null | undefined;
  life: string | undefined;
  patched: boolean | undefined;
  dot: string | undefined;
};

/** The detail page's tire. */
export function factsFromSingleTire(
  t: Pick<SingleTire, 'treadDepth' | 'remainingLife' | 'patched' | 'dot'>
): AllFacts {
  return {
    tread: parseTread(t.treadDepth),
    life: clean(t.remainingLife),
    patched: yesNo(t.patched),
    dot: clean(t.dot),
  };
}

/** A catalog card's tire: facts from its named features; DOT as a field since 051. */
export function factsFromCardTire(t: Pick<TransformedTire, 'features' | 'dot'>): AllFacts {
  const value = (name: string) =>
    t.features?.find(f => f.name.toLowerCase() === name.toLowerCase())?.value;
  return {
    tread: parseTread(value('Tread depth')),
    life: clean(value('Remaining life')),
    patched: yesNo(value('Patched')),
    dot: clean(t.dot),
  };
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** `["8.6/32", "86% life", "Patched", "DOT 2325"]` — only what the line has. */
export function factsParts(f: TireFacts): string[] {
  return [
    typeof f.tread === 'number' ? `${fmt(f.tread)}/32` : null,
    f.life ? `${f.life} life` : null,
    f.patched === true ? 'Patched' : f.patched === false ? 'No patch' : null,
    f.dot ? `DOT ${f.dot}` : null,
  ].filter((p): p is string => Boolean(p));
}
