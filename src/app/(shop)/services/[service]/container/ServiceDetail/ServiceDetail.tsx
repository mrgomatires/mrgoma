import Image from 'next/image';
import Link from 'next/link';

import { locationsConfig } from '@/app/(shop)/locations/locationsConfig';
import { ServiceConfig } from '@/app/(shop)/services/servicesConfig';
import { whatsAppLink } from '@/app/utils/whatsapp';

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

const locationLinks = locationsConfig.map(l => ({ name: l.name, slug: l.slug }));

interface Props {
  service: ServiceConfig;
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 shrink-0 text-[#9dfb40]"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
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

export default function ServiceDetail({ service }: Props) {
  const heroImage = SERVICE_IMAGES[service.icon];

  return (
    <main className="bg-[#0a0a0a] text-white min-h-screen">
      {/* Breadcrumb */}
      <nav className="border-b border-white/8" aria-label="Breadcrumb">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-4">
          <ol className="flex items-center gap-2 text-sm text-gray-400">
            <li>
              <Link href="/" className="hover:text-[#9dfb40] transition-colors">
                Home
              </Link>
            </li>
            <li className="text-white/20">/</li>
            <li>
              <Link href="/services" className="hover:text-[#9dfb40] transition-colors">
                Services
              </Link>
            </li>
            <li className="text-white/20">/</li>
            <li className="text-white font-medium">{service.title}</li>
          </ol>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative border-b border-white/8 overflow-hidden">
        {heroImage && (
          <div
            className="hidden lg:block absolute inset-y-0 right-0 w-[45%] pointer-events-none"
            aria-hidden="true"
          >
            <Image
              src={heroImage}
              alt=""
              fill
              className="object-cover brightness-[0.25]"
              sizes="45vw"
              loading="eager"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
          </div>
        )}
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8 pt-16 pb-14">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-8 h-px bg-[#9dfb40] inline-block" />
            <span className="text-[#9dfb40] text-xs font-bold tracking-[0.2em] uppercase">
              Our Services
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-6">
            {service.title}{' '}
            <span className="block text-gray-400 text-2xl sm:text-3xl font-bold">
              Miami & Orlando, FL
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl leading-relaxed">
            {service.longDescription}
          </p>
        </div>
      </section>

      <div className="bg-[#111]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-14">
            {/* What's included */}
            <section>
              <h2 className="text-2xl font-black tracking-tight mb-6">What&apos;s Included</h2>
              <ul className="space-y-3">
                {service.whatIncluded.map(item => (
                  <li key={item} className="flex items-start gap-3 text-gray-300 leading-relaxed">
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Why MrGoma */}
            <section className="border border-white/8 rounded-2xl p-8 bg-white/[0.02]">
              <h2 className="text-2xl font-black tracking-tight mb-6">Why Choose MrGoma Tires</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  {
                    title: 'ASE-Certified Technicians',
                    body: 'Every technician is certified by the National Automotive Service of Excellence.',
                  },
                  {
                    title: '30-Day Warranty',
                    body: 'Every used tire is backed by a 30-day warranty — many shops offer none at all.',
                  },
                  {
                    title: '7 Locations',
                    body: 'Across Miami and Orlando — always a shop near you.',
                  },
                  {
                    title: 'No Appointment Needed',
                    body: 'Walk in at any location. Fast service, no waiting weeks for a slot.',
                  },
                ].map(item => (
                  <div key={item.title} className="flex flex-col gap-2">
                    <span className="text-[#9dfb40] font-bold text-sm">{item.title}</span>
                    <span className="text-gray-400 text-sm leading-relaxed">{item.body}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section>
              <h2 className="text-2xl font-black tracking-tight mb-6">
                Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                {service.faqs.map(faq => (
                  <div key={faq.q} className="border-b border-white/8 pb-6 last:border-0">
                    <h3 className="font-bold text-white mb-2">{faq.q}</h3>
                    <p className="text-gray-400 leading-relaxed text-sm">{faq.a}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* WhatsApp CTA */}
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
                <p className="text-black font-black text-lg mb-1">Book via WhatsApp</p>
                <p className="text-black/60 text-sm mb-4">Fastest way to schedule</p>
                <a
                  href={whatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="open_whatsapp"
                  data-track-category="contact"
                  data-track-label="service_detail"
                  className="flex items-center justify-center gap-2 bg-black text-[#9dfb40] font-bold py-3 px-6 rounded-full text-sm hover:bg-zinc-900 transition-colors"
                >
                  <WhatsAppIcon />
                  Chat with us
                </a>
              </div>
            </div>

            {/* Locations */}
            <div className="border border-white/8 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-widest">
                Available at
              </h3>
              <ul className="space-y-2.5">
                {locationLinks.map(loc => (
                  <li key={loc.slug}>
                    <Link
                      href={`/locations/${loc.slug}`}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#9dfb40] transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#9dfb40] shrink-0" />
                      {loc.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/locations"
                className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-[#9dfb40] hover:gap-2.5 transition-all duration-200"
              >
                View all locations <ArrowIcon />
              </Link>
            </div>

            {/* Related services */}
            {service.relatedServices.length > 0 && (
              <div className="border border-white/8 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-widest">
                  Related Services
                </h3>
                <ul className="space-y-2">
                  {service.relatedServices.map(slug => (
                    <li key={slug}>
                      <Link
                        href={`/services/${slug}`}
                        className="text-sm text-gray-400 hover:text-[#9dfb40] transition-colors capitalize flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                        {slug.replace(/-/g, ' ')}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Bottom CTA */}
      <section className="border-t border-white/8 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-black text-xl">Need {service.title}?</p>
            <p className="text-gray-400 text-sm mt-1">
              Walk in at any of our 7 locations — no appointment needed.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/contact"
              className="px-6 py-3 rounded-full border border-white/20 text-white text-sm font-bold hover:border-[#9dfb40]/50 hover:text-[#9dfb40] transition-colors"
            >
              Find a Location
            </Link>
            <Link
              href="/tires"
              className="px-6 py-3 rounded-full bg-[#9dfb40] text-black text-sm font-bold hover:bg-[#8ae636] transition-colors"
            >
              Shop Tires
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
