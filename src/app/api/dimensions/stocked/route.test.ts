import type { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  impl: (() => ['235/45/18', '35/12.50/20']) as () => unknown,
}));

vi.mock('@/repositories/cachedCatalog', () => ({
  getCachedStockedSizes: () => h.impl(),
}));
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

import { GET } from './route';

const req = (url: string) => ({ url }) as unknown as NextRequest;

beforeEach(() => {
  h.impl = () => ['235/45/18', '35/12.50/20'];
});

describe('GET /api/dimensions/stocked (049)', () => {
  it('returns the sizes for sale, cacheable at the edge', async () => {
    const res = await GET(req('http://x/api/dimensions/stocked'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sizes: ['235/45/18', '35/12.50/20'] });
    expect(res.headers.get('Cache-Control')).toBe(
      'public, s-maxage=300, stale-while-revalidate=600'
    );
  });

  it('ignores any query string (no input to abuse)', async () => {
    const res = await GET(req("http://x/api/dimensions/stocked?w=1';DROP&x=" + 'a'.repeat(5000)));
    expect(res.status).toBe(200);
    expect((await res.json()).sizes).toHaveLength(2);
  });

  it('returns a generic 500 (no err.message) on failure', async () => {
    h.impl = () => {
      throw new Error('boom secret');
    };
    const res = await GET(req('http://x/api/dimensions/stocked'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('boom secret');
  });
});
