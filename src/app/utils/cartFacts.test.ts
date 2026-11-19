import { describe, expect, it } from 'vitest';

import { factsFromCardTire, factsFromSingleTire, factsParts } from './cartFacts';

describe('cart facts (047, owner review)', () => {
  it('reads a detail-page tire', () => {
    expect(
      factsFromSingleTire({ treadDepth: '8.6', remainingLife: '86%', patched: 'Yes', dot: '2325' })
    ).toEqual({ tread: 8.6, life: '86%', patched: true, dot: '2325' });
  });

  it('reads a catalog card from its features, with no DOT there', () => {
    const facts = factsFromCardTire({
      features: [
        { name: 'Patched', value: 'No' },
        { name: 'Remaining life', value: '90%' },
        { name: 'Tread depth', value: '9.0' },
      ],
    } as never);
    expect(facts).toEqual({ tread: 9, life: '90%', patched: false, dot: undefined });
  });

  it("carries the card's DOT since listings include it (051)", () => {
    const facts = factsFromCardTire({ features: [], dot: '2324' } as never);
    expect(facts.dot).toBe('2324');
    expect(factsParts(facts)).toContain('DOT 2324');
  });

  it('drops blanks and placeholders', () => {
    expect(
      factsFromSingleTire({ treadDepth: '-', remainingLife: '-', patched: '', dot: 'N/A' })
    ).toEqual({ tread: null, life: undefined, patched: undefined, dot: undefined });
  });

  it('writes the line with only what a cart line has', () => {
    expect(factsParts({ tread: 8.6, life: '86%', patched: true, dot: '2325' })).toEqual([
      '8.6/32',
      '86% life',
      'Patched',
      'DOT 2325',
    ]);
    expect(factsParts({ tread: 9, patched: false })).toEqual(['9/32', 'No patch']);
    expect(factsParts({})).toEqual([]);
  });
});
