# Plan — Used-tire filters

> Feature: `052-used-tire-filters` · Based on: [spec.md](./spec.md) · Created: 2026-11-18

## Technical approach

Extend the existing **server-rendered filter rail** (every option a `<Link>`,
counts from one `GROUPING SETS` query) rather than building anything parallel.
Five pieces:

1. **A tread group in the rail.** One more facet dimension in `facetQuery.ts`
   (whole 32nds, used tires only) and a single-select **step** group in
   `railOptions.ts`: 6/32"+, 7/32"+, 8/32"+, 9/32"+, each with its cumulative
   count, writing the param that already exists, `minTreadDepth` (D1).
2. **"Used filters mean used" (D3)**, in two layers:
   - **Links:** every link that applies tread, life or patched also sets
     `condition=used`. Used filters survive a condition change **only if the
     next set is exactly `used`**: any set that includes `new` (New only, or
     Used + New) and removing the Used chip strip `minTreadDepth`,
     `minRemainingLife`, `maxRemainingLife` and `patched`. (Keeping them when
     New is added would let the normalizer turn the view back into used only,
     so clicking "New" would seem to do nothing.) The URL is always
     the truth: chips, counts and `aria-current` read it.
   - **Safety net for typed or old URLs:** `normalizeUsedFilters(filters)` —
     with a used filter and no condition (or both) → condition `used`; with
     `condition=new` only → the used filters are dropped. Applied in the
     storefront paths only (`/tires`, `/api/tires`, `fetchTiresServer`,
     `/tires/used`), **not** in `buildTireFilters`, which the seller dashboard
     also uses.
   - In a New-only view the rail and the quick chips hide tread, life and
     patched (FR4); run-flat stays.
3. **Quick chips above the results (D2, D5).** A small server component,
   `UsedQuickChips`: "Not patched", "Run-flat", "8/32"+" as links with
   `aria-current`, 44px tall, in a row that scrolls sideways on a phone. Same
   hrefs as the rail's options (one builder), so a chip and its rail option can
   never disagree. Shown unless the view is New only, where only "Run-flat"
   shows.
4. **`/tires/used` gets the rail (D4).** The page reads `searchParams`, forces
   `condition=['used']`, renders `FilterRail` / `FilterRailMobile` with
   `basePath="/tires/used"` and the Condition group hidden — in the rail and in
   the applied chips, where a "Used" chip could not be removed —, the quick chips,
   and a grid of the first 24 matching tires whose "View all N" link carries
   the same filters to `/tires?condition=used&…`. Title, hero, breadcrumb,
   JSON-LD and canonical stay as they are; the `ItemList` count is always the
   unfiltered used total (it describes the page, not the filter).
5. **Dashboard size selects (D6).** `dimensionsRepository.ts` replaces its
   three copies of `Local … AND RemainingLife > '70%' AND Price != 0` with
   `STOREFRONT_SELLABLE_WHERE`.

Also, in the same clause builder: `Tread >= @minTreadDepth` compares a text
column with a float, so one malformed `Tread` anywhere in the view can make
SQL Server raise a conversion error. Use `TRY_CAST(Tread AS float)` as the life
filter already does.

## Reuse first

- `FilterRail`, `FacetGroup` (single-select links with `aria-current`, data-track
  attributes), `RangeFacet` (life slider), `AppliedFilters`, `FilterRailMobile`.
- `railOptions.ts` (`sizeOptions` pattern for a single-valued group),
  `appliedChips.ts` (chip + `looseningSuggestions`).
- `facetQuery.ts` (`DIMENSIONS`, `GROUP_KEYS`, `omitGroup`), `tireFacets.ts`
  (`fetchFacetsForRequest`), `filtersClause.ts` (already applies
  `minTreadDepth`).
- `filterHref.ts` (`setParam`, `toggleValue`, `removeValue`, `clearAll`,
  `activeFilterCount`, `FILTER_PARAMS`, `RANGE_PAIRS`).
- Param names: `minTreadDepth`, `minRemainingLife`/`maxRemainingLife`,
  `patched=no|yes`, `kindSale=yes|no`, `condition=used|new`.
- GA4: the existing `filter_apply` / `filter_remove` events (`data-track` with
  group and value), so no new event names; the quick chips add
  `data-track-surface="quick_chips"`.
