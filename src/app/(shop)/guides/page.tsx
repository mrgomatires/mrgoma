import Link from 'next/link';

import type { Metadata } from 'next';

import { guides } from '@/app/(shop)/guides/guidesConfig';
import JsonLd from '@/app/ui/components/JsonLd/JsonLd';
import { INVENTORY_NETWORK } from '@/app/utils/brandClaims';
import { buildBreadcrumbJsonLd, buildPageTypeJsonLd, guidesMetadata } from '@/app/utils/seo';

export const metadata: Metadata = guidesMetadata();

export default function GuidesPage() {
  const buyingGuides = guides.filter(g => g.category === 'buying-guide');
  const rideshareGuides = guides.filter(g => g.category === 'rideshare');
  const maintenanceGuides = guides.filter(g => g.category === 'maintenance');

  return (
    <>
      <JsonLd
        data={[
          buildPageTypeJsonLd({
            type: 'CollectionPage',
            path: '/guides',
            name: 'Tire Guides',
          }),
          buildBreadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Guides', url: '/guides' },
          ]),
        ]}
      />
      <main className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Hero */}
        <section className="relative border-b border-white/8 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(#9dfb40 1px, transparent 1px), linear-gradient(90deg, #9dfb40 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          <div className="relative max-w-6xl mx-auto px-6 lg:px-8 pt-20 pb-16">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-px bg-[#9dfb40]" />
              <span className="text-[#9dfb40] text-xs font-bold tracking-[0.2em] uppercase">
                Expert Advice
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-6">
              Tire Guides <span className="block text-[#9dfb40]">& Tips</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-xl leading-relaxed">
              Straight answers from ASE-certified technicians. No fluff — just what you need to know
              about buying, maintaining, and getting the most out of your tires.
            </p>
          </div>
        </section>

        {/* Guides sections */}
        <div className="bg-[#111] max-w-none">
          <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16 space-y-20">
            {/* Buying guides */}
            {buyingGuides.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-6 h-px bg-[#9dfb40]" />
                  <h2 className="text-2xl font-black tracking-tight text-white">Buying Guides</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {buyingGuides.map(guide => (
                    <GuideCard key={guide.slug} guide={guide} />
                  ))}
                </div>
              </section>
            )}

            {/* Rideshare guides */}
            {rideshareGuides.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-6 h-px bg-amber-400" />
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    Rideshare Driver Guides
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {rideshareGuides.map(guide => (
                    <GuideCard key={guide.slug} guide={guide} />
                  ))}
                </div>
              </section>
            )}

            {/* Maintenance guides */}
            {maintenanceGuides.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-6 h-px bg-blue-400" />
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    Maintenance Guides
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {maintenanceGuides.map(guide => (
                    <GuideCard key={guide.slug} guide={guide} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* CTA */}
        <section className="bg-[#9dfb40] relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)',
              backgroundSize: '12px 12px',
            }}
          />
          <div className="relative max-w-6xl mx-auto px-6 lg:px-8 py-16 flex flex-col items-center text-center gap-6">
            <h2 className="text-black text-3xl sm:text-4xl font-black tracking-tight">
              Ready to find your tire?
            </h2>
            <p className="text-black/60 max-w-md">
              Browse {INVENTORY_NETWORK} or contact our ASE-certified team at any of them.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/tires"
                className="bg-black text-[#9dfb40] font-bold px-10 py-4 rounded-full hover:bg-zinc-900 transition-colors duration-200"
              >
                Shop Tires
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

function GuideCard({ guide }: { guide: (typeof guides)[0] }) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group flex flex-col border border-white/8 rounded-2xl p-7 hover:border-[#9dfb40]/30 transition-all duration-300 relative overflow-hidden bg-white/[0.02]"
    >
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-5 transition-opacity duration-500 blur-2xl"
        style={{ background: '#9dfb40' }}
      />
      <div className="flex items-center justify-between mb-5">
        <span
          className={`text-xs font-bold tracking-wide uppercase px-3 py-1 rounded-full ${
            guide.category === 'buying-guide'
              ? 'bg-[#9dfb40]/15 text-[#9dfb40] border border-[#9dfb40]/20'
              : guide.category === 'rideshare'
                ? 'bg-amber-400/15 text-amber-400 border border-amber-400/20'
                : 'bg-blue-400/15 text-blue-400 border border-blue-400/20'
          }`}
        >
          {guide.categoryLabel}
        </span>
        <span className="text-gray-400 text-xs">{guide.readTime}</span>
      </div>
      {/*
       * An `<h3>`, because this card sits inside a section whose name is an
       * `<h2>`. Marking both the same flattened the list to eleven equal
       * headings and removed the structure a screen-reader user navigates by.
       * The home page's guide cards were already `<h3>`; this brings the two
       * grids in line rather than inventing a convention.
       */}
      <h3 className="text-white font-bold text-lg leading-snug mb-3 group-hover:text-[#9dfb40] transition-colors duration-200 flex-1">
        {guide.cardName}
      </h3>
      <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 mb-5">{guide.intro}</p>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#9dfb40] mt-auto">
        Read guide
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200"
        >
          <line x1="7" y1="17" x2="17" y2="7" />
          <polyline points="7 7 17 7 17 17" />
        </svg>
      </div>
    </Link>
  );
}
