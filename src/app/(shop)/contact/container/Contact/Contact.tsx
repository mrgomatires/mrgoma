'use client';

import { DEFAULT_HOURS, locationsConfig } from '@/app/(shop)/locations/locationsConfig';
import { WhatsAppIcon } from '@/app/ui/icons/WhatsAppIcon';
import { weeklyHours } from '@/app/utils/storeHours';
import { WHATSAPP_DISPLAY, whatsAppLink } from '@/app/utils/whatsapp';

// Derived from the single source of truth (locationsConfig).
const locations = locationsConfig.map((l, i) => ({
  id: String(i + 1).padStart(2, '0'),
  name: l.name,
  address: l.address,
  phone: l.phone,
  tel: l.tel,
  map: l.mapLink,
  area: l.serving.replace(/•/g, '·'),
}));

// This page speaks for the chain rather than for one shop, so it renders the
// shared default. A store that ever departs from it would make that a lie —
// `storeHours.guard.test.ts` fails the build on the day one does, rather than
// letting this page quietly misinform.
const hours = weeklyHours(DEFAULT_HOURS);

/**
 * When somebody is there to answer WhatsApp — **not** the stores' opening
 * hours, which is why it is written here rather than derived from them.
 *
 * The two look alike and already disagree: the shops open on Sunday 10–4 and
 * this does not. So the resemblance is a coincidence, and anyone tempted to
 * "fix" the mismatch by pointing this at `DEFAULT_HOURS` would be promising a
 * Sunday reply that nobody is there to send.
 */
const WHATSAPP_AVAILABILITY = 'Mon–Sat 8am–6pm';

const trust = [
  { label: 'ASE Certified', icon: '✦' },
  { label: '30-Day Warranty', icon: '✦' },
  { label: 'Free Shipping', icon: '✦' },
  { label: 'Est. Miami, FL', icon: '✦' },
];

function PhoneIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
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

function MapPinIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 shrink-0 mt-0.5"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5 shrink-0"
      aria-hidden="true"
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

