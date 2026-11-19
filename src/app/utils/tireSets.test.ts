import { describe, expect, it } from 'vitest';

import {
  availableSetSizes,
  cardSetOffer,
  cheapestSetWith,
  cheapestSet,
  closestMatch,
  countJoinable,
  isQuantityMode,
  isWithinTolerance,
  parseTread,
  pickReplacement,
  setTotal,
  suggestSet,
  swapOptions,
  treadRange,
  type SetUnit,
} from './tireSets';

let n = 0;
const unit = (over: Partial<SetUnit> = {}): SetUnit => ({
  id: over.id ?? `u${++n}`,
  price: 100,
  tread: 9,
  patched: false,
  condition: 'Used',
  city: 'Miami',
  ...over,
});

const ids = (units: SetUnit[] | null) => (units ?? []).map(u => u.id);

describe('parseTread', () => {
  it.each([
    ['10.0', 10],
    ['9.6', 9.6],
    [8, 8],
    ['-', null],
    ['', null],
    [null, null],
    ['abc', null],
    ['0', null],
  ])('%p → %p', (input, expected) => {
    expect(parseTread(input)).toBe(expected);
  });
});

describe('treadRange / tolerance', () => {
  it('labels a range with its difference', () => {
    expect(treadRange([unit({ tread: 9 }), unit({ tread: 10 })])?.label).toBe('9–10/32, Δ1/32');
  });

  it('labels a uniform set with one figure', () => {
    expect(treadRange([unit({ tread: 10 }), unit({ tread: 10 })])?.label).toBe('10/32');
  });

  it('accepts exactly 2/32 and rejects more', () => {
    expect(isWithinTolerance([unit({ tread: 9.6 }), unit({ tread: 7.6 })])).toBe(true);
    expect(isWithinTolerance([unit({ tread: 9.7 }), unit({ tread: 7.6 })])).toBe(false);
  });

  it('rejects a used unit without tread', () => {
    expect(isWithinTolerance([unit({ tread: 9 }), unit({ tread: null })])).toBe(false);
  });

  it('counts a new tire without tread as full tread', () => {
    const a = unit({ tread: 10, condition: 'New' });
    const b = unit({ tread: null, condition: 'New' });
    expect(isWithinTolerance([a, b])).toBe(true);
  });

  it('totals the prices of the units', () => {
    expect(setTotal([unit({ price: 120.5 }), unit({ price: 80.25 })])).toBe(200.75);
  });
});

describe('availableSetSizes (FR3, AC1–AC3)', () => {
  const anchor = unit({ id: 'a', tread: 9 });

  it('offers nothing without candidates', () => {
    expect(availableSetSizes(anchor, [])).toEqual([]);
  });

  it('offers only a pair with one compatible tire (AC2)', () => {
    expect(availableSetSizes(anchor, [unit({ tread: 9 })])).toEqual([2]);
  });

  it('offers 2, 3 and 4 with three compatible tires (AC1)', () => {
    expect(availableSetSizes(anchor, [unit(), unit(), unit()])).toEqual([2, 3, 4]);
  });

  it('ignores tires outside 2/32 or without tread (AC3)', () => {
    const far = unit({ tread: 5 });
    const unknown = unit({ tread: null });
    expect(availableSetSizes(anchor, [far, unknown])).toEqual([]);
  });

  it('builds with tires from the other city (047, AC1)', () => {
    const orlando = [
      unit({ city: 'Orlando' }),
      unit({ city: 'Orlando' }),
      unit({ city: 'Orlando' }),
    ];
    expect(availableSetSizes(anchor, orlando)).toEqual([2, 3, 4]);
  });

  it('never counts the anchor itself or duplicates', () => {
    const twin = unit({ id: 'b' });
    expect(availableSetSizes(anchor, [anchor, twin, twin])).toEqual([2]);
  });
});

describe('countJoinable (FR4)', () => {
  it('counts only tires within 2/32 of the anchor, not the whole group', () => {
    const anchor = unit({ id: 'a', tread: 9 });
    const group = [
      ...Array.from({ length: 6 }, () => unit({ tread: 8 })),
      unit({ tread: 6 }),
      unit({ tread: 5.5 }),
    ];
    expect(countJoinable(anchor, group)).toBe(6);
  });
});

