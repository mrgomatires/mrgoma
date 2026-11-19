import { describe, expect, it } from 'vitest';

import { failingAudits, unexcused } from '../scripts/a11y-check.mjs';
import { pickPages } from '../scripts/lab.mjs';
import { median, summarise } from '../scripts/perf-lab.mjs';

/** The pure parts of `npm run a11y` and `npm run perf:lab` (feature 055). */

describe('pickPages', () => {
  it('takes real paths from the sitemap, so no sold-out tire is hard-coded', () => {
    const xml = [
      '/',
      '/tires/123-michelin-225-45-17',
      '/locations/cutler-bay',
      '/services/oil-change',
      '/tires/size/235-45-18',
      '/tires/brands/michelin',
    ]
      .map(p => `<url><loc>https://www.example.com${p}</loc></url>`)
      .join('');
    const pages = pickPages(xml);
    expect(pages.tire).toBe('/tires/123-michelin-225-45-17');
    expect(pages.store).toBe('/locations/cutler-bay');
    expect(pages.size).toBe('/tires/size/235-45-18');
    expect(pages.brand).toBe('/tires/brands/michelin');
    expect(pages.checkout).toBe('/checkout');
  });
});

describe('the accessibility gate', () => {
  const lhr = {
    categories: {
      accessibility: {
        auditRefs: [{ id: 'color-contrast' }, { id: 'image-alt' }, { id: 'manual' }],
      },
    },
    audits: {
      'color-contrast': {
        id: 'color-contrast',
        title: 'Contrast',
        score: 0,
        scoreDisplayMode: 'binary',
        details: { items: [{ node: { snippet: '<p class="text-gray-500">' } }] },
      },
      'image-alt': { id: 'image-alt', title: 'Alt', score: 1, scoreDisplayMode: 'binary' },
      manual: { id: 'manual', title: 'Manual', score: null, scoreDisplayMode: 'manual' },
    },
  };

  it('reports failing audits only, with a snippet', () => {
    const f = failingAudits(lhr);
    expect(f.map((x: { id: string }) => x.id)).toEqual(['color-contrast']);
    expect(f[0].items[0]).toContain('text-gray-500');
  });

  it('lets an allow-list entry excuse an audit on a page or everywhere, nothing else', () => {
    const f = failingAudits(lhr);
    expect(unexcused(f, 'store', [])).toHaveLength(1);
    expect(
      unexcused(f, 'store', [{ audit: 'color-contrast', page: 'store', reason: 'x' }])
    ).toHaveLength(0);
    expect(
      unexcused(f, 'home', [{ audit: 'color-contrast', page: 'store', reason: 'x' }])
    ).toHaveLength(1);
    expect(
      unexcused(f, 'home', [{ audit: 'color-contrast', page: '*', reason: 'x' }])
    ).toHaveLength(0);
  });
});

describe('the performance lab', () => {
  it('takes medians, ignoring missing values', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([null, 5])).toBe(5);
    expect(median([])).toBeNull();
  });

  it('summarises a report with its explanations', () => {
    const s = summarise({
      categories: { performance: { score: 0.81 } },
      audits: {
        'largest-contentful-paint': { numericValue: 5100 },
        'total-blocking-time': { numericValue: 120 },
        'cumulative-layout-shift': { numericValue: 0.02 },
        'first-contentful-paint': { numericValue: 1400 },
        'server-response-time': { numericValue: 200 },
        'largest-contentful-paint-element': {
          details: { items: [{ items: [{ node: { snippet: '<img alt="hero">' } }] }] },
        },
        'long-tasks': {
          details: { items: [{ url: 'http://localhost:3100/_next/a.js', duration: 300.4 }] },
        },
      },
    });
    expect(s).toMatchObject({ lcp: 5100, tbt: 120, score: 81, lcpElement: '<img alt="hero">' });
    expect(s.longTasks[0]).toEqual({ url: '/_next/a.js', ms: 300 });
  });
});
