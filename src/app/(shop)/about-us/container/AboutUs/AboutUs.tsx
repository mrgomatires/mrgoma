'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import {
  FAMILY_OWNED,
  FOUNDED_YEAR,
  INVENTORY_NETWORK,
  INVENTORY_NETWORK_FIGURE,
  INVENTORY_NETWORK_LABEL,
} from '@/app/utils/brandClaims';

const stats = [
  { value: '7', label: 'Locations', sub: 'Miami & Orlando, FL' },
  { value: INVENTORY_NETWORK_FIGURE, label: INVENTORY_NETWORK_LABEL, sub: 'At all times' },
  { value: '30', label: 'Day warranty', sub: 'On used tires' },
  { value: String(FOUNDED_YEAR), label: 'Serving Florida since', sub: FAMILY_OWNED },
  { value: 'ASE', label: 'Certified', sub: 'Every technician' },
  { value: 'Free', label: 'Shipping', sub: 'Continental US' },
];

const pillars = [
  {
    number: '01',
    title: 'Guaranteed Quality',
    body: 'Every tire in our inventory is inspected by ASE-certified technicians before it reaches you. No guesswork — only tires we would put on our own vehicles.',
  },
  {
    number: '02',
    title: '30-Day Warranty',
    body: 'Every used tire we sell is backed by a 30-day warranty — many shops offer none at all, because we stand behind what we sell.',
  },
  {
    number: '03',
    title: 'Free Shipping',
    body: 'All orders ship free across the continental US via FedEx and UPS. Order before 4 PM ET and your tires go out the same day.',
  },
  {
    number: '04',
    title: 'Rideshare Pricing',
    body: 'Special rates for Uber and Lyft drivers — because your car is your livelihood and every dollar saved on maintenance goes straight to your pocket.',
  },
];

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

