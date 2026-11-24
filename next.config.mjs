/**
 * The site answers on both `mrgomatires.com` and `www.mrgomatires.com`, and
 * until now neither redirected to the other: two origins served the same app.
 *
 * That is not merely untidy. An origin is the boundary for cookies and for web
 * app identity, so the two hosts were two different installs and two different
 * sessions — sign in on one and the session does not exist on the other, and
 * `NEXTAUTH_URL` can only ever name one of them. It is why the staff portal
 * stopped letting people in until they were moved to the `www` address by hand.
 *
 * So one host wins and the other permanently redirects to it. The winner is
 * derived from the same env vars `getSiteUrl()` reads, so the redirect can never
 * disagree with the canonical tags and the sitemap. Only the exact sibling host
 * is matched, which leaves preview deployments and localhost alone.
 *
 * Two things to keep in step, both because this file is loaded before any TS is
 * compiled and so cannot import from `src/app/utils/seo.ts`:
 *
 *  - The literal below must equal `getSiteUrl()`'s own fallback. Neither is
 *    meant to be load-bearing; they are, whenever the env var is unset.
 *  - `NEXT_PUBLIC_BASE_URL` is deliberately NOT read here. Despite the similar
 *    name it answers a different question — where Stripe returns to and which
 *    origins `/api/instant-quote` accepts — and the two are only equal today by
 *    coincidence.
 */
const CANONICAL_HOST = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://www.mrgomatires.com'
).host;
const ALTERNATE_HOST = CANONICAL_HOST.startsWith('www.')
  ? CANONICAL_HOST.slice('www.'.length)
  : `www.${CANONICAL_HOST}`;

/**
 * Store URLs that were indexed after the May migration and then renamed by a
 * later deploy without a redirect. They ranked in positions 3–4, Google still
 * shows them, and every click has been landing on a 404 since — so the ranking
 * those pages earned is being discarded instead of inherited by the pages that
 * replaced them.
 *
 * `/locations/miami-north-441` is **deliberately absent**. None of the seven
 * current addresses is on that road, so there is no destination anyone can
 * confirm, and a redirect pointed at the wrong store is worse than the 404 it
 * replaces. It goes in once the owner says which store "441" was.
 *
 * Every destination is checked against `locationsConfig` by
 * `src/app/(shop)/locations/legacySlugs.guard.test.ts`, so renaming a store
 * without updating this list fails the build rather than creating a redirect
 * loop into a 404.
 */
const LEGACY_LOCATION_SLUGS = {
  'miami-hialeah': 'hialeah',
  'miami-coral-gables': 'coral-gables',
  'orlando-semoran': 'east-orlando',
  'miami-south-us1': 'cutler-bay',
};

/** @type {import('next').NextConfig} */
/**
 * Bots that get blocking metadata (in `<head>`) instead of streamed metadata
 * (055). Next 16's own list (`html-bots.js`, copied verbatim below — re-check
 * it when upgrading Next) plus **Googlebot**: Next streams to Googlebot on
 * the grounds that it runs JavaScript, so the tire page's meta description
 * reached it after `</head>`. People keep streaming (faster first byte); only
 * these crawlers wait for the metadata.
 */
const HTML_LIMITED_BOTS =
  /[\w-]+-Google|Google-[\w-]+|Googlebot|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight/i;

const nextConfig = {
  htmlLimitedBots: HTML_LIMITED_BOTS,
  // `experimental.inlineCss` was tried and reverted (056): it removed the
  // ~450 ms render-blocking stylesheet, but every page's HTML grew by ~64 KB gz
  // (the CSS goes in twice — in the <style> and in the RSC payload) and mobile
  // LCP did not improve. Numbers in spec/features/056-bundle-lcp-mobile/results.md.
  experimental: {
    /**
     * Off on purpose (062). Next 16.3 turns Turbopack's build cache on by
     * default and keeps it in `.next/cache`, the folder Vercel restores before
     * every build. On 22 Nov 2026 the deploy of 69a02f5 reused the cache of the
     * previous release (048) and shipped the new JavaScript with the old
     * `globals.css`: the comparison window went out unstyled, every check was
     * green, and only a redeploy without build cache fixed it.
     *
     * Every build now compiles everything from the commit; Vercel's other
     * caches still apply. Re-check when upgrading Next — the guard
     * `src/turbopackBuildCache.guard.test.ts` fails if the option is renamed.
     * Evidence: spec/features/062-turbopack-build-cache-off/results.md.
     */
    turbopackFileSystemCacheForBuild: false,
  },
  async redirects() {
    return [
      /**
       * These come **first, and without a host condition**, and both of those
       * are the requirement rather than style.
       *
       * Next matches in array order, first rule wins. Placed after the host rule
       * below, a legacy URL arriving on the bare domain would spend one redirect
       * becoming `www` and a second becoming the new slug — two hops for a link
       * Google is still serving. Matching here first, with an absolute
       * destination, gets both hosts to the final URL in one.
       */
      ...Object.entries(LEGACY_LOCATION_SLUGS).map(([from, to]) => ({
        source: `/locations/${from}`,
        destination: `https://${CANONICAL_HOST}/locations/${to}`,
        permanent: true,
      })),
      {
        source: '/:path*',
        has: [{ type: 'host', value: ALTERNATE_HOST }],
        destination: `https://${CANONICAL_HOST}/:path*`,
        permanent: true,
      },
    ];
  },
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 2678400,
    qualities: [75],
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [128, 256],
    /**
     * **Must equal `ALLOWED_IMAGE_HOSTS` in `src/app/utils/imageHosts.ts`.**
     * This file is loaded before any TypeScript is compiled, so it cannot import
     * it — the same constraint the canonical host above lives with, and
     * `imageHosts.guard.test.ts` holds the two together.
     *
     * `ProductImage` needs the same list because **`next/image` throws during
     * render for an unconfigured host**: it does not fall back, and `onError`
     * never fires because nothing loads. One eBay-hosted photo in the catalogue
     * was answering 500 on its own detail page and blanking every filtered view
     * it appeared in.
     */
    remotePatterns: ['www.usedtires.online', 'mrgomatires.com'].map(hostname => ({
      protocol: 'https',
      hostname,
      port: '',
    })),
  },
  /**
   * Development only — `next build` and `next start` ignore this entirely.
   *
   * The dev server answers its own `/_next/*` chunks with a 403 when the request
   * arrives from an origin it does not recognise, and the LAN address a phone
   * types (`192.168.x.x:3000`) is exactly that. The failure is quiet and easy to
   * misread: the page still server-renders and looks right, but no JavaScript
   * ever loads, so nothing hydrates — the menu, the cart and every Add to cart
   * are inert, while links and anything form-driven keep working.
   *
   * The previous value here was Next's own documentation placeholder
   * (`local-origin.dev`), which never matched any host we use.
   *
   * Matching is segment-wise against the hostname, so the wildcards below cover
   * a home router's range without needing an edit every time DHCP hands out a
   * different lease. These are private addresses — a public site cannot present
   * one as its hostname — so this does not widen what a hostile page can reach.
   */
  allowedDevOrigins: ['192.168.*.*'],
};

export default nextConfig;
