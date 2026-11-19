import { describe, expect, it } from 'vitest';

import {
  addItem,
  compareRows,
  type CompareTire,
  MAX_COMPARE,
  parseDot,
  removeItem,
  sameSize,
  snapshot,
} from './compare';

const tire = (id: string, over: Partial<CompareTire> = {}, feats: Record<string, string> = {}) =>
  ({
    id,
    name: `(${id}) | B | M | 235/45/18`,
    size: '235/45/18',
    brand: 'B',
    brandId: 1,
    price: '100',
    condition: 'Used',
    city: 'Miami',
    imageSrc: '/x.webp',
    dot: '2324',
    loadIndex: '94',
    speedIndex: 'V',
    features: Object.entries({
      'Tread depth': '8',
      'Remaining life': '80%',
      Patched: 'No',
      'Run Flat': 'No',
      ...feats,
    }).map(([name, value]) => ({ name, value })),
    ...over,
  }) as CompareTire;

const row = (tires: CompareTire[], key: string) => compareRows(tires).find(r => r.key === key)!;

describe('compare store helpers (051)', () => {
  it('holds at most three, never drops one, ignores duplicates (FR2, AC2)', () => {
    let items = [] as ReturnType<typeof addItem>['items'];
    for (const id of ['1', '2', '3']) items = addItem(items, { tire: tire(id) }).items;
    expect(items).toHaveLength(MAX_COMPARE);
    const fourth = addItem(items, { tire: tire('4') });
    expect(fourth.result).toBe('full');
    expect(fourth.items.map(i => i.tire.id)).toEqual(['1', '2', '3']);
    expect(addItem(items, { tire: tire('2') }).result).toBe('present');
    expect(removeItem(items, '2').map(i => i.tire.id)).toEqual(['1', '3']);
  });

  it('keeps only the public fields of a card', () => {
    const card = { ...tire('9'), href: '#', imageAlt: 'x', color: 'Black', extra: 'secret' };
    const kept = snapshot(card as never).tire as Record<string, unknown>;
    expect(kept).not.toHaveProperty('extra');
    expect(kept).not.toHaveProperty('href');
    expect(kept.id).toBe('9');
  });

  it('knows when sizes differ (D3, AC13)', () => {
    expect(sameSize([tire('1'), tire('2')])).toBe(true);
    expect(sameSize([tire('1'), tire('2', { size: '245/40/18' })])).toBe(false);
  });
});

describe('parseDot', () => {
  it('reads WWYY', () => {
    expect(parseDot('2324')).toEqual({ week: 23, year: 2024 });
    expect(parseDot('0125')).toEqual({ week: 1, year: 2025 });
  });
  it('rejects anything else', () => {
    for (const v of ['104', '5424', '0024', '', undefined, 'N/A']) expect(parseDot(v)).toBeNull();
  });
});

describe('compareRows (FR4, FR5, AC3)', () => {
  it('lists the facts in order with readable values', () => {
    const rows = compareRows([tire('1'), tire('2')]);
    expect(rows.map(r => r.label)).toEqual([
      'Size',
      'Condition',
      'Price',
      'Tread',
      'Remaining life',
      'Patched',
      'Made (DOT)',
      'Load index',
      'Speed rating',
      'Run-flat',
      'Location',
    ]);
    expect(row([tire('1')], 'tread').values).toEqual(['8/32"']);
    expect(row([tire('1')], 'dot').values).toEqual(['Week 23, 2024']);
    expect(row([tire('1')], 'price').values).toEqual(['$100']);
  });

  it('marks the better tread, life, patch, price and newer DOT', () => {
    const a = tire('a', { price: '120', dot: '0124' }, { 'Tread depth': '9', Patched: 'Yes' });
    const b = tire('b', { price: '90', dot: '4824' }, { 'Remaining life': '95%' });
    const tires = [a, b];
    expect(row(tires, 'tread').best).toEqual([0]);
    expect(row(tires, 'life').best).toEqual([1]);
    expect(row(tires, 'patched').best).toEqual([1]);
    expect(row(tires, 'price').best).toEqual([1]);
    expect(row(tires, 'dot').best).toEqual([1]);
    // No "better" size, condition, load, speed, run-flat or city.
    expect(row([a, tire('c', { size: '245/40/18' })], 'size').best).toEqual([]);
  });

  it('shows — for a missing fact and ranks nothing with a single known value', () => {
    const a = tire('a', { dot: undefined, loadIndex: undefined });
    const b = tire('b');
    expect(row([a, b], 'load').values).toEqual(['—', '94']);
    expect(row([a, b], 'dot').best).toEqual([]);
  });

  it('flags rows that differ; ties have no best (AC4)', () => {
    const tires = [tire('1'), tire('2'), tire('3', { price: '80' })];
    expect(row(tires, 'tread').differs).toBe(false);
    expect(row(tires, 'tread').best).toEqual([]);
    expect(row(tires, 'price').differs).toBe(true);
    expect(row(tires, 'price').best).toEqual([2]);
  });

  it('never calls a sold tire the best (051 review)', () => {
    const sold = tire('s', { price: '50' }, { 'Tread depth': '11' });
    const ok = tire('o', { price: '90' });
    const rows = compareRows([sold, ok], new Set([0]));
    expect(rows.find(r => r.key === 'tread')!.best).toEqual([]);
    expect(rows.find(r => r.key === 'price')!.best).toEqual([]);
  });
});
