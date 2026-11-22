import type { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SetUnit } from '@/app/utils/tireSets';

const h = vi.hoisted(() => ({
  records: [] as Record<string, unknown>[],
  pools: {} as Record<string, unknown[]>,
  groupCalls: [] as unknown[],
}));

vi.mock('@/repositories/tiresRepository', () => ({
  fetchTiresByIds: async () => h.records,
}));
vi.mock('@/repositories/tireSetsRepository', async importOriginal => {
  const actual = await importOriginal<typeof import('@/repositories/tireSetsRepository')>();
  return {
    ...actual,
    getCachedSetCandidates: async (g: { model2: string }) => {
      h.groupCalls.push(g);
      return h.pools[g.model2] ?? [];
    },
  };
});
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

import { GET } from './route';

const req = (q: string) => ({ url: `http://x/api/tires/sets${q}` }) as unknown as NextRequest;

const record = (id: string, model: string, over: Record<string, unknown> = {}) => ({
  TireId: id,
  Code: `C${id}`,
  Brand: 'PIRELLI',
  Model2: model,
  RealSize: '235/45/18',
  Price: '100',
  Tread: '8.0',
  RemainingLife: '80%',
  Patched: '0',
  ProductTypeId: 2,
  KindSaleId: 2,
  Condition: 'available',
  VaultName: 'SECRET VAULT',
  Location: 'A1',
  ...over,
});

const unit = (id: string, over: Partial<SetUnit> = {}): SetUnit => ({
  id,
  price: 100,
  tread: 8,
  patched: false,
  condition: 'Used',
  city: 'Miami',
  ...over,
});

beforeEach(() => {
  h.groupCalls = [];
  h.records = [record('1', 'P ZERO'), record('2', 'P ZERO'), record('3', 'CINTURATO')];
  h.pools = {
    // Four of P ZERO (the two cards included): a set of 4 for each.
    'P ZERO': [unit('1'), unit('2'), unit('10', { price: 80 }), unit('11', { price: 90 })],
    // CINTURATO: only one other, so a set of 2.
    CINTURATO: [unit('3'), unit('30', { price: 70 })],
  };
});

describe('GET /api/tires/sets (054)', () => {
  it('offers a set of 4, else of 2, per card, with public fields only (AC1)', async () => {
    const res = await GET(req('?ids=1,2,3'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.offers['1']).toEqual({ size: 4, total: 370, ids: ['1', '10', '11', '2'] });
    expect(body.offers['3']).toEqual({ size: 2, total: 170, ids: ['3', '30'] });
    expect(JSON.stringify(body)).not.toMatch(/VAULT|Location|A1/);
    expect(res.headers.get('Cache-Control')).toMatch(/s-maxage=60/);
  });

  it('fetches each set group once', async () => {
    await GET(req('?ids=1,2,3'));
    expect(h.groupCalls).toHaveLength(2);
  });

  it('offers nothing for a tire with no set or no group', async () => {
    h.records = [record('5', 'LONELY'), record('6', '')];
    const body = await (await GET(req('?ids=5,6'))).json();
    expect(body.offers).toEqual({});
  });

  it.each([
    '',
    '?ids=',
    '?ids=abc',
    '?ids=1;DROP',
    `?ids=${Array.from({ length: 25 }, (_, i) => i + 1).join(',')}`,
  ])('answers 400 to %s', async q => {
    expect((await GET(req(q))).status).toBe(400);
  });

  it('never offers a sold tire', async () => {
    h.records = [record('1', 'P ZERO', { Condition: 'sold' })];
    const body = await (await GET(req('?ids=1'))).json();
    expect(body.offers).toEqual({});
  });
});

describe('a cancelled request stops querying (061)', () => {
  const aborted = (q: string, abortAfterGroups?: number) => {
    const controller = new AbortController();
    if (abortAfterGroups === 0) controller.abort();
    return {
      controller,
      request: {
        url: `http://x/api/tires/sets${q}`,
        signal: controller.signal,
      } as unknown as NextRequest,
    };
  };

  beforeEach(() => {
    h.groupCalls = [];
    h.pools = {};
  });

  it('reads no set groups once the buyer has moved on', async () => {
    h.records = [record('1', 'P ZERO'), record('2', 'CINTURATO'), record('3', 'SCORPION')];
    const { request } = aborted('?ids=1,2,3', 0);
    const res = await GET(request);
    expect(res.status).toBe(499);
    expect(h.groupCalls).toEqual([]);
  });

  it('answers normally when not cancelled', async () => {
    h.records = [record('1', 'P ZERO'), record('2', 'CINTURATO')];
    const { request } = aborted('?ids=1,2');
    const res = await GET(request);
    expect(res.status).toBe(200);
    expect(h.groupCalls).toHaveLength(2);
  });
});
