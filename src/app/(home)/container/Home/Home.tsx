import React, { FC } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { preload } from 'react-dom';

import { guides } from '@/app/(shop)/guides/guidesConfig';
import { locationsConfig } from '@/app/(shop)/locations/locationsConfig';
import { servicesConfig } from '@/app/(shop)/services/servicesConfig';
import { GoogleRating, HeroVideo, JsonLd, TrustStrip } from '@/app/ui/components';
import { InfoCardsSection, PromoBanner, SearchContainer } from '@/app/ui/sections';
import { LocationsSlider } from '@/app/ui/sections/LocationsSlider/LocationsSlider';
import { promoBannerConfig } from '@/app/ui/sections/PromoBanner/config/promoBanner';
import {
  FAMILY_OWNED,
  FOUNDED_YEAR,
  HOME_TRUST_CLAIMS,
  INVENTORY_NETWORK,
  INVENTORY_NETWORK_FIGURE,
  INVENTORY_NETWORK_LABEL,
  LOCATIONS_LABEL_LONG,
  SELECTION_CLAIM,
  SHIPPING,
  WARRANTY,
} from '@/app/utils/brandClaims';
import { combinedRating } from '@/app/utils/googleRatings';
import { buildItemListJsonLd } from '@/app/utils/seo';

const SERVICE_IMAGES: Record<string, string> = {
  tire: '/assets/images/bg-service-card.jpg',
  alignment: '/assets/images/align.jpg',
  oil: '/assets/images/oil.jpg',
  brakes: '/assets/images/brake.webp',
  repair: '/assets/images/service.jpg',
  rotation: '/assets/images/rotation.jpg',
  nitrogen: '/assets/images/nitro.webp',
  tpms: '/assets/images/tpms.webp',
};

/**
 * The three guides the home page features, **by slug**.
 *
 * This was a hand-copied list carrying each guide's title, read time and intro —
 * a second copy of `guidesConfig`, which is why the home page still showed
 * `How to Buy Used Tires: The Complete Guide` after that name was retired, and
 * why one guide appeared under two names across two card grids. Naming the slugs
 * and reading the rest from the config leaves one source for a guide's facts.
 */
const FEATURED_GUIDE_SLUGS = [
  'how-to-buy-used-tires',
  'used-vs-new-tires',
  'best-tires-for-uber-lyft-drivers',
] as const;

const FEATURED_GUIDES = FEATURED_GUIDE_SLUGS.map(
  slug => guides.find(guide => guide.slug === slug)!
);

const STATS = [
  { n: '7', label: 'Locations in Miami & Orlando' },
  { n: INVENTORY_NETWORK_FIGURE, label: INVENTORY_NETWORK_LABEL },
  { n: '30-day', label: 'Warranty on used tires' },
  { n: 'Free', label: 'Shipping on every order' },
];

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  tire: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="w-7 h-7"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="8" />
      <line x1="12" y1="16" x2="12" y2="22" />
      <line x1="2" y1="12" x2="8" y2="12" />
      <line x1="16" y1="12" x2="22" y2="12" />
    </svg>
  ),
  alignment: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="w-7 h-7"
      aria-hidden="true"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  oil: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="w-7 h-7"
      aria-hidden="true"
    >
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  ),
  brakes: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="w-7 h-7"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  repair: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="w-7 h-7"
      aria-hidden="true"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  rotation: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="w-7 h-7"
      aria-hidden="true"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  nitrogen: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="w-7 h-7"
      aria-hidden="true"
    >
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  tpms: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="w-7 h-7"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