describe('suggestSet (FR5, D6, AC4, AC15)', () => {
  it('always includes the anchor and distinct tires', () => {
    const anchor = unit({ id: 'a' });
    const set = suggestSet(anchor, [unit(), unit(), unit(), unit()], 4);
    expect(set?.[0].id).toBe('a');
    expect(new Set(ids(set)).size).toBe(4);
  });

  it('prefers the closest tread', () => {
    const anchor = unit({ id: 'a', tread: 9 });
    const close = unit({ id: 'close', tread: 9 });
    const farther = unit({ id: 'farther', tread: 8, price: 10 });
    expect(ids(suggestSet(anchor, [farther, close], 2))).toEqual(['a', 'close']);
  });

  it('between equal tread, prefers unpatched (AC15)', () => {
    const anchor = unit({ id: 'a', tread: 9 });
    const patched = unit({ id: 'p', tread: 9, patched: true, price: 50 });
    const clean = unit({ id: 'c', tread: 9, patched: false, price: 150 });
    expect(ids(suggestSet(anchor, [patched, clean], 2))).toEqual(['a', 'c']);
  });

  it('between equal tread and patch status, prefers the cheaper (AC15)', () => {
    const anchor = unit({ id: 'a', tread: 9 });
    const dear = unit({ id: 'dear', tread: 9, price: 200 });
    const cheap = unit({ id: 'cheap', tread: 9, price: 90 });
    expect(ids(suggestSet(anchor, [dear, cheap], 2))).toEqual(['a', 'cheap']);
  });

  it('never exceeds 2/32 even when greedy picking would (anchor 8, units 6 and 10)', () => {
    const anchor = unit({ id: 'a', tread: 8 });
    const low = unit({ id: 'low', tread: 6 });
    const high = unit({ id: 'high', tread: 10 });
    expect(suggestSet(anchor, [low, high], 3)).toBeNull();
    const pair = suggestSet(anchor, [low, high], 2);
    expect(pair && isWithinTolerance(pair)).toBe(true);
  });

  it('finds the valid window when it is not centred on the anchor', () => {
    const anchor = unit({ id: 'a', tread: 8 });
    const set = suggestSet(
      anchor,
      [unit({ tread: 9.5 }), unit({ tread: 10 }), unit({ tread: 6 })],
      3
    );
    expect(set && isWithinTolerance(set)).toBe(true);
    expect(set).toHaveLength(3);
  });
});

describe('swapOptions (FR7, AC5)', () => {
  const anchor = unit({ id: 'a', tread: 9 });
  const b = unit({ id: 'b', tread: 9 });
  const c = unit({ id: 'c', tread: 8 });
  const ok = unit({ id: 'ok', tread: 8.5 });
  const tooFar = unit({ id: 'far', tread: 6.5 });

  it('never offers to swap the anchor', () => {
    expect(swapOptions([anchor, b, c], 0, [ok])).toEqual([]);
  });

  it('only offers tires that keep the set within 2/32 and are not already in it', () => {
    expect(ids(swapOptions([anchor, b, c], 2, [ok, tooFar, b]))).toEqual(['ok']);
  });
});

describe('pickReplacement (FR13, AC11)', () => {
  it('returns the best compatible tire for the ones kept', () => {
    const keep = [unit({ id: 'a', tread: 9 }), unit({ id: 'b', tread: 9 })];
    const options = [
      unit({ id: 'patch', tread: 9, patched: true }),
      unit({ id: 'clean', tread: 9 }),
    ];
    expect(pickReplacement(keep, options)?.id).toBe('clean');
  });

  it('returns null when nothing fits', () => {
    const keep = [unit({ id: 'a', tread: 9 })];
    expect(pickReplacement(keep, [unit({ tread: 5 }), unit({ tread: null })])).toBeNull();
  });

  it('offers a replacement in the other city (047, AC4)', () => {
    const keep = [unit({ id: 'a', tread: 9 })];
    expect(pickReplacement(keep, [unit({ id: 'o', city: 'Orlando' })])?.id).toBe('o');
  });

  it("breaks a full tie on the first kept tire's city (047, D3)", () => {
    const keep = [unit({ id: 'a', tread: 9, city: 'Orlando' })];
    const options = [unit({ id: 'm', city: 'Miami' }), unit({ id: 'o', city: 'Orlando' })];
    expect(pickReplacement(keep, options)?.id).toBe('o');
  });
});

