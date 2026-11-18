# Tasks — Pick a size in three taps, see the other sizes of a tire

> Feature: `049-size-picker-other-sizes` · Based on: [plan.md](./plan.md) · Created: 2026-11-18

Each task is one sitting, leaves the build green, and names its check.

## Picker — data

- [x] **T1** — `buildSizeTree`, `widthGroups`, `ratiosFor`, `rimsFor` · files:
      `src/app/utils/sizeTree.ts` (+ `sizeTree.test.ts`, with a fixture of the
      293 live sizes) · check:
      - every (w, s, d) the tree offers is in the input list, and every input
        size is reachable (293 → 293), incl. `35/12.50/20` and a `19.5` rim
        (AC2, AC3);
      - groups 100s / 200s / 300s / Truck flotation (width < 100), numeric
        order inside each; ratios and rims in numeric order; malformed strings
        ignored.
- [x] **T2** — `GET /api/dimensions/stocked` → `{ sizes }` from
      `getCachedStockedSizes()`, `Cache-Control: public, s-maxage=300,
      stale-while-revalidate=600`, generic 500 via `jsonError` · files:
      `src/app/api/dimensions/stocked/route.ts` (+ `route.test.ts`) · check:
      shape, headers, junk query params ignored, error path leaks no message
      (AC10).
- [x] **T3** — `useStockedSizes()`: one fetch per page load (module-level
      promise), returns `{ tree, isLoading, error }` · files:
      `src/app/hooks/useStockedSizes.ts` (+ test) · check: two hook instances
      → one `fetch`; failure → `error`, no throw.

## Picker — component

- [x] **T4** — Read the modern-web-guidance guides again for the build
      (`accordion`, `forms`, `animate-element-entry-exit`, `motion`) and note
      what applies in `results.md` · check: notes present.
- [x] **T5** — `SizePicker` (client): summary bar of three step buttons
      (`aria-expanded`/`aria-controls`), inline panel, `role="group"` steps,
      grouped width rows, `<button>` options (`aria-current` on the chosen one) ≥ 44 px, hint text,
      auto-advance with focus on the next step's first option, polite live
      region, later steps cleared when they no longer exist, `Escape` closes
      to the step button, `onComplete` on rim; `data-track="size_picker_select"`
      (`-step`, `-label`, `-surface`) on options and
      `size_picker_complete` on the rim · files:
      `src/app/ui/components/SizePicker/SizePicker.tsx`,
      `src/app/ui/components/index.ts`, `src/app/globals.css` (panel entry with
      `@starting-style`, reduced motion, highlight ring) · check:
      `SizePicker.test.tsx` — click and keyboard-only paths (AC1, AC5),
      changing width clears an impossible ratio (FR5), `onComplete` fires
      once, tracking attributes present (AC9).

## Picker — hosts

- [x] **T6** — Home: `SearchBySize` uses `SizePicker` + `useStockedSizes`
      (surface `home`); on complete, focus Search and add the highlight;
      chips, "More filters" and the URL builder unchanged · files:
      `src/app/ui/components/SearchBySize/SearchBySize.tsx` (+ test) · check:
      235/45/18 + a brand → same `/tires?…` URL as before (AC4); no
      navigation until Search (AC7c).
- [x] **T7** — 3D preview on phones: `TirePreview3DMobile` takes the picker
      (surface `3d`); the preview still follows the picked size · files:
      `src/app/ui/components/TirePreview3D/TirePreview3DMobile.tsx`,
      `SearchBySize.tsx` · check: existing 3D tests green; manual in Chrome at
      390 px.
- [x] **T8** — `/tires` floating "Edit tire size" form:
      `useTireSearch.applySize({ w, s, d })` (one push, beside the unchanged
      `handleFilterChange`); `CompactForm` uses `SizePicker` (surface
      `tires`), stages the size and gets a Search button (partial size
      allowed, as today) and a `max-height` with internal scroll ·
      files: `useTireSearch.ts`, `CollapsibleSearchBar.tsx`,
      `CompactForm.tsx` (+ tests) · check: picks stage without navigating,
      Search pushes once with `w,s,d` (AC4, AC7c); `TopFilters`,
      `TireSelector` and the dashboard untouched (`git diff` shows no change
      there; dashboard tests green).
