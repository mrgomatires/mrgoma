import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { TireGrid } from '@/app/(shop)/tires/container/TireGrid/TireGrid';
import { getStockedSizes, resolveSizeSlug } from '@/app/(shop)/tires/utils/sizeCatalog';
import { TiresData } from '@/app/interfaces/tires';
import { JsonLd } from '@/app/ui/components';
import { LOCATIONS_LABEL, SHIPPING, WARRANTY, onlineInventoryLabel } from '@/app/utils/brandClaims';
import { LISTS } from '@/app/utils/ecommerce';
import { buildBreadcrumbJsonLd, buildItemListJsonLd, sizeMetadata } from '@/app/utils/seo';
import { slugify } from '@/app/utils/tireSlug';
import { transformTireData } from '@/app/utils/transformTireData';
import { fetchTires } from '@/repositories/tiresRepository';

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const sizes = await getStockedSizes();
    return sizes.map(size => ({ size: slugify(size) }));
  } catch {
    return [];
  }
}

/**
 * The size behind the URL segment, or `null` — and `null` means 404.
 *
 * There used to be a fallback here: when the slug matched no size we stock, it
 * split the slug on hyphens and **invented** a size from the three pieces. That
 * turned every three-segment slug into a live page. `/tires/size/foo-bar-baz`
 * answered `200` with `<title>foo/bar/baz Tires in Miami — 30-Day Warranty</title>`
 * and a canonical pointing at itself; so did `/tires/size/999-999-999`, and so
 * did `/tires/size/235-50-r20`, which is why the site appeared to publish two
 * URLs for every size. An unbounded, indexable, self-canonicalising URL space
 * that any broken link, typo or scraper could add to.
 *
 * It also got real sizes wrong in the other direction: `31/10.50/15` slugifies
 * to four segments, so the fallback would have rejected it while happily
 * inventing `foo/bar/baz`. Exact matching against the catalog handles both.
 *
 * The brand route never had the bug — it always matched exactly — and both now
 * call the same `matchSlug`.
 */
async function getSizeData(sizeSlug: string): Promise<{
  originalSize: string;
  width: string;
  sidewall: string;
  diameter: string;
} | null> {
  const originalSize = await resolveSizeSlug(sizeSlug);
  if (!originalSize) return null;

  const parts = originalSize.split('/');
  if (parts.length !== 3) return null;

  return { originalSize, width: parts[0], sidewall: parts[1], diameter: parts[2] };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ size: string }>;
}): Promise<Metadata> {
  const { size: sizeSlug } = await params;
  const data = await getSizeData(sizeSlug);
  if (!data) return { title: 'Not Found', robots: { index: false, follow: true } };

  return sizeMetadata({ size: data.originalSize, slug: sizeSlug });
}

export default async function SizeCategoryPage({ params }: { params: Promise<{ size: string }> }) {
  const { size: sizeSlug } = await params;
  const data = await getSizeData(sizeSlug);
  if (!data) notFound();

  const { originalSize, width, sidewall, diameter } = data;

  const result = await fetchTires(0, 24, { width, sidewall, diameter });
  const tires = (result.records as TiresData[]).map(transformTireData);
  const totalCount = result.totalCount;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Tires', url: '/tires' },
    // The size index (050) sits between the catalog and a size.
    { name: 'Sizes', url: '/tires/size' },
    { name: `${originalSize} Tires`, url: `/tires/size/${sizeSlug}` },
  ]);

  const itemListJsonLd = buildItemListJsonLd({
    url: `/tires/size/${sizeSlug}`,
    name: `${originalSize} tires available online`,
    count: totalCount,
  });

  const viewAllHref = `/tires?w=${encodeURIComponent(width)}&s=${encodeURIComponent(sidewall)}&d=${encodeURIComponent(diameter)}`;

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd, itemListJsonLd]} />

      <main className="min-h-screen bg-white">
        {/* Breadcrumb */}
        <nav className="bg-gray-50 border-b border-gray-200" aria-label="Breadcrumb">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-sm text-gray-500 flex-wrap">
            <Link href="/" className="hover:text-green-600 transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/tires" className="hover:text-green-600 transition-colors">
              Tires
            </Link>
            <span>/</span>
            <Link href="/tires/size" className="hover:text-green-600 transition-colors">
              Sizes
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{originalSize} Tires</span>
          </div>
        </nav>

        {/* Hero */}
        <section className="bg-[#0a0a0a] text-white relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(#9dfb40 1px, transparent 1px), linear-gradient(90deg, #9dfb40 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-px bg-[#9dfb40]" />
              <span className="text-[#9dfb40] text-xs font-bold tracking-[0.2em] uppercase">
                Tire Size
              </span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none mb-4">
              <span className="text-[#9dfb40]">{originalSize}</span>{' '}
              {/* Both cities: this page aggregates every warehouse, and 19 sizes
                  have stock only in Orlando. See `sizeMetadata` in seo.ts. */}
              <span className="block">Tires in Miami &amp; Orlando</span>
            </h1>
            <p className="text-gray-400 text-lg">
              {totalCount > 0
                ? `${onlineInventoryLabel(totalCount)} · ${SHIPPING}`
                : `${SHIPPING} · ${LOCATIONS_LABEL}`}
            </p>
          </div>
        </section>

        {/* Trust bar */}
        <div className="bg-gray-900 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap gap-x-8 gap-y-2 text-xs text-gray-400 font-medium">
            {['ASE-Certified Technicians', WARRANTY, SHIPPING, LOCATIONS_LABEL].map(item => (
              <span key={item} className="flex items-center gap-1.5">
                <span className="text-[#9dfb40]">✦</span>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Size info pill */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-2">
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
              <span className="text-gray-500">Width</span>
              <span className="font-bold text-gray-900">{width}</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
              <span className="text-gray-500">Sidewall</span>
              <span className="font-bold text-gray-900">{sidewall}</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
              <span className="text-gray-500">Diameter</span>
              <span className="font-bold text-gray-900">{diameter}</span>
            </div>
          </div>
        </div>

        {/* Tire grid */}
        <section className="py-8">
          <TireGrid
            tires={tires}
            totalCount={totalCount}
            viewAllHref={viewAllHref}
            list={LISTS.size(originalSize)}
            viewAllLabel={`View all ${totalCount} tires in size ${originalSize}`}
          />
        </section>

        {/* Bottom CTA */}
        <section className="border-t border-gray-100 bg-gray-50 py-16 text-center px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Looking for a different size?</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Browse our full catalog or search by your specific tire dimensions.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/tires"
              className="bg-green-600 text-white font-bold px-8 py-3 rounded-full hover:bg-green-700 transition-colors"
            >
              Browse All Tires
            </Link>
            <Link
              href="/contact"
              className="border-2 border-gray-300 text-gray-700 font-bold px-8 py-3 rounded-full hover:border-green-600 hover:text-green-600 transition-colors"
            >
              Ask a Technician
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
