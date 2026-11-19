import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import LocationDetail from '@/app/(shop)/locations/[location]/container/LocationDetail/LocationDetail';
import { locationsConfig, getLocationBySlug } from '@/app/(shop)/locations/locationsConfig';
import JsonLd from '@/app/ui/components/JsonLd/JsonLd';
import { buildBreadcrumbJsonLd, buildLocationsJsonLd, locationMetadata } from '@/app/utils/seo';

export function generateStaticParams() {
  return locationsConfig.map(l => ({ location: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string }>;
}): Promise<Metadata> {
  const { location: slug } = await params;
  const loc = getLocationBySlug(slug);
  if (!loc) return { title: 'Location Not Found', robots: { index: false, follow: false } };

  return locationMetadata({
    name: loc.name,
    slug: loc.slug,
    city: loc.city,
    image: loc.image,
    address: loc.address,
    neighborhoods: loc.neighborhoods,
  });
}

export default async function LocationPage({ params }: { params: Promise<{ location: string }> }) {
  const { location: slug } = await params;
  const loc = getLocationBySlug(slug);
  if (!loc) notFound();

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Locations', url: '/locations' },
    { name: loc.name, url: `/locations/${slug}` },
  ]);

  const [locationSchema] = buildLocationsJsonLd([loc]);

  return (
    <>
      <JsonLd data={[breadcrumb, locationSchema]} />
      <LocationDetail location={loc} />
    </>
  );
}