describe('city across cities (047)', () => {
  const anchor = unit({ id: 'a', tread: 9, city: 'Miami' });

  it('never offers a mixed-city tire outside 2/32 (AC2)', () => {
    const set = suggestSet(
      anchor,
      [unit({ tread: 6, city: 'Orlando' }), unit({ tread: 9, city: 'Orlando' })],
      3
    );
    expect(set).toBeNull();
    const two = suggestSet(
      anchor,
      [
        unit({ id: 'far', tread: 6, city: 'Orlando' }),
        unit({ id: 'ok', tread: 8, city: 'Orlando' }),
      ],
      2
    );
    expect(ids(two)).toEqual(['a', 'ok']);
  });

  it('lists swap options from both cities (AC3)', () => {
    const m = unit({ id: 'm', city: 'Miami' });
    const o = unit({ id: 'o', city: 'Orlando' });
    const set = suggestSet(anchor, [m, o], 2)!;
    expect(ids(swapOptions(set, 1, [m, o])).sort()).toEqual(
      ['m', 'o'].filter(id => id !== set[1].id)
    );
  });

  it("prefers the page tire's city only on a full tie (AC12)", () => {
    const miami = unit({ id: 'z-miami', tread: 9, price: 100, city: 'Miami' });
    const orlando = unit({ id: 'a-orlando', tread: 9, price: 100, city: 'Orlando' });
    expect(ids(suggestSet(anchor, [orlando, miami], 2))).toEqual(['a', 'z-miami']);

    const closer = unit({ id: 'closer', tread: 9, city: 'Orlando' });
    const further = unit({ id: 'further', tread: 8, city: 'Miami' });
    expect(ids(suggestSet(anchor, [further, closer], 2))).toEqual(['a', 'closer']);

    const cheaper = unit({ id: 'cheap', tread: 9, price: 90, city: 'Orlando' });
    expect(ids(suggestSet(anchor, [miami, cheaper], 2))).toEqual(['a', 'cheap']);
  });
});

describe('quantity mode (D11, AC16)', () => {
  it('is on for new tires and sizes are capped by availability', () => {
    const anchor = unit({ id: 'a', condition: 'New', tread: 10 });
    const others = [unit({ condition: 'New', tread: null }), unit({ condition: 'New', tread: 10 })];
    expect(isQuantityMode(anchor)).toBe(true);
    expect(availableSetSizes(anchor, others)).toEqual([2, 3]);
  });

  it('is off for used tires', () => {
    expect(isQuantityMode(unit())).toBe(false);
  });
});

describe('closestMatch (043)', () => {
  it('follows 041 order with no tread limit', () => {
    const far = unit({ id: 'far', tread: 3 });
    const near = unit({ id: 'near', tread: 8, patched: true });
    const nearClean = unit({ id: 'nearClean', tread: 8, price: 300 });
    expect(closestMatch(9, [far, near, nearClean])?.id).toBe('nearClean');
    expect(closestMatch(2, [far, near])?.id).toBe('far');
  });

  it('puts units without tread last, and is null for nothing', () => {
    const noTread = unit({ id: 'x', tread: null });
    expect(closestMatch(9, [noTread, unit({ id: 'y', tread: 4 })])?.id).toBe('y');
    expect(closestMatch(9, [noTread])?.id).toBe('x');
    expect(closestMatch(9, [])).toBeNull();
  });
});

describe('cheapestSet (044, D1)', () => {
  it('puts unpatched tires before cheaper patched ones (owner, 10 nov)', () => {
    const units = [
      unit({ id: 'p1', patched: true, price: 40 }),
      unit({ id: 'p2', patched: true, price: 40 }),
      unit({ id: 'u1', patched: false, price: 90 }),
      unit({ id: 'u2', patched: false, price: 95 }),
      unit({ id: 'u3', patched: false, price: 99 }),
    ];
    expect(ids(cheapestSet(units, 2))).toEqual(['u1', 'u2']);
    expect(ids(cheapestSet(units, 4))).toEqual(['u1', 'u2', 'u3', 'p1']);
  });

  it('takes the cheapest units inside a 2/32" window', () => {
    const units = [
      unit({ id: 'a', tread: 9, price: 200 }),
      unit({ id: 'b', tread: 8, price: 80 }),
      unit({ id: 'c', tread: 7, price: 90 }),
      unit({ id: 'd', tread: 4, price: 10 }),
    ];
    expect(ids(cheapestSet(units, 2))).toEqual(['b', 'c']);
  });

  it('never exceeds the 2/32" spread (the 6–8–10 overshoot)', () => {
    const units = [
      unit({ id: 'six', tread: 6, price: 10 }),
      unit({ id: 'eight', tread: 8, price: 500 }),
      unit({ id: 'ten', tread: 10, price: 10 }),
    ];
    const set = cheapestSet(units, 2);
    expect(isWithinTolerance(set ?? [])).toBe(true);
    expect(cheapestSet(units, 3)).toBeNull();
  });

  it('builds sets across cities (047)', () => {
    const units = [
      unit({ id: 'm1', city: 'Miami', price: 50 }),
      unit({ id: 'o1', city: 'Orlando', price: 10 }),
      unit({ id: 'o2', city: 'Orlando', price: 10 }),
      unit({ id: 'm2', city: 'Miami', price: 50 }),
    ];
    expect(ids(cheapestSet(units, 2))).toEqual(['o1', 'o2']);
    expect(ids(cheapestSet(units, 3))).toEqual(['o1', 'o2', 'm1']);
  });

  it('prefers a city only on a full tie (047, D8)', () => {
    const units = [
      unit({ id: 'a-o', city: 'Orlando', price: 50 }),
      unit({ id: 'b-o', city: 'Orlando', price: 50 }),
      unit({ id: 'c-m', city: 'Miami', price: 50 }),
      unit({ id: 'd-m', city: 'Miami', price: 50 }),
    ];
    expect(ids(cheapestSet(units, 2))).toEqual(['a-o', 'b-o']);
    expect(ids(cheapestSet(units, 2, 'Miami'))).toEqual(['c-m', 'd-m']);
    const patchedMiami = [
      unit({ id: 'pm1', city: 'Miami', price: 50, patched: true }),
      unit({ id: 'pm2', city: 'Miami', price: 50, patched: true }),
      unit({ id: 'o1', city: 'Orlando', price: 80 }),
      unit({ id: 'o2', city: 'Orlando', price: 80 }),
    ];
    expect(ids(cheapestSet(patchedMiami, 2, 'Miami'))).toEqual(['o1', 'o2']);
  });

  it('prefers unpatched on equal price, and skips units without tread', () => {
    const units = [
      unit({ id: 'p', patched: true, price: 50 }),
      unit({ id: 'q', patched: false, price: 50 }),
      unit({ id: 'r', patched: false, price: 50 }),
      unit({ id: 'x', tread: null, price: 1 }),
    ];
    expect(ids(cheapestSet(units, 2))).toEqual(['q', 'r']);
  });

  it('counts a new tire without tread as full tread', () => {
    const units = [
      unit({ id: 'n1', condition: 'New', tread: null, price: 150 }),
      unit({ id: 'n2', condition: 'New', tread: null, price: 150 }),
    ];
    expect(ids(cheapestSet(units, 2))).toEqual(['n1', 'n2']);
  });
});

