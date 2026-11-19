import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * The detail gallery felt slow, and the two causes were both about *when*
 * something is fetched rather than how fast the server is. The optimizer answers
 * in 0.23–0.78 s cold and ~1 ms warm; measured on a fully cached page, the
 * magnifier still took **1.754 ms** to appear and switching a photo left the
 * frame **blank from 970 ms onwards**.
 *
 * Asserted against the source because these are declarations, not behaviour a
 * jsdom test can observe: jsdom loads no images, so a rendering test would pass
 * whatever the attributes said.
 */

const ZOOM = readFileSync('src/app/ui/components/ProductImageZoom/ProductImageZoom.tsx', 'utf8');
const CAROUSEL = readFileSync('src/app/ui/sections/ProductCarousel/ProductCarousel.tsx', 'utf8');
const THUMB = readFileSync(
  'src/app/ui/components/ProductCarouselMiniature/ProductCarouselMiniature.tsx',
  'utf8'
);

describe('every photo is mounted, not swapped in', () => {
  it('the viewer takes the whole gallery', () => {
    expect(ZOOM).toContain('images: ZoomImage[]');
    expect(CAROUSEL).toContain('images={zoomImages}');
    // A single `src` is what made the frame go blank while a photo downloaded.
    expect(CAROUSEL).not.toMatch(/<ProductImageZoom[\s\S]{0,120}src=\{current\.src\}/);
  });

  it('and the ones behind are fetched rather than deferred', () => {
    // Left to `lazy` they stayed unrequested — measured 1 of 4 loaded — so a
    // click still waited on the network even with them mounted.
    // Every photo is eager; the ones behind at `low` priority, and the one on
    // screen at `high` when it is the page's LCP (055: Next 16's `priority`
    // only preloads, without the hint).
    expect(ZOOM).toContain('loading="eager"');
    expect(ZOOM).toContain("fetchPriority={isActive ? (priority ? 'high' : undefined) : 'low'}");
  });
});

describe('the magnifier is ready before the pointer arrives', () => {
  it('mounts on idle, not on the first mouse move', () => {
    expect(ZOOM).toContain('requestIdleCallback');
    expect(ZOOM).toContain('zoomPrefetched');
  });

  it('only where there is a pointer to hover with', () => {
    expect(ZOOM).toMatch(/if \(!enabled \|\| !canHover\) return;/);
  });

  it('and not on a metered or slow connection', () => {
    expect(ZOOM).toContain('saveData');
    expect(ZOOM).toMatch(/effectiveType/);
  });

  /**
   * `visibility: hidden` looked equivalent and was not: **Chrome does not
   * download images inside a hidden subtree**, so mounting early fetched
   * nothing and the wait was unchanged.
   */
  it('stays transparent rather than hidden, or it would not download', () => {
    expect(ZOOM).toContain('opacity: lens ? 1 : 0');
    expect(ZOOM).not.toMatch(/visibility: lens \?/);
  });

  /**
   * The lens used the original file: 1600×1200, 283 KB of JPEG, against a 90 KB
   * optimized variant carrying the same pixels.
   */
  it('reads the optimized variant, not the original file', () => {
    // Nowhere in this component: the lens and the full-screen view both used the
    // raw file, and both are 1600 px at source either way.
    expect(ZOOM).not.toMatch(/<img\s/);
    expect(ZOOM.match(/<Image/g) ?? []).toHaveLength(4);
  });
});

describe('thumbnails', () => {
  it('load eagerly, since they sit beside the photo they belong to', () => {
    expect(THUMB).toContain("loading={eager ? 'eager' : 'lazy'}");
    expect(CAROUSEL).toContain('eager');
  });
});

/**
 * The touch path, reported from a real phone after the desktop fix shipped:
 *
 * > *"When I tap an image it takes a couple of seconds to show. Then it works
 * > and I can zoom with the next tap — but that first tap feels slow."*
 *
 * The pre-fetch above is gated on a pointer that can hover, so a phone reaches
 * the full-screen view with the large variant not downloaded and waits for it on
 * a black screen. The desktop fix had quietly covered desktop's full-screen view
 * too — the lens and the dialog share a URL — and left mobile with the same
 * problem in a different place.
 */
describe('the full-screen view opens with something on it', () => {
  it('shows the copy the page already has, underneath the sharp one', () => {
    const from = ZOOM.indexOf('className="z-0 object-contain"');
    expect(from, 'the placeholder layer is gone').toBeGreaterThan(-1);
    const placeholder = ZOOM.slice(ZOOM.lastIndexOf('<Image', from), from);
    // Same `sizes` as the main photo: that is what makes it the same request,
    // already in the browser. A different one would download again.
    expect(placeholder).toContain('sizes={sizes}');
    expect(placeholder).toContain('fill');
  });

  /**
   * An absolutely positioned sibling paints above an in-flow one, so without the
   * explicit order the low-res copy would sit on top of the sharp one for good.
   */
  it('with the sharp copy explicitly above it', () => {
    expect(ZOOM).toContain('className="z-0 object-contain"');
    expect(ZOOM).toContain('relative z-10 block select-none');
  });

  /**
   * **No state tracks whether the sharp copy has arrived**, and that is the
   * point. Doing so meant relying on `onLoad`, which never fires for an image
   * the browser already has: the sharp copy stayed invisible above a placeholder
   * that had been removed and the view opened **empty**. A ref checking
   * `complete` on mount missed it too — the element exists before the decode
   * does. Then removing the placeholder mid-fade left 200 ms with nothing fully
   * opaque, reported from a phone as a flicker.
   *
   * An `<img>` with no pixels is transparent. Two layers and no flag: the one
   * underneath shows until the one above has something to paint.
   */
  it('and no flag, no onLoad, no fade — three bugs came from tracking it', () => {
    // Scoped to the dialog, and to code rather than the comment explaining it:
    // the stacked gallery photos above do crossfade, on purpose.
    const code = ZOOM.slice(ZOOM.indexOf('className="z-0 object-contain"'))
      .split('\n')
      .filter(line => !/^\s*(\*|\/\/|\{?\/\*)/.test(line))
      .join('\n');

    expect(ZOOM).not.toContain('sharpReady');
    expect(code).not.toContain('onLoad');
    expect(code).not.toContain('transition-opacity');
  });
});
