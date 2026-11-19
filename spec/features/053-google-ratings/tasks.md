# Tasks — Google ratings on the site

> Feature: `053-google-ratings` · Based on: [plan.md](./plan.md) · Created: 2026-11-18

Each task is one sitting, leaves the build green, and names its check.

## Research

- [x] **T0** — Read modern-web-guidance for ratings/star display, link
      semantics for new tabs, and chips; note what applies in `results.md` ·
      check: notes written before T4.

## Data and logic

- [x] **T1** — `google: { rating, reviews, readOn }` on `LocationConfig` and
      the seven stores (figures of 2026-11-18) · files:
      `src/app/(shop)/locations/locationsConfig.ts` (+ `locationsConfig.test.ts`)
      · check: every store has rating 1–5 with one decimal, integer count > 0,
      a valid `YYYY-MM-DD` not in the future.
- [x] **T2** — `googleRatings.ts`: `combinedRating`, `storeRating`,
      `ratingSentence`, `readMonth`, `newestReadOn`, `isStale` · files:
      `src/app/utils/googleRatings.ts` (+ `.test.ts`) · check: 4.7 / 5,952;
      changing one store moves the combined figure; "Rated 4.7 out of 5 from
      5,952 Google reviews"; "Nov 2026" (and `2026-11-01` → "Nov 2026", UTC);
      90 days fresh, 91 stale (AC1, AC9).
- [x] **T3** — Guards: `googleRatings.stale.guard.test.ts` (fails past 90
      days with "Re-read the Google ratings on Maps…"),
      `noRatingMarkup.guard.test.ts` (no `aggregateRating`/`reviewRating`/
      `Review` in structured data; built locations JSON-LD has no rating),
      and no typed `4.7 ·` / `5,952 Google` / `4.7 out of` in the placement
      files (scoped list, not all of `src/`) · check: AC8, AC9, AC1.

## Component

- [x] **T4** — `GoogleRating`: SVG stars filled to `rating/5`; visible
      "4.7 · 5,952 Google reviews" with sr-only words so the name is the
      sentence and contains the visible text in order; variants `chip`,
      `inline`, `card`, `store`; optional `href`, `external` (new tab + sr
      "(opens in a new tab)"), `track` attrs; optional `showDate` · files:
      `src/app/ui/components/GoogleRating/GoogleRating.tsx` (+ test), components
      barrel · check: AC6, AC7 (attrs), AC10 (date only when asked).

## Placements

- [x] **T5** — `TrustStrip` accepts a leading node; `TiresHero` and the home
      hero lead with the combined chip → `/locations`
      (`google_rating_click`, surface tires/home) · files:
      `src/app/ui/components/TrustStrip/TrustStrip.tsx` (+ test),
      `src/app/(shop)/tires/container/TiresHero.tsx`,
      `src/app/(home)/container/Home/Home.tsx` · check: AC2.
- [x] **T6** — Tire page: inline figure under the price / Add to cart row
      (surface tire_page) · files:
      `src/app/ui/sections/TireInformation/TireInformation.tsx` · check: AC3.
- [x] **T7** — Cart drawer under Checkout (items only) and checkout order
      summary (surfaces cart, checkout) · files:
      `src/app/ui/sections/CartModal/CartModal.tsx` (+ test),
      `src/app/(shop)/checkout/container/Checkout/Checkout.tsx` · check: AC4.
- [x] **T8** — Store page: store figure, "Read reviews on Google" (its
      `mapLink`, new tab, `google_reviews_open` store/store_page) and "Google
      rating as of Nov 2026" · files:
      `src/app/(shop)/locations/[location]/container/LocationDetail/LocationDetail.tsx`
      · check: AC5, AC7, AC10.
- [x] **T9** — `/locations`: each card's figure + "Read reviews on Google"
      (surface locations); one fine-print date line · files:
      `src/app/(shop)/locations/page.tsx` · check: AC5, AC7, AC10.
- [x] **T10** — Home store slider: each card shows its store's figure as text
      (the card already opens the profile) · files:
      `src/app/ui/sections/LocationsSlider/locationsData.ts`,
      `src/app/ui/components/LocationCard/LocationCard.tsx`,
      `location-card.d.ts` · check: AC5.

## Docs and checks

- [x] **T11** — Docs: `tech-stack.md` (where the figures live, how to update,
      the 90-day check, the two events, no rating markup), roadmap,
      `results.md` · check: written.
- [x] **T-tests** — Tests for T1–T10; full suite green · check: `npm test`.
- [x] **T-DoD** — `npx tsc --noEmit` + `npm run lint` + `npm test` +
      `npm run build` + `npm run perf:budget` green. Manual in Chrome at 1280,
      820 and 390 px: home and `/tires` chip (first, links to `/locations`, no
      overflow), tire page, cart drawer empty vs with items, checkout summary,
      a store page (figure, link opens its profile in a new tab, date),
      `/locations`, home slider; screen-reader name; Lighthouse accessibility on
      home, `/tires`, a store page (label-in-name, contrast); GA4 events in the
      dataLayer · check: AC1–AC10.

## Traceability

| Task | Acceptance criteria |
| ---- | ------------------- |
| T1 | AC1, AC5 |
| T2 | AC1, AC6, AC9, AC10 |
| T3 | AC1, AC8, AC9 |
| T4 | AC6, AC7, AC10 |
| T5 | AC2, AC7 |
| T6 | AC3 |
| T7 | AC4 |
| T8 | AC5, AC7, AC10 |
| T9 | AC5, AC7, AC10 |
| T10 | AC5 |
| T-DoD | AC1–AC10 (manual) |
