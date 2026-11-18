import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/connection/db', () => ({ getPool: vi.fn() }));

import { STOREFRONT_SELLABLE_WHERE } from '@/repositories/feedQuery';

import { MODEL_SIZE_GROUPS_SQL, toModelSizeGroup } from './otherSizesRepository';

describe('otherSizesRepository (049)', () => {
  it('reads only public columns — never the store or the shelf (AC10)', () => {
    expect(MODEL_SIZE_GROUPS_SQL).not.toMatch(/VaultName|Location|Local\b(?! = '0')/);
    const selected = MODEL_SIZE_GROUPS_SQL.split('FROM')[0];
    expect(selected).not.toMatch(/VaultName|Location|Code|DOT|Amount/);
  });

  it('uses the catalog sellable rule, not a copy', () => {
    expect(MODEL_SIZE_GROUPS_SQL).toContain(STOREFRONT_SELLABLE_WHERE);
  });

  it('maps a row; New from ProductTypeId 1; rim from Size or RealSize', () => {
    expect(
      toModelSizeGroup({
        Brand: 'FIRESTONE',
        Model2: 'DESTINATION LE3',
        RealSize: '235/65/17',
        Size: '17',
        units: 4,
        minPrice: 89,
        TireId: 123,
        ProductTypeId: 2,
      })
    ).toEqual({
      brand: 'FIRESTONE',
      model: 'DESTINATION LE3',
      size: '235/65/17',
      rim: '17',
      units: 4,
      minPrice: 89,
      tireId: '123',
      isNew: false,
    });
    const g = toModelSizeGroup({
      Brand: 'B',
      Model2: 'M',
      RealSize: '245/70/19.5',
      Size: null,
      units: 1,
      minPrice: 150,
      TireId: '9',
      ProductTypeId: '1',
    });
    expect(g?.rim).toBe('19.5');
    expect(g?.isNew).toBe(true);
  });

  it('drops a group without a usable price', () => {
    const base = {
      Brand: 'B',
      Model2: 'M',
      RealSize: '205/55/16',
      Size: '16',
      units: 1,
      TireId: 1,
      ProductTypeId: 2,
    };
    expect(toModelSizeGroup({ ...base, minPrice: null })).toBeNull();
    expect(toModelSizeGroup({ ...base, minPrice: 0 })).toBeNull();
  });
});