export default function Contact() {
  return (
    <main className="bg-[#0a0a0a] text-white min-h-screen">
      {/* ── Hero ── */}
      <section className="relative border-b border-white/8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#9dfb40]/30 to-transparent" />
          <div
            className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.04]"
            style={{ background: 'radial-gradient(circle, #9dfb40 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 lg:px-8 pt-20 pb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-block w-8 h-px bg-[#9dfb40]" />
            <span className="text-[#9dfb40] text-xs font-semibold tracking-[0.2em] uppercase">
              Get In Touch
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-6">
            Contact{' '}
            <span className="block">
              <span className="text-[#9dfb40]">MrGoma</span> Tires
            </span>
          </h1>

          <p className="text-gray-400 text-lg max-w-xl leading-relaxed">
            Seven locations across Miami and Orlando, FL — all staffed with ASE-certified
            technicians ready to help you find the right tire at the right price.
          </p>
        </div>
      </section>

      {/* ── Trust Bar ── */}
      <section className="border-b border-white/8">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <ul className="flex flex-wrap items-center divide-x divide-white/8">
            {trust.map(item => (
              <li
                key={item.label}
                className="flex items-center gap-2.5 px-6 py-4 first:pl-0 last:pr-0"
              >
                <span className="text-[#9dfb40] text-xs">{item.icon}</span>
                <span className="text-sm font-medium text-white/80 whitespace-nowrap">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── WhatsApp CTA ── */}
      <section className="bg-[#9dfb40] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)',
            backgroundSize: '12px 12px',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8 py-14 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-black/50 text-xs font-bold tracking-widest uppercase mb-1">
              Fastest response
            </p>
            <h2 className="text-black text-3xl sm:text-4xl font-black tracking-tight">
              Chat with us on WhatsApp
            </h2>
            <p className="text-black/70 mt-2 text-sm">
              Available {WHATSAPP_AVAILABILITY} · Usually replies in minutes
            </p>
          </div>
          <a
            href={whatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            data-track="open_whatsapp"
            data-track-category="contact"
            data-track-label="contact_hero"
            className="flex items-center gap-3 bg-black text-[#9dfb40] font-bold px-8 py-4 rounded-full text-base whitespace-nowrap hover:bg-zinc-900 transition-colors duration-200 shrink-0"
          >
            <WhatsAppIcon className="w-6 h-6 shrink-0" />
            Open WhatsApp
          </a>
        </div>
      </section>

      {/* ── Locations ── */}
      <section className="bg-[#111]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-20">
          <div className="flex items-center justify-between mb-12">
            <div>
              <p className="text-[#9dfb40] text-xs font-bold tracking-widest uppercase mb-2">
                Our Locations
              </p>
              <h2 className="text-3xl font-black tracking-tight">Find your nearest shop</h2>
            </div>
            <span
              aria-hidden="true"
              className="text-6xl font-black text-white/40 select-none hidden sm:block"
            >
              07
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/8 border border-white/8 rounded-2xl overflow-hidden">
            {locations.map(loc => (
              <article
                key={loc.id}
                className="bg-[#0a0a0a] p-6 flex flex-col gap-4 group hover:bg-white/[0.03] transition-colors duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[#9dfb40] text-xs font-bold tracking-widest">{loc.id}</span>
                  <span className="text-[10px] text-white/50 font-medium text-right leading-tight">
                    {loc.area}
                  </span>
                </div>

                <h3 className="font-bold text-base text-white leading-tight">{loc.name}</h3>

                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex items-start gap-2 text-gray-400 text-sm">
                    <MapPinIcon />
                    <span>{loc.address}</span>
                  </div>

                  <a
                    href={loc.tel}
                    data-track="call_store"
                    data-track-category="contact"
                    data-track-label={loc.name}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#9dfb40] transition-colors duration-150 w-fit"
                  >
                    <PhoneIcon />
                    {loc.phone}
                  </a>
                </div>

                <a
                  href={loc.map}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9dfb40] hover:gap-2.5 transition-all duration-200 mt-auto w-fit"
                >
                  Get Directions
                  <ArrowIcon />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hours + Email ── */}
      <section className="border-t border-white/8">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Hours */}
          <div>
            <p className="text-[#9dfb40] text-xs font-bold tracking-widest uppercase mb-2">
              Store Hours
            </p>
            <h2 className="text-3xl font-black tracking-tight mb-8">When we&apos;re open</h2>

            <ul className="divide-y divide-white/8">
              {hours.map(row => {
                const isSunday = row.day === 'Sunday';
                return (
                  <li key={row.day} className="flex items-center justify-between py-3.5 gap-4">
                    <span
                      className={`text-sm font-medium ${isSunday ? 'text-gray-400' : 'text-white'}`}
                    >
                      {row.day}
                    </span>
                    <span
                      className={`text-sm tabular-nums ${isSunday ? 'text-gray-400' : 'text-gray-300'}`}
                    >
                      {row.time}
                    </span>
                  </li>
                );
              })}
            </ul>

            <p className="mt-5 text-xs text-gray-400 leading-relaxed">
              Hours may vary by location. Contact the specific shop before visiting.
            </p>
          </div>

          {/* Email + General contact */}
          <div className="flex flex-col justify-start gap-8">
            <div>
              <p className="text-[#9dfb40] text-xs font-bold tracking-widest uppercase mb-2">
                General Inquiries
              </p>
              <h2 className="text-3xl font-black tracking-tight mb-6">Other ways to reach us</h2>
            </div>

            <div className="space-y-5">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400 uppercase tracking-widest font-medium">
                  Email
                </span>
                <a
                  href="mailto:info@mrgomatires.com"
                  className="text-white hover:text-[#9dfb40] transition-colors font-medium text-lg"
                >
                  info@mrgomatires.com
                </a>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400 uppercase tracking-widest font-medium">
                  WhatsApp
                </span>
                <a
                  href={whatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="open_whatsapp"
                  data-track-category="contact"
                  data-track-label="contact_footer"
                  className="text-white hover:text-[#9dfb40] transition-colors font-medium text-lg inline-flex items-center gap-2"
                >
                  <WhatsAppIcon className="w-6 h-6 shrink-0" />
                  {WHATSAPP_DISPLAY}
                </a>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400 uppercase tracking-widest font-medium">
                  Coverage
                </span>
                <span className="text-white font-medium text-lg">Miami & Orlando, FL</span>
                <span className="text-gray-400 text-sm">Shipping available nationwide</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
