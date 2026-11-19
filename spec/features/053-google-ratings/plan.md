# Plan — Google ratings on the site

> Feature: `053-google-ratings` · Based on: [spec.md](./spec.md) · Created: 2026-11-18

## Technical approach

One source, one formatter, one component, placed in the spots the spec names.

1. **Data in `locationsConfig.ts`** (the stores' single source of truth): each
   store gets `google: { rating, reviews, readOn }` — hand-copied from Maps,
   `readOn` as `YYYY-MM-DD`. Nothing is fetched; the figures ship in the HTML.
2. **`src/app/utils/googleRatings.ts`** (pure): `combinedRating(stores)` (the
   weighted mean, rounded to one decimal, and the total), `storeRating(slug)`,
   `ratingSentence(r)` ("Rated 4.7 out of 5 from 5,952 Google reviews"),
   `readMonth(date)` ("Nov 2026" — formatted with `timeZone: 'UTC'`, so a
   `YYYY-MM-DD` read on the 1st is not shown as the previous month in Miami), `newestReadOn(stores)`,
   `isStale(readOn, today, days = 90)`.
3. **`GoogleRating` component** (server, no client JS, no layout shift):
   - stars: five outlined stars and, above them, five filled stars clipped to
     `rating / 5` of the width — one SVG `<symbol>`-free row each, `aria-hidden`;
   - text: visible `4.7 · 5,952 Google reviews`, with screen-reader-only words
     around it so the accessible name is the sentence **and** contains the
     visible text in order (WCAG 2.5.3 — the 052 lesson): `Rated` (sr) `4.7`
     (sr ` out of 5 from`) `5,952 Google reviews`; the `·` is `aria-hidden`;
   - variants: `chip` (hero, dark), `inline` (tire page, cart, checkout —
     light), `card` (dark store cards), `store` (store page, larger);
   - `href` optional; `external` adds `target="_blank" rel="noopener"` and a
     screen-reader "(opens in a new tab)"; GA4 via `data-track`.
4. **Placements** (D2–D6):
   - `TrustStrip` gains an optional leading item (a node, not a string), used
     by `TiresHero` and the home hero — combined figure, link to `/locations`.
   - `TireInformation`: combined figure under the price / Add to cart row.
   - `CartModal`: under Checkout, only with items. `Checkout`: in the order
     summary.
   - `LocationDetail`: the store's figure + "Read reviews on Google" (its
     `mapLink`, new tab) + "Google rating as of Nov 2026".
   - `/locations` page cards: each store's figure + "Read reviews on Google";
     one fine-print line "Google ratings as of Nov 2026" under the heading.
   - Home store slider (`LocationCard` via `locationsData`): the store's figure
     as plain text (the card already opens the profile; no nested link).
5. **Guards**
   - `googleRatings.stale.guard.test.ts`: fails when `isStale(newestReadOn,
     today)`, message "Re-read the Google ratings on Maps and update
     locationsConfig.ts" (D7).
   - `noRatingMarkup.guard.test.ts`: no `aggregateRating` / `reviewRating` /
     `"Review"` in `src/` structured data builders, and the built locations
     JSON-LD has no rating key (AC8).
   - The combined figure is computed, never typed: a guard that the placement
     files (hero, tire page, cart, checkout, store page, `/locations`, slider
     card, `GoogleRating`) contain no `4.7 ·` / `5,952 Google` / `4.7 out of`
     text — scoped to those files and patterns so CSS values or coordinates
     cannot trip it.

## Reuse first

- `locationsConfig` (every store page, card, menu and JSON-LD derive from it),
  `locationsData` (home slider), `mapLink` (CID-derived Google profile link).
- `TrustStrip` (hero chips, `solid` / `onMedia` variants), `brandClaims.ts`.
- `TireInformation`, `CartModal`, `Checkout` order summary, `LocationDetail`,
  `/locations` page.
- `InteractionTracker` (`data-track`, extra `data-track-*` params forwarded).
- The sr-only-after-visible pattern from 052 (`8/32"+ minimum tread`) and the
  separate-text-node spacing rule (023).

## Files to add / change

- `src/app/(shop)/locations/locationsConfig.ts` — `google` per store
  (figures of 2026-11-18); `LocationConfig.google` type.
- `src/app/(shop)/locations/locationsConfig.test.ts` — every store has a
  rating 1–5 with one decimal, a positive integer count, a valid `readOn`.
- `src/app/utils/googleRatings.ts` (+ `.test.ts`) — the pure functions.
- `src/app/ui/components/GoogleRating/GoogleRating.tsx` (+ test) — the
  component; exported from the components barrel (no DB import).
