# Tasks — A filter on /tires loads its results once

> Feature: `061-tires-results-load-once` · Based on: [plan.md](./plan.md) · Created: 2026-11-21

Ordered, **very small, independently verifiable** tasks. Check each off as it is
completed.

- [x] **T1** — Baseline: production build with the 060 DB probe (`getPool`,
  `fetchTireById`; never staged). On `/tires`: a brand filter, page 2, page
  size 10, a sort, the table view switch; on `/tires/used`: a brand filter.
  For each: `?_rsc`, `/api/tires`, `/api/tires/sets` (cancelled or not) and
  `getPool` calls. Also one quick double click (two filters < 1 s apart) to
  reproduce cancelled set offers. Write the "before" table in `results.md`
  (the planning measurement goes in as context). · files: `results.md` ·
  check: table written; probe reverted.
- [x] **T2** — Prototype check (throwaway, not staged): in a production build,
  a `startTransition(() => router.push(...))` from a client component on
  `/tires` keeps `isPending` true until the new server render commits (log the
  pending → idle moment against the `?_rsc` response time). · check: observed
  and written in `results.md`; if it fails, switch the plan to the fallback
  ("pending until the data prop changes", with a timeout) before T3.
- [x] **T3** — `ResultsNavigation` provider + `useResultsNavigation()`:
  `navigate(href, { replace? })` in a transition with `{ scroll: false }`,
  `isPending`; fallback to plain `router.push`/`replace` without a provider;
  click capture for plain left clicks on same-page `?` links inside its region
  (ignores modifier keys, other paths, `target`, external, and an href equal to
  the current URL); carries the current `view` onto hrefs that lack it. Uses
  React `onClickCapture` on its wrapper; a test renders a real `next/link`
  inside it and asserts **one** `router.push` (ours), not two. ·
  files: `src/app/(shop)/tires/container/ResultsNavigation.tsx`, its test ·
  check: tests for each rule green.
- [x] **T4** — `page.tsx` wraps the rail, the mobile rail and the results
  column in `ResultsNavigation`. · files: `src/app/(shop)/tires/page.tsx` ·
  check: `/tires` renders the same (tests + build).