export default function AboutUs() {
  const { ref: statsRef, inView: statsInView } = useInView(0.15);

  return (
    <main className="bg-[#0a0a0a] text-white overflow-hidden">
      {/* ── HERO ── */}
      <section className="relative min-h-[70vh] flex items-center border-b border-white/8">
        {/* Background grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#9dfb40 1px, transparent 1px), linear-gradient(90deg, #9dfb40 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Large decorative text */}
        <span
          className="absolute right-0 top-1/2 -translate-y-1/2 text-[clamp(120px,20vw,240px)] font-black leading-none select-none pointer-events-none"
          style={{ color: 'rgba(157,251,64,0.04)', letterSpacing: '-8px' }}
          aria-hidden="true"
        >
          TIRES
        </span>

        <div className="relative max-w-6xl mx-auto px-6 lg:px-8 py-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-px bg-[#9dfb40]" />
            <span className="text-[#9dfb40] text-xs font-bold tracking-[0.25em] uppercase">
              Our Story
            </span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tight mb-8">
            About{' '}
            <span className="block text-transparent" style={{ WebkitTextStroke: '2px #9dfb40' }}>
              MrGoma
            </span>{' '}
            <span className="block text-white">Tires</span>
          </h1>

          <p className="text-gray-400 text-xl max-w-lg leading-relaxed">
            Miami&apos;s most trusted tire shop — 7 locations, thousands of tires, and one standard:
            quality you can count on.
          </p>

          {/* Scroll cue */}
          <div className="mt-12 flex items-center gap-3 text-gray-400">
            <div className="w-px h-10 bg-gradient-to-b from-[#9dfb40]/60 to-transparent" />
            <span className="text-xs uppercase tracking-widest font-medium">Scroll to explore</span>
          </div>
        </div>
      </section>

      {/* ── OUR STORY ── */}
      <section className="relative py-24 border-b border-white/8 bg-[#111]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[#9dfb40] text-xs font-bold tracking-[0.25em] uppercase mb-4">
              Who we are
            </p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-8 leading-tight">
              Built in Miami. <span className="block text-gray-400">Driven by trust.</span>
            </h2>
            <div className="space-y-5 text-gray-400 leading-relaxed text-lg">
              {/* Hidden until confirmed — founding year & founder name. Restore once confirmed:
              <p>
                Founded in <span className="text-yellow-400 font-semibold">[YEAR]</span> by{' '}
                <span className="text-yellow-400 font-semibold">[FOUNDER NAME]</span>,
                MrGoma Tires started with a single location and a simple mission:
                give Miami drivers access to quality tires at honest prices.
              </p>
              */}
              <p>
                Today we operate 7 locations across Miami and Orlando, FL — all under the same
                commitment to quality, transparency, and service that built our reputation from the
                ground up.
              </p>
              <p>
                We&apos;re a registered brand of{' '}
                <span className="text-white font-medium">Jomah Trading Inc.</span>, serving
                thousands of Florida drivers every year — from daily commuters to Uber and Lyft
                professionals who depend on their vehicle for their income.
              </p>
            </div>
          </div>

          {/* Visual panel */}
          <div className="relative">
            <div className="border border-white/8 rounded-2xl p-8 bg-white/[0.02] relative overflow-hidden">
              <div
                className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 blur-3xl"
                style={{ background: '#9dfb40' }}
              />
              <div className="relative space-y-6">
                {[
                  { label: 'Founded', value: String(FOUNDED_YEAR) },
                  { label: 'Parent company', value: 'Jomah Trading Inc.' },
                  { label: 'Headquarters', value: 'Miami, FL' },
                  { label: 'Markets', value: 'Miami & Orlando, FL' },
                  { label: 'Coverage', value: 'Continental United States' },
                  { label: 'Certifications', value: 'ASE National Automotive' },
                ]
                  .filter(item => !item.value.startsWith('[')) // hide pending-confirmation rows
                  .map(item => (
                    <div
                      key={item.label}
                      className="flex justify-between items-baseline border-b border-white/6 pb-4 last:border-0 last:pb-0"
                    >
                      <span className="text-gray-400 text-sm">{item.label}</span>
                      <span
                        className={`font-semibold text-sm ${item.value.startsWith('[') ? 'text-yellow-400' : 'text-white'}`}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BY THE NUMBERS ── */}
      <section className="relative py-24 border-b border-white/8 overflow-hidden" ref={statsRef}>
        {/* Diagonal accent */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(157,251,64,0.03) 0%, transparent 60%)',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-px bg-[#9dfb40]" />
            <p className="text-[#9dfb40] text-xs font-bold tracking-[0.25em] uppercase">
              By the numbers
            </p>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-16">
            The facts speak for themselves
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white/8 border border-white/8 rounded-2xl overflow-hidden">
            {stats
              .filter(stat => !stat.value.includes('[')) // hide pending-confirmation stats
              .map((stat, i) => (
                <div
                  key={stat.label}
                  className="bg-[#0a0a0a] px-8 py-10 group hover:bg-white/[0.03] transition-colors duration-300"
                  style={{
                    opacity: statsInView ? 1 : 0,
                    transform: statsInView ? 'translateY(0)' : 'translateY(20px)',
                    transition: `opacity 0.5s ease ${i * 0.08}s, transform 0.5s ease ${i * 0.08}s`,
                  }}
                >
                  <div
                    className="text-4xl sm:text-5xl font-black tracking-tight mb-2"
                    style={{ color: stat.value.startsWith('[') ? '#facc15' : '#9dfb40' }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-white font-bold text-lg mb-1">{stat.label}</div>
                  <div className="text-gray-400 text-sm">{stat.sub}</div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* ── WHY MRGOMA ── */}
      <section className="relative py-24 border-b border-white/8 bg-[#111]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-px bg-[#9dfb40]" />
            <p className="text-[#9dfb40] text-xs font-bold tracking-[0.25em] uppercase">
              Why choose us
            </p>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-16">
            What makes MrGoma different
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {pillars.map(pillar => (
              <article
                key={pillar.number}
                className="group relative border border-white/8 rounded-2xl p-8 hover:border-[#9dfb40]/30 transition-all duration-300 overflow-hidden"
              >
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-5 transition-opacity duration-500 blur-2xl"
                  style={{ background: '#9dfb40' }}
                />
                <span
                  aria-hidden="true"
                  className="block text-[#9dfb40]/40 text-7xl font-black leading-none mb-6 select-none group-hover:text-[#9dfb40]/60 transition-colors duration-300"
                >
                  {pillar.number}
                </span>
                <h3 className="text-xl font-bold text-white mb-3">{pillar.title}</h3>
                <p className="text-gray-400 leading-relaxed">{pillar.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CERTIFICATIONS ── */}
      <section className="border-b border-white/8">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
          <p className="text-center text-gray-400 text-xs uppercase tracking-widest mb-8 font-medium">
            Certifications & Trust
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {[
              { label: 'ASE Certified', detail: 'National Automotive Service of Excellence' },
              { label: 'Jomah Trading Inc.', detail: 'Registered trademark holder' },
              { label: 'Miami, FL', detail: 'Headquartered & founded here' },
              { label: `Since ${FOUNDED_YEAR}`, detail: 'Family-owned, serving Florida drivers' },
            ]
              .filter(cert => !cert.label.includes('[')) // hide pending-confirmation certs
              .map(cert => (
                <div key={cert.label} className="flex flex-col items-center gap-1 text-center">
                  <span
                    className={`font-black text-lg ${cert.label.includes('[') ? 'text-yellow-400' : 'text-white'}`}
                  >
                    {cert.label}
                  </span>
                  <span className="text-gray-400 text-xs">{cert.detail}</span>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="bg-[#9dfb40] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)',
            backgroundSize: '12px 12px',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8 py-20 flex flex-col items-center text-center gap-8">
          <h2 className="text-black text-4xl sm:text-5xl font-black tracking-tight">
            Ready to find your tire?
          </h2>
          <p className="text-black/60 text-lg max-w-md">
            Browse {INVENTORY_NETWORK} online or visit any of them across Miami and Orlando.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/tires"
              className="bg-black text-[#9dfb40] font-bold px-10 py-4 rounded-full text-base hover:bg-zinc-900 transition-colors duration-200"
            >
              Shop Tires
            </Link>
            <Link
              href="/contact"
              className="bg-transparent text-black font-bold px-10 py-4 rounded-full text-base border-2 border-black hover:bg-black hover:text-[#9dfb40] transition-colors duration-200"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
