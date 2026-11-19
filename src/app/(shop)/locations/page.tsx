import Link from 'next/link';

import type { Metadata } from 'next';

import { locationsConfig } from '@/app/(shop)/locations/locationsConfig';
import GoogleRating from '@/app/ui/components/GoogleRating/GoogleRating';
import JsonLd from '@/app/ui/components/JsonLd/JsonLd';
import { HOME_TRUST_CLAIMS } from '@/app/utils/brandClaims';
import { combinedRating } from '@/app/utils/googleRatings';
import {
  buildBreadcrumbJsonLd,
  buildLocationsJsonLd,
  buildPageTypeJsonLd,
  locationsMetadata,
} from '@/app/utils/seo';

export const metadata: Metadata = locationsMetadata();

function MapPinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 shrink-0 text-[#9dfb40]"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 shrink-0"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.01 1.22 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
    </svg>
  );
}

const miamis = locationsConfig.filter(l => l.city === 'Miami');
const orlandos = locationsConfig.filter(l => l.city === 'Orlando');

export default function LocationsPage() {
  return (
    <>
      {/* The canonical home for all seven store entities. */}
      <JsonLd
        data={[
          buildPageTypeJsonLd({
            type: 'CollectionPage',
            path: '/locations',
            name: 'MrGoma Tires Locations',
          }),
          buildBreadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Locations', url: '/locations' },
          ]),
          ...buildLocationsJsonLd(locationsConfig),
        ]}
      />
      <main className="bg-[#0a0a0a] text-white min-h-screen">
        {/* Hero */}
        <section className="relative border-b border-white/8 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.04]"
              style={{ background: 'radial-gradient(circle, #9dfb40 0%, transparent 70%)' }}
            />
          </div>
          <div className="relative max-w-6xl mx-auto px-6 lg:px-8 pt-20 pb-16">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-px bg-[#9dfb40] inline-block" />
              <span className="text-[#9dfb40] text-xs font-bold tracking-[0.2em] uppercase">
                Find us
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-6">
              Our Locations <span className="block text-[#9dfb40]">Miami & Orlando</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-xl leading-relaxed">
              7 tire shops across South Florida and Central Florida. Walk in at any location — no
              appointment needed.
            </p>
            {/* All seven on Google, and the day it was read (053, D5–D6). The
                combined figure leads here, so this page is where it is explained;
                each card below links to its own reviews. */}
            <GoogleRating figures={combinedRating()} variant="store" showDate className="mt-6" />
          </div>
        </section>

        {/* Miami + Orlando locations */}
        <div className="bg-[#111]">
          <section className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
            <div className="flex items-center gap-4 mb-10">
              <MapPinIcon />
              <h2 className="text-2xl font-black tracking-tight">Miami, FL</h2>
              <span className="text-gray-400 text-sm font-medium">{miamis.length} locations</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/8 border border-white/8 rounded-2xl overflow-hidden mb-4">
              {miamis.map(loc => (
                <LocationCard key={loc.slug} loc={loc} />
              ))}
            </div>
          </section>

          <section className="max-w-6xl mx-auto px-6 lg:px-8 pb-20">
            <div className="flex items-center gap-4 mb-10">
              <MapPinIcon />
              <h2 className="text-2xl font-black tracking-tight">Orlando, FL</h2>
              <span className="text-gray-400 text-sm font-medium">{orlandos.length} locations</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/8 border border-white/8 rounded-2xl overflow-hidden">
              {orlandos.map(loc => (
                <LocationCard key={loc.slug} loc={loc} />
              ))}
            </div>
          </section>
        </div>

        {/* Trust bar */}
        <section className="border-t border-white/8 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto px-6 lg:px-8 py-10 flex flex-wrap justify-center gap-x-12 gap-y-4">
            {['Walk-ins Welcome', 'ASE-Certified Technicians', ...HOME_TRUST_CLAIMS].map(item => (
              <div key={item} className="flex items-center gap-2">
                <span className="text-[#9dfb40] text-xs">✦</span>
                <span className="text-white/70 font-medium text-sm">{item}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function LocationCard({ loc }: { loc: (typeof locationsConfig)[0] }) {
  return (
    <article className="bg-[#0a0a0a] p-6 flex flex-col gap-4 group hover:bg-white/[0.04] transition-colors duration-200">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-base text-white leading-tight">{loc.name}</h3>
        <span className="text-[10px] text-white/50 font-semibold uppercase tracking-widest shrink-0 mt-0.5">
          {loc.city}
        </span>
      </div>

      <p className="text-gray-300 text-sm leading-relaxed">{loc.address}</p>

      {/* This store's Google rating, to its reviews on Google (053, D4–D5). */}
      <GoogleRating
        figures={loc.google}
        variant="card"
        href={loc.mapLink}
        external
        track={{ event: 'google_reviews_open', surface: 'locations', store: loc.slug }}
      />

      <div className="flex flex-wrap gap-1.5">
        {loc.neighborhoods.slice(0, 3).map(n => (
          <span
            key={n}
            className="text-[11px] font-medium text-gray-200 bg-white/10 px-2.5 py-1 rounded-full border border-white/15"
          >
            {n}
          </span>
        ))}
      </div>

      <a
        href={loc.tel}
        data-track="call_store"
        data-track-category="contact"
        data-track-label={loc.name}
        className="flex items-center gap-2 text-sm text-gray-200 hover:text-[#9dfb40] transition-colors w-fit"
      >
        <PhoneIcon />
        {loc.phone}
      </a>

      <div className="flex items-center gap-3 mt-auto pt-3 border-t border-white/10">
        <Link
          href={`/locations/${loc.slug}`}
          className="text-xs font-bold text-[#9dfb40] hover:underline"
        >
          View details →
        </Link>
        <a
          href={loc.mapLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-gray-300 hover:text-white transition-colors"
        >
          Get directions →
        </a>
      </div>
    </article>
  );
}
