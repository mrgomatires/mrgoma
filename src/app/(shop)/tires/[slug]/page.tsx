import { cache } from 'react';

import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import DetailView from '@/app/(shop)/detail/container/DetailView/DetailView';
import type { SingleTire } from '@/app/interfaces/tires';
import JsonLd from '@/app/ui/components/JsonLd/JsonLd';
import {
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
  canonical,
  productMetadata,
} from '@/app/utils/seo';
import { isRemoved, isSoldStatus, schemaAvailability } from '@/app/utils/tireAvailability';
import { generateTireDescription } from '@/app/utils/tireDescription';
import { brandName, modelName, tireTitle } from '@/app/utils/tireNaming';
import { buildTireSlug, extractIdFromSlug } from '@/app/utils/tireSlug';
import { mapTireRecordToSingleTire } from '@/repositories/mapTireRecordToSingleTire';
import { fetchTireById } from '@/repositories/tiresRepository';

// Dynamic (no-store) render so price and sold/stock stay accurate per request.
export const dynamic = 'force-dynamic';

// Wrapped in React cache() so generateMetadata, the JSON-LD and the page render
// share a single DB read per request instead of querying multiple times.
const fetchProduct = cache(async (productId: string): Promise<SingleTire | null> => {
  try {
    const record = await fetchTireById(productId);
    // A tire withdrawn without being sold is not published: same path as an
    // unknown id — "Tire Not Found", noindex, no structured data (045). Sold
    // tires are trashed too, and keep their page (see `isRemoved`).
    if (!record || isRemoved(record)) return null;
    return mapTireRecordToSingleTire(record);
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const productId = extractIdFromSlug(slug);
  const product = await fetchProduct(productId);

  if (!product) {
    return {
      title: 'Tire Not Found',
      description:
        'We could not find the tire you are looking for. Explore our catalog of new and used tires in Miami.',
      robots: { index: false, follow: true },
    };
  }

  const canonicalSlug = buildTireSlug(String(product.id), product.brand, product.size || '');

  /**
   * Every field is handed to one pure builder rather than assembled here.
   *
   * This block used to compose the whole `Metadata` object inline, which is why
   * nothing tested it — and why it was the last route still returning a plain
   * `title` string, so the root `%s | MrGoma Tires` template printed the brand a
   * second time on all 1.622 pages.
   */
  return productMetadata({
    brand: product.brand,
    model: modelName(product.model2),
    size: product.size,
    condition: product.condition,
    patched: product.patched,
    remainingLife: product.remainingLife,
    // No price in the title or description of a sold tire (045).
    price: isSoldStatus(product.status) ? undefined : product.price,
    city: product.city,
    path: `/tires/${canonicalSlug}`,
    images: Array.isArray(product.images) ? product.images.map(image => image.src) : [],
  });
}

async function TireJsonLd({ productId }: { productId: string }) {
  const product = await fetchProduct(productId);
  if (!product) return null;

  const canonicalSlug = buildTireSlug(String(product.id), product.brand, product.size || '');
  const url = canonical(`/tires/${canonicalSlug}`);
  // Shown in the breadcrumb and in its JSON-LD, so the brand is written for a
  // reader rather than as the catalog stores it.
  const breadcrumbLabel =
    `${product.condition} ${brandName(product.brand)}${product.size ? ` ${product.size}` : ''}`.trim();

  const jsonLdDescription = generateTireDescription({
    // Written for a reader: this text is the Product node's description and is
    // shown by Google, so it follows the page rather than the stored capitals.
    brand: brandName(product.brand),
    model: modelName(product.model2),
    size: product.size,
    condition: product.condition,
    remainingLife: product.remainingLife,
    treadDepth: product.treadDepth,
    patched: product.patched,
    loadIndex: product.loadIndex,
    speedIndex: product.speedIndex,
    city: product.city,
  });

  const productJsonLd = buildProductJsonLd({
    url,
    /**
     * The name a shopper would recognise, not the internal identity.
     *
     * This was `(594712) | Nitto | 275/45/20` — a stock code leading a
     * pipe-delimited row, with the model missing entirely. Google may show this
     * string in a rich result. `product.name` keeps its stored shape because the
     * cart and checkout re-validation match on it.
     */
    name: [tireTitle({ brand: product.brand, model: product.model2 }), product.size]
      .filter(Boolean)
      .join(' '),
    brand: brandName(product.brand),
    description: jsonLdDescription,
    images: (product.images || []).map(i => i.src),
    // A sold tire's offer carries no price: sold records often hold 0 (045).
    price: isSoldStatus(product.status) ? undefined : product.price,
    currency: 'USD',
    condition: product.condition,
    // Sold pages stay indexed (045, D1) but never claim stock they do not have.
    availability: schemaAvailability(product.status),
    sku: String(product.id),
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Tires', url: '/tires' },
    { name: breadcrumbLabel, url: `/tires/${canonicalSlug}` },
  ]);

  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
    </>
  );
}

export default async function TirePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const productId = extractIdFromSlug(slug);

  if (!productId) notFound();

  const product = await fetchProduct(productId);
  if (!product) notFound();

  return (
    <>
      <TireJsonLd productId={productId} />
      <DetailView product={product} />
    </>
  );
}
