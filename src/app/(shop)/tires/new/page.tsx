import { Suspense } from 'react';

import Link from 'next/link';

import type { Metadata } from 'next';

import { BrowseFilters } from '@/app/(shop)/tires/container/BrowseFilters/BrowseFilters';
import { TireGrid } from '@/app/(shop)/tires/container/TireGrid/TireGrid';
import { TiresData } from '@/app/interfaces/tires';
import JsonLd from '@/app/ui/components/JsonLd/JsonLd';
import { onlineInventoryLabel } from '@/app/utils/brandClaims';
import { LISTS } from '@/app/utils/ecommerce';
import { buildBreadcrumbJsonLd, buildItemListJsonLd, newTiresMetadata } from '@/app/utils/seo';
import { transformTireData } from '@/app/utils/transformTireData';
import { pickTireListFields } from '@/repositories/tireListFields';
import { fetchBrands, fetchTires } from '@/repositories/tiresRepository';

export const revalidate = 3600;

export const metadata: Metadata = newTiresMetadata();

const advantages = [
  {
    title: 'Full DOT Lifespan',
    body: 'Brand-new tires give you maximum mileage and the full manufacturer lifespan — no previous wear, no compromises.',
  },
  {
    title: 'Top Brands',
    body: 'We carry new tires from leading manufacturers. ASE-certified technicians help you find the right match for your vehicle.',
  },
  {
    title: 'Free Shipping',
    body: 'All orders ship free to the continental US via FedEx and UPS. Order before 4 PM ET and your tires go out the same day.',
  },
  {
    title: '7 Install Locations',
    body: 'Buy online and install at any of our 7 locations in Miami and Orlando. Walk-in, no appointment needed.',
  },
];

export default async function NewTiresPage() {
  const [result, brands] = await Promise.all([
    fetchTires(0, 24, { condition: ['new'] }),
    fetchBrands().catch(() => [] as string[]),
  ]);
  // Through the same whitelist as `/api/tires`: public fields plus the city (051).
  const tires = result.records.map(pickTireListFields).map(r => transformTireData(r as TiresData));
  const totalCount = result.totalCount;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Tires', url: '/tires' },
    { name: 'New Tires', url: '/tires/new' },
  ]);

  const itemListJsonLd = buildItemListJsonLd({
    url: '/tires/new',
    name: 'New tires available online',
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
            <span className="text-gray-900 font-medium">New Tires</span>
          </div>
        </nav>

        {/* Hero */}
        <section className="bg-[#0a0a0a] text-white relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          <span
            className="absolute right-0 top-1/2 -translate-y-1/2 text-[clamp(80px,15vw,180px)] font-black leading-none select-none pointer-events-none"
            style={{ color: 'rgba(34,197,94,0.06)', letterSpacing: '-4px' }}
            aria-hidden="true"
          >
            NEW
          </span>
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-px bg-green-400" />
              <span className="text-green-400 text-xs font-bold tracking-[0.2em] uppercase">
                Brand New
              </span>
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-5 text-white">
              <span style={{ color: '#4ade80' }}>New</span> Tires{' '}
              <span className="block" style={{ color: '#9dfb40' }}>
                Miami & Orlando
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-lg leading-relaxed">
              Brand-new tires from top manufacturers, installed by ASE-certified technicians at any
              of our 7 locations. Maximum safety, maximum lifespan.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm font-semibold">
                {totalCount > 0 ? onlineInventoryLabel(totalCount) : 'In stock now'}
              </span>
              <span
                className="border rounded-full px-4 py-2 text-sm font-semibold"
                style={{
                  color: '#4ade80',
                  borderColor: 'rgba(74,222,128,0.3)',
                  background: 'rgba(74,222,128,0.1)',
                }}
              >
                Full Manufacturer Lifespan
              </span>
              <span className="bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm font-semibold">
                Free Shipping
              </span>
            </div>
          </div>
        </section>

        <Suspense fallback={null}>
          <BrowseFilters brands={brands} variant="new" />
        </Suspense>

        {/* Why new tires */}
        <section className="py-16 border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <p className="text-green-600 text-xs font-bold tracking-[0.2em] uppercase mb-2">
              Why buy new
            </p>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-10">
              Nothing beats fresh rubber
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {advantages.map(adv => (
                <div
                  key={adv.title}
                  className="border border-gray-200 rounded-2xl p-7 hover:border-green-300 hover:shadow-sm transition-all duration-200"
                >
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{adv.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-sm">{adv.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tire grid */}
        <section className="py-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-6">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              New tires available now
            </h2>
            <p className="text-gray-500 text-sm mt-1">Inventory updated daily</p>
          </div>
          <TireGrid
            tires={tires}
            totalCount={totalCount}
            viewAllHref="/tires?condition=new"
            list={LISTS.newTires}
            viewAllLabel={`View all ${totalCount} new tires`}
          />
        </section>

        {/* Bottom CTA */}
        <section className="bg-[#9dfb40] relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)',
              backgroundSize: '12px 12px',
            }}
          />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 flex flex-col items-center text-center gap-6">
            <h2 className="text-black text-3xl sm:text-4xl font-black tracking-tight">
              Not sure which tire fits your car?
            </h2>
            <p className="text-black/60 max-w-md">
              Search by size or talk to one of our ASE-certified technicians — we will find the
              right tire for your vehicle and budget.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/tires"
                className="bg-black text-[#9dfb40] font-bold px-10 py-4 rounded-full hover:bg-zinc-900 transition-colors duration-200"
              >
                Search by Size
              </Link>
              <Link
                href="/contact"
                className="border-2 border-black text-black font-bold px-10 py-4 rounded-full hover:bg-black hover:text-[#9dfb40] transition-colors duration-200"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
