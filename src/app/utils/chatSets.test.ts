import { describe, expect, it } from 'vitest';

import type { SizeUnit } from '@/repositories/tireSetsRepository';

import {
  parseSetParam,
  pickChatSets,
  resolvePresetSet,
  setHref,
  toChatSetCard,
  type ChatSetRequest,
} from './chatSets';
import { cardSetOffer, isWithinTolerance, setTotal, type SetUnit } from './tireSets';

let n = 1000;
const u = (over: Partial<SizeUnit> = {}): SizeUnit => ({
  id: over.id ?? String(++n),
  price: 100,
  tread: 8,
  patched: false,
  condition: 'Used',
  city: 'Miami',
  brand: 'Michelin',
  model2: 'Pilot Sport 4',
  runFlat: false,
  ...over,
});

const many = (count: number, over: Partial<SizeUnit> = {}) =>
  Array.from({ length: count }, () => u(over));

const req = (over: Partial<ChatSetRequest> = {}): ChatSetRequest => ({
  size: '225/45/17',
  quantity: 4,
  ...over,
});

describe('pickChatSets (044, FR2–FR8)', () => {
  it('returns valid sets with every card field (AC1, AC2)', () => {
    const r = pickChatSets(many(5, { price: 90 }), req());
    expect(r.outcome).toBe('found');
    expect(r.sets).toHaveLength(1);
    const card = r.sets[0];
    expect(Object.keys(card).sort()).toEqual(
      [
        'brand',
        'cities',
        'condition',
        'count',
        'href',
        'model',
        'size',
        'total',
        'treadLabel',
        'units',
      ].sort()
    );
    expect(card).toMatchObject({ brand: 'Michelin', model: 'Pilot Sport 4', count: 4, total: 360 });
    expect(card.href).toMatch(/^\/tires\/\d+-michelin-225-45-17\?set=(\d+,){3}\d+$/);
  });

  it('never mixes models, run-flat or condition, and keeps the 2/32" rule (AC2)', () => {
    const units = [
      u({ id: '1', tread: 9 }),
      u({ id: '3', tread: 9, runFlat: true }),
      u({ id: '4', tread: 9, condition: 'New' }),
      u({ id: '5', tread: 9, model2: 'Pilot Sport 5' }),
      u({ id: '6', tread: 5 }),
    ];
    expect(pickChatSets(units, req({ quantity: 2 })).outcome).toBe('none');
  });

  it('builds a set across cities (047, AC5)', () => {
    const r = pickChatSets(
      [...many(2, { city: 'Miami' }), ...many(2, { city: 'Orlando' })],
      req({ quantity: 4 })
    );
    expect(r.outcome).toBe('found');
    expect(r.sets[0].cities).toEqual(['Miami', 'Orlando']);
  });

  it('shows at most 3 cards, one per brand and model, cheapest first (D1)', () => {
    const units = [
      ...many(2, { price: 50 }), // Michelin PS4 $100
      ...many(2, { price: 60, city: 'Orlando' }), // Michelin PS4 Orlando — same model, one card
      ...many(2, { brand: 'Pirelli', model2: 'P Zero', price: 40 }),
      ...many(2, { brand: 'Bridgestone', model2: 'Potenza', price: 70 }),
      ...many(2, { brand: 'Goodyear', model2: 'Eagle', price: 80 }),
    ];
    const r = pickChatSets(units, req({ quantity: 2 }));
    expect(r.sets.map(s => s.brand)).toEqual(['Pirelli', 'Michelin', 'Bridgestone']);
    expect(r.sets.map(s => s.total)).toEqual([80, 100, 140]);
  });

  it('lists sets without patched tires before cheaper patched ones', () => {
    const units = [
      ...many(2, { price: 40, patched: true }),
      ...many(2, { brand: 'Pirelli', model2: 'P Zero', price: 90 }),
    ];
    const r = pickChatSets(units, req({ quantity: 2 }));
    expect(r.sets.map(s => s.brand)).toEqual(['Pirelli', 'Michelin']);
  });

  it("uses the visitor's city only to break ties (047, AC16)", () => {
    const units = [
      ...many(2, { price: 50, city: 'Miami' }),
      ...many(2, { brand: 'Pirelli', model2: 'P Zero', price: 90, city: 'Orlando' }),
    ];
    const orlando = pickChatSets(units, req({ quantity: 2, visitorCity: 'Orlando' }));
    expect(orlando.sets.map(s => s.total)).toEqual([100, 180]);

    const patched = [
      ...many(2, { price: 40, city: 'Orlando', patched: true }),
      ...many(2, { brand: 'Pirelli', model2: 'P Zero', price: 90, city: 'Miami' }),
    ];
    expect(
      pickChatSets(patched, req({ quantity: 2, visitorCity: 'Orlando' })).sets.map(s => s.cities)
    ).toEqual([['Miami'], ['Orlando']]);

    const tie = [
      ...many(2, { price: 50, city: 'Miami' }),
      ...many(2, { brand: 'Pirelli', model2: 'P Zero', price: 50, city: 'Orlando' }),
    ];
    expect(
      pickChatSets(tie, req({ quantity: 2, visitorCity: 'Orlando' })).sets.map(s => s.cities)
    ).toEqual([['Orlando'], ['Miami']]);
  });

  it('respects brand, condition and city (AC8)', () => {
    const units = [
      ...many(4, { city: 'Orlando' }),
      ...many(4, { brand: 'Pirelli', model2: 'P Zero', city: 'Orlando' }),
      ...many(4, { city: 'Miami', condition: 'New', tread: null }),
    ];
    const r = pickChatSets(
      units,
      req({ brands: ['michelin'], city: 'Orlando', condition: 'used' })
    );
    expect(r.sets).toHaveLength(1);
    expect(r.outcome).toBe('found');
    expect(r.sets[0]).toMatchObject({ brand: 'Michelin', cities: ['Orlando'], condition: 'Used' });
    expect(pickChatSets(units, req({ brands: ['Goodyear'] })).outcome).toBe('none');
  });

  it("offers the visitor's other city as plain found sets (047, AC5)", () => {
    const r = pickChatSets(many(4, { city: 'Orlando' }), req({ visitorCity: 'Miami' }));
    expect(r.outcome).toBe('found');
    expect(r.sets[0].cities).toEqual(['Orlando']);
  });

  it('a named city is a preference: all there first, else any_city (047, AC15)', () => {
    const local = pickChatSets(
      [...many(4, { city: 'Orlando', price: 200 }), ...many(4, { city: 'Miami', price: 50 })],
      req({ city: 'Orlando' })
    );
    expect(local.outcome).toBe('found');
    expect(local.sets[0].cities).toEqual(['Orlando']);

    const anywhere = pickChatSets(
      [...many(4, { city: 'Orlando' }), ...many(2, { city: 'Miami' })],
      req({ city: 'Miami' })
    );
    expect(anywhere).toMatchObject({ outcome: 'any_city', quantity: 4 });
    expect(anywhere.sets[0].cities).toEqual(['Miami', 'Orlando']);
  });

  it('falls back to the largest smaller set, then none (AC7)', () => {
    const r = pickChatSets(many(3), req());
    expect(r).toMatchObject({ outcome: 'smaller', quantity: 3 });
    expect(r.sets[0].count).toBe(3);
    expect(pickChatSets(many(1), req())).toEqual({ outcome: 'none', quantity: 4, sets: [] });
  });

  it('only uses the 60 tires the page loads for a group (plan risk)', () => {
    // 70 good-tread expensive tires the page shows, 2 cheap worn ones it does not.
    const units = [...many(70, { tread: 9, price: 200 }), ...many(2, { tread: 5, price: 10 })];
    const r = pickChatSets(units, req({ quantity: 2 }));
    expect(r.sets[0].total).toBe(400);
  });

  it('carries no warehouse or shelf data (AC14)', () => {
    const r = pickChatSets(many(4), req());
    expect(JSON.stringify(r)).not.toMatch(/vault|location|shelf/i);
  });
});

