# Results — Accessibility and performance pass

> Feature: `055-a11y-performance-pass` · Implemented: 2026-11-19

## Part A — Accessibility

**`npm run a11y` before: 17 failures** (`a11y-baseline.txt`) — home: carousel
dots (target size), "Open address link" (label in name); `/tires/used`: the
size pill (target size); store and service pages: grey text (contrast); size
page: grey pills (contrast) and heading order; brand page: heading order;
`/checkout`: heading order (the footer's `<h3>` with no `<h2>` before it).

**After: 100 on all 10 pages, mobile and desktop, no allow-list entry.**

| Fix | Where |
| --- | --- |
| Secondary text on dark sections → `gray-400` (≥ 6.5:1); on `gray-100` → `gray-600` | store, service, about pages; size-page pills; `darkContrast.guard` |
| 24 px targets, same look | `LocationsSlider` and `InfoSlider` dots inside 24 px buttons (the store dots sit a little further apart: 24 px buttons cannot overlap); the size pill inside a 24 px link |
| Name = visible text | `LocationCard` address: a real `<a target="_blank">` to Google Maps (was a `<button>` with `window.open` and `aria-label="Open address link"`), + sr "(opens Google Maps in a new tab)" |
| Heading order | footer headings `<h2>`; an sr-only `<h2>` above the cards on size and brand pages |
| Duplicate id | `ArrowsToRight` lost its `clipPath` (it trimmed half a pixel); decorative icons `aria-hidden` |
| Missing logos | `brandLogos.ts` generated from the folder (`scripts/brand-logos.mjs`); `BrandImage` / `CompareBrand` show the name as text and request no file for the 24 brands without one (no more 404 per card) |

Logos: the owner approves the 9 official logos found (see "Logos" below)
before any is added.

## Part B — Performance (lab, production build, 5 runs, medians)

See `baseline.json` and `after.json`.

| Page | Form | LCP | TBT | CLS | Score |
| --- | --- | --- | --- | --- | --- |
| home | mobile | 4.36 → 4.51 s | 1 → 0 ms | 0 → 0 | 85 → 84 |
| home | desktop | 0.94 → 0.92 s | 0 → 0 ms | 0 → 0 | 99 → 99 |
| /tires | mobile | 3.68 → 3.76 s | 0 → 0 ms | 0 → 0 | 89 → 89 |
| /tires | desktop | 1.35 → 1.36 s | 0 → 0 ms | 0 → 0 | 96 → 96 |
| tire page | mobile | 5.41 → 5.58 s | 36 → 56 ms | 0 → 0 | 80 → 79 |
| tire page | desktop | 1.11 → 1.18 s | 0 → 0 ms | 0.037 → 0.043 | 98 → 97 |
| store | mobile | 3.83 → 3.83 s | 0 → 0 ms | 0 → 0 | 88 → 88 |
| store | desktop | 0.77 → 0.77 s | 0 → 0 ms | 0 → 0 | 100 → 100 |
| **checkout** | **mobile** | 3.38 → 3.53 s | 0 → 0 ms | **0.624 → 0** | **69 → 91** |
| **checkout** | **desktop** | 0.66 → 0.68 s | 0 → 0 ms | **0.296 → 0** | **85 → 100** |

LCP differences of ±0.2 s are within run-to-run noise on this machine.

**Fixed:**
- **`/checkout` layout shift: CLS 0.624 → 0 (mobile), 0.296 → 0 (desktop);
  performance score 69 → 91 / 85 → 100.** The page's `<Suspense>` fallback was
  `LoadingScreen`, a fixed overlay that takes no room, so the footer painted
  under the header and dropped when the checkout arrived. The fallback now
  holds the page's frame (`min-h-[70vh]` + the heading).
- **Home TBT: already 1 ms** (median of 5) — the 3.6 s seen in the 052 review
  was a one-off. Nothing to defer.
- **Meta description for Googlebot:** Next 16 streams metadata to Googlebot
  (it runs JS), so the tire page's description sat after `</head>` for it.
  `htmlLimitedBots` = Next's list + Googlebot → now in `<head>` for Googlebot,
  Bingbot, Facebook…; people keep streaming. A guard keeps the copy in step
  with Next's list on upgrades. Lighthouse 13 still reports SEO 92 on the tire
  page: it identifies as a plain mobile Chrome, and making *every* visitor wait
  for metadata (`/.*/`) would slow each dynamic page's first byte.

**Image priority (Next 16's `priority` only preloads; it does not set
`fetchpriority`):** the LCP images now use `loading="eager"` +
`fetchPriority="high"` (store and service heroes, the tire page's main photo,
the header background, the first listing card); images that are not LCP stop
preloading on every page (all brand logos, the AI chat avatar, the hidden
mobile-menu logo). The home hero's high-priority preload moved from the server
`Home` into the client `HeroVideo`: from a server component the hint travels
in the RSC payload, so every page that prefetched "/" downloaded the home's
hero at high priority. The store hero was two images (phone and desktop) both
downloaded; now one with responsive classes.

**Not achieved — mobile LCP did not improve (AC13).** Lighthouse confirms the
LCP images are now hinted (`priorityHinted: true`), yet mobile LCP stayed
within noise of the baseline. The LCP breakdown shows why: on home and the
store page the LCP image is requested almost at once (load delay ≈ 10 ms); the
simulated 4 s is the page's critical JS/CSS transfer and execution on a slow
phone. That is bundle size and the hero video/3D work — Track 1 P1.5, out of
scope here (spec D5). **The owner decides whether to open it next.**

## Logos

24 brands in stock had no logo. A search of the brands' own sites found 9
official logos; downloaded to a scratch folder, converted like the existing
files (trimmed, alpha WebP, ≤ 768 px wide, 2–57 KB) and shown to the owner on
one sheet — on a white card at the 160 × 32 box, on dark and large.

- **Added (owner-approved, 2026-11-19):** Rockblade (1464), Fulda (2475),
  Rolling Big Power (1457), Travelstar (202), Pegasus (119), Suretrac (2471 —
  its white "Performance Tires" subtitle vanishes on white; the wordmark
  reads).
- **Left as text:** Milestar (white "MILE"), Dohvan (white parts in both
  variants), Gripmax (all white) — invisible on the white cards; recolouring a
  brand's official logo was not done without the owner's say-so. Plus the 15
  with no official logo found (APLUS, DELMAX, GEODRIVE, ARMOHERO, THUNDERER,
  MONTREAL, OMNIMAX, CORDIAL, WINRUN, MOTOMASTER, MOHAVE-CUV, TRAIL GUIDE, BACK
  COUNTRY, BIG FOOT, ROAD HUGGER).
- `brandLogos.ts` regenerated: 166 brands with a logo. Checked on the Rockblade
  brand page: logos shown, no 404.

To add one later: drop `{brandId}-logo.webp` into
`public/assets/images/TireBrand/` and run `node scripts/brand-logos.mjs`.

## Also in this branch

- **`/tires` cards (owner review):** the 054 set line's 28 px slot made the text
  column taller than the 4:3 photo (a grey band under it, ~30 px). On `sm:` and
  up the set line now sits in the top row beside "Single or set · Free
  Shipping" (no added height) and the photo covers its box (`object-cover`);
  on phones the line keeps its own reserved row under the price.

## Pending (noted, not done)

- Ten other icons carry fixed `clipPath` ids (`clip0_…`); Lighthouse 13 no
  longer audits non-ARIA duplicate ids and none rendered twice on an audited
  page.
- Mobile LCP: bundle/JS audit (Track 1 P1.5).
