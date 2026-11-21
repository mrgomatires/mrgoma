import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const PAGE = readFileSync('src/app/(shop)/tires/page.tsx', 'utf8');
const RESULTS = readFileSync('src/app/(shop)/tires/container/SearchResults.tsx', 'utf8');
const DASHBOARD = readFileSync('src/app/(sellers)/dashboard/container/Dashboard.tsx', 'utf8');

describe('the counts are never baked at build time', () => {
  /**
   * The sellable total moved by eight tires during one working session. A facet
   * promising stock the catalogue no longer has is worse than no facet.
   *
   * Reading `searchParams` already makes a route dynamic — but bare `/tires`,
   * with no parameters, is exactly the page a build can prerender, and it is the
   * one whose counts matter most. Its three siblings all declare
   * `revalidate = 3600`, so this must be stated rather than inferred.
   */
  it('/tires declares itself dynamic', () => {
    expect(PAGE).toMatch(/export const dynamic = 'force-dynamic'/);
  });

  it('and caches nothing on the facet path', () => {
    expect(PAGE).not.toContain('unstable_cache');
    expect(PAGE).not.toMatch(/export const revalidate/);
  });
});

describe('the rail sticks', () => {
  /**
   * `self-start` is load-bearing and its absence is invisible: a grid item
   * stretches to the row height by default, so `sticky` has nothing to move
   * within and silently does nothing. Nothing throws, nothing looks broken in a
   * screenshot — the rail just scrolls away.
   */
  it('the sticky rail is also self-start', () => {
    const aside = PAGE.match(/<aside[\s\S]*?>/)?.[0] ?? '';
    expect(aside).toContain('lg:sticky');
    expect(aside).toContain('lg:self-start');
  });

  it('and clears the site header, which is itself sticky at top-14', () => {
    const aside = PAGE.match(/<aside[\s\S]*?>/)?.[0] ?? '';
    expect(aside).toMatch(/lg:top-(2[0-9]|[3-9][0-9])/);
  });

  it('scrolls inside itself rather than clipping its last group', () => {
    const aside = PAGE.match(/<aside[\s\S]*?>/)?.[0] ?? '';
    expect(aside).toContain('lg:overflow-y-auto');
    expect(aside).toContain('lg:max-h-');
  });
});

describe('filtering is navigation, not client state', () => {
  /**
   * FR8: a filter must work with JavaScript disabled or still downloading. That
   * holds only while the page renders its results on the server and the rail
   * renders links — so `/tires` must not go back to fetching its filters in the
   * browser.
   */
  it('the page reads the filters on the server', () => {
    expect(PAGE).toContain('buildTireFilters(params)');
    expect(PAGE).toContain('fetchFacetsForRequest');
    expect(PAGE).not.toContain("'use client'");
  });

  it('the rail is rendered by the server component, not by the client one', () => {
    expect(PAGE).toContain('<FilterRail');
    expect(RESULTS).not.toContain('FilterRail');
  });

  it('the results no longer carry the filter bars', () => {
    for (const gone of ['TopFilters', 'FiltersMobile', 'BrowseFilters']) {
      expect(RESULTS).not.toContain(gone);
    }
  });
});

describe('the brand pages keep their inbound links', () => {
  /**
   * `/tires` no longer carries a brand index — it was a wall of 115 links at the
   * foot of the page and the owner cut it.
   *
   * Measured before removing it: the brand pages are linked from the **sitemap**
   * (all 115) and from the browse strip on `/tires/new`, `/tires/used` and every
   * brand page (115 links each). They are not orphaned by this; `/tires` is one
   * of four routes that linked them.
   */
  it('the browse strip that links them is still on the three landing pages', () => {
    for (const file of [
      'src/app/(shop)/tires/new/page.tsx',
      'src/app/(shop)/tires/used/page.tsx',
      'src/app/(shop)/tires/brands/[brand]/page.tsx',
    ]) {
      expect(readFileSync(file, 'utf8')).toContain('BrowseFilters');
    }
  });
});

describe('the shared filter machinery is left alone', () => {
  /**
   * `TopFilters`, `useFilters`, `FilterBody` and `FiltersMobile` are also the
   * dashboard's filters and the home page's "More filters". This feature stops
   * `/tires` using them; it must not remove them.
   */
  it('the dashboard still renders TopFilters', () => {
    expect(DASHBOARD).toContain('TopFilters');
  });

  it('and the components still exist', () => {
    for (const file of [
      'src/app/ui/sections/TopFilters/TopFilters.tsx',
      'src/app/ui/sections/FiltersMobile/FiltersMobile.tsx',
      'src/app/ui/sections/FiltersMobile/hooks/useFilters.tsx',
      'src/app/ui/sections/FilterBody/FilterBody.tsx',
    ]) {
      expect(() => readFileSync(file, 'utf8')).not.toThrow();
    }
  });

  /**
   * The brand carousel is removed from `/tires` only. On the three landing pages
   * it is not a filter — they fetch a fixed list and offer no filtering at all,
   * so it is the only navigation they have.
   */
  it('the landing pages keep their browse strip', () => {
    for (const file of [
      'src/app/(shop)/tires/new/page.tsx',
      'src/app/(shop)/tires/used/page.tsx',
      'src/app/(shop)/tires/brands/[brand]/page.tsx',
    ]) {
      expect(readFileSync(file, 'utf8')).toContain('BrowseFilters');
    }
  });
});

describe('a list beside the rail takes the column (059)', () => {
  /**
   * `/tires/used` gained the filter rail in 052 but kept `TireGrid`'s centred
   * 768 px list, so its cards were 720 px wide against 944 px on `/tires`.
   */
  it('/tires/used passes besideRail to its TireGrid', () => {
    const USED = readFileSync('src/app/(shop)/tires/used/page.tsx', 'utf8');
    expect(USED).toMatch(/<TireGrid[^>]*\bbesideRail\b/);
  });
});
