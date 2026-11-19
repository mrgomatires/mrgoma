import { Suspense } from 'react';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { BrowseFilters } from '@/app/(shop)/tires/container/BrowseFilters/BrowseFilters';
import { TireGrid } from '@/app/(shop)/tires/container/TireGrid/TireGrid';
import { TiresData } from '@/app/interfaces/tires';
import { BrandImage, JsonLd } from '@/app/ui/components';
import { LOCATIONS_LABEL, SHIPPING, WARRANTY, onlineInventoryLabel } from '@/app/utils/brandClaims';
import { LISTS } from '@/app/utils/ecommerce';
import { brandMetadata, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/app/utils/seo';
import { brandName as displayBrand } from '@/app/utils/tireNaming';
import { matchSlug, slugify } from '@/app/utils/tireSlug';
import { transformTireData } from '@/app/utils/transformTireData';
import { pickTireListFields } from '@/repositories/tireListFields';
import { fetchBrands, fetchTires } from '@/repositories/tiresRepository';

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const brands = await fetchBrands();
    return brands.map(brand => ({ brand: slugify(brand) }));
  } catch {
    return [];
  }
}

async function getBrandName(brandSlug: string): Promise<string | null> {
  return matchSlug(await fetchBrands(), brandSlug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>;
}): Promise<Metadata> {
  const { brand: brandSlug } = await params;
  const brandName = await getBrandName(brandSlug);
  if (!brandName) return { title: 'Not Found', robots: { index: false, follow: true } };

  return brandMetadata({ brand: brandName, slug: brandSlug });
}

export default async function BrandCategoryPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand: brandSlug } = await params;
  const brandName = await getBrandName(brandSlug);
  if (!brandName) notFound();

  const [result, allBrands] = await Promise.all([
    fetchTires(0, 24, { brands: [brandName] }),
    fetchBrands().catch(() => [] as string[]),
  ]);
  // Through the same whitelist as `/api/tires`: public fields plus the city (051).
  const tires = result.records.map(pickTireListFields).map(r => transformTireData(r as TiresData));
  const totalCount = result.totalCount;
  const brandId = result.records.length > 0 ? (result.records[0] as TiresData).BrandId : undefined;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Tires', url: '/tires' },
    { name: `${displayBrand(brandName)} Tires`, url: `/tires/brands/${brandSlug}` },
  ]);

  const itemListJsonLd = buildItemListJsonLd({
    url: `/tires/brands/${brandSlug}`,
    name: `${displayBrand(brandName)} tires available online`,
    count: totalCount,
  });

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
            <span className="text-gray-900 font-medium">{displayBrand(brandName)} Tires</span>
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
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8">
            {/* Text */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span className="w-8 h-px bg-[#9dfb40]" />
                <span className="text-[#9dfb40] text-xs font-bold tracking-[0.2em] uppercase">
                  Brand
                </span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none mb-4">
                {displayBrand(brandName)} <span className="block text-[#9dfb40]">Tires</span>
              </h1>
              <p className="text-gray-400 text-lg">
                {totalCount > 0
                  ? `${onlineInventoryLabel(totalCount)} · ${SHIPPING}`
                  : `${SHIPPING} · ${LOCATIONS_LABEL}`}
              </p>
            </div>

            {/* Brand logo card */}
            {brandId && (
              <div className="shrink-0 self-start sm:self-auto">
                <div className="bg-white rounded-2xl px-6 py-3 shadow-2xl flex items-center justify-center h-20 w-48">
                  <BrandImage product={{ brand: brandName!, brandId }} />
                </div>
              </div>
            )}
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

        <Suspense fallback={null}>
          <BrowseFilters brands={allBrands} activeBrand={brandName} />
        </Suspense>

        {/* Tire grid — under its own <h2>, so the cards' <h3> do not skip a level (055). */}
        <section className="py-10" aria-labelledby="brand-tires-heading">
          <h2 id="brand-tires-heading" className="sr-only">
            {`${displayBrand(brandName)} tires in stock`}
          </h2>
          <TireGrid
            tires={tires}
            totalCount={totalCount}
            viewAllHref={`/tires?brand=${encodeURIComponent(brandName)}`}
            list={LISTS.brand(displayBrand(brandName))}
            viewAllLabel={`View all ${totalCount} ${brandName} tires`}
          />
        </section>

        {/* Bottom CTA */}
        <section className="border-t border-gray-100 bg-gray-50 py-16 text-center px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Need help finding the right tire?
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Our ASE-certified technicians are available at all 7 locations across Miami and Orlando.
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
              Contact Us
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
