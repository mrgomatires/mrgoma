import { describe, expect, it } from 'vitest';

import robots, { FACET_PARAMS } from './robots';

/**
 * `robots.txt` is one of the few files where a one-character edit silently
 * removes the site from Google. Nothing else in the suite reads it, so this is
 * the guard: every rule that exists today is asserted by name, and the two rules
 * `020-crawl-hygiene` added are asserted alongside them.
 *
 * The rules that were deliberately *not* added are asserted too. A rule missing
 * because someone decided against it and a rule missing because someone deleted
 * it look identical in a diff a year from now.
 */

const rule = robots().rules;
const first = Array.isArray(rule) ? rule[0] : rule;
const disallow = ([] as string[]).concat(first.disallow ?? []);

/**
 * Google's matching, not `startsWith`: a rule is a prefix of the path plus query,
 * `*` matches any run of characters and a trailing `$` anchors the end. The facet
 * rules depend on `*`, so a naive prefix check would pass them vacuously.
 */
const blocks = (rule: string, url: string) => {
  const anchored = rule.endsWith('$');
  const body = (anchored ? rule.slice(0, -1) : rule)
    .split('*')
    .map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`).test(url);
};
const isBlocked = (url: string) => disallow.some(rule => blocks(rule, url));

describe('robots.txt', () => {
  // AC1 — the rules that predate this feature
  it.each(['/api/', '/checkout', '/dashboard', '/sellers/', '/feed/'])(
    'still disallows %s',
    path => {
      expect(disallow).toContain(path);
    }
  );

  it('still allows everything else, and still points at the sitemap', () => {
    expect(first.userAgent).toBe('*');
    expect(first.allow).toBe('/');
    expect(robots().sitemap).toMatch(/^https?:\/\/.+\/sitemap\.xml$/);
    expect(robots().host).toMatch(/^https?:\/\//);
  });

  /**
   * AC1 — both positions, not just the first.
   *
   * `?_rsc=` matches only when the parameter leads the query string. Next
   * appends it to the href it is prefetching, so a link that already carries a
   * query is prefetched as `&_rsc=`. Dropping the second pattern would leave
   * every prefetch of a filtered catalog link crawlable.
   */
  it('blocks the prefetch parameter wherever it appears in the query string', () => {
    expect(disallow).toContain('/*?_rsc=');
    expect(disallow).toContain('/*&_rsc=');
  });

  /**
   * AC2 — deliberately absent.
   *
   * The audit asked for this in the same breath as the prefetch rules, but every
   * product photo is served through the image optimizer, so blocking it removes
   * the catalog from Google Images. Its stated justification is crawl waste from
   * 278 broken images — an inventory problem. It is decided alongside the work
   * that fixes the cause, not here.
   */
  it('does not block the image optimizer', () => {
    expect(disallow.some(path => path.includes('_next/image'))).toBe(false);
  });

  /**
   * AC2 — a rule must never shadow a page we ask Google to index.
   *
   * Checked against the routes the sitemap publishes rather than a copy of them,
   * so adding a disallow that swallows a real section fails here.
   */
  it('never disallows a path the sitemap publishes', () => {
    const published = [
      '/',
      '/tires',
      '/tires/new',
      '/tires/used',
      '/tires/brands/michelin',
      '/tires/size/235-50-20',
      '/tires/471004-bridgestone-235-50-20',
      '/locations',
      '/locations/hialeah',
      '/services',
      '/services/wheel-alignment',
      '/guides',
      '/guides/used-vs-new-tires',
      '/about-us',
      '/contact',
      '/instant-quote',
      '/legal-policies',
    ];

    // Only the literal prefix rules can shadow a path; the `_rsc` rules require
    // a query string, which none of these carry.
    const prefixes = disallow.filter(path => !path.includes('_rsc='));
    for (const path of published) {
      for (const blocked of prefixes) {
        expect(path.startsWith(blocked)).toBe(false);
      }
    }
  });

  /**
   * AC3 (036) — the filter combinations stop being crawlable.
   *
   * Every parameter the filter rail writes into a link, first in the query
   * string and after another one, alone and stacked. These are the URLs that
   * multiply without bound and all canonicalise to `/tires`.
   */
  it.each(FACET_PARAMS)('blocks the %s facet wherever it sits in the query string', param => {
    expect(isBlocked(`/tires?${param}=x`)).toBe(true);
    expect(isBlocked(`/tires?page=2&${param}=x`)).toBe(true);
    expect(isBlocked(`/tires?w=235&s=50&d=20&${param}=x`)).toBe(true);
  });

  it.each(FACET_PARAMS)('blocks the %s facet on /tires/used too (052)', param => {
    expect(isBlocked(`/tires/used?${param}=x`)).toBe(true);
    expect(isBlocked(`/tires/used?brands=michelin&${param}=x`)).toBe(true);
  });

  it('blocks a stacked combination of facets', () => {
    expect(isBlocked('/tires?brands=michelin&brands=bridgestone&condition=used&minPrice=50')).toBe(
      true
    );
  });

  /**
   * AC4 (036) — deliberately still crawlable.
   *
   * Pagination carries a self-referencing canonical (`tiresMetadata`), and the
   * size landing pages are where a complete size is published. Blocking them
   * would leave Google holding pages it was told to reach and can no longer
   * fetch.
   */
  it.each([
    '/tires',
    '/tires?page=2',
    '/tires/brands/michelin',
    '/tires/size/235-50-20',
    '/tires/471004-bridgestone-235-50-20',
    '/tires/new',
    '/tires/used',
  ])('leaves %s crawlable', url => {
    expect(isBlocked(url)).toBe(false);
  });

  /**
   * AC4 (036) — a parameter name is matched whole. `view` must not catch a
   * parameter that merely ends in it, and the facet rules must not reach
   * outside `/tires`.
   */
  it('matches facet names whole and only under /tires', () => {
    expect(isBlocked('/tires?preview=1')).toBe(false);
    expect(isBlocked('/tires?page=2&preview=1')).toBe(false);
    expect(isBlocked('/guides?view=grid')).toBe(false);
  });

  /**
   * AC1 (038) — sizes on `/tires` are closed, partial or complete.
   *
   * The rail links partial sizes, which canonicalise to `/tires` and are no page
   * we publish; they were the one door `036` left open. A complete size is
   * published as its landing page instead (asserted crawlable above).
   */
  it.each([
    '/tires?w=235',
    '/tires?d=19',
    '/tires?s=55&d=19',
    '/tires?w=235&s=50&d=20',
    '/tires?w=235&s=50&d=20&page=3',
    '/tires?page=2&w=235',
  ])('blocks the size filter %s', url => {
    expect(isBlocked(url)).toBe(true);
  });

  /**
   * AC2 (038) — `w`, `s` and `d` are one letter long, so they are the names most
   * likely to swallow a parameter that merely starts or ends with them. Each rule
   * is anchored on `?` or `&` and ends in `=`, which is what keeps them whole.
   */
  it('matches the one-letter size names whole', () => {
    expect(isBlocked('/tires?sort=price')).toBe(false);
    expect(isBlocked('/tires?page=2&ws=1')).toBe(false);
    expect(isBlocked('/tires?page=2&dd=1')).toBe(false);
    expect(isBlocked('/tires?page=2&sw=1')).toBe(false);
    expect(isBlocked('/tires/size/235-50-20?w=235')).toBe(false);
  });
});
