import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { getGuideBySlug, guides, type GuideSection } from '@/app/(shop)/guides/guidesConfig';
import JsonLd from '@/app/ui/components/JsonLd/JsonLd';
import { INVENTORY_NETWORK } from '@/app/utils/brandClaims';
import { buildArticleJsonLd, buildBreadcrumbJsonLd, guideMetadata } from '@/app/utils/seo';
import { whatsAppLink } from '@/app/utils/whatsapp';

export function generateStaticParams() {
  return guides.map(g => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return { title: 'Not Found', robots: { index: false, follow: true } };

  return guideMetadata({
    metaTitle: guide.metaTitle,
    metaDescription: guide.metaDescription,
    slug,
    publishedTime: guide.publishDate,
  });
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Guides', url: '/guides' },
    // The breadcrumb names the page the way its `<h1>` does. It used to be fed
    // from the card name, so the trail said one thing and the heading three
    // lines below it said another.
    { name: guide.heading, url: `/guides/${slug}` },
  ]);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };

  const articleJsonLd = buildArticleJsonLd({
    heading: guide.heading,
    description: guide.metaDescription,
    slug,
    publishDate: guide.publishDate,
  });

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={faqJsonLd} />
      <JsonLd data={articleJsonLd} />

      <main className="bg-white min-h-screen">
        {/* Breadcrumb */}
        <nav className="bg-gray-50 border-b border-gray-200" aria-label="Breadcrumb">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-sm text-gray-500 flex-wrap">
            <Link href="/" className="hover:text-green-600 transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/guides" className="hover:text-green-600 transition-colors">
              Guides
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium line-clamp-1">{guide.heading}</span>
          </div>
        </nav>

        {/* Article header */}
        <header className="bg-[#0a0a0a] text-white relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(#9dfb40 1px, transparent 1px), linear-gradient(90deg, #9dfb40 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
            <div className="flex items-center gap-3 mb-5 flex-wrap">
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
              <span className="text-gray-600 text-xs">{guide.readTime}</span>
              <span className="text-gray-600 text-xs">
                {new Date(guide.publishDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-5">
              {guide.heading}
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed max-w-2xl">{guide.intro}</p>
          </div>
        </header>

        {/* Article body */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
            {/* Main content */}
            <article className="prose prose-gray max-w-none">
              {/* Key Facts box */}
              <div className="not-prose mb-10 border-2 border-[#9dfb40]/40 rounded-2xl p-6 bg-[#f8fff0]">
                <h2 className="text-[#4a7a00] font-black text-base tracking-wide uppercase mb-4 flex items-center gap-2">
                  <span className="text-[#9dfb40] text-lg">✦</span>
                  Key Facts
                </h2>
                <ul className="space-y-2">
                  {guide.keyFacts.map((fact, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-700 leading-snug"
                    >
                      <span className="text-[#9dfb40] font-bold mt-0.5 shrink-0">→</span>
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sections */}
              {guide.sections.map((section, i) => (
                <Section key={i} section={section} />
              ))}

              {/* FAQ section */}
              {guide.faqs.length > 0 && (
                <div className="not-prose mt-12">
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-6">
                    Frequently Asked Questions
                  </h2>
                  <div className="space-y-5">
                    {guide.faqs.map((faq, i) => (
                      <div
                        key={i}
                        className="border border-gray-200 rounded-xl p-6 hover:border-green-300 transition-colors duration-200"
                      >
                        <h3 className="font-bold text-gray-900 mb-2 text-base">{faq.question}</h3>
                        <p className="text-gray-600 leading-relaxed text-sm">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* Sidebar */}
            <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              {/* CTA card */}
              <div className="border border-gray-200 rounded-2xl p-6 bg-gray-50">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-3">
                  Need Tires?
                </p>
                <h3 className="font-black text-gray-900 text-lg mb-2 leading-snug">
                  {INVENTORY_NETWORK}
                </h3>
                <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                  7 locations in Miami and Orlando, FL. Free shipping nationwide.
                </p>
                <Link
                  href="/tires"
                  className="block w-full text-center bg-green-600 text-white font-bold py-3 rounded-full hover:bg-green-700 transition-colors duration-200 text-sm"
                >
                  Shop Tires
                </Link>
              </div>

              {/* WhatsApp card */}
              <div className="border border-gray-200 rounded-2xl p-6">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-3">
                  Ask a Technician
                </p>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Have a question? Our ASE-certified team answers quickly on WhatsApp.
                </p>
                <a
                  href={whatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="open_whatsapp"
                  data-track-category="contact"
                  data-track-label="guide"
                  className="flex items-center justify-center gap-2 w-full border-2 border-[#25D366] text-[#0e7a37] font-bold py-3 rounded-full hover:bg-[#25D366] hover:text-white transition-colors duration-200 text-sm"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp Us
                </a>
              </div>

              {/* Related guides */}
              <div className="border border-gray-200 rounded-2xl p-6">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-4">
                  More Guides
                </p>
                <ul className="space-y-3">
                  {guides
                    .filter(g => g.slug !== guide.slug)
                    .slice(0, 4)
                    .map(g => (
                      <li key={g.slug}>
                        <Link
                          href={`/guides/${g.slug}`}
                          className="text-sm text-gray-700 hover:text-green-600 transition-colors leading-snug block"
                        >
                          {g.cardName}
                        </Link>
                      </li>
                    ))}
                </ul>
                <Link
                  href="/guides"
                  className="block mt-4 text-xs font-bold text-green-600 hover:text-green-700"
                >
                  View all guides →
                </Link>
              </div>
            </aside>
          </div>
        </div>

        {/* Bottom CTA */}
        <section className="border-t border-gray-100 bg-gray-50 py-14 text-center px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Questions? We are here to help.</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
            Visit any of our 7 locations in Miami and Orlando, FL — or reach us on WhatsApp.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/tires"
              className="bg-green-600 text-white font-bold px-8 py-3 rounded-full hover:bg-green-700 transition-colors text-sm"
            >
              Shop Tires
            </Link>
            <Link
              href="/locations"
              className="border-2 border-gray-300 text-gray-700 font-bold px-8 py-3 rounded-full hover:border-green-600 hover:text-green-600 transition-colors text-sm"
            >
              Find a Location
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

function Section({ section }: { section: GuideSection }) {
  if (section.type === 'keyFacts') return null;

  if (section.type === 'callout') {
    return (
      <div className="not-prose my-8 border-l-4 border-[#9dfb40] bg-[#f8fff0] rounded-r-xl pl-5 pr-6 py-5">
        {section.heading && (
          <p className="font-black text-gray-900 text-base mb-2">{section.heading}</p>
        )}
        <p className="text-gray-700 leading-relaxed text-sm">{section.content}</p>
      </div>
    );
  }

  if (section.type === 'list') {
    return (
      <div className="not-prose my-6">
        {section.heading && (
          <h2 className="text-xl font-black text-gray-900 tracking-tight mb-4">
            {section.heading}
          </h2>
        )}
        <ul className="space-y-2.5">
          {section.items?.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-gray-700 leading-relaxed text-base">
              <span className="text-green-600 font-bold mt-0.5 shrink-0 text-lg leading-none">
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // type === 'text'
  return (
    <div className="not-prose my-7">
      {section.heading && (
        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-3">{section.heading}</h2>
      )}
      <p className="text-gray-700 leading-relaxed text-base">{section.content}</p>
    </div>
  );
}
