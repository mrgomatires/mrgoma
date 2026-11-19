import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ALLOWED_IMAGE_HOSTS, isOptimisableImage } from './imageHosts';

/**
 * `next.config.mjs` is loaded before any TypeScript is compiled, so it cannot
 * import this list — the same constraint the canonical host in that file already
 * lives with. The two are therefore written twice, and this holds them together.
 *
 * The cost of drift is not cosmetic. `next/image` **throws during render** for a
 * host it is not configured for, and nothing catches it: `onError` fires when an
 * image fails to load, and an image that throws never loads. A single tire with
 * an eBay-hosted photo was making its own detail page answer **500** and every
 * filtered catalogue view containing it render the loading skeleton forever.
 */
describe('the allowed image hosts are the same in both places', () => {
  it('next.config.mjs lists exactly what imageHosts.ts does', () => {
    const config = readFileSync('next.config.mjs', 'utf8');
    const block = config.match(/remotePatterns: \[([\s\S]*?)\]\.map/);
    expect(block, 'remotePatterns is no longer a literal list — update this guard').toBeTruthy();

    const inConfig = [...block![1].matchAll(/'([^']+)'/g)].map(m => m[1]);
    expect(inConfig).toEqual([...ALLOWED_IMAGE_HOSTS]);
  });
});

describe('isOptimisableImage', () => {
  it('accepts the hosts we proxy', () => {
    expect(isOptimisableImage('https://www.usedtires.online/img/1.webp')).toBe(true);
    expect(isOptimisableImage('https://mrgomatires.com/img/1.webp')).toBe(true);
  });

  it('accepts our own relative paths', () => {
    expect(isOptimisableImage('/images/default-tire.png')).toBe(true);
  });

  /** The actual URL that was taking pages down. */
  it('refuses a host next/image would throw on', () => {
    expect(isOptimisableImage('https://i.ebayimg.com/images/g/BIIAAeSwstBqcNCr/s-l1600.webp')).toBe(
      false
    );
  });

  it('refuses a lookalike host', () => {
    // `usedtires.online` without the `www.` is not configured either.
    expect(isOptimisableImage('https://usedtires.online/img/1.webp')).toBe(false);
    expect(isOptimisableImage('https://evil.com/www.usedtires.online/1.webp')).toBe(false);
    expect(isOptimisableImage('https://www.usedtires.online.evil.com/1.webp')).toBe(false);
  });

  it('refuses http, which next/image is not configured for either', () => {
    expect(isOptimisableImage('http://www.usedtires.online/img/1.webp')).toBe(false);
  });

  it('refuses the empty and the not-really-a-URL', () => {
    for (const bad of ['', 'N/A', 'null', 'undefined', 'not a url', null, undefined]) {
      expect(isOptimisableImage(bad)).toBe(false);
    }
  });
});

/**
 * Three components each had their own answer to "is this URL usable by
 * `next/image`", and **none of them looked at the host** — the one thing that
 * makes the tag throw. `ProductImage` parsed the URL, `ProductCarouselMiniature`
 * checked the prefix, and `ProductImageZoom` did not check at all, which is the
 * one that answered 500.
 */
describe('only one place decides whether an image URL is usable', () => {
  const RENDERERS = [
    'src/app/ui/components/ProductImage/ProductImage.tsx',
    'src/app/ui/components/ProductCarouselMiniature/ProductCarouselMiniature.tsx',
    'src/app/ui/components/ProductImageZoom/ProductImageZoom.tsx',
  ];

  it.each(RENDERERS)('%s asks imageHosts rather than deciding for itself', file => {
    const source = readFileSync(file, 'utf8');
    expect(source).toContain('isOptimisableImage');
    // A locally-defined validator is how the three drifted apart.
    expect(source).not.toMatch(/const is(Valid|Optimisable)\w*\s*=\s*\(/);
  });

  it.each(RENDERERS)('%s falls back to an image we host, and it exists', file => {
    const source = readFileSync(file, 'utf8');
    const fallback = source.match(/'(\/(?:assets\/)?images\/[\w-]+\.(?:png|svg|webp))'/)?.[1];
    expect(fallback).toBeDefined();
    // The path alone is not enough: `/images/default-tire.png` matched it for
    // months and did not exist, so a tire without a photo showed a broken
    // image (052 site review).
    expect(existsSync(join(process.cwd(), 'public', fallback!))).toBe(true);
  });
});
