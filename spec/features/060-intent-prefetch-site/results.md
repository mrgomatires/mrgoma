# Results — Pages load in the background only when the shopper is about to open them

> Feature: `060-intent-prefetch-site` · Implemented: 2026-11-21

## Method

Production build (`npm run build`, `next start` on :3457), Chrome desktop. A
temporary probe (`console.log` in `getPool` and `fetchTireById`, reverted
before staging) counts database reads. Per page: load, wait 5 s, scroll to the
bottom in 400 px steps, wait 4 s. Requests are the page's `?_rsc` resource
entries (pre-loads; Next 16 sends 1–2 per route: tree + segment), grouped by
where the link lives: **tire** (`/tires/{id}`), **menu** (header), **footer**
(only in the footer), **body** (in `<main>`, wins over header/footer when a
page links the same URL in both).

## T1 — Before

| Page | Tire pages | Menu | Footer | Body | Total | `fetchTireById` from pre-loads |
| --- | --- | --- | --- | --- | --- | --- |
| `/tires` | 20 routes, 22 req, 43.0 KB | 12 / 24 / 90.4 KB | 2 / 4 / 7.2 KB | 2 / 3 / 7.0 KB | 53 req, 147.6 KB | **20** |
| Size page (`/tires/size/225-45-18`) | 5 / 7 / 11.6 KB | 11 / 20 / 67.4 KB | 1 / 2 / 5.0 KB | 4 / 10 / 32.5 KB | 39 req, 116.5 KB | **5** |
| Tire page (`/tires/514085-…`) | 2 / 2 / 4.2 KB | 12 / 22 / 63.3 KB | 2 / 4 / 7.2 KB | 3 / 8 / 36.6 KB | 36 req, 111.3 KB | **2** (+1 for the page itself) |
| Home (`/`) | 0 | 9 / 15 / 49.0 KB | 2 / 4 / 7.2 KB | 18 / 33 / 103.7 KB | 52 req, 159.8 KB | 0 |
| Store page (`/locations/hialeah`) | 0 | 11 / 21 / 57.4 KB | 2 / 4 / 7.2 KB | 11 / 18 / 86.7 KB | 43 req, 151.2 KB | 0 |
| `/tires/used` | 24 routes | — | — | — | — | **24** |
| `/tires/new` | 24 routes | — | — | — | — | **24** |
| Brand page (`/tires/brands/michelin`) | 24 routes | — | — | — | — | **24** |

Each `fetchTireById` matched, id for id, a tire page that was pre-loaded.

## T11 — After

Same build-and-probe method, same pages, same order.

