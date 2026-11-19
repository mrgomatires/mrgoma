import type { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  impl: (() => []) as (ids: string[]) => unknown,
  calls: [] as string[][],
}));

vi.mock('@/repositories/tiresRepository', () => ({
  fetchTiresByIds: (ids: string[]) => {
    h.calls.push(ids);
    return h.impl(ids);
  },
}));
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

import { GET } from './route';

const req = (q: string) => ({ url: `http://x/api/tires/compare${q}` }) as unknown as NextRequest;

beforeEach(() => {
  h.calls = [];
  h.impl = () => [
    {
      TireId: '1',
      Price: '120',
      Condition: 'available',
      Trash: 'false',
      VaultName: 'V1',
      Location: 'A1',
    },
    { TireId: '2', Price: '90', Condition: 'sold', Trash: 'true' },
    { TireId: '3', Price: '80', Condition: 'available', Trash: 'true' },
  ];
});

describe('GET /api/tires/compare (051)', () => {
  it('answers availability and price only, in the order asked (AC12, AC9)', async () => {
    const res = await GET(req('?ids=3,1,2'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = await res.json();
    expect(body).toEqual({
      tires: [
        { id: '3', available: false, price: 80 }, // trashed without selling: removed
        { id: '1', available: true, price: 120 },
        { id: '2', available: false, price: 90 }, // sold
      ],
    });
    expect(JSON.stringify(body)).not.toMatch(/V1|A1|Vault|Location/);
    expect(h.calls).toEqual([['3', '1', '2']]);
  });

  it('reports an unknown id as unavailable', async () => {
    const body = await (await GET(req('?ids=9'))).json();
    expect(body.tires).toEqual([{ id: '9', available: false, price: null }]);
  });

  it.each(['', '?ids=', '?ids=1,2,3,4', "?ids=1';DROP", '?ids=abc', `?ids=${'9'.repeat(11)}`])(
    'rejects %j without touching the database',
    async q => {
      const res = await GET(req(q));
      expect(res.status).toBe(400);
      expect(h.calls).toEqual([]);
    }
  );

  it('returns a generic 500 on failure', async () => {
    h.impl = () => {
      throw new Error('db secret');
    };
    const res = await GET(req('?ids=1'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('db secret');
  });
});
