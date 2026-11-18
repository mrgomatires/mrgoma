import type { Metadata } from 'next';
import { describe, expect, it } from 'vitest';

import { guides } from '@/app/(shop)/guides/guidesConfig';
import { locationsConfig } from '@/app/(shop)/locations/locationsConfig';
import { servicesConfig } from '@/app/(shop)/services/servicesConfig';
import { statesPrimaryDifferentiator } from '@/app/utils/brandClaims';
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  TITLE_MAX,
  aboutMetadata,
  absUrl,
  brandMetadata,
  checkoutMetadata,
  contactMetadata,
  guideMetadata,
  guidesMetadata,
  instantQuoteMetadata,
  legalPoliciesMetadata,
  homeMetadata,
  locationMetadata,
  getSiteUrl,
  locationsMetadata,
  newTiresMetadata,
  serviceMetadata,
  servicesMetadata,
  sizeIndexMetadata,
  sizeMetadata,
  storeServes,
  storeStreet,
  tiresMetadata,
  usedTiresMetadata,
} from '@/app/utils/seo';

/**
 * The regression guard for the commercial entry points.
 *
 * This is what stops the feature rotting: a page can be edited into shipping a
 * missing description, an over-long title, or a description that says nothing a
 * competitor couldn't also say — and the suite goes red.
 *
 * It runs against the pure builders rather than the page modules on purpose.
 * Three of these pages build metadata inside a `generateMetadata` that also
 * awaits database data, so testing the modules would mean mocking `mssql`.
 */

function absoluteTitle(meta: Metadata): string {
  const title = meta.title;
  if (typeof title === 'object' && title !== null && 'absolute' in title) {
    return String(title.absolute);
  }
  throw new Error(
    'Commercial entry points must set `title: { absolute }` so the root ' +
      '`%s | MrGoma Tires` template does not eat 15 characters of the budget.'
  );
}

/** Every entry point, including the variable-input pages at realistic extremes. */
const ENTRY_POINTS: [label: string, meta: Metadata][] = [
  ['/', homeMetadata()],
  ['/tires', tiresMetadata()],
  ['/tires (size)', tiresMetadata({ w: '225', s: '40', d: '18' })],
  ['/tires (size, page 3)', tiresMetadata({ w: '225', s: '40', d: '18', page: 3 })],
  ['/tires/used', usedTiresMetadata()],
  ['/tires/new', newTiresMetadata()],
  ['/tires/size', sizeIndexMetadata()],
  ['/locations', locationsMetadata()],
  ['/about-us', aboutMetadata()],
  ['/contact', contactMetadata()],
  ['/instant-quote', instantQuoteMetadata()],
  ...(['Bridgestone', 'BFGoodrich', 'Kumho', 'Continental', 'Accelera'] as const).map(
    brand =>
      [`/tires/brands/${brand}`, brandMetadata({ brand, slug: brand.toLowerCase() })] as [
        string,
        Metadata,
      ]
  ),
  ...(['225/40/18', '31/10.50/15', '265/70/17'] as const).map(
    size => [`/tires/size/${size}`, sizeMetadata({ size, slug: 'x' })] as [string, Metadata]
  ),
  /**
   * All seven stores, from the config the site actually renders.
   *
   * This used to be four stores written by hand with `slug: 'x'`. Every
   * store-wide assertion below — "all seven titles are distinct", "each
   * description names its own street" — was really a statement about four
   * stores standing in for seven, and could not have caught a defect in the
   * other three.
   */
  ...locationsConfig.map(
    store =>
      [
        `/locations/${store.slug}`,
        locationMetadata({
          name: store.name,
          slug: store.slug,
          city: store.city,
          image: store.image,
          address: store.address,
          neighborhoods: store.neighborhoods,
        }),
      ] as [string, Metadata]
  ),
];

/**
 * Pages that describe a *service* rather than a tire.
 *
 * They are held to every structural rule below — one brand, inside the width, a
 * complete preview card, a canonical of their own — but **not** to
 * `statesPrimaryDifferentiator`. A 30-day tire warranty is not a reason to pick
 * an oil change, and requiring it here would push tire copy onto pages that are
 * not selling tires. That distinction is why `ENTRY_POINTS` is named for the
 * commercial entry points and not simply "every page".
 */
