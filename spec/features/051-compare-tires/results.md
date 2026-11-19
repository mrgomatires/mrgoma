# Results — Compare up to three tires side by side

> Feature: `051-compare-tires` · Verified locally 2026-11-18 (`next dev`, real
> inventory, Chrome at desktop width and at 390 px through a same-origin
> iframe).

## Definition of Done

`npx tsc --noEmit` ✓ · `npm run lint` ✓ · `npm test` ✓ (178 files, 2,139
tests; 38 new) · `npm run build` ✓ · `npm run perf:budget` ✓ — shared
First-Load 166.0 KB of 180 (unchanged), total client JS 646.4 KB of 680
(+4.9 KB over 050).

## Data (sellable catalog, 2026-11-18)

- DOT: 6,894 of 6,895 tires carry four digits `WWYY` (week spread 01–53); one
  has `104`. Load index and speed rating: 6,891 of 6,895.
- `DOT`, `loadIndex`, `speedIndex` were already read by the listing queries
  (`SELECT *`) and dropped on the way out; they now reach the cards. `012`'s
  whitelist test listed DOT as internal — it is public (printed on the tire,
  shown on every tire page) and moved to the whitelist with a note.

## Browser checks

| Check | Result | AC |
| --- | --- | --- |
| Size page 235/45/18: 24 cards with "Compare" (`aria-label` "Compare Goodyear Electric Drive 2 SoundComfort XL 235/45/18"); two picked → tray with both, an empty slot, "2 of 3 tires", Compare enabled; `--compare-tray-h` 83 px | ✓ | AC1, AC7 |
| Brand page Pirelli: the two picks still in the tray (across pages); a third added | ✓ | AC11 |
| Comparison: different-sizes notice, Size "(differs)", Best on price $175, tread 8.9/32", life 89%, No patch, DOT "Week 31, 2026"; load, speed, run-flat rows | ✓ | AC3, AC13 |
| Esc closes; focus returns to Compare | ✓ | AC7 |
| A sold tire (#392758) injected into the comparison: "Sold", no Add to cart, never "Best"; reload kept the three picks | ✓ | AC12, AC11 |
| `/api/tires/compare?ids=392758,500138` → `available:false` / `true, 145`; `ids=1,2,3,4` and `ids=1';drop` → 400 | ✓ | AC9, AC12 |
| 390 px `/tires`: tray 619–700 px; floating search (559–603) and chat (525–595) above it; tray buttons 44 px; no sideways overflow | ✓ | AC6 |
| 390 px dialog: full screen (390×700); tires scroll sideways with the fact column pinned at 0 | ✓ | AC6, AC9 |
| `/checkout`: no tray, picks kept (3) | ✓ | AC14 |

## Changes found while verifying

- **Location was "—" on server-rendered listings** (size, brand, new, used,
  first `/tires` page): those paths transformed raw records, and only
  `/api/tires` derived the city. They now go through `pickTireListFields`
  like the API — the city is derived on the server, and `storeCity` (which
  lists the warehouse names) stays out of the client bundle. This also gives
  cart lines added from those pages their city.
- **Thumbnails downloaded 1,600 px originals** for a 40 px slot; they now go
  through `next/image` with fixed `width`/`height` (013's guard: no `sizes`,
  a 1x/2x pair).
- **A sold tire could win "Best"**; sold tires are now excluded from ranking.
- **The pinned fact column let content show beside it** while scrolling
  sideways on a phone (side padding on the scroller); the gutter moved to the
  column itself.
- The compare checkbox's name ran "Compare" and the brand together through a
  hidden span; it now has an explicit `aria-label` starting with the visible
  word (WCAG 2.5.3).
- `brandContrast.guard` flagged `disabled:text-gray-*` next to
  `bg-green-600`; active and disabled styles are now separate branches.

## Owner review (2026-11-18): the comparison's design

The first version worked but looked plain. Redesigned taking Priority Tire's
comparison as a **reference, not a model** (owner: "que sea un referente pero
con cuidado con la igualdad"): one card per tire heading its column, in Mr.
Goma's own card language — the listing `TireCard`'s condition accent on the
left, the photo on top with the Used/New and size pills (black/lime), the dark
spec strip with lime labels (tread, life, patched), the site's green rounded
CTA — and a cleaner table below (small-caps fact labels, a lime "✓ Best"
pill). Header "Compare (n)" with Clear and close; "Show only differences" is a
switch (`role="switch"`). Cards in a row share one height; the CTA sits at the
same line in each. First focus goes to Close, not Clear (React does not write
`autofocus` to the DOM, so the native dialog cannot see it — focused after
`showModal()`). Verified at desktop (3 × 460–533 px cards) and at 390 px
(sideways scroll, fact column 5 rem).

## Owner review, second round (2026-11-18)

- **A request loop in `next dev`** on every store page (`/tires`: an RSC
  refetch about once a second, each followed by `/api/tires?page=1`; size
  pages: RSC + manifest). Not in a production build (`next start`: silent) and
  not on `main` — bisected by stashing 051, then disabling pieces: the tray
  (mounted by the store layout, alive across pages) importing the listing's
  `BrandImage` was enough to trigger it. The dialog now draws the logo with
  its own `CompareBrand` (same files, no `priority`, the name as text when
  there is no logo); `devLoop.guard.test.ts` keeps `BrandImage` out of the
  tray. Re-checked with the tray full and the dialog open: `/`, `/tires`,
  `/tires/size`, a size page, `/tires/used`, `/tires/new`, a brand page, a
  tire page, `/locations`, `/checkout` — no repeated requests.
- **The remove ✕ was hard to see on photos**: now a solid white disc with a
  dark cross, ring and shadow inside the 44 px target; the dialog's close is a
  bordered circle with a dark cross.
- **Alignment**: the fact column is a fixed 7.5 rem (5.25 on phones), the
  table is `table-layout: fixed`, and the dialog is sized by the number of
  tires (`--compare-n`): two tires no longer sit in a three-tire frame with an
  empty left half. Measured: 2 tires → dialog 824 px, cards 336 px; 3 tires →
  1,160 px, cards 324 × 518 px each, evenly spaced; phone → 224 px cards
  scrolling sideways with the next one peeking.
- **Contrast**: the "Show only differences" switch's off track was gray-300
  on white (1.5:1); now gray-500 (4.8:1), WCAG 1.4.11.

## Modern Web Guidance

- `ui-components/dialog` — native `<dialog>` + `showModal()`, no `role`,
  `aria-modal`, focus trap or body scroll lock; `overscroll-behavior: contain`
  on the dialog and backdrop; `closedby="any"`; `aria-labelledby`.
- `ui-atoms/responsive-table` — semantic table with row headers, sticky fact
  column for sideways scrolling.
- `forms/forms` — a checkbox for a binary, reversible choice.
- `ui-behaviors/animate-element-entry-exit` — tray entry with
  `@starting-style`, motion only when allowed.

## Left for the owner

- GA4 DebugView on the Preview: `compare_add`, `compare_remove`,
  `compare_limit`, `compare_open`, `compare_view_tire`.
- iPhone: tray, comparison dialog (full screen, sideways scroll).

### Owner review, third round (alignment)

- The empty corner above the fact names left a gap beside the cards: the "Show only differences" switch now lives there, by the rows it filters.
- A two-line name pushed one card's price down: the logo line, the name (clamped to two lines, fixed height) and the load/speed line are fixed-height, so prices and buttons sit on one line across cards (measured: prices at the same y, buttons at the same y).
- Row values start where the card text does (column px-2 + 4px accent + px-4); the cards' right edge matches the header's close button; the title is left-aligned with the content.

### Owner review, fourth round (card height)

- Cards were ~518px tall on desktop; now 391px (measured, 3 tires): photo 2:1 instead of 16:10, the heading is the model only (the logo says the brand; its alt text keeps the column's accessible name "Pirelli P Zero…"), load/speed beside the price, "Add to cart" and an outlined "View tire" on one line. On a phone (224px card) the two buttons wrap to full-width rows; the card stays ~392px.
