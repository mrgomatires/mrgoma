# Plan — Set total on listing cards

> Feature: `054-set-total-on-cards` · Based on: [spec.md](./spec.md) · Created: 2026-11-19

## Technical approach

Everything a card needs already exists for the tire page and the chat; this
feature adds one pure function, one small endpoint and one line on the card.

1. **Pure: `cheapestSetWith(anchor, candidates, size)`** in `tireSets.ts` —
   the existing cheapest-set rule (`cheapestSet`: fewest patched, then lowest
   total, then nearest city, then id) restricted to sets that **contain the
   anchor** and respect the 2/32" window. The anchor is removed from the
   candidates first (the builder's pool includes the page's own tire), and the
   preferred city is the anchor's own — what the builder does with its anchor.
   `cardSetOffer(anchor, candidates)`
   returns the set of 4 if one exists, else of 2, else `null` (D1, D2), with
   `total = setTotal(set)` and the ids.
2. **Endpoint `GET /api/tires/sets?ids=…`** — the card ids of one listing
   (1–24, digits only, Zod → 400). Server side, never trusting the client:
   `fetchTiresByIds` (051) → `mapTireRecordToSingleTire` (the tire page's own
   mapper) → each tire's set group (`setGroupOf`, 041) and anchor
   (`anchorFromTire`) → the
   group's candidates through **the same cache the tire page's builder uses**
   (`getCachedSetCandidates`, 60 s) → `cardSetOffer`. Answers
   `{ offers: { [id]: { size, total, ids } } }`, only public fields, with
   `Cache-Control: public, s-maxage=60, stale-while-revalidate=60`. Distinct
   groups are fetched with a small concurrency limit (4) so a cold page never
   takes more than a few of the pool's ten connections.
3. **Client: `useSetOffers(tires)`** — one request per rendered card list,
   after the cards are on screen (D6), aborted on unmount, silent on error.
   Keyed on the sorted ids, so `/tires` paging client-side (the cards change
   without `TireCard` remounting) asks again, and a late answer for a previous
   page is dropped.
4. **Card line** in `TireCard`: a reserved line (fixed min-height, so no
   shift) that fills with **"Set of 4 · $640 total"** (D3) linking to
   `/tires/{slug}?set={ids}` — the tire page's existing `?set=` (044) opens the
   builder on that size with exactly that set, and still handles a unit sold
   in between ("1 tire of that set just sold; we picked the closest match").
   Not rendered in `TireTable` (D5).
5. **GA4:** `set_offer_select` (`data-track`) with `set_size`, `list`,
   `tire_id`.

## Reuse first

- `tireSets.ts`: `cheapestSet` tie-break, `effectiveTread`, `setTotal`,
  `MAX_TREAD_SPREAD`, `SetUnit`, `SetSize`.
- `tireSetsRepository.ts`: `setGroupOf`, `getCachedSetCandidates` (the
  builder's own candidates, so the card can never price a set the builder
  cannot open).
- `chatSets.ts`: `parseSetParam` / `resolvePresetSet` and the `?set=` link
  format (`toChatSetCard` builds the same href) — reused, not copied.
- `tiresRepository.fetchTiresByIds` + `pickTireListFields` (051 compare
  endpoint pattern: Zod, ids only, whitelisted output, `withLogging`,
  `jsonError`).
- `TireCard` — rendered only by `TireResults` (`/tires`) and `TireGrid`
  (used, new, brand, size pages), so no other screen gets the line by accident, `buildTireSlug`,
  `InteractionTracker`, `LISTS`.

## Files to add / change

- `src/app/utils/tireSets.ts` — `cheapestSetWith`, `cardSetOffer` (+ tests).
- `src/app/utils/chatSets.ts` — export the href builder used by
  `toChatSetCard` as `setHref(anchorId, brand, size, ids)` so the chat and the
  cards write the same link (+ test).