const SERVICE_PAGES: [label: string, meta: Metadata][] = [
  ['/services', servicesMetadata()],
  ...servicesConfig.map(
    service =>
      [
        `/services/${service.slug}`,
        serviceMetadata({
          metaTitle: service.metaTitle,
          metaDescription: service.metaDescription,
          slug: service.slug,
        }),
      ] as [string, Metadata]
  ),
];

/**
 * The guides. Held to the structural rules, but not to
 * `statesPrimaryDifferentiator` for the same reason as the service pages: an
 * article about reading a sidewall is not selling a warranty.
 */
const GUIDE_PAGES: [label: string, meta: Metadata][] = [
  ['/guides', guidesMetadata()],
  ...guides.map(
    guide =>
      [
        `/guides/${guide.slug}`,
        guideMetadata({
          metaTitle: guide.metaTitle,
          metaDescription: guide.metaDescription,
          slug: guide.slug,
          publishedTime: guide.publishDate,
        }),
      ] as [string, Metadata]
  ),
];

/**
 * Pages that exist for a legal or procedural reason. Structural rules apply;
 * `statesPrimaryDifferentiator` does not — a policies page is not a sales pitch,
 * and forcing warranty copy into it would be worse than leaving it out.
 */
const UTILITY_PAGES: [label: string, meta: Metadata][] = [
  ['/legal-policies', legalPoliciesMetadata()],
];

/** Every page whose metadata this feature owns. The structural rules apply to all. */
const ALL_PAGES: [label: string, meta: Metadata][] = [
  ...ENTRY_POINTS,
  ...SERVICE_PAGES,
  ...GUIDE_PAGES,
  ...UTILITY_PAGES,
];

