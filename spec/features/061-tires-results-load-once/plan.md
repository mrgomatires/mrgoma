# Plan — A filter on /tires loads its results once

> Feature: `061-tires-results-load-once` · Based on: [spec.md](./spec.md) · Created: 2026-11-21

## What the measurement showed (production build, 2026-11-21)

Temporary logs in `SearchResults` and `useSetOffers` plus the DB probe from
060, all reverted:

| Action on `/tires` | Requests | What happened |
| --- | --- | --- |
| Brand filter (rail link) | `/tires?_rsc` 16 KB + **`/api/tires` 10 KB** + `/api/tires/sets` | `SearchResults` **stayed mounted** (the navigation is a transition; `loading.tsx` did not show). It received the new server data as a prop and **ignored it**: its `tiresData` state is `useState(initialData)`, read once. Its `searchParams` effect then set `count=1` → `getDataTires` → `/api/tires` for the same results. |
| Page 2 (button) | same three | `setPage` → `router.replace(?page=2)` → server render + the same client re-fetch. **23 DB calls** for one click (server render with facets, the duplicate `/api/tires`, and the set offers). |
| Table view (link) | `/tires?_rsc` + `/api/tires` | Same duplicate, and the view link **dropped `page`** (`setParam` resets the page): table view always lands on page 1. |
| Sort (select) | — (by code) | `router.push(?sort=…)` → same path as a filter. |
| `/tires/used` brand filter | `/tires/used?_rsc` + `/api/tires/sets` | **No duplicate**: `TireGrid` renders the server's props directly. One set-offer request. |

**Set offers.** `/api/tires/sets` costs 1 query + 1 per distinct size on the
cards (`mapLimited` lanes), and took 0.4–5 s under the duplicate load. While
`SearchResults` re-fetched it showed `ResultsSkeleton` (`loading=true`), which
**unmounted the cards**: any set-offer request still in flight was aborted in
the browser — but the server finished its queries anyway. Under a slow pool
and quick clicks, that is the 3–4 red rows in the owner's screenshot.

## Technical approach

**1. `SearchResults` renders the server's data; it no longer fetches.**
The `/tires` server component already computes the page for the URL
(`fetchTiresServer`, which validates `page` and `pageSize`). `SearchResults`
becomes a view of its `initialData` prop (renamed `data`):
- remove `tiresData`, `loading`, `count`, `skipNextFetch`, `getDataTires`, the
  `/api/tires` fetch, `page`/`pageSize` state and refs, and the effects that
  synced state ↔ URL (`updatePaginationParams` and the `searchParams` effects);