describe('toChatSetCard', () => {
  it('links the best-tread tire first and labels the tread range', () => {
    const card = toChatSetCard(
      [u({ id: '11', tread: 7 }), u({ id: '12', tread: 8 }), u({ id: '13', tread: 7.5 })],
      '225/45/17'
    );
    expect(card.href).toBe('/tires/12-michelin-225-45-17?set=12,13,11');
    expect(card.treadLabel).toBe('7–8/32, Δ1/32');
  });
});

describe('parseSetParam', () => {
  it('accepts 2 to 4 distinct numeric ids', () => {
    expect(parseSetParam('1,2,3,4')).toEqual(['1', '2', '3', '4']);
    expect(parseSetParam('1')).toBeNull();
    expect(parseSetParam('1,2,3,4,5')).toBeNull();
    expect(parseSetParam('1,1')).toBeNull();
    expect(parseSetParam('1,abc')).toBeNull();
    expect(parseSetParam(null)).toBeNull();
  });
});

describe('resolvePresetSet (D6, AC4, AC5)', () => {
  const anchor: SetUnit = u({ id: '1', tread: 8 });
  const cands: SetUnit[] = [
    anchor,
    u({ id: '2', tread: 8 }),
    u({ id: '3', tread: 7 }),
    u({ id: '4', tread: 7 }),
    u({ id: '5', tread: 7.5 }),
  ];

  it('keeps exactly the tires of the link', () => {
    const r = resolvePresetSet(['1', '2', '3'], anchor, cands);
    expect(r).toMatchObject({ status: 'exact' });
    if (r.status === 'exact') expect(r.set.map(x => x.id)).toEqual(['1', '2', '3']);
  });

  it('replaces a tire that sold and says how many', () => {
    const r = resolvePresetSet(['1', '2', '99'], anchor, cands);
    expect(r).toMatchObject({ status: 'replaced', replaced: 1 });
    if (r.status === 'replaced') {
      expect(r.set).toHaveLength(3);
      expect(isWithinTolerance(r.set)).toBe(true);
    }
  });

  it('is unavailable when no valid set of that size can be built', () => {
    expect(resolvePresetSet(['1', '97', '98', '99'], anchor, [anchor, u({ id: '2' })])).toEqual({
      status: 'unavailable',
      size: 4,
    });
  });

  it('never builds an invalid set from tires outside the tread rule', () => {
    const far = u({ id: '6', tread: 3 });
    const r = resolvePresetSet(['1', '6'], anchor, [...cands, far]);
    expect(r.status).toBe('replaced');
    if (r.status === 'replaced') {
      expect(r.set.map(x => x.id)).not.toContain('6');
      expect(isWithinTolerance(r.set)).toBe(true);
    }
  });

  it('keeps a mixed-city set from a chat link as it is (047, AC4)', () => {
    const orl = u({ id: '7', city: 'Orlando' });
    const r = resolvePresetSet(['1', '7'], anchor, [...cands, orl]);
    expect(r).toEqual({ status: 'exact', set: [anchor, orl] });
  });

  it('ignores a link without this tire or without a valid value', () => {
    expect(resolvePresetSet(['2', '3'], anchor, cands)).toEqual({ status: 'ignored' });
    expect(resolvePresetSet(null, anchor, cands)).toEqual({ status: 'ignored' });
  });
});

describe('setHref and the listing cards (054)', () => {
  it('writes the same link the chat cards use', () => {
    expect(setHref('101', 'Michelin', '225/45/17', ['101', '102'])).toBe(
      '/tires/101-michelin-225-45-17?set=101,102'
    );
  });

  it('a card offer opens in the builder as exactly that set, same total (AC2)', () => {
    const anchor = u({ id: '500', tread: 8, price: 160 });
    const pool = [
      anchor,
      u({ id: '501', tread: 9, price: 120 }),
      u({ id: '502', tread: 7, price: 80 }),
      u({ id: '503', tread: 8, price: 100 }),
    ];
    const offer = cardSetOffer(anchor, pool)!;
    const href = setHref(anchor.id, anchor.brand, '225/45/17', offer.ids);
    const resolved = resolvePresetSet(
      parseSetParam(new URL(href, 'https://x').searchParams.get('set')),
      anchor,
      pool
    );
    expect(resolved.status).toBe('exact');
    expect(resolved.status === 'exact' && setTotal(resolved.set)).toBe(offer.total);
  });
});