| Page | Tire pages | Menu | Footer | Body | Total | `fetchTireById` from pre-loads |
| --- | --- | --- | --- | --- | --- | --- |
| `/tires` | **0** | 1 route (`/`, the logo) / 4 req / 25.4 KB | **0** | 1 / 3 / 11.9 KB | 7 req, 37.3 KB (was 53, 147.6) | **0** (was 20) |
| Size page | **0** | **0** | **0** | 4 / 11 / 35.2 KB | 11 req, 35.2 KB (was 39, 116.5) | **0** (was 5) |
| Tire page | **0** | **0** | **0** | 2 / 7 / 37.3 KB | 7 req, 37.3 KB (was 36, 111.3) | **0** (was 2; the page's own read stays) |
| Home | 0 | **0** | **0** | 18 / 33 / 98.1 KB | 33 req, 98.1 KB (was 52, 159.8) | 0 |
| Store page | 0 | **0** | **0** | 11 / 19 / 89.3 KB | 19 req, 89.3 KB (was 43, 151.2) | 0 |
| `/tires/used` | **0** (was 24) | | | | | **0** (was 24) |
| `/tires/new` | **0** (was 24) | | | | | **0** (was 24) |
| Brand page | **0** (was 24) | | | | | **0** (was 24) |

**Database reads caused by pre-loads across the eight pages: 99 → 0.**
`getPool` calls (every query, the pages' own included) fell from 54 to 27 on
the first five pages and from 127 to 51 on the last three.

What is left is the **body**: links in `<main>` that this feature keeps (the
home page's buttons and cards to stores, services and guides; a store page's
services; a tire page's "View all"). All static pages from Vercel's cache, no
database. The logo's home page is the one menu pre-load left, on purpose.

**Intent and clicks** (AC4, AC6):
- **Intent:** pointer on a card title → that tire page pre-loaded once.
- **Clicks** open the right page:
  - the title, and the photo, open the tire page;
  - "About us" in the menu;
  - "Contact" in the footer;
  - a cart item opens its tire page; the cart's "Checkout" link is still there.
- **GA4:** the `select_item` tests on the photo and title pass, unchanged.
- **404:** an unknown URL shows the standard sticky header (AC12).

**Phone width**: not measured; the browser window does not resize (as in
058–059). Phones have no hover: pre-load starts on touch
(`IntentPrefetchLink.test.tsx`); the phone menu is not rendered until opened.

## Guards (T10, AC8)

- **Duplicate check, on a real build:** a copy of the header's marker was put
  for one build into the cookie banner, which every page loads.
  `perf:budget` failed: `site header in 2 chunks of /about-us`, and the same
  for `/contact`. The marker was then removed.
- **Unit tests** cover once / twice / none.
- **The 404 revert did not reproduce the duplicate.** With the final code,
  building with the old root 404 (importing `Header` directly) gave
  215.1 KB and no duplicate. The likely reason: `IntentPrefetchLink` is now
  also used by server components (footer, other sizes, sold alternative), so
  Turbopack gives it a chunk of its own instead of copying it into the header.
  The 404 fix stays: it is the cause seen in the planning builds (226.9 KB →
  214.6 KB) and keeps the header to one entry. `notFound.guard.test.ts` keeps
  it that way.
- **Limit**: `shopperPageJs` 240 → 225 KB; 059's duplicate measured 227.2 KB, so
  it would now fail. Today: 215.1 KB.

## Production baseline (Vercel, human traffic, 9–21 Nov 2026)

Production runs PR #209 (048): every link pre-loads on sight. `bot_category`
empty = people:

| Route | Requests | Real page views (Web Analytics) |
| --- | --- | --- |
| `/tires/[slug].rsc` (tire-page data: pre-loads + client navigations) | 11,193 | 1,857 tire page views |
| `/locations/[location]` | 20,957 | 232 |
| `/` | 17,365 | 1,039 |
| `/legal-policies` | 11,310 | < 12 |
| `/services` | 6,682 | 149 |
| `/locations` | 6,124 | 63 |
| `/contact` | 4,976 | 61 |
| `/about-us` | 4,954 | 21 |
| `/guides` | 4,785 | 12 |

For scale: bots made ~162k requests to tire pages in the same period (AI
crawlers 86k, search engines 31k, SEO tools 20k); they do not pre-load.

**Follow-up (FR7):** 1–2 weeks after the deploy that contains 060, run the same
two Vercel queries (`vercel.request.count` by route with `bot_category eq ''`,
and `vercel.analytics_pageview.count` by route) and add an "after" column.

## Acceptance criteria

- **AC1 ✅** — `/tires`: 0 tire pre-loads, 0 reads (was 20).
- **AC2 ✅** — size, brand, used, new: 0 (were 5, 24, 24, 24).
- **AC3 ✅** — tire page: 0 (was 2).
- **AC4 ✅** — hover → one pre-load.
- **AC5 ✅** — store page: 0 from menu/footer (was 21 req / 57 KB from the menu
  by this method; 30 / 119 KB in the analysis, which counted shared links as
  menu); body links counted apart.
- **AC6 ✅** — clicks and `select_item` as before.
- **AC7 ✅** — `TireCard.prefetch.test.tsx` (detail links, tried with a revert),
  `menu.prefetch.test.tsx`, `intentPrefetch.guard.test.ts` (every surface;
  tried with a revert), `IntentPrefetchLink.test.tsx`.
- **AC8 ✅** — 215.1 / 225 KB; the duplicate check fails on a real duplicate.
- **AC9 ✅** — tables above.
- **AC10 ✅** — production baseline and follow-up above; the follow-up itself
  is after release.
- **AC11 ✅** — tsc, lint, 2353 tests, build, `perf:budget`, `npm run a11y`.
- **AC12 ✅** — the 404 shows the standard header.

