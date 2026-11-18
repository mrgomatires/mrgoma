# Tasks — Every tire size on one page

> Feature: `050-size-index` · Based on: [plan.md](./plan.md) · Created: 2026-11-18

Each task is one sitting, leaves the build green, and names its check.

## Data and pure logic

- [x] **T1** — `fetchSizeCounts()` (`GROUP BY RealSize`, the sellable
      constant) and `getCachedSizeCounts` (300 s, tag `sizes`) · files:
      `src/repositories/tiresRepository.ts`, `src/repositories/cachedCatalog.ts`
      (+ a test of the SQL: sellable constant, no `VaultName`/`Location`) ·
      check: test green; a one-off run returns ~294 rows whose sizes equal
      `fetchSizes()` (noted in `results.md`).
- [x] **T2** — `sizeIndex.ts`: `popularSizes(counts, 12)` (most units, ties by
      size), `sizesByRim(counts)` (rims and sizes in numeric order, 19.5
      included), `tireCountLabel(n)` ("12 tires" / "1 tire") · files:
      `src/app/utils/sizeIndex.ts` (+ `.test.ts`) · check: AC1, AC7d.
- [x] **T3** — `sizeQuery.ts`: `parseSizeQuery`, `findStocked`,
      `closestSizes` · files: `src/app/utils/sizeQuery.ts` (+ `.test.ts` with
      the 049 fixture) · check: every format of FR2 parses (incl. `P…ZR`,
      `LT…`, `2354518`, `35x12.50R20`, spaces, case); non-sizes → `null`;
      `12.5` ≡ `12.50`; 225/65/18 → the five 225s on 18"; a width absent on
      the rim → the whole rim; 155/80/12 → `[]` (AC2, AC3, AC4).

## The page

- [x] **T4** — Read the modern-web-guidance guides for the build (`forms`,
      `accessibility`) and note what applies in `results.md` · check: notes.
- [x] **T5** — `SizeSearch` (client): `<search>` landmark with a labelled form,
      `<input list>` + `<datalist>` of every size, `enterkeyhint="search"`;
      submit → push the size page / not-found `role="status"` panel (closest
      links with `data-track="size_index_select"` `-source="closest"`, fit
      reminder, picker link) / format hint; `size_index_search` via
      `trackEvent` (`result`, parsed `label` only, `via` best-effort) · files:
      `src/app/ui/components/SizeSearch/SizeSearch.tsx` (+ `.test.tsx`) ·
      check: AC2–AC5, AC9 (raw text never sent).
- [x] **T6** — `sizeIndexMetadata()` (title, description, canonical
      `/tires/size`) · files: `src/app/utils/seo.ts` (+ the metadata tests'
      length rules) · check: tests green.
- [x] **T7** — The hub page: breadcrumb, H1, intro, `SizeSearch`, popular
      sizes, all sizes by rim with counts (`data-track="size_index_select"`,
      `-source` popular / list), Breadcrumb + ItemList JSON-LD,
      `revalidate = 300` · files: `src/app/(shop)/tires/size/page.tsx`
      (+ a render test with the cached list mocked) · check: AC1, AC6, AC7d.
- [x] **T8** — Sitemap entry `/tires/size` · files: `src/app/sitemap.ts`
      (+ its test if entries are asserted) · check: AC6.

## Ways in

- [x] **T9** — Size pages' breadcrumb: Home / Tires / **Sizes** / {size}, in
      the markup and in `buildBreadcrumbJsonLd` · files:
      `src/app/(shop)/tires/size/[size]/page.tsx` · check: AC7 (render or
      view-source).
- [x] **T10** — "See all sizes" (`data-track="see_all_sizes"`, `-surface`):
      home picker, `/tires` floating form, end of the Rim size group of the
      filter rail · files: `SearchBySize.tsx`, `CompactForm.tsx`,
      `FilterRail.tsx` (+ tests) · check: AC7b.
- [x] **T11** — Footer "Shop by size" · files:
      `src/app/ui/sections/Footer/Footer.tsx` (+ `Footer.test.tsx`) · check:
      AC7b.
- [x] **T12** — Header "Shop Tires" menu: `MenuChild.group`, `MenuItem.allLabel`,
      generic grouped rendering on desktop and phone (Locations unchanged in
      look), Shop Tires children (All / Used / New / Shop by size),
      `group-focus-within` on the desktop panel, `inert` on the collapsed phone
      panel · files: `src/app/ui/sections/Header/MenuItems.ts`, `Header.tsx`,
      `src/app/ui/sections/MenuMobile/components/MenuItem.tsx` (+ tests) ·
      check: AC7c; Locations still shows Miami / Orlando and "View all 7
      locations →".

## Docs and done

- [x] **T13** — `spec/tech-stack.md` (the three events, `via` noted as
      best-effort; the hub); `results.md` · check: review.
- [x] **T-DoD** — `npx tsc --noEmit`, `npm run lint`, `npm test`,
      `npm run build`, `npm run perf:budget`; manual by the agent in Chrome at
      390 px and desktop:
      - `/tires/size`: 200, sections, links, view-source (one H1, canonical,
        JSON-LD, links in HTML); `sitemap.xml` lists it;
      - search: `235/45R18`, `2354518`, `P235/45ZR18`, `35x12.50R20` → size
        pages; `225/65R18` → five closest; `155/80R12` → message + picker;
        `hello` → format hint; typing `235` shows suggestions;
      - a size page's breadcrumb; the four "See all sizes"/footer links;
      - header menu with mouse and with Tab only; Locations unchanged; phone
        menu;
      - no sideways overflow, targets ≥ 44 px (AC10); events by tests
        (consent declined locally) · check: `results.md`.

## Traceability

| Task | AC |
| ---- | -- |
| T1 | AC1, AC8 |
| T2 | AC1, AC7d |
| T3 | AC2, AC3, AC4 |
| T4 | AC5, AC10 (research) |
| T5 | AC2, AC3, AC4, AC5, AC9 |
| T6 | AC6 |
| T7 | AC1, AC6, AC7d, AC9 |
| T8 | AC6 |
| T9 | AC7 |
| T10 | AC7b, AC9 |
| T11 | AC7b |
| T12 | AC7c |
| T13 | — (docs) |
| T-DoD | AC1–AC10, AC7b–AC7d |
