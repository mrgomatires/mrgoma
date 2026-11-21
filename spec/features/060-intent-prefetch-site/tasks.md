# Tasks — Pages load in the background only when the shopper is about to open them

> Feature: `060-intent-prefetch-site` · Based on: [plan.md](./plan.md) · Created: 2026-11-21

Ordered, **very small, independently verifiable** tasks. Check each off as it is
completed.

- [x] **T1** — Baseline, before any code: production build with the temporary
  DB probe (`console.log` in `getPool` and `fetchTireById`, never staged), the
  server on a free port, Chrome desktop. On `/tires`, a size page, a tire page,
  the home page and a store page: load, full scroll; record `?_rsc` requests,
  KB, and `fetchTireById` / `getPool` calls caused by prefetches, split into
  tire pages / menu / footer / body. Also `/tires/used`, `/tires/new` and a
  brand page (tire prefetches only). Write the "before" table and the
  production baseline (Vercel, human traffic 9–21 Nov) in `results.md`. ·
  files: `spec/features/060-intent-prefetch-site/results.md` · check: table
  written; probe lines reverted (`git status` shows no change in `src/connection`
  or `src/repositories`).
- [x] **T2** — Root 404 renders `<StickyHeader />` instead of `TopHeader` +
  `Header`, and a test that it renders the site header. · files:
  `src/app/not-found.tsx`, a test beside it · check: test green; `perf:budget`
  unchanged (~215 KB).
- [x] **T3** — Duplicate check: `LAYOUT_MARKERS` (`data-nav-menu`,
  `cart-modal-title`) and a pure `findDuplicatedLayout` in `perf-budget.mjs`
  (a marker in more than one chunk of a page, or in none → problem); `main()`
  fails on it. Unit tests in `src/perf-budget.test.ts` (once → ok, twice →
  duplicate, none → missing). · files: `scripts/perf-budget.mjs`,
  `src/perf-budget.test.ts` · check: tests green; `npm run perf:budget` green
  on the current build.
- [x] **T4** — Lower `shopperPageJs.limitKB` 240 → 225 and update its note. ·
  files: `perf-budget.json` · check: `perf:budget` green.
- [x] **T5** — Delete `MenuPrefetchLink`; `Header.tsx` and phone `MenuItem.tsx`
  use `IntentPrefetchLink` for **every** item (top-level, dropdown/submenu
  children, "View all locations"), not the logos; remove
  `MenuChild.prefetchOnIntent` from `MenuItems.ts`; update the
  `IntentPrefetchLink` comment (one component site-wide, the 404 cause). ·
  files: `MenuPrefetchLink/` (removed), `IntentPrefetchLink.tsx`, `Header.tsx`,
  `MenuItem.tsx`, `MenuItems.ts` · check: `menu.prefetch.test.tsx` rewritten —
  every menu link but the logo `prefetch=false`, desktop and phone; green.
- [x] **T6** — Footer: section links and Terms / Privacy use
  `IntentPrefetchLink`. · files: `Footer/FooterSection.tsx`, `Footer/Footer.tsx`
  · check: footer case in `prefetch.sites.test.tsx` (T9).
- [x] **T7** — Tire-page links: TireCard photo and title, `TireTable`,
  `OtherSizes`, `SoldTireAlternative`, `CompareDialog`, `CartModal` item links
  (not "Checkout"), `Checkout.tsx` item links (not the continue links) use
  `IntentPrefetchLink`; same href, classes, `onClick`. · files: those seven ·
  check: existing tests green (TireCard GA4 `select_item` from photo and
  title, cart, checkout, compare).
- [x] **T8** — `TireCard.prefetch.test.tsx`: detail links now `prefetch=false`
  (the 059 assertion inverted, comment explains why). · check: green; fails
  with a detail link reverted to `Link` (try once).
- [x] **T9** — *(Done as a source guard, `src/app/ui/intentPrefetch.guard.test.ts`: these components already have render tests with the real `next/link`, and mocking it there would change what they test. The guard lists every surface and the only destinations allowed to keep a plain `Link` — logo, cart "Checkout", checkout's continue links — and fails on any other; tried by reverting "other sizes".)* Originally: `prefetch.sites.test.tsx` (one file, `next/link` mocked): table
  view, other sizes, sold alternative, compare dialog, cart panel (items
  intent, Checkout default), checkout page item links, footer (all intent). ·
  check: green.
- [x] **T10** — Guard proof: build with T2 reverted once → `perf:budget` fails
  on both the duplicate check and the 225 KB limit; restore → green. Record
  the numbers in `results.md`. · check: both failures observed and written
  down.
- [x] **T11** — After: same build-and-probe method as T1 on the same pages
  (desktop): 0 tire prefetches and 0 prefetch-caused `fetchTireById`; 0 menu /
  footer prefetches (logo's home page excepted; body links counted apart);
  hover a card title → one prefetch; clicks on a card (title, body), a menu
  item, a footer link, a cart item open the right pages; the 404 shows the
  site header. Phone width if the window resizes (else state it). Revert the
  probe. · files: `results.md` · check: after table, AC evaluation.
- [x] **T12** — `tech-stack.md`: intent-prefetch as the default for links that
  are rarely followed, the single-entry rule for layout components, and the
  two guards; roadmap P1.7 line updated; memory note with the production
  follow-up date; and the stale "`shopperPageJs` ≤ 320 KB" in `tech-stack.md`
  corrected to the real limit (225 KB). · files: `spec/tech-stack.md`,
  `spec/roadmap.md` · check: diff reads correctly; the number matches
  `perf-budget.json`.
- [x] **T-DoD** — `npx tsc --noEmit` + `npm run lint` + `npm test` +
  `npm run build` + `npm run perf:budget` + `npm run a11y` green; manual check
  done in T11; stage with explicit pathspecs (no probe, no audit .xlsx); no
  commit until the owner approves.

## Traceability

| Task | Acceptance criteria |
| ---- | ------------------- |
| T1   | AC9 (before), AC10 (baseline) |
| T2   | AC8 (cause removed), AC12 |
| T3   | AC8 |
| T4   | AC8 |
| T5   | AC5, AC7 |
| T6   | AC5 |
| T7   | AC1, AC2, AC3, AC6 |
| T8   | AC7 |
| T9   | AC7 |
| T10  | AC8 |
| T11  | AC1, AC2, AC3, AC4, AC5, AC6, AC9, AC12 |
| T12  | AC10 |
| T-DoD | AC11 |
