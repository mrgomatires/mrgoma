# Results — A filter on /tires loads its results once

> Feature: `061-tires-results-load-once` · Implemented: 2026-11-21

## Method

Production build, `next start` on :3457, Chrome desktop. A temporary probe
(`console.log` in `getPool` / `fetchTireById`) counts database calls; a
`fetch` wrapper in the page records every request and whether it was
cancelled. Each action waits 7–8 s. All probes reverted before staging.

## T1 — Before

| Action on `/tires` | Requests | DB calls (`getPool`) |
| --- | --- | --- |
| Brand filter (rail link) | `/tires?_rsc` + **`/api/tires`** + `/api/tires/sets` | 20 |
| Page 2 (button) | same three | 23 |
| Page size 10 (select) | same three | 5 |
| Sort by price (select) | same three | 11 |
| Table view (link) | `/tires?_rsc` + **`/api/tires`**, and the URL loses `page` | 3 |
| Two brand filters 1.5 s apart (list view) | 2 × `?_rsc` + **2 × `/api/tires`** + 2 × sets | 28 |
| `/tires/used` brand filter | `/tires/used?_rsc` + sets — **no duplicate** | — |

Every change on `/tires` fetched its results twice: the server render, then
`SearchResults`' own `/api/tires` (it ignores the new server data after its
first render — confirmed with temporary logs during `/plan`). No set-offer
request was cancelled locally (the local server answers fast); the owner's
screenshot under real load showed 3–4 cancelled per change, caused by the
skeleton unmounting the cards while a slow set-offer request was in flight.

Page size from page 2 goes to page 3 (`handlePageSizeChange` keeps the first
visible tire): today's behaviour, kept.

## T2 — The pending state tracks the navigation

A throwaway `startTransition(() => router.push('/tires?brands=CONTINENTAL'))`:

| Moment | Time (ms) |
| --- | --- |
| click → `isPending` true | 79,044 |
| `?_rsc` response ends | 79,721 |
| `isPending` false (new page committed) | 79,753 |

`useTransition` covers the whole App Router navigation, so the plan's
`ResultsNavigation` holds; no fallback needed.

## T13 — After

Same build-and-probe method, same actions.

| Action on `/tires` | Requests (before → after) | DB calls (before → after) |
| --- | --- | --- |
| Brand filter | rsc + **`/api/tires`** + sets → rsc + sets | 20 → 19 |
| Page 2 | rsc + **`/api/tires`** + sets → rsc + sets | 23 → 22 |
| Page size 10 | rsc + **`/api/tires`** + sets → rsc + sets | 5 → 4 |
| Sort by price | rsc + **`/api/tires`** + sets → rsc + sets | 11 → 10 |
| Table view (from page 2) | rsc + **`/api/tires`**, page lost → **nothing at all**, page kept | 3 → 0 |
| Back to list view | (another round trip) → **nothing at all** (set offers remembered) | — → 0 |
| Two filters 300 ms apart | 2 × rsc + 2 × `/api/tires` + 2 × sets → 2 × rsc + **1** sets (the superseded page never showed) | 28 → 24 |
| `/tires/used` brand filter | rsc + sets → rsc + sets (unchanged) | — |

