import { describe, expect, it } from 'vitest';

import { closestSizes, findStocked, parseSizeQuery, sizeLabel } from './sizeQuery';
import live from './sizeTree.fixture.json';

// The 293 sizes for sale on 2026-11-18 (049's fixture).
const SIZES = live as string[];

describe('parseSizeQuery (050)', () => {
  it.each([
    '235/45R18',
    '235/45/18',
    '235-45-18',
    '235 45 18',
    '2354518',
    '235/45ZR18',
    'P235/45R18',
    'p235/45zr18',
    ' 235 / 45 R 18 ',
    '235/45R18 94V',
    '235/45R18 98W XL',
    '235/45-18',
  ])('reads %s as 235/45/18 (AC2)', text => {
    expect(parseSizeQuery(text)).toEqual({ w: '235', s: '45', d: '18' });
  });

  it.each([
    ['LT265/70R17', { w: '265', s: '70', d: '17' }],
    ['35x12.50R20', { w: '35', s: '12.50', d: '20' }],
    ['35X12.50-20', { w: '35', s: '12.50', d: '20' }],
    ['35/12.50/20', { w: '35', s: '12.50', d: '20' }],
    ['35×12.5R20', { w: '35', s: '12.5', d: '20' }],
    ['245/70R19.5', { w: '245', s: '70', d: '19.5' }],
  ])('reads %s (AC3)', (text, want) => {
    expect(parseSizeQuery(text)).toEqual(want);
  });

  it.each(['', 'hello', '235', '235/45', '23545', 'michelin 235', '1/2/3', 'x'.repeat(60)])(
    'rejects %j',
    text => {
      expect(parseSizeQuery(text)).toBeNull();
    }
  );
});

describe('findStocked', () => {
  it('finds the catalog size, matching numbers not strings', () => {
    expect(findStocked(parseSizeQuery('2354518')!, SIZES)).toBe('235/45/18');
    expect(findStocked(parseSizeQuery('35x12.5R20')!, SIZES)).toBe('35/12.50/20');
    expect(findStocked(parseSizeQuery('225/65R18')!, SIZES)).toBeNull();
  });
});

describe('closestSizes (D3, AC4)', () => {
  it('offers the same width on the same rim', () => {
    expect(closestSizes(parseSizeQuery('225/65R18')!, SIZES)).toEqual([
      '225/40/18',
      '225/45/18',
      '225/50/18',
      '225/55/18',
      '225/60/18',
    ]);
  });

  it('falls back to the whole rim when the width is not there', () => {
    const onRim14 = closestSizes(parseSizeQuery('175/65R14')!, SIZES);
    expect(onRim14).toEqual(SIZES.filter(s => s.endsWith('/14')));
    expect(onRim14.length).toBeGreaterThan(0);
  });

  it('offers nothing on a rim we do not sell', () => {
    expect(closestSizes(parseSizeQuery('155/80R12')!, SIZES)).toEqual([]);
  });
});

describe('sizeLabel', () => {
  it('reads a size back as printed on the tire', () => {
    expect(sizeLabel({ w: '225', s: '65', d: '18' })).toBe('225/65R18');
    expect(sizeLabel({ w: '35', s: '12.50', d: '20' })).toBe('35x12.50R20');
  });
});
