# Results — The catalog stops pre-loading the same pages again and again

> Feature: `059-tires-prefetch-repeats` · Implemented: 2026-11-20

## T1 — Baseline (before any code)

Production build (`npm run build`, `next start` on :3457), Chrome desktop,
`performance.getEntriesByType('resource')` filtered to `?_rsc` (prefetches and
client navigations). One prefetch of a route is **2+ requests** in Next 16: a
small route tree (~0.5 KB) and one or more segment payloads, so counts below
are per route, not per request.

### How the pages are built (`next build` route table)

| Route | Type | Server cost of a prefetch |
| --- | --- | --- |
| `/tires/new` | ○ static, revalidate 1 h | edge/ISR copy, no database |
| `/tires/size` | ○ static, revalidate 5 min | same |
| `/tires/size/{size}` | ● ISR | same |
| `/tires/brands/{brand}` | ● ISR | same |
| `/tires/used` | ƒ dynamic | function render up to the loading boundary |
| `/tires/{slug}` (detail) | ƒ dynamic | **function render** (~280 ms, ~2 KB) |

058's note ("each is a server render of a dynamic route") was wrong for
`/tires/new` and `/tires/size`: both are static.

### What `/tires` prefetches

| Moment | Routes prefetched (`?_rsc`) |
| --- | --- |
| Load (6 s) | 41 requests: every header/footer page, 2 detail pages, 2 size pages, 1 brand, `/tires/new`, `/tires/used`, `/tires/size` (tree only for the last three) |
| One filter (brand) | 10 + the navigation: **`/tires/new` (full, 6.6 KB), `/tires/size` (full, 15.4 KB), `/tires/brands/pirelli` again**; 2 new detail + 2 new size pages (new cards) |
| Full scroll | 30: 18 detail pages, 9 size pages (cards coming into view, first time each), `/tires/size` **again**, `/instant-quote` |
| Three more filters | 12 + 3 navigations: **`/tires/new` again**; 4 new detail, 3 new size pages |

### Where the repeated links are

Visible in the viewport when the repeats happen:

- `/tires/new` — the **header** "New tires" link (the card "New" badges were
  off-screen or absent in these results).
- `/tires/size` — the **header** "Shop by size" link (also "See all sizes"
  links in the rail and the footer, hidden at the time).
- `/tires/brands/pirelli` — the **card** brand link.
- `/tires/used` — header + card "Used" badges: **not** repeated.

### Cause, compared with the plan

- The plan assumed the repeats came from card links to dynamic routes under
  `loading.tsx`. Measured: the two pages 058 saw repeating (`/tires/new`,
  `/tires/size`) are **static**, and the visible links that re-prefetch them
  are in the **header**. Next re-downloads them in full after client
  navigations on `/tires` (not only after re-renders of cards).
- Card size and brand links point to ISR pages: no database work; a card
  brand link does repeat (`/tires/brands/pirelli`).
- The only prefetches that cost a **server render** are the card **detail**
  links (dynamic `/tires/{slug}`): one per card as it scrolls into view — about
  20 per page plus every card scrolled past — not repeated, but the largest
  server cost here.

Decision (owner, 2026-11-20): card secondary links **and** the header's
"Used tires", "New tires", "Shop by size" pre-load on intent; the detail
links stay as they are.

## T7 — After

Same build, same method, same filter sequence (Pirelli, then three more
rail links, full scroll). Counts are `?_rsc` requests excluding the
navigations themselves (a prefetch is 1–2 requests: tree + segment).

| Moment | Before | After | What is left |
| --- | --- | --- | --- |
| Load | 40 | 32 | header/footer pages (28), 2 detail pages |
| One filter | 10 | **0** | — |
| Full scroll | 30 | 21 | detail pages of cards coming into view (18), `/tires/size` once (rail/footer "See all sizes"), `/instant-quote` (footer) |
| Three more filters | 9 | 4 | detail pages of the new cards |

By destination, whole sequence:

| Destination | Before | After |
| --- | --- | --- |
| `/tires/new` | 3 prefetches (full page twice) | **0** |
| `/tires/size` | 3 (full page twice) | 1 (footer/rail link scrolled into view) |
| `/tires/size/{size}` (card pills) | 16 | **0** |
| `/tires/brands/{brand}` (card logos) | 2 | **0** |
| `/tires/used` | 1 | **0** |
| Detail pages (card photo/title) | 26 | 24 (unchanged by design; varies with which cards show) |