**What this saved, honestly.** The duplicate catalogue request is gone from
every change, and the view switch no longer costs a server render. In
database calls the duplicate was **one call** per change (`/api/tires` is one
query), so the per-click total moves only from ~20 to ~19: most of a change's
database work is the server render itself (results + the rail's facet counts)
and the set offers on a cold cache. Those are the next levers, not this one.
What changed more is the browser side: ~10 KB less per change, no skeleton
flash, cards updated in place, and set offers asked for once.

**Dimmed state** (AC4): 30 ms after a filter click the list had
`aria-busy="true"`, `inert`, the opacity transition running, and pagination
disabled; after the new page arrived all were back to normal. Screenshot during
the load showed the cards faded, the rail and header untouched.

**Set offers** (AC3, AC10): one request per change everywhere; none cancelled
by its own change. A request for cards that are replaced before it answers is
cancelled by the browser and the route now stops its size queries
(`request.signal`, unit-tested; the local server answered too fast to catch
one live). `/tires/used`: one request, none cancelled, before and after.

## Production vs local, side by side (owner's request)

www.mrgomatires.com (runs PR #209 / 048) and the local build (061), same
database. Browse only on production — no cart, no forms.

**Pages loaded directly — identical:**

| URL | Both |
| --- | --- |
| `/tires` | Showing 20 of 6,912 · Page 1 of 346 · same first 6 tires |
| `?brands=MICHELIN` | 20 of 513 · Page 1 of 26 · same first 6 |
| `?brands=MICHELIN&page=2&pageSize=20` | Page 2 of 26 · same first 6 |
| `?brands=MICHELIN&sort=price-asc` | same order |
| `?brands=MICHELIN&page=3&pageSize=10` | Page 3 of 52 · same first 6 |
| `?w=225&s=45&d=18` | 5 of 5 · same 5 |
| `?brands=MICHELIN&w=999` (nothing matches) | "No Tires Found" + the same suggestion |
| `/tires/used` | the same 24 tires in the same order · "View all 3845 used tires" |

**The same clicks on both** (rail filter → page 2 → page size 10 → sort →
next page → table → list → remove chip / clear): same URL, count, pagination
and first tires at every step, except:
- **Table view**: production goes back to page 1 (the bug fixed here); local
  stays on page 2.
- **"Not patched" quick chip**: not on production (added after 048).

**Price range slider** (keyboard, 3 steps): both `minPrice=73`, 509 results,
same scroll. **Back button**: both return to `?brands=MICHELIN`, 513.

**Scroll after each change** (from mid-page), production → local:

| Change | Production | Local |
| --- | --- | --- |
| Rail filter | → 65 | → 65 |
| Sort | stays | stays |
| Table / List | → 65 | → 65 (first build stayed put; fixed to match) |
| Page 2 (from the pagination) | → 0 | → 0 |
| Page size | stays | stays |
| Remove a chip | → 65 | → 65 |

Found by this comparison and fixed before finishing: the first version scrolled
nowhere on a filter (`scroll: false` for everything) and the view switch
stayed in place; production scrolls to the results. Links now keep
`next/link`'s default scroll and the view switch scrolls `<main>` into view.

**Cards** (first four on `?brands=MICHELIN`): same condition, size, stock,
title, price, life, tread, patched, run-flat. Local adds "Compare" and the set
offer line ("Set of 2 · $465 total") — 049–054, not production yet.

**Local only**: Add to Cart (cart 3 → 4, button "✓ In Cart") and Compare (tray
opens) work; both undone afterwards.

**Not checked:** phone width (the window does not resize, as in 058–060; the
mobile filter panel sits inside the same `ResultsNavigation` region);
GA4 events in the browser (they need the consent banner accepted — covered by
tests: `view_item_list` keys on the ids, `select_item` positions from the
data's page, page-2 test).

## Acceptance criteria

- **AC1 ✅** — filter: no `/api/tires`; one catalogue search (19 DB calls vs 20).
- **AC2 ✅** — page, page size, sort: same.
- **AC3 ✅** — one set-offer request per change, none cancelled by its change;
  the route stops on abort (unit test).
- **AC4 ✅** — dimmed, inert, `aria-busy`, pagination disabled; restored.
- **AC5 ✅** — GA4 by tests (offset from the data's page; `view_item_list` key).
- **AC6 ✅** — no-fetch test, source guard, `useSetOffers` tests, route test.
- **AC7 ✅** — tables above.
- **AC8 ✅** — tsc, lint, 2404 tests, build, `perf:budget` (215.1 / 225 KB),
  `npm run a11y`.
- **AC9 ✅** — list ↔ table: no request at all, page kept, same scroll as production.
- **AC10 ✅** — `/tires/used`: one set-offer request, none cancelled.

## Addendum — opening a tire after hovering it (AC11, AC12)

Owner's observation during the review: hovering a card pre-loaded the tire,
and the click loaded it again. Production build, `LOG_LEVEL=debug` (every
query logged, no code probe), Pirelli 245/35/20 (#406198) on
`/tires?brands=PIRELLI`.

**Before** (060's intent pre-load, Next's default for a dynamic page):

| Step | Requests | Size | `tires.byId` |
| --- | --- | --- | --- |
| Hover the title | route tree + page down to `loading.tsx` with the `<head>` | 0.5 KB + 2.1 KB | 1 (the `<title>` needs the tire) |
| Click | the whole page | 10.4 KB | 1 |
| **Hover + click** | 3 | | **2** |

**After** (`prefetch={true}` on intent for a tire page with no query):

| Step | Requests | Size | `tires.byId` |
| --- | --- | --- | --- |
| Hover the title | route tree + the whole page | 0.5 KB + 11 KB | 1 |
| Hover again | nothing | — | 0 |
| Click | **nothing**; the page shows at once, no skeleton | — | **0** |
| Hover then immediate click (pre-load still on its way) | the pre-load is reused, no second request | — | 1 in total |
| **Hover + click** | 2 | | **1** |

The opened page matched production for the same tire: title, price $170,
"1 in stock", condition, life, tread, patched, run-flat, "Located in Miami",
#253946.

**Found while measuring — links with a query keep the default.** Next does
not reuse a full pre-load of a URL with search params: on the card's "Set of
2" link (`?set=…`) a second hover and the click each fetched the whole page
again (same with a plain `?x=1` through `router.prefetch`). There a full
pre-load would cost more than today, so `IntentPrefetchLink` pre-loads in full
only `/tires/<id>-…` with no query; the set link stays at the shell (1
request, measured after the change).

**Unchanged (AC12):** a card's "Used" pill (`/tires/used`, dynamic) still
pre-loads only the shell on hover (0.4 KB + 1.5 KB); menu, footer, size and
brand links keep `null`; nothing pre-loads before intent (tests).

**Cost, honestly:** a hover with no click reads the tire once, as before, but
downloads ~10 KB instead of ~2 KB, and the page's set-candidate query runs
(it is cached server-side). A pre-loaded page is reused for up to 5 minutes
(`staleTimes.static`), so after a long pause between hover and click the
price and stock shown can be that old; checkout validates the tire again.

- **AC11 ✅** — hover + click: 1 read (was 2), no request on the click; fast
  click reuses the pre-load.
- **AC12 ✅** — `IntentPrefetchLink` tests (tire page `true`; `?set=`,
  `/tires`, used, new, size, brand, menu `null`; `false` before intent);
  `/tires/used` shell measured.

## Addendum 2 — owner's review, round 2 (AC13, AC14)

**Card width** (window 1398 px, production build):

| Page | Before | After |
| --- | --- | --- |
| `/tires` | 944 px | 944 px |
| `/tires/used` | 944 px (fixed in 059) | 944 px |
| `/tires/new` | **720 px** | 944 px, heading aligned (x = 227 both) |
| `/tires/brands/pirelli` | **720 px** | 944 px |
| `/tires/size/315-30-22` | **720 px** | 944 px |

`/tires/used` on the owner's dev server (:3000) also measured 944 px; the
720 px seen there would be production (059 is not deployed). Phones not
checked (the window does not resize); the margins are `/tires`'s by
construction (28 px, 24 px from `sm`).

**"Shop by size" pre-loads** (full scroll from top to bottom):

| | Requests | Transferred | Uncompressed |
| --- | --- | --- | --- |
| Before | **563** (286 size pages) | 1.3 MB | 19 MB |
| After | 6 (header logo and `/locations`, as on every page) | 27 KB | — |

Hovering a size then pre-loads its route tree (744 B, usually already in the
browser cache); the click fetches the static page (11 KB transferred) — from
the CDN on Vercel, no database. A size page sits under `/tires/loading.tsx`,
so Next's default intent pre-load stops at that boundary; a full pre-load was
not chosen here, because sweeping the cursor across a grid of 300 sizes would
download ~77 KB per size touched.

**Other pages, full scroll** (pre-load requests, same method): size page 11,
brand page 9, `/tires/new` 9, `/tires/used` 12, `/tires` 10, `/guides` 20,
`/locations` 15, `/services` 16, home 37 (service and guide cards — 060 kept
the home page's main links at the default). Not changed.

**Requests that look doubled.** A static page's pre-load is split by Next 16
into segments — route tree, each layout, the page (`.next/server/app/
index.segments/`: `_tree`, `_index`, `(home)`, `__PAGE__`) — each one a request
to the same URL; a tire page's hover is the tree plus the page. In
`next dev`, React's Strict Mode also mounts every component twice, which
aborts and repeats the first set-offer request; neither happens twice in a
production build.

- **AC13 ✅** — widths above; `TireGrid` test.
- **AC14 ✅** — 563 → 6 on scroll; hover starts the pre-load; 060 guard
  covers the file.

## Found, not changed

- **Two filters clicked within a fraction of a second**: the second link was
  built for the page on screen, so the result has the second filter but not
  the first (Michelin + Goodyear clicked 300 ms apart gave Michelin +
  Bridgestone…). Production does the same with any `next/link`: links describe
  the page that is showing. The rail is left clickable on purpose (blocking it
  would stop a buyer changing their mind).
- **Most of a change's database work** is the server render's facet counts and
  the set offers on a cold cache, not the results query.
