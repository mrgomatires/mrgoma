# Plan — Pages load in the background only when the shopper is about to open them

> Feature: `060-intent-prefetch-site` · Based on: [spec.md](./spec.md) · Created: 2026-11-21

## Technical approach

**One component, everywhere: `IntentPrefetchLink`** (059,
`src/app/ui/components/IntentPrefetchLink/`). `next/link` with
`prefetch={false}` until `mouseenter` / `touchstart`, then Next's default. Every
in-scope link swaps `Link` for it; href, classes, `onClick` (GA4
`select_item`) and children stay as they are.

**Why one component is possible now (grounded in two builds, 2026-11-21).** In
059 the header loaded twice (+12 KB) when it imported the module the cards
use, so the menu got its own copy (`MenuPrefetchLink`). Experiments while
planning:

| Build | `shopperPageJs` |
| --- | --- |
| main | 214.9 KB |
| cards import the menu's module (one shared module) | **226.9 KB** — header in two chunks again |
| same, and the root 404 renders `StickyHeader` instead of `Header` | **214.6 KB** — no duplicate |

The cause is not the shared module: the header was entered from **two
client-component boundaries** — `StickyHeader` (every layout) and the root
`not-found.tsx`, which imports `Header` directly. Any new shared dependency
made Turbopack emit one header chunk per entry, and every page loads both
(the root not-found is part of every page's tree). So:

1. `src/app/not-found.tsx` renders `<StickyHeader />` like `(home)` and `(shop)`
   layouts. Visible effect on the 404 only: the `TopHeader` bar goes away and
   the header becomes sticky — exactly what every other page already shows
   (`StickyHeader` hides `TopHeader` "until we have unique content").
2. `MenuPrefetchLink` is deleted; the menu, the cart and the footer use
   `IntentPrefetchLink` like the rest.
3. The new duplicate check (below) proves it stays that way.

**Link inventory (what changes).**

| Surface | File | Links → intent |
| --- | --- | --- |
| Tire cards (all listings) | `ui/sections/TireCard/TireCard.tsx` | photo + title detail links (secondary links already, 059) |
| Table view | `ui/components/TireTable/TireTable.tsx` | row detail link |
| Other sizes (tire page) | `ui/sections/OtherSizes/OtherSizes.tsx` | detail link |
| Sold-tire alternative | `ui/sections/TireSet/SoldTireAlternative.tsx` | detail link |
| Compare dialog | `ui/sections/CompareTray/CompareDialog.tsx` | detail link |
| Cart panel | `ui/sections/CartModal/CartModal.tsx` | the 2 item detail links (**not** "Checkout") |
| Checkout page | `(shop)/checkout/container/Checkout/Checkout.tsx` | item detail links only (not "/tires" / "/" continue links) |
| Desktop menu | `ui/sections/Header/Header.tsx` | top-level items, dropdown children, "View all locations" (**not** the logo) |
| Phone menu | `ui/sections/MenuMobile/components/MenuItem.tsx` | top-level items and submenu children (`MenuHeader`'s logo kept) |
| Footer | `ui/sections/Footer/FooterSection.tsx`, `Footer.tsx` | section links, Terms / Privacy |

Not changed: the set builder's links to other tires are plain
`<a target="_blank">` (Next never prefetches them); `CtaButton` on the tire
page links to the page itself; the logo; home hero buttons; "View all …";
pagination; filter rail; cart "Checkout".

**`MenuChild.prefetchOnIntent` goes away.** With every menu link on intent the
flag no longer selects anything; `Header` and `MenuItem` render
`IntentPrefetchLink` for all items. `currentChild` (059) is untouched.

**Guards (FR6).**
- `perf-budget.json`: `shopperPageJs.limitKB` 240 → **225** (today 214.9; 059's
  duplicate would be 227 → fails). Note updated.
- `scripts/perf-budget.mjs`: `LAYOUT_MARKERS` — strings that exist once in a
  layout component and survive minification, in the same style as the
  existing `FORBIDDEN` markers: `data-nav-menu` (Header), `cart-modal-title`
  (CartModal). A pure `findDuplicatedLayout(chunks)` reports a marker found in
  more than one chunk of one shopper page; `main()` fails on it with a message
  pointing at the 060 note in `tech-stack.md`. Unit-tested in
  `src/perf-budget.test.ts`.
- `spec/tech-stack.md`: a short rule — a layout component must have **one**
  client entry (render `StickyHeader`, never `Header` directly) and why.

## Reuse first

- `IntentPrefetchLink` (059) and its tests; `next/link` semantics documented in
  `node_modules/next/dist/docs/01-app/02-guides/prefetching.md`.
- `perf-budget.mjs` marker scan (`FORBIDDEN`, `findForbidden`, `chunksOf`) and
  its test file for the duplicate check.
- `StickyHeader` for the root 404.
- 059's measurement method (production build, `performance` resource entries)
  and the temporary DB probe from the 2026-11-21 analysis (log in `getPool` /
  `fetchTireById`, never committed).
- 059's prefetch test pattern: `next/link` mocked to expose `prefetch` as a
  data attribute.

## Files to add / change

- `src/app/not-found.tsx` — `StickyHeader` instead of `TopHeader` + `Header`.
- `src/app/ui/components/MenuPrefetchLink/` — deleted.
- `src/app/ui/components/IntentPrefetchLink/IntentPrefetchLink.tsx` — comment:
  one component site-wide, the 404 cause, link to the guard.
- Link swaps: `TireCard.tsx`, `TireTable.tsx`, `OtherSizes.tsx`,
  `SoldTireAlternative.tsx`, `CompareDialog.tsx`, `CartModal.tsx`,
  `Checkout.tsx`, `Header.tsx`, `MenuItem.tsx`, `FooterSection.tsx`,
  `Footer.tsx`.
- `src/app/ui/sections/Header/MenuItems.ts` — remove `prefetchOnIntent`.
- Tests:
  - `TireCard.prefetch.test.tsx` — detail links now `prefetch=false` too (the
    059 test asserted the opposite; updated).
  - `menu.prefetch.test.tsx` — every menu link but the logo waits for intent,
    desktop and phone.
  - new `prefetch.sites.test.tsx` (one file, `next/link` mocked): table view,
    other sizes, sold alternative, compare dialog, cart panel (item links
    intent, Checkout default), footer (all intent).
  - Checkout page: assert in its existing test file if it renders items there;
    otherwise in `prefetch.sites.test.tsx`.
  - `src/perf-budget.test.ts` — `findDuplicatedLayout` cases.
  - root 404: renders the site header (`StickyHeader`).
- `scripts/perf-budget.mjs`, `perf-budget.json` — guards above.
- `spec/tech-stack.md` — layout single-entry rule + intent-prefetch default;
  fix the stale "`shopperPageJs` ≤ 320 KB" to 225 KB.
- `spec/features/060-intent-prefetch-site/results.md` — before/after, the
  production baseline (9–21 Nov) and the dated follow-up.

## Data & flow

No API, query or DB change. Before: a link enters the viewport → Next
prefetches its route (a tire page: function render up to `loading.tsx`
including metadata → `fetchTireById`; a static page: CDN). After: nothing
until hover / touch → that one route → click navigates as today.

## Acceptance criteria → implementation

| AC | How it's met | How it's verified/tested |
| --- | --- | --- |
| AC1 | TireCard detail links → intent | Prod build + DB probe: `/tires` load + full scroll → 0 tire prefetches, 0 `fetchTireById` from prefetch (before: 20) |
| AC2 | Same card on every listing | Same method on a size page, a brand page, `/tires/used`, `/tires/new` |
| AC3 | OtherSizes, SoldTireAlternative → intent | Tire page load + scroll → 0 tire prefetches (before: 2) |
| AC4 | `IntentPrefetchLink` | Unit test (059) + browser hover on a card title → 1 prefetch |
| AC5 | Header, MenuItem, Footer → intent | Store page load + scroll: 0 prefetches from menu/footer (before ~30 req / 119 KB); body links counted apart |
| AC6 | Same href/classes/onClick | Existing TireCard GA4 test (`select_item` from photo and title) + browser clicks |
| AC7 | — | `TireCard.prefetch`, `menu.prefetch`, `prefetch.sites` tests; one revert tried |
| AC8 | Limit 225 + `findDuplicatedLayout` | `perf:budget` green; revert the 404 change once → duplicate check and the limit both fail; restore |
| AC9 | — | `results.md` table: `/tires`, size page, tire page, home, store page — requests, KB, DB queries |
| AC10 | — | `results.md` baseline + follow-up date; memory note |
| AC11 | — | tsc, lint, tests, build, `perf:budget`, `npm run a11y` |
| AC12 | Root 404 renders `StickyHeader` | Test on `not-found.tsx`; browser: an unknown URL shows the standard header; duplicate check green |

## Tradeoffs / alternatives

- **Two copies (059's way)** — would work without touching the 404, but it
  keeps a latent trap: any future shared dependency of the header re-triggers
  the duplicate. Fixing the double entry removes the cause.
- **Global `staleTimes` / Next config** — does not stop viewport prefetch;
  rejected in 059.
- **Leaving tire-page prefetch and making it cheaper** (e.g. metadata without
  the DB) — would still cost a function per visible card and change SEO
  metadata code; out of scope.
- **Speculation Rules API** — for full-document navigations; Next's client
  navigation uses its own prefetch, so it does not apply here.

## Risks

- **Main tap on a tire card**: no skeleton pre-loaded; on desktop the hover
  starts it ~200–300 ms early, on phones at touch. Accepted (spec, analysis).
- **The 404 looks slightly different** (no `TopHeader` bar, sticky header) —
  the same as every other page; confirm in the browser.
- **A marker string renamed** (e.g. `data-nav-menu`) makes the duplicate check
  silently pass: the check also fails if a marker is found in **no** chunk of
  a page (it must find each exactly once).
- **Turbopack may still split differently for another component** — the
  lowered limit is the backstop.
- **Hover on many cards while moving the mouse** — a few prefetches, each once.

## Out of scope

- Server cost of tire pages from bots (86k AI-crawler requests / 2 weeks).
- The Vercel Firewall challenge volume on `/tires` (73.9M / 2 weeks).
- The production comparison itself (after release, FR7).

---

_The concrete steps live in [tasks.md](./tasks.md)._
