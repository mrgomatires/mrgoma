import Image from 'next/image';
import Link from 'next/link';

import { LocationConfig } from '@/app/(shop)/locations/locationsConfig';
import GoogleRating from '@/app/ui/components/GoogleRating/GoogleRating';
import { formatHours } from '@/app/utils/storeHours';
import { whatsAppLink } from '@/app/utils/whatsapp';

const services = [
  { label: 'Tire Mounting & Balancing', slug: 'tire-mounting-balancing' },
  { label: 'Wheel Alignment', slug: 'wheel-alignment' },
  { label: 'Oil Change', slug: 'oil-change' },
  { label: 'Brake Service', slug: 'brake-service' },
  { label: 'Flat Tire Repair', slug: 'flat-tire-repair' },
  { label: 'Tire Rotation', slug: 'tire-rotation' },
  { label: 'Nitrogen Inflation', slug: 'nitrogen-inflation' },
  { label: 'TPMS Service', slug: 'tpms-service' },
];

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 shrink-0"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.01 1.22 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 shrink-0"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5 shrink-0"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface Props {
  location: LocationConfig;
}

export default function LocationDetail({ location }: Props) {
  const heroImage = location.image;

  return (
    <main className="bg-[#0a0a0a] text-white min-h-screen">
      {/* Breadcrumb */}
      <nav className="border-b border-white/8" aria-label="Breadcrumb">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-4">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-[#9dfb40] transition-colors">
                Home
              </Link>
            </li>
            <li className="text-white/20">/</li>
            <li>
              <Link href="/locations" className="hover:text-[#9dfb40] transition-colors">
                Locations
              </Link>
            </li>
            <li className="text-white/20">/</li>
            <li className="text-white font-medium">{location.name}</li>
          </ol>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative border-b border-white/8 overflow-hidden">
        {heroImage && (
          <div
            className="hidden lg:block absolute inset-y-0 right-0 w-[50%] pointer-events-none"
            aria-hidden="true"
          >
            <Image
              src={heroImage}
              alt=""
              fill
              className="object-cover brightness-[0.35]"
              sizes="50vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/80 via-transparent to-transparent" />
          </div>
        )}
        {heroImage && (
          <div className="lg:hidden absolute inset-0 pointer-events-none" aria-hidden="true">
            <Image
              src={heroImage}
              alt=""
              fill
              className="object-cover brightness-[0.25]"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/85 to-[#0a0a0a]/70" />
          </div>
        )}
        {!heroImage && (
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.04]"
              style={{ background: 'radial-gradient(circle, #9dfb40 0%, transparent 70%)' }}
            />
          </div>
        )}
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8 pt-16 pb-14">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-8 h-px bg-[#9dfb40] inline-block" />
            <span className="text-[#9dfb40] text-xs font-bold tracking-[0.2em] uppercase">
              {location.city}, FL
            </span>
          </div>
          {/*
           * The heading used to be the name of a suburb — `Cutler Bay` — which
           * spent the largest element on the page saying neither what the
           * business is nor what it sells.
           *
           * The second line is a `block` span with a real space before it, and
           * **deliberately not a `<br />`**. `ServiceDetail` builds its two-line
           * heading with one, and that is exactly why thirteen pages report
           * headings like `Wheel AlignmentMiami & Orlando, FL`: a `<br />` is a
           * line break, not whitespace, so the text content runs together for
           * anything that reads text rather than pixels. Here CSS does the
           * breaking and the string keeps its space.
           *
           * The wrapper's classes are unchanged; only the contents differ.
           */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-4 drop-shadow-lg">
            MrGoma Tires {location.name}{' '}
            <span className="block text-2xl sm:text-3xl font-bold text-gray-300">
              Used &amp; New Tires
            </span>
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl leading-relaxed drop-shadow-md">
            {location.description}
          </p>
          {/* This store's own Google rating (053, D4–D6): to its reviews on
              Google, with the day the figures were read. */}
          <GoogleRating
            figures={location.google}
            variant="store"
            href={location.mapLink}
            external
            showDate
            track={{ event: 'google_reviews_open', surface: 'store_page', store: location.slug }}
            className="mt-6"
          />
        </div>
      </section>

      <div className="bg-[#111]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-12">
            {/* NAP */}
            <section>
              <h2 className="text-2xl font-black tracking-tight mb-6">Store Info</h2>
              <div className="border border-white/8 rounded-2xl overflow-hidden divide-y divide-white/8">
                <div className="flex items-start gap-4 p-5">
                  <MapIcon />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Address</p>
                    <p className="text-white font-medium">{location.address}</p>
                    <a
                      href={location.mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#9dfb40] text-sm font-semibold mt-1 inline-block hover:underline"
                    >
                      Get Directions →
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-5">
                  <PhoneIcon />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Phone</p>
                    <a
                      href={location.tel}
                      data-track="call_store"
                      data-track-category="contact"
                      data-track-label={location.name}
                      className="text-white font-medium hover:text-[#9dfb40] transition-colors text-lg"
                    >
                      {location.phone}
                    </a>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Hours</p>
                  <p className="text-gray-400 text-sm">
                    {/* This store's own hours, not the chain's. They are uniform
                      today, but the config models them per store precisely so a
                      divergence is an edit rather than a refactor — and that
                      promise only holds if this page reads them. */}
                    {formatHours(location.hours)
                      .split(' | ')
                      .map((line, i) => (
                        <span key={line} className={i === 0 ? undefined : 'block mt-0.5'}>
                          {line}
                        </span>
                      ))}
                    <span className="block text-gray-600 text-xs mt-2">
                      * Hours may vary — call ahead to confirm
                    </span>
                  </p>
                </div>
              </div>
            </section>

            {/* Neighborhoods */}
            <section>
              <h2 className="text-2xl font-black tracking-tight mb-4">Areas We Serve</h2>
              <p className="text-gray-500 mb-5 text-sm leading-relaxed">
                This location is conveniently accessible from the following neighborhoods and
                communities:
              </p>
              <div className="flex flex-wrap gap-2">
                {location.neighborhoods.map(n => (
                  <span
                    key={n}
                    className="px-4 py-2 border border-white/10 rounded-full text-sm text-gray-300 bg-white/[0.03]"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </section>

            {/* Services at this location */}
            <section>
              <h2 className="text-2xl font-black tracking-tight mb-6">Services at This Location</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map(s => (
                  <Link
                    key={s.slug}
                    href={`/services/${s.slug}`}
                    className="flex items-center gap-3 border border-white/8 rounded-xl p-4 hover:border-[#9dfb40]/30 hover:bg-white/[0.02] transition-all duration-200 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9dfb40] shrink-0" />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      {s.label}
                    </span>
                    <span className="ml-auto text-[#9dfb40] opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* WhatsApp */}
            <div className="bg-[#9dfb40] rounded-2xl p-6 relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg,#000 0,#000 1px,transparent 0,transparent 50%)',
                  backgroundSize: '10px 10px',
                }}
              />
              <div className="relative">
                <p className="text-black font-black text-lg mb-1">Contact This Location</p>
                <p className="text-black/60 text-sm mb-4">Fastest reply via WhatsApp</p>
                <a
                  href={whatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="open_whatsapp"
                  data-track-category="contact"
                  data-track-label={location.name}
                  className="flex items-center justify-center gap-2 bg-black text-[#9dfb40] font-bold py-3 px-6 rounded-full text-sm hover:bg-zinc-900 transition-colors w-full"
                >
                  <WhatsAppIcon />
                  Open WhatsApp
                </a>
                <a
                  href={location.tel}
                  data-track="call_store"
                  data-track-category="contact"
                  data-track-label={location.name}
                  className="flex items-center justify-center gap-2 mt-3 border border-black/20 text-black font-semibold py-3 px-6 rounded-full text-sm hover:bg-black/10 transition-colors w-full"
                >
                  <PhoneIcon />
                  {location.phone}
                </a>
              </div>
            </div>

            {/* All locations */}
            <div className="border border-white/8 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-widest">
                All Locations
              </h3>
              <Link
                href="/locations"
                className="flex items-center gap-2 text-[#9dfb40] text-sm font-semibold hover:underline mb-4"
              >
                View all 7 locations →
              </Link>
            </div>

            {/* Shop tires */}
            <div className="border border-[#9dfb40]/20 rounded-2xl p-6 bg-[#9dfb40]/5">
              <h3 className="font-bold text-white mb-2">Need a tire?</h3>
              <p className="text-gray-500 text-sm mb-4">
                Browse our inventory of 15,000+ new and used tires online.
              </p>
              <Link
                href="/tires"
                className="block text-center bg-[#9dfb40] text-black font-bold py-3 px-6 rounded-full text-sm hover:bg-[#8ae636] transition-colors"
              >
                Shop Tires
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
