import type { MetadataRoute } from 'next';

import { absUrl, getSiteUrl } from '@/app/utils/seo';
import { slugify, buildTireSlug } from '@/app/utils/tireSlug';
import { fetchActiveTireIds, fetchBrands, fetchSizes } from '@/repositories/tiresRepository';

const SERVICE_SLUGS = [
  'tire-mounting-balancing',
  'wheel-alignment',
  'oil-change',
  'brake-service',
  'flat-tire-repair',
  'tire-rotation',
  'nitrogen-inflation',
  'tpms-service',
];

const LOCATION_SLUGS = [
  'cutler-bay',
  'miami-airport',
  'miami-gardens',
  'coral-gables',
  'hialeah',
  'orlando-west-colonial',
  'east-orlando',
];

const GUIDE_SLUGS = [
  'how-to-buy-used-tires',
  'used-tire-safety-checklist',
  'how-to-read-tire-size',
  'how-long-do-used-tires-last',
  'used-vs-new-tires',
  'best-tires-for-uber-lyft-drivers',
  'rideshare-tire-maintenance-schedule',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const site = getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: site, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: absUrl('/tires'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absUrl('/tires/new'), lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: absUrl('/tires/used'), lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    // The size index (050): the one page that links every size page below.
    { url: absUrl('/tires/size'), lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: absUrl('/guides'), lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: absUrl('/about-us'), lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: absUrl('/services'), lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: absUrl('/locations'), lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: absUrl('/contact'), lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: absUrl('/instant-quote'), lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: absUrl('/legal-policies'), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    ...SERVICE_SLUGS.map(slug => ({
      url: absUrl(`/services/${slug}`),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...LOCATION_SLUGS.map(slug => ({
      url: absUrl(`/locations/${slug}`),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...GUIDE_SLUGS.map(slug => ({
      url: absUrl(`/guides/${slug}`),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];

  const [tireIds, brands, sizes] = await Promise.allSettled([
    fetchActiveTireIds(2000),
    fetchBrands(),
    fetchSizes(),
  ]);

  const tireRoutes: MetadataRoute.Sitemap =
    tireIds.status === 'fulfilled'
      ? tireIds.value.map(i => ({
          url: absUrl(`/tires/${buildTireSlug(i.id, i.brand || '', i.size || '')}`),
          lastModified: i.modified || now,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        }))
      : [];

  const brandRoutes: MetadataRoute.Sitemap =
    brands.status === 'fulfilled'
      ? brands.value.map(brand => ({
          url: absUrl(`/tires/brands/${slugify(brand)}`),
          lastModified: now,
          changeFrequency: 'daily' as const,
          priority: 0.75,
        }))
      : [];

  const sizeRoutes: MetadataRoute.Sitemap =
    sizes.status === 'fulfilled'
      ? sizes.value.map(size => ({
          url: absUrl(`/tires/size/${slugify(size)}`),
          lastModified: now,
          changeFrequency: 'daily' as const,
          priority: 0.7,
        }))
      : [];

  return [...staticRoutes, ...tireRoutes, ...brandRoutes, ...sizeRoutes];
}