- `STOREFRONT_SELLABLE_WHERE` (`feedQuery.ts`) for the dashboard rule.
- `robots.ts` `FACET_PARAMS` for crawling.

## Files to add / change

- `src/repositories/facetQuery.ts` — dimension `fTread`:
  `CASE WHEN ISNULL(ProductTypeId,0) <> 1 THEN FLOOR(TRY_CAST(Tread AS float)) END`;
  `fPatched` and `fLife` also count used tires only (their links narrow to used,
  so their counts must match what the link returns); `tread` in `TireFacets`,
  `FACET_GROUPS`, `GROUP_KEYS` (`minTreadDepth`, `maxTreadDepth`).
- `src/repositories/filtersClause.ts` — `TRY_CAST(Tread AS float)` in both tread
  bounds.
- `src/app/utils/usedFilters.ts` (new) — `USED_ONLY_PARAMS`, `TREAD_STEPS`
  `[6, 7, 8, 9]`, `normalizeUsedFilters`, `withUsed(search)` (sets
  `condition=used`), `withoutUsedFilters(search)`, `isNewOnly(filters)`,
  `treadLabel(step)` (`8/32"+`). Pure, tested.
- `src/app/utils/filterHref.ts` — `minTreadDepth` in `FILTER_PARAMS` so it
  counts, clears and resets the page like the rest.
- `src/app/ui/sections/FilterRail/railOptions.ts` — `treadOptions` (cumulative
  counts, single-select, href through `withUsed`); patched hrefs and the
  `search` given to the life slider go through `withUsed`; condition hrefs
  strip the used filters unless the next set is exactly `used`.
- `src/app/ui/sections/FilterRail/FilterRail.tsx` — `tread` in `RAIL_ORDER`
  (after life) and `TITLES` ("Tread depth"); hide tread/life/patched when
  `isNewOnly`; optional `hideCondition` prop for `/tires/used`.
- `src/app/ui/sections/FilterRail/appliedChips.ts` — chip "Tread 8/32"+"; the
  Used chip's removal strips the used filters; a `hideCondition` option leaves
  the condition chip out on `/tires/used`.
- `src/app/ui/sections/UsedQuickChips/UsedQuickChips.tsx` (new) + test — the
  quick chips (server component, links).
- `src/app/(shop)/tires/page.tsx` — `normalizeUsedFilters`; quick chips above
  the results; `EMPTY_FACETS.tread`.
- `src/app/api/tires/route.ts`, `src/app/(shop)/tires/utils/fetchTiresServer.ts`
  — `normalizeUsedFilters` so the client-side results match the server's.
- `src/app/(shop)/tires/used/page.tsx` — reads `searchParams`; rail, quick chips,
  filtered grid; "View all" carries the filters. Drops the brand/rim
  `BrowseFilters` (the rail covers both).
- `src/app/robots.ts` — `minTreadDepth` in `FACET_PARAMS`; the same patterns for
  `/tires/used?` as for `/tires?`.
- `src/repositories/dimensionsRepository.ts` — `STOREFRONT_SELLABLE_WHERE` in
  heights, widths and sizes.
- Tests: `usedFilters.test.ts`, `facetQuery`/`railOptions`/`appliedChips`/
  `FilterRail` tests extended, `UsedQuickChips.test.tsx`,
  `dimensionsRepository` (rule written once — `sellableRule.guard` already
  enforces it; extend its list), `robots` test.
- Docs: `spec/tech-stack.md` (rail groups, `minTreadDepth` in robots),
  `results.md`, roadmap.

## Data & flow

```
URL ?condition=used&minTreadDepth=8&patched=no
  → buildTireFilters → normalizeUsedFilters   (storefront only)
  → fetchTires (results)  +  fetchFacetsForRequest (counts, one scan per active group)
  → railOptions / appliedChips / UsedQuickChips build links from `search`
```

- **Counts.** `fTread` buckets are whole 32nds of used tires (6, 7, 8, 9, 10).
  The step "8/32"+" shows the sum of buckets ≥ 8: 1,731 on 2026-11-18, which is
  exactly what `Tread >= 8` returns. Tread is a stored decimal (`7.6`), and
  `FLOOR` puts 7.6 under 7, so "7/32"+" includes it.
- **No new endpoint, no new table, no new parameter name.** `minTreadDepth`
  already flows through `/api/tires`; `safeInt` keeps it an integer, and
  `normalizeUsedFilters` keeps only 1–32.
