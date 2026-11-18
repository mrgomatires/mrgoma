# Plan — Pick a size in three taps, see the other sizes of a tire

> Feature: `049-size-picker-other-sizes` · Based on: [spec.md](./spec.md) · Created: 2026-11-18

## Technical approach

Two independent halves that share nothing but the branch.

### 1. The size picker

**One list instead of three queries.** Today every picker asks the server three
times (`/api/dimensions/heights`, `widths?height=`, `sizes?height=&width=`),
each a scan of `View_Tires` with its own copy of the sellable rule — the stale
`RemainingLife > '70%'` string comparison, which is why 7 of the 293 sizes for
sale cannot be reached (FR3). The whole size space is **293 strings**
(`RealSize`, always `Height/Width/Size` — verified: 0 mismatches over the
sellable catalog). So the picker loads that list **once**, from the
already-cached `getCachedStockedSizes()` (`cachedCatalog.ts`, sellable rule
`STOREFRONT_SELLABLE_WHERE`, 5-minute cache — the same list the sitemap and
`/tires/size/[size]` use), and derives every step on the client:

```ts
// src/app/utils/sizeTree.ts  (pure)
buildSizeTree(realSizes: string[]) → SizeTree
widthGroups(tree)  → [{ id: '100s' | '200s' | '300s' | 'flotation', label, widths: string[] }]
ratiosFor(tree, w) → string[]          // numeric order
rimsFor(tree, w, s) → string[]         // numeric order, '19.5' kept
```

Values are the DB column strings (`235`, `45`, `12.50`, `19.5`) — the same
strings the drop-downs put in `w`/`s`/`d` today, so URLs do not change (FR7).
Flotation = width below 100 (`33`, `35`, `37`). After the first load, every
step is instant (no spinner per step, no request per tap — INP and pool both
win).

**New endpoint** `GET /api/dimensions/stocked` → `{ sizes: string[] }` from
`getCachedStockedSizes()`, with `Cache-Control: public, s-maxage=300,
stale-while-revalidate=600` so Vercel's edge answers repeat visits. No input,
so nothing to validate and nothing to amplify. The home page stays static (it
has no server data today and should not gain any).

**The component** `SizePicker` (client) follows the research below:

- A summary bar of three **step buttons** — `Width 235`, `Aspect ratio —`,
  `Rim —` — each `aria-expanded` and `aria-controls` the one panel; pressing
  one opens the panel on that step (FR5: go back to any step).
- The **panel is inline** (pushes content down, not an overlay): it works the
  same in the home hero, the `/tires` floating form and the 3D preview's modal,
  needs no focus trap, and opens only on a user action (no CLS charge).
- Each step is a `role="group"` labelled by its heading ("Choose width"), with
  **plain `<button>`s** (`aria-current="true"` on the chosen value — `aria-pressed` is banned in `src/app` by `ariaPressed.guard.test.ts`; ≥ 44 px). Not
  radios: arrow keys move *and check* a radio, which would auto-advance on the
  first arrow press. Not `appearance: base-select`: Safari only supports it
  from 27 and Firefox not at all, so most phones would still get today's wheel.
- Widths render in four labelled rows (D2): **100s, 200s, 300s, Truck
  flotation**. Each row is a nested `role="group"`.
- **Auto-advance (FR1):** choosing a value sets it, clears later steps that no
  longer exist (FR5), moves to the next step and **moves focus to its first
  option**; a polite live region says "Aspect ratio: 7 options".
- **Completion (FR6, D3):** choosing the rim closes the panel and calls
  `onComplete()`; the host moves focus to its Search button and adds a
  highlight ring. Nothing navigates.
