/**
 * One request per URL for data several components on a page need (058).
 *
 * The dashboard mounted two filter panels (desktop and phone) and two size
 * pickers, and each asked the server for the same filter options — ranges,
 * brands, stores, tire heights — so opening it doubled that database work. The
 * same hooks run on the storefront's `/tires`.
 *
 * `sharedJson` keeps one in-flight promise per URL and the parsed answer for
 * `ttlMs`, so every caller in that window gets the same response from a single
 * request. A failed request is forgotten at once, so the next caller retries.
 * Module scope: the cache lives as long as the page does (a reload clears it).
 */

const DEFAULT_TTL_MS = 60_000;

type Entry = { promise: Promise<unknown>; expires: number };

const entries = new Map<string, Entry>();

export async function sharedJson<T>(
  url: string,
  { ttlMs = DEFAULT_TTL_MS }: { ttlMs?: number } = {}
): Promise<T> {
  const hit = entries.get(url);
  if (hit && Date.now() < hit.expires) return hit.promise as Promise<T>;

  const promise = fetch(url).then(async res => {
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    return (await res.json()) as T;
  });
  // Until it settles, `expires` is open-ended: concurrent callers share it.
  const entry: Entry = { promise, expires: Number.POSITIVE_INFINITY };
  entries.set(url, entry);

  try {
    const value = await promise;
    entry.expires = Date.now() + ttlMs;
    return value;
  } catch (err) {
    if (entries.get(url) === entry) entries.delete(url);
    throw err;
  }
}

/** Test helper: forget every cached answer. */
export function clearSharedJson() {
  entries.clear();
}
