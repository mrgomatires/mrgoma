import type { Metadata } from 'next';

import AboutUs from '@/app/(shop)/about-us/container/AboutUs/AboutUs';
import JsonLd from '@/app/ui/components/JsonLd/JsonLd';
import { aboutMetadata, buildBreadcrumbJsonLd, buildPageTypeJsonLd } from '@/app/utils/seo';

export const metadata: Metadata = aboutMetadata();

export default function AboutUsPage() {
  return (
    <>
      <JsonLd
        data={[
          buildPageTypeJsonLd({ type: 'AboutPage', path: '/about-us', name: 'About MrGoma Tires' }),
          buildBreadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'About', url: '/about-us' },
          ]),
        ]}
      />
      <AboutUs />
    </>
  );
}
