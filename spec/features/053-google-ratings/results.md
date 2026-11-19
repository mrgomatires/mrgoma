# Results — Google ratings on the site

> Feature: `053-google-ratings` · Implemented: 2026-11-18

## What shipped

- **Figures in one place:** `locationsConfig.ts`, per store
  `google: { rating, reviews, readOn: '2026-11-18' }` — Cutler Bay 4.8/2,083,
  Miami Airport 4.8/1,499, Miami Gardens 4.6/1,111, Orlando West Colonial
  4.7/635, Coral Gables 4.7/394, Hialeah 4.7/161, East Orlando 4.5/69.
- **Combined, computed:** `googleRatings.ts` — weighted mean 4.739 → **4.7**,
  **5,952** reviews; never typed (a guard checks the placement files).
- **`GoogleRating`:** SVG stars clipped to rating/5, "4.7 · 5,952 Google
  reviews"; read as "Rated 4.7 out of 5 from 5,952 Google reviews"; variants
  chip / chipOnMedia / inline / card / store; external links open in a new tab
  with ↗ and "(opens in a new tab)" for screen readers.
- **Placements:** first hero chip on home (over the video) and `/tires` →
  `/locations`; the tire page under the price / Add to cart → `/locations`;
  the cart drawer under Checkout (items only) and the checkout order summary,
  as text; each store page (its figure → its Google profile, plus "Google
  rating as of Nov 2026"); `/locations` (combined figure and date in the hero,
  each card → its profile); the home store slider (each card, as text).
- **Guards:** fails `npm test` 90 days after the newest `readOn` with "Re-read
  the Google ratings on Maps…" (first failing day 2027-02-17); no rating
  structured data anywhere in `src/` and none in the built stores/organization
  JSON-LD.

## Deviations from the plan

- **Cart and checkout show the rating as text, not a link to `/locations`.**
  The moment before paying is no time to send the buyer away, and a link in the
  cart drawer would leave it open over the next page (the 051 compare lesson).
  So those two surfaces send no event.
- **A `chipOnMedia` variant** for the home hero, matching the `onMedia` trust
  chips over the video.
- **A ↗ on external rating links**, so sighted users also know the link leaves
  the site.

## modern-web-guidance

- Real `<a href>` links; `target="_blank" rel="noopener noreferrer"` for the
  Google profiles, with the new tab said in words.
- Stars drawn with `currentColor`, so they stay visible in forced-colors mode;
  focus ring `#9dfb40` on dark, 3:1 or better.
- Accessible name = the sentence, built from screen-reader-only words around
  the visible numbers, spaces as their own text nodes (052 and 023 lessons).

## Checks

- `tsc`, lint, **2,225 tests**, build, `perf:budget` (649.8 KB of 680) green.
- Manual (Chrome, dev): home and `/tires` at 1280 and 390 — the rating is the
  first chip, links to `/locations`, no horizontal scroll (the home chip row
  wraps to four lines on a phone; the search stays in the first screen); the
  tire page; the cart drawer with items and the checkout summary (text, no
  link); a store page (4.8 · 2,083, opens its profile in a new tab,
  `google_reviews_open` / `store_page` / `cutler-bay`, the date); `/locations`
  (all seven cards, the combined figure and date, no overflow at 390); the home
  slider (all seven). The dev cart was restored afterwards.
- Lighthouse (production build): `/tires` desktop A100, `/locations` desktop
  P98 A100, tire page desktop A100, store page mobile A96, home mobile A97.
  The remaining accessibility items are the pre-existing ones listed in 052's
  results (carousel dots, "Open address link", grey on the dark store pages) —
  none comes from the rating.
- Not checked live: the GA4 events reaching the dataLayer (consent-gated in
  dev); the attributes are asserted by tests.

## To update the figures

Open each store's Google Maps profile, copy its rating and review count into
`src/app/(shop)/locations/locationsConfig.ts`, and set `readOn` to that day.
Everything else follows.
