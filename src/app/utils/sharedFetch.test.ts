import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearSharedJson, sharedJson } from './sharedFetch';

const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clearSharedJson();
  fetchMock = vi.fn(() => ok(['MICHELIN']));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('sharedJson (058)', () => {
  it('two callers at once share one request', async () => {
    const [a, b] = await Promise.all([sharedJson('/api/x'), sharedJson('/api/x')]);
    expect(a).toEqual(['MICHELIN']);
    expect(b).toEqual(['MICHELIN']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a later caller within the window reuses the answer', async () => {
    await sharedJson('/api/x');
    await sharedJson('/api/x');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('asks again once the window has passed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await sharedJson('/api/x', { ttlMs: 1000 });
    vi.setSystemTime(Date.now() + 1001);
    await sharedJson('/api/x', { ttlMs: 1000 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keys by the full URL', async () => {
    await sharedJson('/api/brands?w=225');
    await sharedJson('/api/brands?w=235');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not keep a failure: the next caller retries', async () => {
    fetchMock.mockImplementationOnce(() => Promise.resolve(new Response('', { status: 500 })));
    await expect(sharedJson('/api/x')).rejects.toThrow(/500/);
    await expect(sharedJson('/api/x')).resolves.toEqual(['MICHELIN']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