describe('commercial entry point metadata', () => {
  it.each(ALL_PAGES)('%s has a title within the width Google displays', (_label, meta) => {
    const title = absoluteTitle(meta);
    expect(title.length).toBeGreaterThan(0);
    expect(title.length).toBeLessThanOrEqual(TITLE_MAX);
  });

  it.each(ALL_PAGES)('%s has a description Google will not truncate', (_label, meta) => {
    const description = meta.description ?? '';
    expect(description.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    expect(description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it.each(ENTRY_POINTS)('%s states at least one primary differentiator', (_label, meta) => {
    expect(statesPrimaryDifferentiator(meta.description ?? '')).toBe(true);
  });

  it.each(ALL_PAGES)('%s declares a canonical URL', (_label, meta) => {
    expect(meta.alternates?.canonical).toMatch(/^https?:\/\//);
  });

  // AC19 — "used tires" is what people search for; "like-new" is a qualifier
  // for body copy, never a replacement for the term in a title.
  it.each(ALL_PAGES)('%s keeps "like-new" out of the title', (_label, meta) => {
    expect(absoluteTitle(meta)).not.toMatch(/like-new/i);
  });

  it.each(ALL_PAGES)('%s mirrors its title and description into OpenGraph', (_label, meta) => {
    expect(meta.openGraph?.title).toBe(absoluteTitle(meta));
    expect(meta.openGraph?.description).toBe(meta.description);
  });

  /**
   * AC1 — the half of the Open Graph block that was missing everywhere.
   *
   * Next *replaces* the root layout's `openGraph` when a segment defines one, so
   * every page built through `pageMetadata` shipped with no image and no locale
   * at all. Sharing a size, a brand or a store produced bare text — the exact
   * thing `019` opened a firewall rule to make possible.
   */
  it.each(ALL_PAGES)('%s declares a complete preview card', (_label, meta) => {
    const images = meta.openGraph?.images;
    expect(Array.isArray(images)).toBe(true);
    const [image] = images as Array<{ url: string; width: number; height: number; alt: string }>;
    expect(image.url).toMatch(/^https?:\/\//);
    expect(image.width).toBe(1200);
    expect(image.height).toBe(630);
    expect(image.alt.length).toBeGreaterThan(0);
    expect(meta.openGraph?.locale).toBe('en_US');
  });

  // AC2 — a page must name itself, in both places it says so.
  it.each(ALL_PAGES)('%s points OpenGraph at its own canonical', (_label, meta) => {
    expect(meta.openGraph?.url).toBe(meta.alternates?.canonical);
  });

  /**
   * AC3 — the brand belongs in a title once.
   *
   * `pageMetadata` sets `title: { absolute }` precisely so the root
   * `%s | MrGoma Tires` template stops appending a second copy to a title that
   * already ends in one.
   */
  it.each(ALL_PAGES)('%s names the brand at most once', (_label, meta) => {
    const occurrences = absoluteTitle(meta).split('MrGoma').length - 1;
    expect(occurrences).toBeLessThanOrEqual(1);
  });
});

/**
 * AC5 and AC6 — the alignment page's differentiator, and eight distinct services.
 *
 * `Hunter HawkEye Elite®` is the one claim on that page a competitor cannot
 * copy, and it used to sit past the 60 characters Google shows because 30 of the
 * 88 were the brand printed twice. Shortening the title must never be done by
 * dropping the rig.
 */
/**
 * AC1–AC4 — seven stores that must stop reading like one.
 *
 * Twenty thousand impressions in the top four positions produced fifty clicks in
 * three months, on seven pages whose descriptions differed only by a name.
 */
describe('store pages', () => {
  const metaFor = (store: (typeof locationsConfig)[number]) =>
    locationMetadata({
      name: store.name,
      slug: store.slug,
      city: store.city,
      image: store.image,
      address: store.address,
      neighborhoods: store.neighborhoods,
    });

  // AC1
  it.each(locationsConfig.map(l => [l.slug, l] as const))(
    '%s names the product and the state',
    (_slug, store) => {
      const title = absoluteTitle(metaFor(store));
      expect(title).toMatch(/Tires/);
      expect(title).toContain('FL');
      expect(title.length).toBeLessThanOrEqual(TITLE_MAX);
    }
  );

  // AC2 — seven pages, seven titles.
  it('gives every store a title of its own', () => {
    const titles = locationsConfig.map(store => absoluteTitle(metaFor(store)));
    expect(titles).toHaveLength(7);
    expect(new Set(titles).size).toBe(7);
  });

  // AC3 — the facts the config held and never published.
  it.each(locationsConfig.map(l => [l.slug, l] as const))(
    '%s names its own street and the areas it serves',
    (_slug, store) => {
      const description = String(metaFor(store).description);
      expect(description).toContain(storeStreet(store.address));
      expect(storeServes(store.name, store.neighborhoods).some(a => description.includes(a))).toBe(
        true
      );
    }
  );

  /**
   * AC4 — the templating test, and the reason this feature exists.
   *
   * Take store A's description and substitute B's name, city and street for A's.
   * If the result is B's description, the two were the same sentence with the
   * nouns swapped — which is exactly what the seven were, and what Google is
   * thought to have filed Orlando West Colonial away as a duplicate of.
   *
   * It passes now because the descriptions differ in the **areas served** too,
   * which no substitution of name, city or street can reach.
   */
  it('has no two stores whose description is the other with the nouns swapped', () => {
    for (const a of locationsConfig) {
      for (const b of locationsConfig) {
        if (a.slug === b.slug) continue;
        const swapped = String(metaFor(a).description)
          .split(storeStreet(a.address))
          .join(storeStreet(b.address))
          .split(a.name)
          .join(b.name)
          .split(a.city)
          .join(b.city);
        expect(swapped).not.toBe(String(metaFor(b).description));
      }
    }
  });
});

describe('service pages', () => {
  const titleOf = (slug: string) => {
    const service = servicesConfig.find(s => s.slug === slug)!;
    return String(
      (
        serviceMetadata({
          metaTitle: service.metaTitle,
          metaDescription: service.metaDescription,
          slug,
        }).title as { absolute: string }
      ).absolute
    );
  };

  it('keeps the Hunter HawkEye rig inside the visible width', () => {
    const title = titleOf('wheel-alignment');
    expect(title).toContain('Hunter HawkEye Elite®');
    expect(title.length).toBeLessThanOrEqual(TITLE_MAX);
  });

  it('gives each of the eight services a title of its own', () => {
    const titles = servicesConfig.map(s => titleOf(s.slug));
    expect(titles).toHaveLength(8);
    expect(new Set(titles).size).toBe(8);
    for (const service of servicesConfig) {
      expect(titleOf(service.slug).toLowerCase()).toContain(
        service.title.split(' ')[0].toLowerCase()
      );
    }
  });
});

// AC — the guides stay articles. Losing this is invisible in the page itself.
/**
 * The two conversion pages, which the audit could not see: `robots.txt` blocks
 * `/checkout` and both declared `noindex`, so the crawl never fetched them.
 */
describe('conversion pages', () => {
  it('gives /checkout its own canonical while keeping it out of the index', () => {
    const meta = checkoutMetadata();
    expect(meta.alternates?.canonical).toBe(absUrl('/checkout'));
    expect((meta.robots as { index: boolean }).index).toBe(false);
  });

  /**
   * The reversal of "SEO phase 1" (commit `b754578`), decided by the owner on
   * 2026-08-18 with the conflict in front of them. The sitemap had been
   * publishing this page while the page said `noindex` — Search Console reports
   * that as "Submitted URL marked 'noindex'".
   */
  it('makes /instant-quote indexable and gives it a title of its own', () => {
    const meta = instantQuoteMetadata();
    expect(meta.alternates?.canonical).toBe(absUrl('/instant-quote'));
    expect(meta.robots).toBeUndefined();
    expect(absoluteTitle(meta)).not.toContain('Used & New Tires in Miami & Orlando');
  });
});

describe('guide pages', () => {
  // The hub at `/guides` is a listing, not an article — only the seven are.
  const ARTICLES = GUIDE_PAGES.filter(([label]) => label !== '/guides');

  it.each(ARTICLES)('%s is still declared an article, with its date', (_label, meta) => {
    expect(meta.openGraph).toMatchObject({ type: 'article' });
    const og = meta.openGraph as { publishedTime?: string };
    expect(og.publishedTime).toBeTruthy();
  });
});

describe('home metadata', () => {
  // Fixed by the approved decision recorded in spec.md (AC3b). If this changes,
  // it should change in the spec first.
  it('matches the approved copy exactly', () => {
    const meta = homeMetadata();

    expect(absoluteTitle(meta)).toBe('Used & New Tires Miami & Orlando — 30-Day Warranty | MrGoma');
    // Both halves of the decision, asserted separately so a future edit that
    // drops one is named for what it dropped.
    expect(absoluteTitle(meta)).toContain('Orlando');
    expect(absoluteTitle(meta)).toContain('30-Day Warranty');
    expect(meta.description).toBe(
      '15,000+ like-new used and new tires, every used tire backed by a 30-day warranty. ' +
        '7 locations in Miami & Orlando. Free shipping. Since 2006.'
    );
  });

  // AC15b — one spelling of the root, asserted exactly.
  //
  // This used to accept either form via a regex, which is how the breadcrumb
  // drifted to the slashed spelling without anything going red. The canonical
  // and `absUrl('/')` must now be the same string.
  it('canonicalises to the site root, with no trailing slash', () => {
    expect(homeMetadata().alternates?.canonical).toBe(absUrl('/'));
    expect(homeMetadata().alternates?.canonical).toBe(getSiteUrl());
  });
});

/**
 * AC3–AC7 — the canonical of a filtered catalog view.
 *
 * A crawl found 47 filter URLs each declaring itself an original while carrying
 * `/tires`' own title. The rule now is: keep only the parameters that describe a
 * page we publish.
 *
 * `sizeSlug` is what the route supplies after checking the catalog; absent, the
 * size is one we do not stock, whose landing page 404s.
 */
/**
 * AC8 — `/tires` and the home used to differ by the single word "in", which is
 * two pages competing for one query. The catalog page now says what it is for.
 */
describe('/tires as a catalogue, not a second home page', () => {
  it('reads differently from the home page', () => {
    const tires = absoluteTitle(tiresMetadata());
    const home = absoluteTitle(homeMetadata());
    expect(tires).not.toBe(home);
    const shared = tires.split(' ').filter(word => home.includes(word));
    expect(shared.length).toBeLessThan(tires.split(' ').length - 2);
  });

  it('names the two things a visitor came to search by', () => {
    const description = String(tiresMetadata().description);
    expect(description.toLowerCase()).toContain('size');
    expect(description.toLowerCase()).toContain('brand');
  });

  /**
   * FR9 — no hardcoded stock figure. The audit proposed "Search 4,000+ tires";
   * the live count is ~4,274 and moves daily, and `014` exists partly because
   * the home once claimed a number the catalog contradicted.
   */
  it('claims no stock quantity it cannot keep', () => {
    expect(String(tiresMetadata().description)).not.toMatch(/[\d,]+\+/);
  });
});

describe('/tires canonicals', () => {
  const canonicalOf = (params: Parameters<typeof tiresMetadata>[0]) =>
    String(tiresMetadata(params).alternates?.canonical);

  const root = `${getSiteUrl()}/tires`;

  // AC4 — every proper subset of the three size parameters, not one example.
  const PARTIAL: [label: string, params: Parameters<typeof tiresMetadata>[0]][] = [
    ['w only', { w: '225' }],
    ['s only', { s: '40' }],
    ['d only', { d: '18' }],
    ['w+s', { w: '225', s: '40' }],
    ['w+d', { w: '225', d: '18' }],
    ['s+d', { s: '40', d: '18' }],
    // The `?w=&s=&d=` form the audit names by URL: all three present, none valued.
    ['all three empty', { w: '', s: '', d: '' }],
    ['all three whitespace', { w: ' ', s: ' ', d: ' ' }],
  ];

  it.each(PARTIAL)('drops a partial size (%s) from the canonical', (_label, params) => {
    expect(canonicalOf(params)).toBe(root);
  });

  // AC3 — the single most duplicated facet in the crawl.
  it('canonicalises ?d=20 to /tires, not to itself', () => {
    expect(canonicalOf({ d: '20' })).toBe(root);
    // And the title it carries is the generic one, which is why it was a
    // duplicate in the first place.
    expect(absoluteTitle(tiresMetadata({ d: '20' }))).toBe(absoluteTitle(tiresMetadata()));
  });

  // AC5 — a complete size we stock consolidates onto its landing page.
  it('sends a complete, stocked size to its /tires/size page', () => {
    expect(canonicalOf({ w: '235', s: '50', d: '20', sizeSlug: '235-50-20' })).toBe(
      `${getSiteUrl()}/tires/size/235-50-20`
    );
  });

  // AC5 — a complete size we do NOT stock. After the fabricating fallback was
  // removed its landing page 404s, and a canonical must never point at one.
  it('sends a complete but unstocked size to /tires, never to a 404', () => {
    expect(canonicalOf({ w: '999', s: '999', d: '999' })).toBe(root);
    expect(canonicalOf({ w: '999', s: '999', d: '999', sizeSlug: null })).toBe(root);
  });

  // AC6 — parameters we build no pages for. Already correct; pinned so it stays.
  it('ignores filter parameters that have no page of their own', () => {
    expect(canonicalOf({})).toBe(root);
  });

  // AC7 — pagination keeps its own canonical. Folding page 2 into page 1 hides
  // everything only page 2 links to.
  it('keeps the page number, and never folds a page into the size landing page', () => {
    expect(canonicalOf({ page: 2 })).toBe(`${root}?page=2`);
    expect(canonicalOf({ w: '235', s: '50', d: '20', sizeSlug: '235-50-20', page: 2 })).toBe(
      `${root}?w=235&s=50&d=20&page=2`
    );
  });

  it('drops a partial size but keeps the page', () => {
    expect(canonicalOf({ d: '20', page: 2 })).toBe(`${root}?page=2`);
  });

  it('treats page 1 as no page at all', () => {
    expect(canonicalOf({ page: 1 })).toBe(root);
  });
});
