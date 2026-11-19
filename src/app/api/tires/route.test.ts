import type { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// A vi.fn that throws/rejects is re-reported by Vitest as an unhandled error even
// when the route catches it, so a swappable plain function (`h.impl`) is used.
// `h.calls` captures the args the route passed to fetchTires.
const h = vi.hoisted(() => ({
  impl: (() => ({ records: [], totalCount: 0 })) as (...a: unknown[]) => unknown,
  calls: [] as unknown[][],
}));

vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/repositories/tiresRepository', () => ({
  fetchTires: (...args: unknown[]) => {
    h.calls.push(args);
    return h.impl(...args);
  },
}));
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

import { GET } from './route';

const req = (url: string) => ({ url }) as unknown as NextRequest;

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
  VaultName: 'Vault-1',
  Local: '0',
  Trash: 'false',
  Amount: 5,
  DOT: '1234', // public since 051
  ModificationDate: '2026-01-01',
  ConditionId: 7,
};

beforeEach(() => {
  h.impl = () => ({ records: [], totalCount: 0 });
  h.calls = [];
});

describe('GET /api/tires', () => {
  it('whitelists records — internal columns never reach the client', async () => {
    h.impl = () => ({ records: [rawRecord], totalCount: 1 });
    const res = await GET(req('http://x/api/tires?page=1&pageSize=10'));
    expect(res.status).toBe(200);
    const body = await res.json();
    const rec = body.records[0];
    expect(rec.TireId).toBe('42');
    expect(rec.Brand).toBe('Michelin');
    for (const leaked of [
      'VaultName',
      'Local',
      'Trash',
      'Amount',
      // DOT is public since 051 (the comparison): on every tire page and the tire.
      'ModificationDate',
      'ConditionId',
    ]) {
      expect(rec).not.toHaveProperty(leaked);
    }
    expect(body.totalCount).toBe(1);
  });

  it('returns a generic 500 (no err.message) on failure', async () => {
    h.impl = () => {
      throw new Error('DB connection=secret failed');
    };
    const res = await GET(req('http://x/api/tires'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toBe('Failed to fetch tires');
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('clamps an oversized pageSize (cap enforced)', async () => {
    await GET(req('http://x/api/tires?page=1&pageSize=9999'));
    // fetchTires(offset, pageSize, filters) — pageSize clamped to <= 100
    const pageSizeArg = h.calls[0][1] as number;
    expect(pageSizeArg).toBeLessThanOrEqual(100);
  });
});