- [x] **T5** — `SearchResults` props-driven: render `data` (the server's page);
  remove the client fetch, its state, `skipNextFetch`, `count`, the page /
  page-size state, refs and URL-sync effects; `page`, `pageSize`,
  `totalPages` from `data`; pagination and page size call `navigate`
  (`replace` for page changes, as today), keep the scroll/focus to the
  heading. · files: `src/app/(shop)/tires/container/SearchResults.tsx` and its
  tests · check: test "never fetches `/api/tires`"; a new `data` prop
  replaces the list without remounting the cards; with page-2 data the cards'
  positions start at `pageSize + 1` (GA4 `select_item`, AC5); existing tests
  green.
- [x] **T6** — Dimmed state: while `isPending`, the list/table container has
  `inert`, `aria-busy="true"` and reduced opacity (short transition);
  pagination buttons disabled; header not inert. · files: `SearchResults.tsx`,
  test · check: test with a pending provider.
- [x] **T7** — Sort via `useResultsNavigation()`. · files:
  `src/app/ui/components/ResultsHeader/ResultsHeader.tsx`, test · check: sort
  change calls `navigate` once with `page` reset; fallback without provider.
- [x] **T8** — Range sliders via `useResultsNavigation()`. · files:
  `src/app/ui/sections/FilterRail/RangeFacet.tsx`, test · check: same; on
  `/tires/used` (no provider) still `router.push`.
- [x] **T9** — View switch: `ViewToggle` client component, same `<a href>` now
  keeping `page`; plain click → `history.pushState`; `SearchResults` reads the
  view from `useSearchParams()` (server value as the first render). · files:
  `ViewToggle.tsx` + test, `filterHref.ts` (a setter that keeps the page),
  `SearchResults.tsx` · check: tests: href keeps `page`; a click pushes state
  and does not call the router; `SearchResults` switches layout from the URL.
- [x] **T10** — Set-offer route: size lanes stop when `request.signal` is
  aborted. · files: `src/app/api/tires/sets/route.ts`, its test · check: test
  with an aborted signal → no lane query after the abort.
- [x] **T11** — `useSetOffers` test: new ids abort only the previous request and
  fetch once; same ids don't refetch. · files: `useSetOffers` test · check:
  green.
- [x] **T12** — Source guard: `SearchResults.tsx` does not reference
  `/api/tires`; `/tires` page renders `ResultsNavigation`. · files:
  `src/app/(shop)/tires/tiresPage.guard.test.ts` · check: green; fails if the
  fetch comes back.
- [x] **T13** — After: same method as T1 (probe, same actions, the quick double
  click); browser with network throttling for the dimmed state (dimmed, not
  clickable, `aria-busy`, replaced with the right count/pagination); table ↔
  list with no request and `page` kept; GA4: `view_item_list` once per new
  list, `select_item` position on page 2; `/tires/used` filter. Phone width if
  the window resizes (else state it). Probe reverted. **Side by side with
  production** (owner's request, 2026-11-21): on www.mrgomatires.com and the
  local build, the same steps on `/tires` and `/tires/used` — rail filters,
  quick chips, applied-filter chips and "Clear all", ranges, sort, pagination
  and page size, list/table, a filter with no results and its suggestions,
  cards (photo, title, badges, set offer, Add to Cart, Compare), the mobile
  filter panel — comparing results, counts, URLs and behaviour; differences
  that come from 049–060 (production runs 048) noted apart from anything 061
  changed. Browse only on production: no checkout, no forms. · files:
  `results.md` · check: after table, the comparison table, AC evaluation.
- [x] **T14** — `tech-stack.md`: "a server-rendered list renders its props; no
  client re-fetch" and the `ResultsNavigation` pattern; roadmap P1.7 line. ·
  files: `spec/tech-stack.md`, `spec/roadmap.md` · check: diff reads
  correctly.
- [x] **T15** — Measure the tire page pre-load before: production build with
  `LOG_LEVEL=debug`, hover a card title then click: requests, sizes,
  `tires.byId` count. Prototype the full pre-load with `router.prefetch(…,
  { kind: 'full' })`, slow and fast click. · files: none · check: numbers in
  `results.md`.
- [x] **T16** — `IntentPrefetchLink`: `isTirePageHref(href)` → `prefetch={true}`
  after intent; others `null`. · files:
  `src/app/ui/components/IntentPrefetchLink/IntentPrefetchLink.tsx` + test ·
  check: tests for tire page (`true`); `?set=`, `/tires`, used, size, brand,
  menu (`null`).
- [x] **T17** — After: same method as T15 on the real cards (hover, click,
  fast click, `?set=` link, table link, a menu hover still shell-only); detail
  page compared with production for the same tire. · files: `results.md` ·
  check: AC11, AC12.
- [x] **T18** — Card width without a rail: `TireGrid` `CENTRED_LIKE_TIRES`;
  `/tires/new` heading aligned. · files: `TireGrid.tsx` + test,
  `tires/new/page.tsx` · check: test; 944 px on new, brand and size pages.
- [x] **T19** — "Shop by size" links on intent: `IntentPrefetchLink` in
  `tires/size/page.tsx`; the file added to `intentPrefetch.guard.test.ts`. ·
  check: guard; full scroll before/after; hover then click.
- [x] **T-DoD** — `npx tsc --noEmit` + `npm run lint` + `npm test` +
  `npm run build` + `npm run perf:budget` + `npm run a11y` green; manual check
  done in T13; stage with explicit pathspecs (no probe); no commit until the
  owner approves.

## Traceability

| Task | Acceptance criteria |
| ---- | ------------------- |
| T1   | AC7 (before), AC10 (before) |
| T2   | AC4 (feasibility) |
| T3   | AC1, AC2, AC4, AC9 |
| T4   | AC1, AC2 |
| T5   | AC1, AC2, AC3, AC5, AC6 |
| T6   | AC4 |
| T7   | AC2 |
| T8   | AC2 |
| T9   | AC9 |
| T10  | AC3, AC10 |
| T11  | AC3, AC6 |
| T12  | AC6 |
| T13  | AC1, AC2, AC3, AC4, AC5, AC7, AC9, AC10 |
| T14  | — (docs) |
| T15  | AC11 (before) |
| T16  | AC11, AC12 |
| T17  | AC11, AC12 |
| T18  | AC13 |
| T19  | AC14 |
| T-DoD | AC8 |
