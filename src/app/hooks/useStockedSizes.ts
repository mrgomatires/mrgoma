'use client';

import { useEffect, useState } from 'react';

import { buildSizeTree, type SizeTree } from '@/app/utils/sizeTree';

/**
 * The size picker's tree, fetched once per page load (feature 049).
 *
 * Every picker on a page (the home hero and its 3D preview, for one) shares a
 * single request: the promise lives at module level. A failed request is
 * forgotten so the next mount can retry.
 */
let pending: Promise<SizeTree> | null = null;

function loadTree(): Promise<SizeTree> {
  if (!pending) {
    pending = fetch('/api/dimensions/stocked')
      .then(res => {
        if (!res.ok) throw new Error(`stocked sizes: ${res.status}`);
        return res.json() as Promise<{ sizes: string[] }>;
      })
      .then(body => buildSizeTree(Array.isArray(body.sizes) ? body.sizes : []))
      .catch(err => {
        pending = null;
        throw err;
      });
  }
  return pending;
}

/** Test seam: forget the cached request. */
export function resetStockedSizesCache() {
  pending = null;
}

export function useStockedSizes(): {
  tree: SizeTree | null;
  isLoading: boolean;
  error: boolean;
} {
  const [tree, setTree] = useState<SizeTree | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    loadTree().then(
      t => alive && setTree(t),
      () => alive && setError(true)
    );
    return () => {
      alive = false;
    };
  }, []);

  return { tree, isLoading: !tree && !error, error };
}
