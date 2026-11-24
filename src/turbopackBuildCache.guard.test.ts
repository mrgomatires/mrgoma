import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import nextConfig from '../next.config.mjs';

/**
 * Turbopack's build cache stays off (062).
 *
 * On 22 Nov 2026 the production deploy of 69a02f5 restored the build cache of
 * the previous release (048) and shipped new JavaScript with the old
 * `globals.css`: the comparison window had no styles and nothing warned. Next
 * 16.3 turns this cache on by default, and it lives in `.next/cache`, the
 * folder Vercel restores before every build.
 *
 * The last two checks fail on a Next upgrade that renames or drops the option,
 * so it can't quietly stop doing anything. See
 * spec/features/062-turbopack-build-cache-off/.
 */
const WHY =
  '062: Turbopack build cache must stay off — on 22 Nov 2026 a cached Vercel build shipped a stale globals.css';

const experimental = (nextConfig.experimental ?? {}) as Record<string, unknown>;

const nextFile = (path: string) => readFileSync(`node_modules/next/dist/${path}`, 'utf8');

describe('Turbopack build cache (062)', () => {
  it('is off for builds', () => {
    expect(experimental.turbopackFileSystemCacheForBuild, WHY).toBe(false);
  });

  it('stays on for `next dev`, which was not involved', () => {
    expect(experimental.turbopackFileSystemCacheForDev, WHY).not.toBe(false);
  });

  it('is still an option this Next version validates', () => {
    expect(nextFile('server/config-schema.js'), WHY).toMatch(
      /turbopackFileSystemCacheForBuild:\s*_zod\.z\.boolean\(\)/
    );
  });

  it('is still what this Next version reads to cache a build', () => {
    expect(nextFile('build/turbopack-build/impl.js'), WHY).toMatch(
      /persistentCaching = .*turbopackFileSystemCacheForBuild/
    );
  });
});
