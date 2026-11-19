'use client';

import { RefObject, useEffect, useState } from 'react';

/**
 * `false` until the element is within `rootMargin` of the viewport, then `true`
 * for good. Used to hold a heavy download — three.js for the tire page's tread
 * viewer, 260 KB gz — until the shopper is about to reach it, instead of
 * spending a phone's bandwidth on it while the page is still loading (056).
 *
 * Fires once and disconnects: once the scene has loaded, scrolling away and
 * back must not unmount it. `true` straight away without IntersectionObserver,
 * so an old browser still gets the viewer.
 */
export function useNearViewport(ref: RefObject<Element | null>, rootMargin = '400px'): boolean {
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    if (!el) return;

    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, near]);

  return near;
}