- [x] **T9** — Remove `useTireDimensions` and `SizeSelectors` if unused ·
      files: those two + barrels · check: `tsc`, `grep` shows no import.

## Other sizes

- [x] **T10** — `fetchModelSizeGroups()` (plan's SQL, sellable rule,
      whitelisted columns) and `getCachedModelSizeGroups` (300 s, tag
      `other-sizes`) · files: `src/repositories/otherSizesRepository.ts`
      (+ `.test.ts` guard) · check: the SQL selects no `VaultName`/`Location`
      and contains `STOREFRONT_SELLABLE_WHERE` (AC10); a one-off run against the
      DB returns ~1,881 rows (noted in `results.md`).
- [x] **T11** — `otherSizesFor(tire, rows)` · files:
      `src/app/utils/otherSizes.ts` (+ `.test.ts`) · check: grouped by rim,
      numeric order, own rim `open`, own size `current` always for a tire not sold (even when
      the cached rows lack it) and for a sold one only if units remain,
      `isNew` from `ProductTypeId === 1`, counts and from-prices, cheapest
      tire id; `null` when no other size (AC6, AC7, AC7b).
- [x] **T12** — `OtherSizes` async server section (h2, `<details>` per rim,
      not exclusive, marker beside the label, links via `buildTireSlug`,
      "this tire" item with `aria-current`, "New" badge, "From $X · N
      available" ("$X" when N = 1)) + `OtherSizesTracker` (`other_sizes_open` on toggle-open
      only) + `data-track="other_size_select"` (`-from`, `-label`,
      `-tire-id`) on links; rendered in `DetailView` inside `Suspense`
      after the product grid; renders nothing on error · files:
      `src/app/ui/sections/OtherSizes/OtherSizes.tsx`,
      `OtherSizesTracker.tsx` (+ tests),
      `src/app/(shop)/detail/container/DetailView/DetailView.tsx` · check:
      render tests for links/hrefs (AC8), empty → absent (AC7), sold tire →
      present (AC7b), tracker fires only on open (AC9).

## Docs and done

- [x] **T13** — `spec/tech-stack.md`: the four events under Analytics; the
      picker's data source; `results.md` with the measurements (293 sizes,
      7 recovered, 64% with siblings, 1,881 groups), event list and
      verification · check: review.
- [x] **T-DoD** — `npx tsc --noEmit`, `npm run lint`, `npm test`,
      `npm run build`, `npm run perf:budget`; manual by the agent in Chrome
      at 390 px and desktop:
      - home: pick 235 → 45 → 18 with taps and with the keyboard; Search
        highlighted; URL as before; 3D preview on phone width;
      - `/tires` floating form at 390 px: the grid fits (scrolls inside, never
        off-screen), pick, Search, partial width only;
      - the dashboard's size search unchanged;
      - a Firestone Destination LE3 page (AC6), a one-size tire (AC7), a
        sold tire (AC7b); view-source shows the links (AC8);
      - every size for sale reachable (count in dev = DB);
      - events in GA4 DebugView / console (AC9); no horizontal overflow,
        targets ≥ 44 px (AC11) · check: `results.md`.

## Traceability

| Task | AC |
| ---- | -- |
| T1 | AC2, AC3 |
| T2 | AC3, AC10 |
| T3 | AC1 (data) |
| T4 | AC5, AC11 (research) |
| T5 | AC1, AC5, AC9, AC11 |
| T6 | AC4, AC7c |
| T7 | AC1, AC11 |
| T8 | AC4, AC7c |
| T9 | — (cleanup) |
| T10 | AC10 |
| T11 | AC6, AC7, AC7b |
| T12 | AC6, AC7, AC7b, AC8, AC9 |
| T13 | — (docs) |
| T-DoD | AC1–AC11, AC7b, AC7c |