- `Escape` closes the panel and returns focus to the step button.
- Reduced motion: the panel opens without animation; with motion, a short
  height/opacity entry via `@starting-style` (as 047's hover card).
- Short hint under the width row: "The first number on your tire's sidewall,
  e.g. **235**/45R18".

**Hosts (D1):**

- **Home** — `SearchBySize` swaps `SizeSelectors` + `useTireDimensions` for
  `SizePicker` + `useStockedSizes`. Its Search button, chips, "More filters"
  and the URL it builds stay as they are.
- **3D preview (phone)** — `TirePreview3DMobile` takes the picker's props
  instead of `SizeSelectors`'; the preview keeps following the picked size.
- **`/tires`** — the size is chosen in `CollapsibleSearchBar`: a floating
  button that opens `CompactForm` ("Edit tire size", fixed bottom-left,
  320 px, max 90vw), which today navigates on every drop-down change.
  `CompactForm` swaps `TireSelector` for `SizePicker` (surface `tires`),
  stages `w/s/d` locally and gains a **Search** button that applies them with
  one navigation (`useTireSearch` gains `applySize({ w, s, d })`). A partial
  size can still be applied, as today; on home the existing rule stays
  (complete size or extra filters). The form gets a `max-height` (viewport
  minus its offset) with internal scrolling so the grid never runs off a
  phone screen. `TopFilters` and `TireSelector` are **dashboard-only** (it
  renders `TopFilters` and `TireSelector` with `useTireSearch` itself) and are
  not touched; `handleFilterChange` keeps its behaviour for it. The `/tires`
  filter rail's width/profile/rim link groups stay (spec: Out).

**Retired:** `useTireDimensions` (home only) and `SizeSelectors` once the 3D
preview moves; `SelectDropdown` stays where other code uses it. The three
`/api/dimensions/*` routes stay for the dashboard.

### 2. Other sizes on the tire page

**One cached query for the whole catalog.** The tire page renders fresh on
every visit and the mssql pool (10) has saturated before, so the section must
not add a per-view query. All brand+model+size groups for sale are **1,881
rows**; one query returns them with what the section shows, cached 5 minutes:

```sql
-- otherSizesRepository.ts — whitelisted columns only, no VaultName/Location
SELECT Brand, Model2, RealSize, Size AS Rim, units, minPrice, TireId, ProductTypeId
FROM (
  SELECT Brand, Model2, RealSize, Size, TireId, ProductTypeId,
         TRY_CAST(Price AS float) AS price,
         COUNT(*) OVER (PARTITION BY Brand, Model2, RealSize) AS units,
         MIN(TRY_CAST(Price AS float)) OVER (PARTITION BY Brand, Model2, RealSize) AS minPrice,
         ROW_NUMBER() OVER (PARTITION BY Brand, Model2, RealSize
                            ORDER BY TRY_CAST(Price AS float), TireId) AS rn
  FROM dbo.View_Tires
  WHERE <STOREFRONT_SELLABLE_WHERE> AND ISNULL(Model2,'') <> '' AND ISNULL(RealSize,'') <> ''
) x WHERE rn = 1
```

`getCachedModelSizeGroups = unstable_cache(fetchModelSizeGroups,
['model-size-groups'], { revalidate: 300, tags: ['other-sizes'] })` — ~150 KB,
well under the 2 MB entry limit. One scan every 5 minutes for every tire page
on the site.

```ts
// src/app/utils/otherSizes.ts  (pure)
otherSizesFor(tire: { brand, model2, size }, rows) →
  null | { groups: [{ rim: '18', open: boolean,
                      sizes: [{ size, label, units, from, tireId, isNew, current }] }] }
```

Rows matching the tire's brand + model; grouped by rim, rims and sizes in
numeric order; the tire's own size flagged `current` — **always** for a tire
that is not sold (added from the tire itself when the cached rows lack it, e.g.
a tire under 50% life reached by its URL; FR10), and for a sold tire only if
units of its size are still for sale (FR13); the own rim's group `open` (FR11); `null` when no size
other than the tire's own exists (FR12) — 36% of tires today. `isNew` =
`ProductTypeId === 1` (the mapper's rule) → "New" badge (D5b).

**The section** `OtherSizes` — an async server component, rendered by
`DetailView` in `<Suspense fallback={null}>` like 041's `TireSetSection` and
045's `SoldTireAlternative` (DB code stays out of the client barrel), placed
full-width after the product grid and before the tread explorer:

```html
<section aria-labelledby="other-sizes-heading">
  <h2 id="other-sizes-heading">Other sizes of this tire</h2>
  <details open>                       <!-- the tire's own rim -->
    <summary>18" rim · 4 sizes</summary>
    <ul>
      <li aria-current="true">235/45R18 · this tire</li>
      <li><a href="/tires/{slug}">245/40R18</a> From $89 · 4 available</li>  <!-- "$89 · 1 available" for one -->
      …
```

Per the accordion guide: adjacent `<details>`, **not exclusive** (no `name`),
no heading inside `summary`, custom marker beside the label; closed content
stays in the HTML (`content-visibility`, findable by in-page search and by
crawlers). Links use `buildTireSlug(tireId, brand, size)` — existing tire URLs
only (FR16). Sold tires: rendered too (D5); the section sits below 045's
alternative, which lives inside `TireInformation`.

### 3. Analytics (FR15)

Declarative `data-track` through `InteractionTracker` (both sinks), no
personal data, consent handled by the existing tracker:

| Event | Where | Params |
| --- | --- | --- |
| `size_picker_select` | each option button | `data-track-step` = width/ratio/rim, `-label` = value, `-surface` = home/tires/3d |
| `size_picker_complete` | rim button (fires with the select) | `-label` = `235/45/18`, `-surface` |
| `other_sizes_open` | `<details>` opened | `-label` = rim — via a 20-line client `OtherSizesTracker` listening to `toggle` (`newState === 'open'`), because a `summary` click cannot tell open from close in markup |
| `other_size_select` | each size link | `-from` = current size, `-label` = target size, `-tire-id` |

GA4 `search` is unchanged: it still fires once where every size search lands
(`useSearchEvent` on `/tires`). Event names are added to the events list in
046's notes so the consultant's report stays complete.

## Reuse first

- `getCachedStockedSizes()` (`cachedCatalog.ts`) and `STOREFRONT_SELLABLE_WHERE`
  (`feedQuery.ts`) — one sellable rule (FR3).
- `SearchBySize`'s URL builder, chips, `HomeMoreFilters`; `useTireSizeWithContext`.
- `useTireSearch` and `CollapsibleSearchBar` / `CompactForm` (`/tires`); `TopFilters` and `TireSelector` are dashboard-only and stay untouched.
- `TirePreview3DMobile` (its `selector` prop).
- `buildTireSlug` (`tireSlug.ts`), `brandName`/`modelName` (`tireNaming.ts`),
  the size label the tire page heading uses.
- 041/045's async-section pattern (`TireSetSection`, `SoldTireAlternative`) and
  `unstable_cache` usage (`tireSetsRepository.ts`).
- `InteractionTracker` + `data-track-*`, `trackEvent`.
- 047's `@starting-style` entry and reduced-motion handling (`globals.css`).

## Files to add / change

Picker:

- `src/app/utils/sizeTree.ts` (+ `.test.ts`) — new, pure.
- `src/app/api/dimensions/stocked/route.ts` (+ `.test.ts`) — new GET.
- `src/app/hooks/useStockedSizes.ts` — new; one fetch per page load (module
  promise), returns the tree, `isLoading`, `error`.
- `src/app/ui/components/SizePicker/SizePicker.tsx` (+ `.test.tsx`) — new.
- `src/app/ui/components/index.ts` — export.
- `src/app/ui/components/SearchBySize/SearchBySize.tsx` — use the picker;
  focus + highlight Search on complete.
- `src/app/ui/components/TirePreview3D/TirePreview3DMobile.tsx` — picker props.
- `src/app/ui/components/CollapsibleSearchBar/components/CompactForm.tsx` —
  `SizePicker` instead of `TireSelector`, staged size, Search button,
  `max-height` + internal scroll.
- `src/app/ui/components/CollapsibleSearchBar/CollapsibleSearchBar.tsx` —
  pass `applySize` and the staged state to the form.
- `src/app/ui/components/CollapsibleSearchBar/hooks/useTireSearch.ts` —
  `applySize()`.
- `src/app/globals.css` — picker panel entry/exit, highlight ring.
- Remove `src/app/hooks/useTireDimensions.ts` and
  `src/app/ui/sections/SizeSelectors/` if nothing else imports them (checked
  by `tsc`).

Other sizes:

- `src/repositories/otherSizesRepository.ts` (+ `.test.ts` guard: selected
  columns are whitelisted, no `VaultName`/`Location`, uses the sellable rule).
- `src/app/utils/otherSizes.ts` (+ `.test.ts`) — new, pure.
- `src/app/ui/sections/OtherSizes/OtherSizes.tsx` (+ `.test.tsx`) — new
  async server component.
- `src/app/ui/sections/OtherSizes/OtherSizesTracker.tsx` — tiny client
  listener.
- `src/app/(shop)/detail/container/DetailView/DetailView.tsx` — render it.

Docs:

- `spec/tech-stack.md` — Analytics: the four new events; Data: picker reads
  `getCachedStockedSizes`.
- `spec/features/049-size-picker-other-sizes/results.md`.

## Data & flow

- **Picker:** mount → `GET /api/dimensions/stocked` (edge-cached 5 min) → tree
  in memory → steps derived locally → Search builds the same `/tires?w=&s=&d=…`
  URL as today → `/tires` server render (unchanged) → `useSearchEvent` (unchanged).
- **Other sizes:** tire page render → `getCachedModelSizeGroups()` (memory/data
  cache; DB at most once per 5 min) → `otherSizesFor()` → HTML. No client
  fetch, no new URL.
- No DB writes. No change to `/tires` filtering or to the size landing pages.

## Acceptance criteria → implementation

| AC | How it's met | How it's verified/tested |
| --- | --- | --- |
| AC1 | `SizePicker` auto-advance; `ratiosFor`/`rimsFor` | `SizePicker.test`: click 235 → ratio step shown with only tree ratios, focus on first; manual at 390 px in Chrome |
| AC2 | options derived from sizes for sale | `sizeTree.test`: every (w, s, d) the tree offers is a member of the input list (property-style over the real 293-size fixture) |
| AC3 | list from `getCachedStockedSizes` (sellable rule) | `sizeTree.test`: 293 in → 293 reachable, incl. `35/12.50/20`, `…/19.5`; manual: count reachable sizes in dev = DB count |
| AC4 | values are column strings; host URL builders unchanged | `SearchBySize` test: picked 235/45/18 + brand → same URL as before; `CompactForm` test: picks stage, Search → `applySize` → one push with `w,s,d` |
| AC5 | buttons, `aria-current`, groups, live region, Escape | `SizePicker.test` with `user-event` keyboard only; manual VoiceOver pass |
| AC6 | `otherSizesFor` + `OtherSizes` | `otherSizes.test` (grouping, order, current, New, counts, cheapest id); `OtherSizes.test` render; manual on a Firestone Destination LE3 page |
| AC7 | `null` → section not rendered | tests: model with one size → nothing in the DOM |
| AC7b | rendered whatever the tire's status | test: sold tire fixture with siblings → section present |
| AC7c | `onComplete` → host focuses + highlights Search; no `router.push` | tests on home and `/tires` hosts: no navigation until Search |
| AC8 | `<a href>` from `buildTireSlug`; existing route | test: hrefs match `/tires/{id}-{brand}-{size}`; manual: view-source shows the links inside closed `<details>` |
| AC9 | `data-track-*` + `OtherSizesTracker` | tests assert attributes and that the tracker calls `trackEvent` only on open; manual in GA4 DebugView (Preview) |
| AC10 | whitelisted SQL columns; endpoint has no input; edge cache | repository guard test; route test (shape, headers); `curl` with junk query params → same 200 |
| AC11 | inline panel, ≥ 44 px targets, wrap at 390 px | manual Chrome at 390 px and desktop on home, `/tires`, tire page; `perf:budget` green |

## Tradeoffs / alternatives

- **Keep the three endpoints, just fix their rule:** smaller diff, but still 3
  round trips (each step waits on the DB) and three copies of the sellable
  rule. Rejected: the full list is smaller than one listing page's JSON.
- **Customizable `<select>` (`appearance: base-select`) with `<optgroup>`s:**
  free a11y, but on iOS < 27 and Firefox it is today's wheel — the problem
  we are solving. Rejected.
- **Radio groups:** arrow keys select, which fights auto-advance. Rejected.
- **Bottom-sheet dialog on phones:** more native-feeling, but needs focus
  management and scroll locking inside a hero and a modal (3D). Inline is
  simpler and works in all three hosts. Revisit if testing shows it is cramped.
- **Per-model query for other sizes:** fresher, but one query per distinct
  model per 5 minutes on a force-dynamic page; the all-groups query is one
  scan per 5 minutes total.
- **Link to the size listing instead of the cheapest tire:** decided against
  (D4); the listing cannot filter by model.

## Risks

- **The `/tires` floating form is small** (320 px, fixed to the bottom): a
  grid of 44 px buttons is tall on a phone. Mitigated by `max-height` with
  internal scrolling; checked at 390 px.
- **`useTireSearch` is shared with the dashboard** — `applySize` is added
  beside `handleFilterChange`, which keeps its navigate-on-change behaviour;
  the dashboard's tests stay green.
- **Stale data up to 5 minutes:** a size may sell out; the link then opens a
  sold page, which (045) points to the same tire in stock. The tire page shows
  the live price.
- **Streaming the section** below the fold may land after first paint; it sits
  below the product grid, so no CLS in the viewport. Checked with the CLS
  overlay.
- **Event volume** on Vercel Web Analytics (custom events count against the
  plan): ≤ 4 picker events per search; acceptable, noted in results.
- **Client JS on home:** the picker replaces `SizeSelectors`/`SelectDropdown`
  usage there; `perf:budget` decides.

## Out of scope

- The size index page (050), compare (051), used-tire filters (052), Google
  ratings (053), set totals on cards (054).
- Fixing the `> '70%'` rule in the dashboard's `/api/dimensions/*` (D1 leaves
  the dashboard alone; noted for 052, which touches filters).
- Search by vehicle; staggered sizes; "similar tires" in other brands.

## Modern Web Guidance consulted

Read from `~/.agents/skills/modern-web-guidance/guides`:

- `ui-components/accordion` — adjacent `<details>`, not exclusive, no heading
  in `summary`, marker next to the label, closed content stays findable.
- `forms/forms` — radios for visible exclusive choices, but "don't
  auto-submit on change": we advance steps, never submit (D3).
- `forms/custom-select-picker-layouts` — `base-select` support (Chrome 135,
  Safari 27, no Firefox): why it is not the base here.
- `ui-components/stack-drill-down` — considered for the phone; heavier than
  the three-step inline panel needs.

---

_The concrete steps live in [tasks.md](./tasks.md)._