**Intent** (AC3): pointer on a card's size pill → that page once (tree +
segment), nothing more while it stays; **away and back → nothing again** (the
pre-load is reused). Pointer on "Shop Tires" → "New tires" → `/tires/new`
once. Clicking the pill opened `/tires/size/255-35-21`; the card title opened
the detail page; the "Used" badge opened `/tires/used` (AC4).

**Other pages** (AC5): `/tires/used` load + a brand filter → no card or header
pre-loads (the rail's own filter links prefetch `/tires/used?brands=…`, ~1.5
KB each, 4 on load: not from this branch, noted below). `/tires/new` (no rail)
load + full scroll → only detail pages, `/tires/size` once. A size page → only
detail pages and `/tires/size` once.

**Phone width**: not measured. The browser window does not resize (as in
058). The touch path is covered by `IntentPrefetchLink.test.tsx` (touchstart
→ prefetch) and `menu.prefetch.test.tsx` (phone submenu).

## Bundle: the header almost loaded twice

First version: the header and phone menu imported `IntentPrefetchLink`, the
same module as the tire cards. Turbopack then split the header into **two
chunks loaded on every page**: `shopperPageJs` 214.9 → 227.2 KB gzip (+12.3
KB), still under the 240 KB budget. Isolated by building main, then with
each change alone: the cards' change alone added nothing; the header
importing the shared module did; the same logic inside the header did not.
Fix: the menu has its own small copy, `MenuPrefetchLink`, documented as such.
Final: `shopperPageJs` **214.9 KB (= main)**, `totalClientJs` 701.6 → 702.0 KB.

## Dashboard title (AC8)

`metadata.title = 'Dashboard'` → "Dashboard | MrGoma Tires" through the root
template; robots stay `noindex, nofollow` (test `page.test.ts`). In the
browser: the session had expired (`/dashboard` → `/login`), so the tab itself
is for the owner to check after signing in.

## Acceptance criteria

- **AC1 ✅** — one filter: 0 pre-loads from card secondary links; `/tires/new`
  and `/tires/size` not downloaded again.
- **AC2 ✅** — three more filters + full scroll: none from card secondary links
  or the three header links (`/tires/size` once from a footer/rail link, out
  of scope).
- **AC3 ✅** — once per hover; away and back did not repeat it.
- **AC4 ✅** — pill, badge and title open the right pages.
- **AC5 ✅** — `/tires/used`, `/tires/new`, a size page.
- **AC6 ✅** — `TireCard.prefetch.test.tsx` (fails when a pill is reverted to
  `Link`, tried), `menu.prefetch.test.tsx`, `IntentPrefetchLink.test.tsx`.
- **AC7 ✅** — tables above, same method.
- **AC8 ✅ in test; tab pending the owner's sign-in.**
- **AC9 ✅** — tsc, lint, 2320 tests, build, `perf:budget` (214.9 / 240),
  `npm run a11y` 100 on all pages.

## Owner's check (2026-11-20): two fixes added

- **The submenu did not mark the current page.** On `/tires/used` the "Shop
  Tires" parent turned green, but "Used tires" inside it did not (neither
  menu ever had it). Now the most specific matching child is highlighted in
  the brand green, semibold, with `aria-current="page"` — or `"true"` for a
  page inside its section (`/tires/size/225-45-18` → "Shop by size"). "All
  tires" is the parent's own page, so it counts only on `/tires` itself.
  Checked in the browser on `/tires/used`. **AC10 ✅**
- **`/tires/used`'s cards were narrower than `/tires`'s**: 720 px against
  944 px in the same 944 px results column. `/tires/used` got the filter rail
  in 052 but kept `TireGrid`'s centred 768 px cap, which `/tires` dropped when
  its rail arrived. `TireGrid` now takes `besideRail` (only `/tires/used` has a
  rail; `/tires/new`, brand and size pages keep the centred list). Measured
  after: 944 px on both. **AC11 ✅**

After these: tsc, lint, **2333 tests**, build, `perf:budget`
(`shopperPageJs` 215.1 / 240 KB, `totalClientJs` 702.2), `npm run a11y` 100.

## Found, not changed

- **Detail pages are the remaining server work**: one dynamic render
  (~280 ms, ~2 KB) per card that comes into view, ~24 in this sequence. Kept
  by decision (the card's main tap stays fast); the next lever if the pool
  needs relief.
- `/tires/used`'s rail prefetches its own filter links (`/tires/used?brands=…`,
  dynamic, 4 on load).
- Header/footer pages are prefetched on every page load (28 on `/tires`):
  static, from the edge cache, not repeated.