- `page`, `pageSize`, `totalPages` come from `data` (the server's answer);
- pagination buttons and the page-size select **navigate** to the new URL
  (`?…&page=n`, `?…&pageSize=n&page=…`), keeping today's `router.replace` for
  page changes (history unchanged) and the scroll/focus to the heading.
`/api/tires` stays (the home page's size search and others may use it —
checked in `/tasks`); only `/tires`' list stops calling it.

**2. One pending state for every change: `ResultsNavigation`.**
A small client provider (`src/app/(shop)/tires/container/ResultsNavigation.tsx`)
wraps the rail, the mobile rail and the results in `page.tsx`. It owns
`useTransition` and exposes `navigate(href, { replace? })` (calls
`router.push`/`replace` with `{ scroll: false }` inside `startTransition`) and
`isPending`. Navigation in the App Router is itself a transition, so
`isPending` stays true until the new server render commits (React entangles
them — verified first in `/tasks` T2 with a quick prototype before anything is
built on it).

Who calls it:
- **Links in the rail, quick chips, applied-filter chips, "no results"
  suggestions** — unchanged `<a href>` (crawlable, middle-click, 052's
  "filtering is navigation"); the provider listens for clicks on same-page
  links inside its region with **React's `onClickCapture` on its wrapper**
  (plain left click without modifier keys, `href` starting with the page's
  path and `?`) and turns them into `navigate(href)` with `preventDefault`.
  React runs capture handlers before the `Link`'s own `onClick`, and
  `next/link` does not navigate when the event is already default-prevented —
  so there is one navigation, ours, inside the transition. One handler instead
  of editing every link component.
- **Programmatic** — sort (`ResultsHeader`), range sliders (`RangeFacet`),
  pagination and page size (`SearchResults`): call `navigate` from a hook
  `useResultsNavigation()`, which falls back to plain `router.push` when there
  is no provider (`RangeFacet` is also used on `/tires/used`).

**3. Dimmed results while pending (FR3).** In `SearchResults`, while
`isPending`: the list/table container gets `inert`, `aria-busy="true"` and
`opacity-50` with a short transition; header and pagination stay focusable
(pagination buttons disabled) so the focus moved to the heading on a page
change is not lost into inert content (modern-web-guidance: `inert` for
non-interactive regions; no live-region "Loading…" noise). The cards stay
mounted, so `useSetOffers` asks once per new set of cards, and only a request
for cards that are **replaced before it answers** is cancelled (correct: its
answer is for cards no longer shown).

**4. The set-offer route stops working for an aborted request.** In
`src/app/api/tires/sets/route.ts`, the size lanes check `request.signal.aborted`
before each query and stop, so a request cancelled by a quick second click
does not finish 10+ queries for nothing. The first `fetchTiresByIds` still
runs (it is already in flight).

**5. View switch without a server render (FR6).** `ViewToggle` becomes a client
component: same `<a href>` (now keeping `page`), and on a plain click
`window.history.pushState(null, '', href)` — which Next 16 syncs with
`useSearchParams` without a navigation (docs: "Native History API"). In
`SearchResults` the view is read from `useSearchParams()` (the server's `view`
prop stays as the first-render value). Filter links built on the server would
drop `view=table` after a client-only switch, so the provider's click handler
**carries the current `view` onto** same-page hrefs that lack it. Fixes the
"table view goes to page 1" bug too.

## Addendum — the tire page pre-load (owner's request during /implement)

**Measured** (production build, `LOG_LEVEL=debug` logs every query): hovering
a card's title makes two requests — the route tree (0.5 KB, no database) and
the page *down to its `loading.tsx`* plus the `<head>` (2.1 KB). The head
needs `generateMetadata`, which reads the tire (`tires.byId`). The click then
asks for the whole page (10.4 KB) and reads the tire again: **2 reads, 3
requests** for one opened tire. This is Next's documented default for a
dynamic page with `loading.js` (`prefetch={null}`: "Layout to first loading
boundary"; the data is never pre-loaded).

**Prototype** (`window.next.router.prefetch(href, { kind: 'full' })`, then
`push`): the hover fetched the whole page (11–14 KB, one `tires.byId`); the
click made **no request**; a click 80 ms into the pre-load reused it (no
second request). **1 read**.

**Change:** `IntentPrefetchLink` passes `prefetch={true}` (full) instead of
`null` once intent is shown **when its `href` is a tire's page with no
query** (`/tires/<id>-…`); every other link keeps `null`. Found while
measuring: Next does not reuse a full pre-load of a URL with search params
(the card's "Set of 2" link, `?set=`) — a second hover and the click both
fetched the whole page again (also with a plain `?x=1`) — so the set link
keeps the default shell pre-load. One
place covers all nine surfaces that link to a tire (cards, table, cart,
checkout, compare, other sizes, sold-tire alternative), and the menu/footer
cannot pick it up by accident — `/tires/used` is dynamic and a full pre-load
there would run the whole listing on a hover.

**Cost:** a hover without a click reads the database as today (one
`tires.byId`; the set-candidates read the page also makes is cached) but
downloads ~10 KB more. A full pre-load stays usable for 5 minutes
(`staleTimes.static` default); not changed.

**Tests:** `IntentPrefetchLink` → `true` for tire pages, `null` for `?set=`,
`null` for `/tires`, `/tires/used`, `/tires/size/…`, `/tires/brands/…`, the
menu; `false` before intent. AC11 measured in the browser.

## Addendum 2 — owner's review, round 2

**Card width.** `TireGrid` (used by `/tires/new`, brand and size pages)
centred its list in `max-w-3xl` (768 px → 720 px cards); `/tires` and
`/tires/used` put the cards in the results column beside the rail (944 px at
≥ 1280 px). Without a rail the list now uses `CENTRED_LIKE_TIRES`:
`mx-auto max-w-[62rem] px-7 sm:px-6` → 944 px of cards on a desktop, and the
same phone margins as `/tires` (16 px page + 12 px list = 28 px; 24 px from
`sm`). `/tires/new`'s heading uses the same box so it lines up. One class, in
one place; `besideRail` unchanged.

**"Shop by size".** Measured on a production build: scrolling `/tires/size`
made 563 pre-load requests for 286 size pages (1.3 MB transferred, 19 MB
uncompressed) without a click — its ~300 links were plain `next/link`s, which
060 did not cover. They become `IntentPrefetchLink` (popular + all sizes); the
breadcrumb and the empty-state link keep the default. The 060 source guard
gets the file. The search's "closest sizes" (a handful, shown after a search)
keep the default. Other pages measured the same way: 9–20 pre-loads for a full
scroll (home 37, its service and guide cards — 060 left the home page's main
links at the default); not changed.

## Reuse first

- `fetchTiresServer` (already validates `page`/`pageSize`), `createPaginatedResponse`.
- `setParam` / `filterHref.ts` for building hrefs; a `keepPage` variant for the
  view link (no `resetPage`).
- `useViewItemList` (keyed on list + offset + ids: fires for a new list without
  a remount — checked) and `TireResults`' `indexOffset` from the data's page.
- `useSetOffers` unchanged (its key logic already handles new cards).
- The 060 DB probe and `performance` resource-entry method for before/after.
- Next 16 docs: `useRouter` (navigation is a transition), "Native History API"
  (`linking-and-navigating.md`).

## Files to add / change

- `src/app/(shop)/tires/container/ResultsNavigation.tsx` (new) — provider,
  `useResultsNavigation()`, click capture, `view` carry-over; tests beside it.
- `src/app/(shop)/tires/page.tsx` — wrap rail + mobile rail + results in the
  provider.
- `src/app/(shop)/tires/container/SearchResults.tsx` — props-driven (see 1),
  dimmed state (3), view from the URL (5), pagination/page size via
  `navigate`.
- `src/app/ui/components/ResultsHeader/ResultsHeader.tsx` — sort via
  `useResultsNavigation()`.
- `src/app/ui/sections/FilterRail/RangeFacet.tsx` — sliders via
  `useResultsNavigation()` (fallback keeps `/tires/used` as today).
- `src/app/ui/components/ViewToggle/ViewToggle.tsx` — client, `pushState`,
  keeps `page`; its test updated.
- `src/app/api/tires/sets/route.ts` — stop lanes on `request.signal.aborted`;
  test.
- Tests:
  - `SearchResults` — renders the prop; **never calls `fetch('/api/tires')`**
    (FR1/FR5); a new `data` prop replaces the list without unmounting the
    cards; pending → `inert` + `aria-busy` on the list, pagination disabled.
  - `ResultsNavigation` — a plain click on a same-page link calls
    `router.push` once inside a transition; modifier-click / other paths /
    external links are left alone; `view=table` carried over.
  - `useSetOffers` — a new set of ids aborts only the previous request and
    fetches once (FR2).
  - a source guard: `SearchResults.tsx` does not reference `/api/tires`.
- `spec/features/061-tires-results-load-once/results.md` — before/after.

## Data & flow

Before: click → server render (results + facets) → `SearchResults` ignores it
→ skeleton (cards unmount, set offers aborted) → `/api/tires` → cards mount →
set offers again. After: click → `isPending` (list dimmed, inert) → server
render → new `data` prop → list updates in place → set offers once.

## Acceptance criteria → implementation

| AC | How it's met | How it's verified/tested |
| --- | --- | --- |
| AC1 | (1) no client fetch | Prod build + probe: brand filter → no `/api/tires`, one catalogue search |
| AC2 | (1)(2) page, page size, sort navigate | Same, per action |
| AC3 | (3) cards stay mounted; (4) server stops on abort | Same: one `/api/tires/sets` per change, none cancelled by the same change; `useSetOffers` test |
| AC4 | (3) | Browser with throttling: dimmed, not clickable, `aria-busy`; then replaced; SearchResults test |
| AC5 | `useViewItemList` key; `indexOffset` from data | Existing GA4 tests + a page-2 `select_item` position test |
| AC6 | — | SearchResults no-fetch test, source guard, `useSetOffers` test |
| AC7 | — | `results.md` table (filter, page, sort, view) |
| AC8 | — | tsc, lint, tests, build, `perf:budget`, a11y |
| AC9 | (5) | Browser: view switch → no request at all; URL has `view` and keeps `page` |
| AC11 | addendum: full pre-load on intent for tire pages | Prod build, debug log: hover + click → 1 `tires.byId`, no request on click; fast click reuses |
| AC12 | addendum: `isTirePageHref` decides | `IntentPrefetchLink` tests; 060 guards unchanged |
| AC13 | `TireGrid` `CENTRED_LIKE_TIRES`; new page heading | `TireGrid` test; browser widths on new, brand, size |
| AC14 | size index links → `IntentPrefetchLink` | 060 guard; browser: full scroll, then hover |
| AC10 | already one request on `/tires/used`; (4) helps quick clicks | Measured before (1) and after |

## Tradeoffs / alternatives

- **Keep the client fetch and drop the server render** (`/tires` as a client
  page): loses server-rendered results and SEO; rejected.
- **`useEffect` syncing state from the new prop** (minimal patch): still a
  second state copy and the skeleton; the duplicate would go but not the
  unmounting. Rejected for the props-driven version.
- **`useLinkStatus`** (Next): per link, not one pending state for the list.
- **`useOptimistic` for the URL**: not needed — the dimmed old list is the
  chosen feedback.

## Risks

- **`isPending` not tracking the navigation** — prototype first (T2); if it
  does not, fall back to "pending until the `data` prop changes identity"
  with a timeout.
- **A click on a same-page link that does not change the URL** (e.g. the
  active page number) — the handler ignores hrefs equal to the current URL.
- **Back/forward**: the browser's own navigation, no transition we own: no
  dimming, but results still come from the server render (no duplicate).
- **`pushState` view + server-built links**: handled by the carry-over; a test
  covers it.
- **Scroll**: `navigate` uses `{ scroll: false }` as today's calls; the page
  change keeps its scroll-to-heading.

## Out of scope

- `/tires/new`, size and brand pages (no client fetch there).
- Server-side caching of facets or results.

---

_The concrete steps live in [tasks.md](./tasks.md)._