describe('cheapestSetWith / cardSetOffer (054)', () => {
  const anchor = unit({ id: 'A', tread: 8, price: 160 });

  it('always contains the anchor once, even when the pool holds it', () => {
    const pool = [
      anchor,
      unit({ id: 'b', tread: 8 }),
      unit({ id: 'c', tread: 9 }),
      unit({ id: 'd', tread: 7 }),
    ];
    const set = cheapestSetWith(anchor, pool, 4)!;
    expect(ids(set)[0]).toBe('A');
    expect(new Set(ids(set)).size).toBe(4);
  });

  it('takes the cheapest units in a 2/32" window that holds the anchor', () => {
    const pool = [
      unit({ id: 'far', tread: 5, price: 10 }), // 3/32" below: never
      unit({ id: 'b', tread: 9, price: 120 }),
      unit({ id: 'c', tread: 7, price: 80 }),
      unit({ id: 'd', tread: 10, price: 90 }), // with 7 it would span 3/32"
    ];
    const set = cheapestSetWith(anchor, pool, 3)!;
    expect(ids(set).sort()).toEqual(['A', 'b', 'c']);
    expect(isWithinTolerance(set)).toBe(true);
    expect(setTotal(set)).toBe(360);
  });

  it('prefers unpatched, then cheaper, then the anchor’s city', () => {
    const pool = [
      unit({ id: 'p', tread: 8, price: 50, patched: true }),
      unit({ id: 'o', tread: 8, price: 90, city: 'Orlando' }),
      unit({ id: 'm', tread: 8, price: 90 }),
    ];
    expect(ids(cheapestSetWith(anchor, pool, 2))).toEqual(['A', 'm']);
  });

  it('offers 4, else 2, else nothing (D1)', () => {
    const four = [1, 2, 3].map(i => unit({ id: `f${i}`, tread: 8 }));
    expect(cardSetOffer(anchor, four)).toEqual({
      size: 4,
      total: 460,
      ids: ['A', 'f1', 'f2', 'f3'],
    });
    const two = [unit({ id: 't1', tread: 8 })];
    expect(cardSetOffer(anchor, two)).toEqual({ size: 2, total: 260, ids: ['A', 't1'] });
    expect(cardSetOffer(anchor, [unit({ tread: 4 })])).toBeNull();
  });

  it('works for new tires (full tread)', () => {
    const nu = (id: string) => unit({ id, tread: null, condition: 'New', price: 200 });
    expect(cardSetOffer(nu('N'), [nu('n1'), nu('n2'), nu('n3')])?.total).toBe(800);
  });

  it('never prices a set that breaks the 2/32" rule', () => {
    expect(cheapestSetWith(anchor, [unit({ tread: 11 }), unit({ tread: 5 })], 2)).toBeNull();
  });
});
