import type { Metadata } from 'next';

import Contact from '@/app/(shop)/contact/container/Contact/Contact';
import JsonLd from '@/app/ui/components/JsonLd/JsonLd';
import { contactMetadata, buildBreadcrumbJsonLd, buildPageTypeJsonLd } from '@/app/utils/seo';

export const metadata: Metadata = contactMetadata();

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={[
          buildPageTypeJsonLd({
            type: 'ContactPage',
            path: '/contact',
            name: 'Contact MrGoma Tires',
          }),
          buildBreadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Contact', url: '/contact' },
          ]),
        ]}
      />
      <Contact />
    </>
  );
}