- `src/app/ui/components/TrustStrip/TrustStrip.tsx` (+ test) — `lead?: ReactNode`.
- `src/app/(shop)/tires/container/TiresHero.tsx`, `src/app/(home)/container/Home/Home.tsx` — the lead chip.
- `src/app/ui/sections/TireInformation/TireInformation.tsx` — inline figure.
- `src/app/ui/sections/CartModal/CartModal.tsx` — under Checkout when not empty.
- `src/app/(shop)/checkout/container/Checkout/Checkout.tsx` — order summary.
- `src/app/(shop)/locations/[location]/container/LocationDetail/LocationDetail.tsx` — store figure, link, date.
- `src/app/(shop)/locations/page.tsx` — card figures, links, one date line.
- `src/app/ui/sections/LocationsSlider/locationsData.ts`,
  `src/app/ui/components/LocationCard/LocationCard.tsx` (+ `location-card.d.ts`) — store figure on the card.
- Guards: `googleRatings.stale.guard.test.ts`, `noRatingMarkup.guard.test.ts`.
- Docs: `tech-stack.md` (where ratings live, how to update, the 90-day check,
  events), roadmap, `results.md`.

## Data & flow

```
locationsConfig[i].google {rating, reviews, readOn}   ← typed by hand from Maps
        │
        ├─ googleRatings.combinedRating()  → {rating: 4.7, reviews: 5952, readOn: newest}
        │        └─ GoogleRating variant=chip|inline  (home, /tires, tire page, cart, checkout)
        └─ storeRating(slug)              → GoogleRating variant=store|card (store page, /locations, slider)
```

- Weighted mean: Σ(rating × reviews) / Σ reviews = 4.739 → **4.7**; total
  **5,952**. One decimal, rounded half up.
- No API, no request, no cache: static data in the bundle / HTML. The
  component is a server component except inside the client `CartModal` and
  `Checkout`, where it renders the same markup from props.
- GA4: `google_rating_click` (combined chip → `/locations`; `surface` home /
  tires / tire_page / cart / checkout) and `google_reviews_open` (outbound;
  `store` slug, `surface` store_page / locations). No personal data.

## Acceptance criteria → implementation

| AC | How it's met | How it's verified/tested |
| --- | --- | --- |
| AC1 | `combinedRating` from `locationsConfig` | Unit: 4.7 / 5,952; changing one store changes it; guard: no literal figures in components |
| AC2 | Lead chip in `TrustStrip` on home and `/tires` | Component test (first item, link to `/locations`); manual at 390px (no overflow) and desktop |
| AC3 | `TireInformation` inline figure | Component/source test; manual |
| AC4 | `CartModal` (non-empty only) + `Checkout` summary | `CartModal` test empty vs items; checkout source test; manual |
| AC5 | Store page, `/locations` card, slider card | Tests with Cutler Bay 4.8 · 2,083; link = its `mapLink` |
| AC6 | sr-only words around the visible text | Accessible name = "Rated 4.7 out of 5 from 5,952 Google reviews"; Lighthouse label-in-name passes |
| AC7 | `href` / `external` props, `data-track` | Tests: combined → `/locations`; store → `mapLink`, `target=_blank`, "(opens in a new tab)", event attrs |
| AC8 | No rating markup | `noRatingMarkup.guard`: builders and built JSON-LD free of rating keys |
| AC9 | `isStale(readOn, today, 90)` | Unit: 90 days passes, 91 fails; guard runs it with today |
| AC10 | `readMonth` on store page + `/locations` only | Tests: date present there, absent on chip/cart variants |

## Tradeoffs / alternatives

- **Business Profile API:** live and exact, but its content may not be stored
  over 30 days, needs allow-listing and a server round-trip per page; the
  owner chose hand-copied figures (D, memory `reference-gbp-api`).
- **`aggregateRating` markup:** rejected — self-serving reviews are ineligible
  for stars and the rating would be a claim about ourselves.
- **Stars as `★` text vs SVG:** SVG gives an exact 70% fill and a stable size;
  text stars depend on the font and cannot fill partially.
- **Failing the build when stale** (vs a test): the Vercel build would block a
  hotfix; a test fails the Definition of Done, where the team can update the
  figures before merging.

## Risks

- **The staleness test blocks unrelated work after 2027-02-16.** Intended
  (D7); the fix is a five-minute data edit. Called out in `tech-stack.md`.
- **Hero chip row on a phone:** one more chip wraps the row to a third line;
  checked at 390px, chip order keeps the rating first.
- **Contrast:** gold stars on dark (`#fbbf24` on `#0a0a0a`, ~11:1) and on white
  (`#d97706`-ish needed for 3:1); text uses the existing chip colours.
- **Cart drawer and checkout are client components:** the component must not
  import server-only code; it takes plain props. `locationsConfig` is already
  in the client bundle through the header menu (`MenuItems.ts`), so importing
  it there adds no weight — `perf:budget` confirms it in T-DoD.

## Out of scope

- Review texts, review requests, the API, rating structured data. A future
  feature could move to the API with a TTL cache if the owner wants live
  figures.

---

_The concrete steps live in [tasks.md](./tasks.md)._
