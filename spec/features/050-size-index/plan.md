# Plan — Every tire size on one page

> Feature: `050-size-index` · Based on: [spec.md](./spec.md) · Created: 2026-11-18

## Technical approach

### 1. The page: `/tires/size`

A **static page regenerated every 5 minutes** (`export const revalidate = 300`),
beside the existing `/tires/size/[size]` route. No database work per visit:
the only data is one cached list of sizes with their tire counts.

```ts
// tiresRepository.ts — next to fetchSizes(), same sellable constant
fetchSizeCounts(): Promise<{ size: string; units: number }[]>
  // SELECT RealSize, COUNT(*) AS units FROM dbo.View_Tires
  // WHERE STOREFRONT_SELLABLE_WHERE AND RealSize <> '' GROUP BY RealSize
// cachedCatalog.ts
getCachedSizeCounts = unstable_cache(fetchSizeCounts, ['size-counts'], { revalidate: 300, tags: ['sizes'] })
```

Same `WHERE` as `fetchSizes()` (which feeds the picker, the sitemap and the
size pages), so the hub lists exactly the sizes for sale (FR8). ~294 rows.

The page (server component), top to bottom:

- **Breadcrumb** Home / Tires / Sizes (visual + `BreadcrumbList`).
- **H1** "Shop tires by size" and one short paragraph on reading a size on the
  sidewall (the 049 hint's wording).
- **`SizeSearch`** (client) — §2.
- **Popular sizes** (`h2`): the 12 with the most tires (D1), as link buttons
  ≥ 44 px: `/tires/size/{slugify(size)}`.
- **All sizes** (`h2`), then one `h3` per rim (`18" rim · 45 sizes`) in
  numeric order (13, 14, 15 … 19, 19.5, 20 … 26), each a `<ul>` of links
  `235/45/18 · 12 tires` / `· 1 tire` (D2), sizes in numeric order (width,
  ratio). Plain headed lists, **not** an accordion: everything visible and
  scannable, and every link plainly in the HTML (FR10, AC6).
- **JSON-LD:** `buildBreadcrumbJsonLd` + `buildItemListJsonLd({ url:
  '/tires/size', name, count, items })` with every size (name + URL).
- **Metadata:** new `sizeIndexMetadata()` in `seo.ts` through `pageMetadata` /
  `fitTitle` / `fitDescription` (title e.g. "Shop Tires by Size — Miami &
  Orlando | MrGoma"), self canonical `/tires/size`.
- **Sitemap:** `/tires/size` among the static entries (priority 0.8, daily).

### 2. The search box: `SizeSearch` (client)

> **Owner review (spec D8) — supersedes the datalist design below.** The box
> is the home page's typed field, extracted as `TireSizeTextField` and used by
> `SearchByText` (home, `/instant-quote`) and `SizeSearch`: digits only,
> formatted as typed, no autocomplete, `ButtonSearch` enabled when complete.
> `parseSizeQuery`, `findStocked` and `closestSizes` stay (the value is always
> `ddd/dd/dd`); `size_index_search` loses `via` and `invalid`. The shared
> `handleKeyPress` now lets named keys (Enter, Tab, arrows) and shortcuts
> through — it trapped Tab and blocked Enter on home too. `handleChangeInput`
> (only used by `SearchByText`) is removed. Header dropdowns release focus
> and stay shut after a navigation until the pointer re-enters.

Pure parsing and matching first:

```ts
// src/app/utils/sizeQuery.ts (pure)
parseSizeQuery(text) → { w, s, d } | null
  // strips spaces, case, a leading P/LT, R/ZR/-/x separators:
  // "235/45R18" "235 45 18" "235-45-18" "2354518" "P235/45ZR18" "LT265/70R17"
  // "35x12.50R20" "35/12.50/20"; 7-digit run = 3+2+2; ratios with a decimal
  // (12.50) only in flotation form
findStocked(parsed, sizes) → string | null
  // numeric match per part against the list ("12.5" ≡ "12.50", "19.5" rim)
closestSizes(parsed, sizes) → string[]
  // D3: same width on the same rim; else every size on that rim; else []
```

The component:

- `<search><form>` (the HTML `search` landmark, per the forms guide) with a
  visible `<label>`, `<input type="text"
  list="size-options" enterkeyhint="search" autocomplete="off">` and a Search
  button. `<datalist>` holds every size for sale (`235/45/18`) — the native
  suggestion list (modern-web-guidance, `forms`: "10+ / Dynamic → `<input
  list>`"), keyboard and screen-reader support from the browser, no library.
- **Suggestions match what is typed as text** (`235`, `235/4` → the 235s), as
  datalist does. A run of digits like `2354518` is understood on **submit**
  by `parseSizeQuery` (spec D7, AC5).
- **Submit:** found → `router.push('/tires/size/{slug}')`; valid but not sold
  → a `role="status"` panel: "We don't carry 225/65R18 right now.", the
  closest sizes (links), "Check the size on your tire's sidewall or in your
  car's door jamb before you buy.", and "Use the step-by-step picker" →
  `/tires`; not a size → "Type a size like 235/45R18."
- The list of sizes reaches the component as props from the page (~5 KB of
  strings), so typing and submitting call **no server** (FR12).
- Without JavaScript the form submits to `/tires/size?q=…`, which renders the
  same static page (the list is the fallback); the canonical stays
  `/tires/size`, and nothing links to `?q=` URLs.

### 3. Ways in (D4–D6)

- **Size pages:** breadcrumb becomes Home / Tires / **Sizes** / {size}, in the
  markup and in `buildBreadcrumbJsonLd` (`/tires/size/[size]/page.tsx`).
- **"See all sizes"** link (`data-track="see_all_sizes"`, `-surface`):
  - home: under the 049 picker in `SearchBySize`;
  - `/tires`: in `CompactForm` (floating form) and at the end of the **Rim
    size** group of `FilterRail` (server component). The rail exists only on
    `/tires` — desktop, and inside `FilterRailMobile` on phones — so the link
    shows on both; `/tires/new`, `/tires/used` and brand pages use
    `BrowseFilters` and are not touched.
- **Footer:** "Shop by size" in the links column next to "Store".
- **Header "Shop Tires" menu (D5):** `menuItems` gets children — All tires
  `/tires`, Used tires `/tires/used`, New tires `/tires/new`, Shop by size
  `/tires/size`. Today the dropdown rendering (desktop `Header.tsx`, phone
  `MenuMobile/components/MenuItem.tsx`) is written for Locations only (Miami
  / Orlando columns and "View all 7 locations →"). It is generalised:
  - `MenuChild.group?: string` (Locations' children get `group: 'Miami, FL'`
    / `'Orlando, FL'`, from `city`); children are rendered per group, with
    the group heading only when it has a label — one list for Shop Tires.
  - `MenuItem.allLabel?: string` for the footer link of the panel ("View all
    7 locations →"; none for Shop Tires, whose first child is "All tires").
  - Desktop panel width follows the content (`w-[480px]` only for grouped
    menus).
  - **Keyboard (AC7c):** the desktop panel opens on hover **and**
    `group-focus-within`, so Tab reaches the children (today Locations' panel
    is hover-only); the phone submenu's collapsed panel gets `inert`, so its
    links are not tabbable while hidden (today they are).

### 4. Analytics (FR11)

| Event | Where | Params |
| --- | --- | --- |
| `size_index_search` | `trackEvent` on submit | `result` found / not_found / invalid; `label` = normalized size **only when it parses** (never the raw text); `via` typed / suggestion (`inputType === 'insertReplacementText'`, which Chrome sends for a datalist pick; **best-effort** — where a browser does not send it the event says `typed`) |
| `size_index_select` | `data-track` on popular, list and "closest" links | `-source` popular / list / closest, `-label` size |
| `see_all_sizes` | `data-track` on the three picker links | `-surface` home / tires_form / rail |

Header and footer links stay untracked, like their siblings.

## Reuse first

- `getCachedStockedSizes` / `fetchSizes` pattern, `STOREFRONT_SELLABLE_WHERE`,
  `unstable_cache` (`cachedCatalog.ts`).
- `slugify` / `matchSlug` (`tireSlug.ts`) — the size page's address; `35/12.50/20`
  → `35-12-50-20`.
- `parseSize` and the numeric ordering of `sizeTree.ts` (049).
- `pageMetadata`, `fitTitle`, `fitDescription`, `buildBreadcrumbJsonLd`,
  `buildItemListJsonLd` (`seo.ts`); `JsonLd`.
- The size page's breadcrumb markup (copied for the hub's).
- `menuItems`, `Header`, `MenuMobile` (generalised, not duplicated).
- `trackEvent`, `InteractionTracker` + `data-track-*`.

## Files to add / change

Add:

- `src/app/(shop)/tires/size/page.tsx` — the hub.
- `src/app/utils/sizeQuery.ts` (+ `.test.ts`) — parse, find, closest.
- `src/app/utils/sizeIndex.ts` (+ `.test.ts`) — pure: popular (top 12 by
  units, ties by size), group by rim, labels ("12 tires" / "1 tire").
- `src/app/ui/components/SizeSearch/SizeSearch.tsx` (+ `.test.tsx`).
- `spec/features/050-size-index/results.md`.

Change:

- `src/repositories/tiresRepository.ts` — `fetchSizeCounts()`.
- `src/repositories/cachedCatalog.ts` — `getCachedSizeCounts`.
- `src/app/utils/seo.ts` — `sizeIndexMetadata()` (+ case in the metadata
  tests: length rules).
- `src/app/sitemap.ts` — static entry (+ its test if one asserts entries).
- `src/app/(shop)/tires/size/[size]/page.tsx` — breadcrumb step "Sizes".
- `src/app/ui/components/SearchBySize/SearchBySize.tsx` — "See all sizes".
- `src/app/ui/components/CollapsibleSearchBar/components/CompactForm.tsx` —
  "See all sizes".
- `src/app/ui/sections/FilterRail/FilterRail.tsx` — link under Rim size.
- `src/app/ui/sections/Footer/Footer.tsx` (+ test) — "Shop by size".
- `src/app/ui/sections/Header/MenuItems.ts`, `Header.tsx`,
  `MenuMobile/components/MenuItem.tsx` — generic grouped submenu, Shop Tires
  children, focus-within, `inert`.
- `spec/tech-stack.md` — the three events; the hub in the SEO notes.

## Data & flow

- **Hub render (every ≤ 5 min):** `getCachedSizeCounts()` → `sizeIndex`
  (popular, by rim) → HTML + JSON-LD. Visitors get the static page.
- **Search:** in the browser only — `parseSizeQuery` → `findStocked` against
  the sizes passed as props → navigate or show the not-found panel.
- **Size pages:** unchanged data; one breadcrumb item more.
- No API added, no DB writes, no new URL space (`?q=` is a no-JS fallback that
  renders the same canonical page).

## Acceptance criteria → implementation

| AC | How it's met | How it's verified/tested |
| --- | --- | --- |
| AC1 | hub page, `sizeIndex` grouping | `sizeIndex.test` (rims in order incl. 19.5, sizes in order, counts); manual: 200 and sections present |
| AC2 | `parseSizeQuery` + `findStocked` + push | `sizeQuery.test` over the formats; `SizeSearch.test`: submit → push `/tires/size/235-45-18` |
| AC3 | flotation parsing, `slugify` | `sizeQuery.test`: `35x12.50R20` → `35/12.50/20`; `SizeSearch.test` → `/tires/size/35-12-50-20` |
| AC4 | `closestSizes` + status panel | `sizeQuery.test`: 225/65/18 → the five 225s on 18"; 155/80/12 → []; `SizeSearch.test`: panel text, links, picker link, invalid text hint |
| AC5 | the shared `TireSizeTextField` (D8) | `SizeSearch.test` / `TireSizeTextField.test`: formatting, no `list`; `handleKeyPress.test`: Enter/Tab pass |
| AC6 | server-rendered links, one H1, canonical, ItemList, sitemap | page test (render the server component) or manual view-source; `sitemap` test/`curl` |
| AC7 | breadcrumb step in markup + JSON-LD | size page render test or manual view-source |
| AC7b | four links | component tests (SearchBySize, CompactForm, Footer) + FilterRail render test |
| AC7c | generic submenu, focus-within, inert | Header/MenuItem tests: Shop Tires children rendered; collapsed phone panel `inert`; manual Tab through on desktop |
| AC7d | counts + top 12 | `sizeIndex.test` |
| AC8 | `revalidate = 300` on the same cached list | review + note (size pages are ISR 1 h; see Risks) |
| AC9 | `trackEvent` with parsed label only; `data-track-*` | `SizeSearch.test`: raw text never sent; attributes asserted |
| AC10 | wrapping lists, 44 px targets | manual at 390 px / desktop; `perf:budget` |

**AC5** was amended at `/analyze` (spec D7).

## Tradeoffs / alternatives

- **Custom ARIA combobox** (would match `2354`): more JS, more a11y surface to
  get right; the guide's pattern for long dynamic lists is `<datalist>`.
  Rejected for now; revisit if search data shows people type digits-only.
- **Server-side search** (`/tires/size?q=` resolved and redirected on the
  server): works without JS, but makes the page dynamic (no static cache) and
  opens a crawlable query space. Rejected.
- **Accordion per rim** (like 049's "Other sizes"): shorter page, but hides
  the content this page exists to show; plain headed lists scan faster.
- **Counts from 049's model-size groups** (no new query): couples the hub to a
  query built for something else; a 294-row `GROUP BY` is cheap and cached.

## Risks

- **Size page cache (1 h) vs hub (5 min):** a size that sells out leaves the
  hub within 5 minutes; its own page may still serve the cached version for up
  to an hour (200, with a "no results" body if regenerated) — never a link to
  a 404 from the hub except in the regeneration race. Acceptable; noted.
- **Generalising the header menu** touches every page: covered by tests for
  both menus and a manual pass of Locations (unchanged look).
- **JSON-LD size:** ~294 `ListItem`s (~25 KB in the HTML). Acceptable for an
  index page; it is what the ItemList is for.
- **iOS datalist:** Safari shows suggestions above the keyboard; checked on a
  real phone by the owner.

## Out of scope

- A brands index (`/tires/brands`).
- Changing what size pages show beyond the breadcrumb.
- Digits-only live suggestions (see tradeoffs).

## Modern Web Guidance consulted

- `forms/forms` — `<input list>` + `<datalist>` for 10+ dynamic options;
  visible labels; `enterkeyhint`; no auto-submit on change.
- `accessibility/accessibility` — one polite status region for the not-found
  result, not for loading states.

---

_The concrete steps live in [tasks.md](./tasks.md)._