- `src/app/api/tires/sets/route.ts` (+ `route.test.ts`) — the endpoint.
- `src/app/hooks/useSetOffers.ts` (+ test) — fetch after mount, abort, silent
  failure, ids deduplicated and sorted for a stable cache key.
- `src/app/ui/sections/TireCard/TireCard.tsx` (+ test) — the reserved line
  and the link; `TireTable` untouched.
- `src/app/robots.ts` — nothing (`/api/` is already disallowed); a test
  asserts it.
- Docs: `tech-stack.md` (endpoint, event, the one set rule), roadmap,
  `results.md`.

## Data & flow

```
listing renders cards (server or client, as today)
  └─ TireCard mounts → useSetOffers([ids]) → GET /api/tires/sets?ids=…   (after paint)
        server: fetchTiresByIds → setGroupOf → getCachedSetCandidates (60 s, shared with the builder)
                → cardSetOffer(anchor, candidates): set of 4 | set of 2 | none
        ← { offers: { id: { size, total, ids } } }
  └─ card line: "Set of 4 · $640 total" → /tires/{slug}?set=a,b,c,d
        tire page → resolvePresetSet → builder open on 4, same set (or a sold unit replaced, said so)
```

- Card ids per request ≤ 24 (the listings' page sizes are 20–24).
- Distinct groups per page: typically ≤ 20; each is one cached query
  (`tireSets.candidates`, TOP 60) shared with the tire pages.

## Acceptance criteria → implementation

| AC | How it's met | How it's verified/tested |
| --- | --- | --- |
| AC1 | `cardSetOffer`: 4, else 2, else null | Unit: groups that allow 4, only 2, none |
| AC2 | Same candidates as the builder + `?set=` exact ids | Unit: `resolvePresetSet(offer.ids)` is `exact` with the same total; live script over a page of cards |
| AC3 | Fixed wording | Component test: "Set of 4 · $640 total", no "from", no "each" |
| AC4 | Link to `?set=`, builder opens on that size | Manual: tap → builder open, same total; `data-track` attrs tested |
| AC5 | Reserved one-line slot, min-height ≥ 24 px | Manual at 390 px on `/tires`, used, new, brand, size pages |
| AC6 | sr text "Set of 4, $640 total — build this set" | Component test on the accessible name |
| AC7 | Fetched after paint; failure = no line | Hook test (error → nothing); manual: response time and CLS before/after; endpoint timing cold/warm |
| AC8 | Only `tireSets.ts` decides | Guard: the card and endpoint import the rule, no local copy |
| AC9 | Not in `TireTable` | Test: table view renders no set line |

## Tradeoffs / alternatives

- **Computing on the server with the page:** one less request, but every
  listing render would wait on up to 20 more queries (D6 says never slower),
  and `/tires` is the page bots hammer.
- **`getCachedSizeUnits` (044, by size, TOP 400)** instead of group
  candidates: fewer queries, but a different pool from the builder's — the
  card could price a set whose units the builder does not have, and the link
  would arrive "replaced". Consistency wins.
- **Cheapest set of the model/size** (not containing the card's tire):
  rejected in D2.

## Risks

- **Cold cache on a busy page:** up to ~20 group queries; limited to 4 at a
  time and cached 60 s, shared with tire pages. Measure cold and warm.
- **Bots:** `/api/` is disallowed in `robots.txt`; the endpoint does nothing
  without ids and answers 400 to junk; CDN caching (`s-maxage=60`) absorbs
  repeats of the same page.
- **A set sells between listing and tap:** the tire page's `?set=` already
  replaces the unit and says so, or offers to build another.
- **Card height:** one more line on every card; on phones the line is short
  ("Set of 4 · $640 total") and its space is reserved.

## Out of scope

- One-tap "add set to cart" from the listing (D7), the table view (D5), set
  discounts, staggered sizes.

---

_The concrete steps live in [tasks.md](./tasks.md)._
