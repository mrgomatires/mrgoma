import { describe, expect, it } from 'vitest';

import { pickTireListFields } from '@/repositories/tireListFields';
import type { DocumentRecord } from '@/repositories/tiresRepository';

const WHITELIST = [
  'TireId',
  'Code',
  'Brand',
  'Model2',
  'RealSize',
  'Image1',
  'Image2',
  'Image3',
  'Image4',
  'Price',
  'BrandId',
  'ProductTypeId',
  'Patched',
  'RemainingLife',
  'Tread',
  'KindSaleId',
  'City',
  // Public since 051 (the comparison): on every tire page and on the tire.
  'DOT',
  'loadIndex',
  'speedIndex',
].sort();

const INTERNAL = ['VaultName', 'Local', 'Trash', 'Amount', 'ModificationDate', 'ConditionId'];

// A raw record as it comes off `SELECT *` — includes internal columns that are
// not even in the DocumentRecord type but exist at runtime.
const rawRecord = {
  TireId: '42',
  Code: 'ABC',
  Brand: 'Michelin',
  Model2: 'Pilot',
  RealSize: '225/40/18',
  Image1: 'a.jpg',
  Price: 99,
  BrandId: 3,
  ProductTypeId: 2,
  Patched: '0',
  RemainingLife: '80%',
  Tread: '7',
  KindSaleId: 1,
  loadIndex: '94',
  speedIndex: 'V',
  // internal columns that must be dropped:
  VaultName: 'Vault-1',
  Local: '0',
  Trash: 'false',
  Amount: 5,
  DOT: '1234', // public (051)
  ModificationDate: '2026-01-01',
  ConditionId: 7,
} as unknown as DocumentRecord;

describe('pickTireListFields', () => {
  const out = pickTireListFields(rawRecord);

  it('returns only whitelisted keys', () => {
    expect(Object.keys(out).sort()).toEqual(WHITELIST);
  });

  it('drops every internal-only column', () => {
    for (const key of INTERNAL) {
      expect(out).not.toHaveProperty(key);
    }
  });

  it('preserves the whitelisted values', () => {
    expect(out.TireId).toBe('42');
    expect(out.Brand).toBe('Michelin');
    expect(out.Price).toBe(99);
    expect(out.KindSaleId).toBe(1);
  });
});