const Home: FC = () => {
  // Prioritize the hero LCP: the <video> poster has no native fetchpriority, so
  // preload it as a high-priority image so it paints sooner (Baseline 2024).
  // See spec/features/002-lcp-fetchpriority.
  preload('/assets/images/banner-hero.webp', { as: 'image', fetchPriority: 'high' });

  return (
    <>
      {/*
       * The home page shows all seven stores and declared none of them. This
       * names each by its own URL and repeats nothing: the phone numbers,
       * addresses and coordinates live on the store pages, and copying them
       * here would be one more place for them to drift.
       */}
      <JsonLd
        data={buildItemListJsonLd({
          url: '/locations',
          name: 'MrGoma Tires locations',
          count: locationsConfig.length,
          items: locationsConfig.map(store => ({
            name: `MrGoma Tires — ${store.name}`,
            url: `/locations/${store.slug}`,
          })),
        })}
      />
      <main className="bg-white">
        {/* ── Hero ── */}
        <section aria-label="Tire search" className="px-4 sm:px-6 lg:px-8 relative">
          <div className="absolute inset-0 overflow-hidden">
            <HeroVideo
              className="absolute inset-0 h-full w-full object-cover"
              src="/assets/images/banner-hero.mp4"
              poster="/assets/images/banner-hero.webp"
            />
          </div>
          <div className="relative pt-12 sm:pt-16">
            {/* The page's single <h1>. Server-rendered on purpose: it is what
              Google reads to build the result's title link, so it must be in the
              raw HTML rather than inside the client search component (which
              paints at opacity-0 until hydration). Tires-only by decision — the
              wider service range lives on /services and would dilute our
              strongest query. */}
            <h1 className="text-center text-3xl sm:text-5xl font-black tracking-tight text-white uppercase [text-shadow:_0px_4px_10px_rgb(0_0_0_/_0.6)]">
              New &amp; Used Tires in <span className="text-[#9dfb40]">Miami &amp; Orlando</span>
            </h1>

            {/* The claims Google turns into the snippet. Plain server-rendered
              text — no image, no extra font, no client JS. */}
            <TrustStrip
              items={HOME_TRUST_CLAIMS}
              variant="onMedia"
              className="justify-center mt-5 sm:mt-6"
              // The stores' Google rating first (053, D2), computed from each
              // store's figures; it leads to the stores and their reviews.
              lead={
                <GoogleRating
                  figures={combinedRating()}
                  variant="chipOnMedia"
                  href="/locations"
                  track={{ event: 'google_rating_click', surface: 'home' }}
                />
              }
            />

            <SearchContainer />
          </div>
        </section>

        {/* ── Stats strip ── */}
        <section className="bg-[#0a0a0a]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            {/* The differentiators as a full sentence, not just badge words —
              Google needs prose it can lift into a description. */}
            <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto text-center mb-10 sm:mb-14">
              {SELECTION_CLAIM}, every one backed by a {WARRANTY.toLowerCase()}. Shop{' '}
              {INVENTORY_NETWORK}, with {SHIPPING.toLowerCase()} and expert installation across{' '}
              {LOCATIONS_LABEL_LONG}. {FAMILY_OWNED} since {FOUNDED_YEAR}.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-0 sm:divide-x sm:divide-white/10">
              {STATS.map(s => (
                <div key={s.n} className="text-center sm:px-8">
                  <p className="text-4xl sm:text-5xl font-black text-[#9dfb40] leading-none">
                    {s.n}
                  </p>
                  <p className="text-gray-400 text-sm mt-2 leading-snug">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Services ── */}
        <section id="services" className="bg-gray-50 py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <PromoBanner content={promoBannerConfig.home} className="mb-10" storageKey="home" />
            <div className="mb-10">
              <p className="text-green-600 text-xs font-bold tracking-[0.2em] uppercase mb-2">
                What we offer
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Our Services</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {servicesConfig.map(service => {
                const img = SERVICE_IMAGES[service.icon];
                return (
                  <Link
                    key={service.slug}
                    href={`/services/${service.slug}`}
                    className="group relative isolate border border-white/10 rounded-2xl p-7 hover:border-[#9dfb40]/50 transition-all duration-300 flex flex-col gap-5 overflow-hidden bg-[#0a0a0a] min-h-[260px]"
                  >
                    {img && (
                      <>
                        <Image
                          src={img}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover -z-10 opacity-70 transform-gpu transition-[scale,opacity] duration-500 ease-out group-hover:opacity-90 group-hover:scale-105"
                        />
                        <div
                          className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-[#0a0a0a]/20"
                          aria-hidden="true"
                        />
                      </>
                    )}
                    <div className="text-[#9dfb40] shrink-0">
                      {SERVICE_ICONS[service.icon] ?? SERVICE_ICONS.tire}
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                      <h3 className="text-base font-bold text-white leading-snug group-hover:text-[#9dfb40] transition-colors duration-200 drop-shadow-md">
                        {service.title}
                      </h3>
                      <p className="text-gray-300 text-sm leading-relaxed drop-shadow">
                        {service.shortDescription}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#9dfb40] mt-auto">
                      Learn more
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200"
                        aria-hidden="true"
                      >
                        <line x1="7" y1="17" x2="17" y2="7" />
                        <polyline points="7 7 17 7 17 17" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/services"
                className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
              >
                See all services & pricing →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Why MrGoma ── */}
        <section id="about" className="bg-[#0a0a0a]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-6">
            <p className="text-[#9dfb40] text-xs font-bold tracking-[0.2em] uppercase mb-2">
              The MrGoma difference
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Why choose us</h2>
          </div>
          <InfoCardsSection className="bg-[#0a0a0a] pb-20" />
        </section>

        {/* ── Featured Guides ── */}
        <section className="bg-white py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-green-600 text-xs font-bold tracking-[0.2em] uppercase mb-2">
                  Learn & save
                </p>
                <h2 className="text-3xl sm:text-4xl font-black text-gray-900">From our guides</h2>
              </div>
              <Link
                href="/guides"
                className="hidden sm:inline-flex items-center text-sm font-bold text-gray-600 hover:text-green-600 transition-colors"
              >
                All guides →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {FEATURED_GUIDES.map(guide => (
                <Link
                  key={guide.slug}
                  href={`/guides/${guide.slug}`}
                  className="group block rounded-xl border border-gray-200 p-6 hover:border-green-500 hover:shadow-md transition-all duration-200"
                >
                  <p className="text-green-600 text-xs font-bold tracking-widest uppercase mb-3">
                    {guide.readTime}
                  </p>
                  <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-green-700 transition-colors leading-snug">
                    {/* A card, so the card name — not the heading. */}
                    {guide.cardName}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
                    {guide.intro}
                  </p>
                  <span className="mt-4 inline-flex items-center text-green-600 text-sm font-bold">
                    Read guide →
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Link
                href="/guides"
                className="text-sm font-bold text-gray-500 hover:text-green-600 transition-colors"
              >
                See all guides →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Shop by Category ── */}
        <section className="bg-[#0a0a0a] py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10">
              <p className="text-[#9dfb40] text-xs font-bold tracking-[0.2em] uppercase mb-2">
                Ready to shop?
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-white">Find your tire</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/tires/used"
                className="group relative rounded-2xl border border-amber-400/20 bg-amber-400/5 p-8 hover:border-amber-400/50 hover:bg-amber-400/10 transition-all duration-200"
              >
                <span className="text-amber-400 text-xs font-bold tracking-widest uppercase block mb-3">
                  Used Tires
                </span>
                <h3 className="text-2xl font-black text-white mb-2 group-hover:text-amber-400 transition-colors">
                  Quality Pre-Owned
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Inspected by ASE-certified techs. 30-day warranty included.
                </p>
                <span className="mt-6 inline-flex items-center text-amber-400 text-sm font-bold gap-1">
                  Shop Used →
                </span>
              </Link>
              <Link
                href="/tires/new"
                className="group relative rounded-2xl border border-green-500/20 bg-green-500/5 p-8 hover:border-green-500/50 hover:bg-green-500/10 transition-all duration-200"
              >
                <span className="text-green-400 text-xs font-bold tracking-widest uppercase block mb-3">
                  New Tires
                </span>
                <h3 className="text-2xl font-black text-white mb-2 group-hover:text-green-400 transition-colors">
                  Brand New Stock
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Full manufacturer warranty. Free shipping nationwide.
                </p>
                <span className="mt-6 inline-flex items-center text-green-400 text-sm font-bold gap-1">
                  Shop New →
                </span>
              </Link>
              <Link
                href="/tires"
                className="group relative rounded-2xl border border-[#9dfb40]/20 bg-[#9dfb40]/5 p-8 hover:border-[#9dfb40]/50 hover:bg-[#9dfb40]/10 transition-all duration-200"
              >
                <span className="text-[#9dfb40] text-xs font-bold tracking-widest uppercase block mb-3">
                  All Tires
                </span>
                <h3 className="text-2xl font-black text-white mb-2 group-hover:text-[#9dfb40] transition-colors">
                  Browse Catalog
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  15,000+ tires across 7 Miami & Orlando locations.
                </p>
                <span className="mt-6 inline-flex items-center text-[#9dfb40] text-sm font-bold gap-1">
                  Browse All →
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Locations ── */}
        <section id="locations" className="bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-2">
            <p className="text-green-600 text-xs font-bold tracking-[0.2em] uppercase mb-2">
              Find us near you
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Our Locations</h2>
          </div>
          <LocationsSlider />
        </section>
      </main>
    </>
  );
};

export default Home;