- **`/tires/used` becomes dynamic.** It reads `searchParams`, so it can no
  longer be served from ISR. The plain URL uses cached reads
  (`unstable_cache`, 300s, like `getCachedSizeCounts`) for its first 24 tires
  and facets; filtered URLs query like `/tires` does and are closed to crawlers
  by `robots.txt`.

## Acceptance criteria → implementation

| AC | How it's met | How it's verified/tested |
| --- | --- | --- |
| AC1 | `treadOptions` + `filtersClause` `TRY_CAST(Tread) >= 8` | Unit: cumulative counts; manual: 8/32"+ on used shows 1,731 and every card ≥ 8 |
| AC2 | Same clause as every other filter (AND) | Unit: `buildFiltersClause` with size + tread; manual |
| AC3 | `UsedQuickChips` above results, `min-h-11`, row scrolls sideways | Component test (links, names, `aria-current`); manual at 390px |
| AC4 | `FilterRail` / `UsedQuickChips` hide tread, life, patched when `isNewOnly` | Component tests on `condition=new` |
| AC5 | Condition hrefs strip used params; used-filter hrefs set `condition=used`; `normalizeUsedFilters` | Unit: hrefs and normalizer; component: Used chip after "Not patched" |
| AC6 | `/tires/used` renders the rail with `hideCondition`, forced condition | Component/page test; manual: each group filters; metadata unchanged (`usedTiresMetadata` snapshot) |
| AC6b | `UsedQuickChips` visibility rule | Component tests: used, mixed, new only |
| AC7 | `appliedChips` tread chip; `clearAll` via `FILTER_PARAMS` | Unit |
| AC8 | URL is the only state | Manual: open a filtered URL directly |
| AC9 | Canonical unchanged; `robots.ts` disallows `minTreadDepth` and `/tires/used?…` | `robots` test |
| AC10 | `STOREFRONT_SELLABLE_WHERE` in `dimensionsRepository` | `sellableRule.guard` extended; manual: 294 sizes reachable in the dashboard selects |
| AC11 | `filter_apply` / `filter_remove` with group `tread` and value; quick chips with surface | `tracking.guard` covers the new links; no personal data in attributes |
| AC12 | Links named "Minimum tread, 8/32 inch or more" (visible "8/32"+" plus `aria-label`), `aria-current` | Component tests on accessible names |

## Tradeoffs / alternatives

- **Steps vs slider (D1).** Steps work without JavaScript, carry counts and
  are one tap on a phone; tread lives between 6 and 10/32", so a slider would
  add precision nobody needs.
- **Implied condition in the URL vs only server-side.** Writing
  `condition=used` into the links keeps the Condition chip, its `aria-current`
  and the count honest without the rail having to reason about implied state;
  the normalizer only catches URLs typed by hand.
- **`/tires/used` linking to `/tires` instead of filtering in place.** Cheaper
  (the page would stay ISR), but the buyer would leave the used landing page
  on the first click — not D4.
- **Normalizing inside `buildTireFilters`.** Rejected: the dashboard uses it,
  and a seller filtering new tires by tread must not have the filter dropped.

## Risks

- **`/tires/used` load.** Dynamic now, and the bot history on `/tires`
  (memory: Sept 2026) is the reason to close its filtered URLs in `robots.txt`
  and cache the plain page. Measure the plain page after deploy in Vercel
  (function invocations for `/tires/used`).
- **One more grouping set in the facet query** (`fTread`). Measured at 244 ms
  for nine sets; T2 re-measures before and after with the same script, and
  the change is reconsidered if it costs more than ~15%.
- **Facet counts change meaning.** Patched and life now count used tires only.
  In a mixed view "Patched: No" drops from ~4,9xx (used + new) to 1,802 — the
  number its link actually returns. Tests pin the new SQL.
- **The empty-result suggestions** (`looseningSuggestions`) need the tread
  group's `withoutGroup` count; it comes from `GROUP_KEYS` like the others.
- **`unstable_cache` key of the dashboard dimensions** serves the old list for
  up to an hour after deploy. Acceptable.

## Out of scope

- DOT, load and speed filters; saving filter preferences; filters on brand
  pages, `/tires/new` and size pages; the dashboard's own tread/life filters.

---

_The concrete steps live in [tasks.md](./tasks.md)._
