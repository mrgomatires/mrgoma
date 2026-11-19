# Results — Set total on listing cards

> Feature: `054-set-total-on-cards` · Implemented: 2026-11-19

## What shipped

- **One line on every listing card** (`/tires`, used, new, brand, size pages;
  not the table view): "Set of 4 · $460 total →", else "Set of 2 · … total",
  else nothing. Its 28 px are reserved, so it arriving after the cards moves
  nothing.
- **The price is the cheapest set that includes that tire**
  (`cheapestSetWith`, the `cheapestSet` rule — fewest patched, lowest total,
  the anchor's city, id — over the 2/32" windows that hold the anchor;
  `cardSetOffer`: 4, else 2).
- **`GET /api/tires/sets?ids=`** (1–24 ids, Zod): the tire page's mapper, set
  group and candidates cache, so a card can never price a set the builder
  cannot open; public fields only; one candidate fetch per group, 4 at a time;
  `public, s-maxage=60, stale-while-revalidate=60`.
- **The tap** opens the tire page with the set builder on that size holding
  exactly that set, through the chat's existing `?set=` (now written by one
  `setHref` for both). A unit sold in between is replaced and said so by the
  page, as for chat links.
- **GA4:** `set_offer_select` with `set_size`, `list`, `tire_id`.

## Checks

- `tsc`, lint, **2,253 tests**, build, `perf:budget` (650.3 KB of 680) green.
- **Live data:** the 7 offers among `/tires`' first 11 tires — six sets of 4,
  one of 2 — each opened in the builder with **exactly the card's total**
  ($440, $460, $750, $960, $960, $510, $415), none "replaced".
- **Listings** (dev, live catalog): `/tires` 13 of 20 cards with a line
  (390 px), `/tires/used` 16/24 (390), `/tires/new` 22/24 (820), a brand
  page 12/24 (390), a size page 17/24 (820); no horizontal scroll; the table
  view shows none.
- **Tap:** `/tires` → "Set of 4 · $460 total" → the tire page opens with the
  builder on "4 tires", "Set of 4 · total $460.00", the `?set=` removed from the
  address bar.
- **Layout shift:** found the reserved slot at 24 px empty / 27 px filled (a
  3 px shift); fixed to a 28 px slot either way; CLS measured 0.0001 in dev,
  **0** in Lighthouse on `/tires` (mobile and desktop) and `/tires/used`.
- **Endpoint time** (11 ids): dev 2.7 s cold / 0.26 s warm; production build
  4.7 s on a freshly started server (database pool and caches cold) / 0.28 s
  warm. It runs after the cards paint, so the listing never waits on it.
- Lighthouse (production build): `/tires` desktop P96 A100, mobile P90 A100;
  `/tires/used` mobile A96 (the pre-existing 20 px size-pill target, listed in
  052's results).

## modern-web-guidance

- Content that arrives after the page gets stable, reserved dimensions (no
  CLS) — the slot is a fixed 28 px whether or not it fills.
- A real `<a href>` with the destination in its name ("— build this set" for
  screen readers); the dot and the arrow are decoration.

## Notes

- The desktop meta row read "Single · Free Shipping" above the new set line —
  a contradiction (owner review). It now reads "Single or set · Free
  Shipping" when the card has a set offer, and "Single · Free Shipping"
  otherwise; same line, so nothing moves when it changes.
- The first request after a deploy is slow (cold pool and caches). It only
  delays the line, never the cards; the 60 s cache, shared with the tire
  pages, absorbs the rest.
