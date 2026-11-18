import { describe, expect, it, vi } from 'vitest';

vi.mock('@/connection/db', () => ({ getPool: vi.fn() }));

import { STOREFRONT_SELLABLE_WHERE } from '@/repositories/feedQuery';

import { SIZE_COUNTS_SQL } from './tiresRepository';

describe('size counts for the size index (050)', () => {
  it('uses the catalog sellable rule, like fetchSizes', () => {
    expect(SIZE_COUNTS_SQL).toContain(STOREFRONT_SELLABLE_WHERE);
    expect(SIZE_COUNTS_SQL).toMatch(/GROUP BY RealSize/);
  });

  it('reads no internal column', () => {
    expect(SIZE_COUNTS_SQL).not.toMatch(/VaultName|Location|Code|DOT/);
  });
});
