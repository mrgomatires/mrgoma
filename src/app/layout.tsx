import React from 'react';

import { Inter } from 'next/font/google';

import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';

import { CartProvider } from '@/app/context/CartContext';
import { CompareProvider } from '@/app/context/CompareContext';
import { SelectedFiltersProvider } from '@/app/context/SelectedFilters';
import { DetailModalProvider } from '@/app/context/ShowDetailModal';
import { FiltersProvider } from '@/app/context/ShowFilterContext';
import { MenuProvider } from '@/app/context/ShowMenuContext';
import { VisitorCityProvider } from '@/app/context/VisitorCityContext';
import { CookieConsent, JsonLd } from '@/app/ui/components';
import SiteAiChat from '@/app/ui/components/AiChat/SiteAiChat';
import GoogleAnalytics from '@/app/ui/components/GoogleAnalytics/GoogleAnalytics';
import InteractionTracker from '@/app/ui/components/InteractionTracker/InteractionTracker';
import { buildDefaultMetadata, organizationJsonLd, websiteJsonLd } from '@/app/utils/seo';

import './globals.css';

// Inter is the app's single typeface. Options are explicit (not left to
// next/font defaults) so the loading decision is reviewable and regression-safe:
// - `display: 'swap'` — show the fallback immediately, swap Inter in (no FOIT).
// - `preload: true` — request the Inter woff2 as early as possible.
// - `adjustFontFallback: true` — generate a size-adjusted "Inter Fallback"
//   (@font-face with size-adjust/ascent-override…) so the swap causes no CLS.
// - `variable` — expose Inter as `--font-inter`, wired as Tailwind's `sans`
//   token in globals.css `@theme` so `font-sans` utilities resolve to Inter too.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
  variable: '--font-inter',
});

export const metadata: Metadata = buildDefaultMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        {/* The favicon and home-screen icons are declared in `buildDefaultMetadata`
            (see seo.ts), not here — they were written twice, and the copy in this
            head pointed apple-touch-icon at the wide `desk-logo.png` lockup. */}
        {/* Hide an already-dismissed PromoBanner before it paints, so a returning
            user's banner never occupies space and hydration causes no layout
            shift. Reads the `promo_<key>=dismissed` cookie and injects a hide-rule
            for `#promo-<key>` before the body parses. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var i=[];document.cookie.split('; ').forEach(function(c){var m=c.match(/^promo_(.+)=dismissed$/);if(m)i.push('#promo-'+m[1]);});if(i.length){var s=document.createElement('style');s.textContent=i.join(',')+'{display:none!important}';document.head.appendChild(s);}}catch(e){}})();",
          }}
        />
        {/* Only the site-wide entities live here. The seven stores used to be
            emitted on every page, which duplicated each of them site-wide and
            made a location page ship its own store twice. They now render once,
            on /locations and on each store's own page. */}
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      </head>
      <SessionProvider>
        <DetailModalProvider>
          <FiltersProvider>
            <SelectedFiltersProvider>
              <MenuProvider>
                <CartProvider>
                  <CompareProvider>
                    <VisitorCityProvider>
                      <body className="font-sans" suppressHydrationWarning={true}>
                        <React.Suspense fallback={null}>
                          <GoogleAnalytics />
                        </React.Suspense>
                        <InteractionTracker />
                        {children}
                        <SiteAiChat />
                        <CookieConsent />
                        <Analytics />
                      </body>
                    </VisitorCityProvider>
                  </CompareProvider>
                </CartProvider>
              </MenuProvider>
            </SelectedFiltersProvider>
          </FiltersProvider>
        </DetailModalProvider>
      </SessionProvider>
    </html>
  );
}
