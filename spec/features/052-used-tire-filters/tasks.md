# Tasks — Used-tire filters

> Feature: `052-used-tire-filters` · Based on: [plan.md](./plan.md) · Created: 2026-11-18

Each task is one sitting, leaves the build green, and names its check.

## Research

- [x] **T0** — Read modern-web-guidance (`~/.agents/skills`) for filter chips /
      faceted search / horizontal scrolling chip rows on phones; note what
      applies in `results.md` · check: notes written before T7.

## Data

- [x] **T1** — `filtersClause.ts`: both tread bounds use
      `TRY_CAST(Tread AS float)` · files: `src/repositories/filtersClause.ts`
      (+ test) · check: the generated SQL has `TRY_CAST(Tread AS float) >= @minTreadDepth`.
- [x] **T2** — `facetQuery.ts`: dimension `fTread` (whole 32nds, used only);
      `fPatched` and `fLife` count used tires only; `tread` in `TireFacets`,
      `FACET_GROUPS`, `GROUP_KEYS`, `emptyFacets`; `EMPTY_FACETS` in
      `/tires/page.tsx` · files: `src/repositories/facetQuery.ts`,
      `src/app/(shop)/tires/page.tsx` (+ tests) · check: query and
      `mapFacetRows` tests; live check by script: buckets ≥ 8 sum to the
      `Tread >= 8` used count (1,731 on 2026-11-18); facet query time before
      and after (≤ ~15% more, else reconsider).
- [x] **T3** — Dashboard size selects: `STOREFRONT_SELLABLE_WHERE` in
      heights, widths and sizes; `sellableRule.guard` covers the file ·
      files: `src/repositories/dimensionsRepository.ts`,
      `src/repositories/sellableRule.guard.test.ts` · check: guard green; no
      `'70%'` left in `src/`; script: 294 distinct sizes.

## Pure logic

- [x] **T4** — `usedFilters.ts`: `USED_ONLY_PARAMS`, `TREAD_STEPS` `[6,7,8,9]`,
      `treadLabel`, `withUsed(search)`, `withoutUsedFilters(search)`,
      `isNewOnly(filters)`, `normalizeUsedFilters(filters)` (used filter + no
      or both conditions → `used`; New only → used filters dropped; tread kept
      only for 1–32) · files: `src/app/utils/usedFilters.ts` (+ `.test.ts`) ·
      check: AC5 logic.
- [x] **T5** — `filterHref.ts`: `minTreadDepth` in `FILTER_PARAMS` · files:
      `src/app/utils/filterHref.ts` (+ test) · check: `activeFilterCount`
      counts it, `clearAll` removes it, applying it resets `page`.
- [x] **T6** — `railOptions.ts`: `treadOptions` (cumulative counts, single
      select, re-pick clears, href via `withUsed`); patched hrefs via
      `withUsed`; condition hrefs strip used params unless the next set is
      exactly `used` · files: `src/app/ui/sections/FilterRail/railOptions.ts`
      (+ test) · check: AC1 counts, AC5 hrefs — from `condition=used&minTreadDepth=8`
      the "New" option leads to a URL without `minTreadDepth`.
- [x] **T7** — `appliedChips.ts`: chip `Tread 8/32"+`; removing the Used chip
      strips the used filters; `hideCondition` leaves the condition chip out
      · files:
      `src/app/ui/sections/FilterRail/appliedChips.ts` (+ test) · check: AC7.

## Interface

- [x] **T8** — `FilterRail.tsx`: `tread` group ("Tread depth", after life),
      steps named "Minimum tread, 8/32 inch or more"; tread / life / patched
      hidden when `isNewOnly`; life slider gets `withUsed(search)`;
      `hideCondition` prop · files:
      `src/app/ui/sections/FilterRail/FilterRail.tsx` (+ test) · check: AC4,
      AC12; `ariaPressed.guard` and `tracking.guard` green.
- [x] **T9** — `UsedQuickChips` (server component): "Not patched", "Run-flat",
      "8/32"+" links with `aria-current`, `min-h-11`, a row that scrolls
      sideways on a phone, `data-track="filter_apply"` / `filter_remove` with
      `data-track-surface="quick_chips"`; only "Run-flat" when New only ·
      files: `src/app/ui/sections/UsedQuickChips/UsedQuickChips.tsx`
      (+ test), sections barrel (no DB import) · check: AC3, AC6b, AC11.
- [x] **T10** — `/tires`: `normalizeUsedFilters` on the server filters; quick
      chips above the results · files: `src/app/(shop)/tires/page.tsx` ·
      check: manual; `tiresPage.guard` green.
- [x] **T11** — Client results agree with the server: `normalizeUsedFilters`
      in `/api/tires` and `fetchTiresServer` · files:
      `src/app/api/tires/route.ts`, `src/app/(shop)/tires/utils/fetchTiresServer.ts`
      (+ route test) · check: `?condition=new&minTreadDepth=8` returns new
      tires; `?minTreadDepth=8` returns used only.
- [x] **T12** — `/tires/used`: reads `searchParams`, forces used; rail
      (`basePath="/tires/used"`, `hideCondition`) + mobile rail + quick chips
      replace `BrowseFilters`; the grid shows the first 24 matching; "View all
      N" carries the filters to `/tires?condition=used&…`; plain URL served
      from `unstable_cache` (300s); metadata, hero, breadcrumb and JSON-LD
      unchanged, `ItemList` count = unfiltered used total · files:
      `src/app/(shop)/tires/used/page.tsx`,
      `src/repositories/cachedCatalog.ts` · check: AC6; tests: no Condition
      group and no condition chip with `hideCondition`, "View all" href carries
      the filters; manual.

## SEO

- [x] **T13** — `robots.ts`: `minTreadDepth` in `FACET_PARAMS`; the same
      disallow patterns for `/tires/used?` · files: `src/app/robots.ts`
      (+ `robots.guard.test.ts`) · check: AC9.

## Docs and checks

- [x] **T14** — Docs: `tech-stack.md` (rail groups and the used rule, robots
      params), roadmap, `results.md` (measured counts, decisions, manual
      checks) · check: written.
- [x] **T-tests** — Tests for T1–T13 as listed; full suite green · check:
      `npm test`.
- [x] **T-DoD** — `npx tsc --noEmit` + `npm run lint` + `npm test` +
      `npm run build` + `npm run perf:budget` green. Manual in Chrome, desktop
      and 390px: `/tires` mixed → "Not patched" (list is used, Used chip
      shows), 8/32"+ count equals the results, switch to New (used filters
      gone, URL clean), `/tires/used` rail and chips, a filtered URL opened
      directly, keyboard and screen-reader names, no request loops, GA4
      `filter_apply` with group `tread` in the dataLayer, dashboard size
      selects offer 294 sizes · check: AC1–AC12.

## Traceability

| Task | Acceptance criteria |
| ---- | ------------------- |
| T1 | AC1, AC2 |
| T2 | AC1 (counts), FR8 |
| T3 | AC10 |
| T4 | AC5 |
| T5 | AC7, AC8 |
| T6 | AC1, AC5 |
| T7 | AC7, AC6 |
| T8 | AC4, AC12 |
| T9 | AC3, AC6b, AC11 |
| T10 | AC2, AC5, AC8 |
| T11 | AC5, AC8 |
| T12 | AC6 |
| T13 | AC9 |
| T-DoD | AC1–AC12 (manual) |
