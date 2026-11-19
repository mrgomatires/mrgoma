import Link from 'next/link';

import type { Metadata } from 'next';

import JsonLd from '@/app/ui/components/JsonLd/JsonLd';
import SizeSearch from '@/app/ui/components/SizeSearch/SizeSearch';
import { SHIPPING, WARRANTY } from '@/app/utils/brandClaims';
import { buildBreadcrumbJsonLd, buildItemListJsonLd, sizeIndexMetadata } from '@/app/utils/seo';
import { popularSizes, type SizeCount, sizesByRim, tireCountLabel } from '@/app/utils/sizeIndex';
import { slugify } from '@/app/utils/tireSlug';
import { getCachedSizeCounts } from '@/repositories/cachedCatalog';

/**
 * `/tires/size` — every tire size we sell, on one page (feature 050).
 *
 * The ~290 size pages were in the sitemap but no page linked them all; this is
 * that page, and the shortcut for a shopper who knows their size. Static,
 * regenerated every five minutes from one cached list (the catalog's sellable
 * rule, the same list the picker, the sitemap and the size pages use), so a
 * visit costs the database nothing.
 *
 * The lists are plain headed lists, not an accordion: everything visible and
 * scannable, and every size an ordinary link in the HTML.
 */
export const revalidate = 300;

export const metadata: Metadata = sizeIndexMetadata();

const sizeHref = (size: string) => `/tires/size/${slugify(size)}`;

export default async function SizeIndexPage() {
  let counts: SizeCount[] = [];
  try {
    counts = await getCachedSizeCounts();
  } catch {
    counts = [];
  }
  const popular = popularSizes(counts, 12);
  const byRim = sizesByRim(counts);
  const all = byRim.flatMap(g => g.sizes);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Tires', url: '/tires' },
    { name: 'Sizes', url: '/tires/size' },
  ]);
  const itemListJsonLd = buildItemListJsonLd({
    url: '/tires/size',
    name: 'Tire sizes available online',
    count: all.length,
    items: all.map(c => ({ name: `${c.size} tires`, url: sizeHref(c.size) })),
  });

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd, itemListJsonLd]} />

      <main className="min-h-screen bg-white">
        <nav className="bg-gray-50 border-b border-gray-200" aria-label="Breadcrumb">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-sm text-gray-500 flex-wrap">
            <Link href="/" className="hover:text-green-600 transition-colors">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/tires" className="hover:text-green-600 transition-colors">
              Tires
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-gray-900 font-medium" aria-current="page">
              Sizes
            </span>
          </div>
        </nav>

        <section className="bg-[#0a0a0a] text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-px bg-[#9dfb40]" />
              <span className="text-[#9dfb40] text-xs font-bold tracking-[0.2em] uppercase">
                Tire Sizes
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none mb-4">
              Shop tires by size
            </h1>
            <p className="text-gray-300 text-lg max-w-2xl mb-8">
              Your size is printed on the tire&apos;s sidewall: in{' '}
              <strong className="text-white">235/45R18</strong>, 235 is the width, 45 the aspect
              ratio and 18 the rim. {`${all.length} sizes in stock · ${WARRANTY} · ${SHIPPING}`}
            </p>
            <div className="max-w-2xl rounded-2xl bg-white p-4 text-gray-900">
              <SizeSearch sizes={all.map(c => c.size)} />
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-12">
          {popular.length > 0 && (
            <section aria-labelledby="popular-sizes">
              <h2 id="popular-sizes" className="text-2xl font-bold text-gray-900 mb-4">
                Popular sizes
              </h2>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {popular.map(c => (
                  <li key={c.size}>
                    <Link
                      href={sizeHref(c.size)}
                      data-track="size_index_select"
                      data-track-category="size_index"
                      data-track-label={c.size}
                      data-track-source="popular"
                      className="flex min-h-14 flex-col justify-center rounded-lg border border-gray-200 px-4 py-2 hover:border-green-600 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                    >
                      <span className="font-bold tabular-nums text-gray-900">{c.size}</span>{' '}
                      <span className="text-sm text-gray-600">{tireCountLabel(c.units)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="all-sizes">
            <h2 id="all-sizes" className="text-2xl font-bold text-gray-900 mb-1">
              All sizes
            </h2>
            <p className="text-sm text-gray-600 mb-6">Grouped by rim size, smallest first.</p>
            {byRim.length === 0 ? (
              <p className="text-gray-700">
                We couldn&apos;t load the sizes right now.{' '}
                <Link href="/tires" className="font-semibold text-green-700 underline">
                  Browse all tires
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-8">
                {byRim.map(group => (
                  <section key={group.rim} aria-labelledby={`rim-${slugify(group.rim)}`}>
                    <h3
                      id={`rim-${slugify(group.rim)}`}
                      className="mb-3 border-b border-gray-200 pb-2 text-lg font-semibold text-gray-900"
                    >
                      {`${group.rim}" rim`}{' '}
                      <span className="text-sm font-normal text-gray-500">
                        {`· ${group.sizes.length} ${group.sizes.length === 1 ? 'size' : 'sizes'}`}
                      </span>
                    </h3>
                    <ul className="grid grid-cols-2 gap-x-4 sm:grid-cols-3 md:grid-cols-4">
                      {group.sizes.map(c => (
                        <li key={c.size}>
                          <Link
                            href={sizeHref(c.size)}
                            data-track="size_index_select"
                            data-track-category="size_index"
                            data-track-label={c.size}
                            data-track-source="list"
                            className="flex min-h-11 items-center gap-2 rounded px-2 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                          >
                            <span className="font-semibold tabular-nums text-green-700">
                              {c.size}
                            </span>{' '}
                            <span className="text-sm text-gray-500">{`· ${tireCountLabel(c.units)}`}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
