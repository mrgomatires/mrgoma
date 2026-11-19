import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  chunksOf,
  evaluateBudget,
  findForbidden,
  measureShopperPages,
} from '../scripts/perf-budget.mjs';

// Budget shape mirrors perf-budget.json (limits in KB).
const budget = {
  sharedFirstLoadJs: { limitKB: 180 },
  totalClientJs: { limitKB: 680 },
};

const KB = 1024;

describe('evaluateBudget (perf budget guard)', () => {
  it('passes when every metric is within budget', () => {
    const measured = { sharedFirstLoadJs: 160 * KB, totalClientJs: 600 * KB };
    const { pass, results } = evaluateBudget(measured, budget);
    expect(pass).toBe(true);
    expect(results.every(r => r.ok)).toBe(true);
  });

  it('fails and flags the offending metric when one is over budget', () => {
    const measured = { sharedFirstLoadJs: 200 * KB, totalClientJs: 600 * KB };
    const { pass, results } = evaluateBudget(measured, budget);
    expect(pass).toBe(false);
    expect(results.find(r => r.key === 'sharedFirstLoadJs')?.ok).toBe(false);
    expect(results.find(r => r.key === 'totalClientJs')?.ok).toBe(true);
  });

  it('treats a value exactly at the limit as within budget', () => {
    const measured = { sharedFirstLoadJs: 180 * KB, totalClientJs: 680 * KB };
    expect(evaluateBudget(measured, budget).pass).toBe(true);
  });

  it('ignores non-limit keys such as $comment', () => {
    const withComment = { $comment: 'note', ...budget };
    const measured = { sharedFirstLoadJs: 1, totalClientJs: 1 };
    const { results } = evaluateBudget(measured, withComment);
    expect(results.map(r => r.key)).toEqual(['sharedFirstLoadJs', 'totalClientJs']);
  });
});

/**
 * 056: the sellers' login form (zod + react-hook-form) and session provider
 * (next-auth's client) shipped to every shopper — 145 KB gz — because they
 * sat in the components barrel and the root layout.
 */
describe('seller-only code stays out of shopper pages', () => {
  it('reads the chunks a page links from its HTML', () => {
    const html =
      '<script src="/_next/static/chunks/a1.js"></script><link href="/_next/static/chunks/b.css">' +
      '<script src="/_next/static/chunks/a1.js"></script><script src="/_next/static/chunks/c-2.js">';
    expect(chunksOf(html)).toEqual(['static/chunks/a1.js', 'static/chunks/c-2.js']);
  });

  it('names each seller-only library a chunk contains', () => {
    expect(findForbidden('class ZodError{};o.shouldUnregister')).toEqual([
      'zod',
      'react-hook-form',
    ]);
    expect(findForbidden('window.__NEXTAUTH={}')).toEqual(['next-auth client']);
    expect(findForbidden('export const cart = []')).toEqual([]);
  });

  const fixture = (chunks: Record<string, string>, pages: Record<string, string[]>) => {
    const dir = mkdtempSync(join(tmpdir(), 'perf-budget-'));
    mkdirSync(join(dir, 'static', 'chunks'), { recursive: true });
    mkdirSync(join(dir, 'server', 'app'), { recursive: true });
    for (const [name, src] of Object.entries(chunks)) {
      writeFileSync(join(dir, 'static', 'chunks', name), src);
    }
    for (const [page, linked] of Object.entries(pages)) {
      writeFileSync(
        join(dir, 'server', 'app', `${page}.html`),
        linked.map(c => `<script src="/_next/static/chunks/${c}"></script>`).join('')
      );
    }
    return dir;
  };

  it('reports a leak with its page and chunk, and the heaviest page', () => {
    const dir = fixture(
      { 'clean.js': 'x'.repeat(5000), 'dirty.js': 'class ZodError{}' },
      { 'about-us': ['clean.js'], contact: ['clean.js', 'dirty.js'] }
    );
    const { shopperPageJs, leaks } = measureShopperPages(dir, ['about-us', 'contact']);
    expect(leaks).toEqual([{ page: 'contact', chunk: 'static/chunks/dirty.js', name: 'zod' }]);
    const aboutOnly = measureShopperPages(dir, ['about-us']).shopperPageJs;
    expect(shopperPageJs).toBeGreaterThan(aboutOnly);
  });

  it('fails rather than measuring nothing when a page is not prerendered', () => {
    const dir = fixture({}, {});
    expect(() => measureShopperPages(dir, ['about-us'])).toThrow(/missing/);
  });
});
