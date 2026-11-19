# Tasks — Each page loads only the components it shows

> Feature: `057-split-barrels` · Based on: [plan.md](./plan.md) · Created: 2026-11-19

Ordered, **very small, independently verifiable** tasks. Check each off as it is
completed.

### Measure first

- [x] **T1** — Baseline on this branch before code: production build;
  `npm run perf:lab` (5 runs, mobile + desktop, tire page pinned with
  `--page tire --path …` in a second run) → `baseline.json`; screenshots at
  390/1280 of home, `/tires`, tire page, store, checkout → scratchpad;
  per-chunk unused JS noted · files:
  `spec/features/057-split-barrels/baseline.json` · check: file has
  `jsKB`/`unusedJsKB` for all 5 pages, tire path recorded.

### Guard (red first)

- [x] **T2** — `bundle.guard.test.ts`: the three index files must not exist; no
  file under `src/` imports `@/app/ui/components`, `@/app/ui/icons` or
  `@/app/ui/sections` bare or through `/index`; failure lists the files · files:
  `src/bundle.guard.test.ts` · check: red today (3 files + 72 importers named).

### Imports by path

- [x] **T3** — Codemod (scratchpad, not committed): map every barrel name to its
  module and default/named kind; rewrite all bare imports (single/multi-line,
  `import type`, aliases); refuse unknown names · files: the ~72 importers ·
  check: dry run lists 0 unmapped names; after the run `grep` finds no bare
  import.
- [x] **T4** — Delete the three index files; `eslint --fix` + `prettier` on the
  touched files only · files: `src/app/ui/{components/index.ts,icons/index.tsx,sections/index.ts}`
  · check: `npx tsc --noEmit` and `npm run lint` green; T2 green.
- [x] **T5** — Rewrite the two whole-barrel `vi.mock` calls to mock the
  specific module paths · files: `Home.test.tsx`, `InstantQoute.test.tsx` ·
  check: both suites green; full `npm test` green.
- [x] **T6** — Update `spec/tech-stack.md`: no barrels in `src/app/ui` — import
  by path; the guard enforces it · check: section present, the 056 note
  updated.

### Cookie banner vs. chat button

- [x] **T7** — `CookieConsent` publishes `--cookie-banner-h` on `<html>` while
  visible (ResizeObserver), `0px` when hidden/unmounted · files:
  `CookieConsent.tsx` + its test · check: unit test — shown → variable set
  to the region's height; after Decline → `0px` (jsdom has no
  ResizeObserver: stub it as `CompareTray.test.tsx` does).
- [x] **T8** — Chat launcher and the floating search button use
  `max(var(--compare-tray-h,0px), var(--cookie-banner-h,0px))` · files:
  `AiChat.tsx`, `CollapsibleSearchBar/components/{FloatingButton,CompactForm}.tsx`
  · check: manual on a first visit at 390/1280 — chat button (and the
  floating search button where it shows) above the banner, each opens on
  click; back to its corner after Decline; with the compare
  tray open it still clears the tray.

### Lock it in

- [x] **T9** — After build: `npm run perf:lab` (same runs as T1) → `after.json`;
  screenshots compared with T1 · check: AC1 thresholds (JS −40 KB, unused
  −50 KB on 5 pages), AC2 (LCP not worse beyond ±0.2 s).
- [x] **T10** — `perf-budget.json` limits lowered to the new weight + ~10 % ·
  check: `npm run perf:budget` green.
- [x] **T11** — `results.md`: before/after table, per-chunk notes, what the
  pages still load and why · check: every AC evaluated with numbers.
- [x] **T-tests** — T2 guard, T5 mocks, T7 CookieConsent in `npm test` ·
  check: `npm test` covers them.
- [x] **T-DoD** (dashboard login → logout pending: the owner's check) — `npx tsc --noEmit` + `npm run lint` + `npm test` +
  `npm run build` + `npm run perf:budget` + `npm run a11y` green; manual at 390
  and 1280: cart, AI chat (with and without the banner), compare tray, set
  builder, size picker, filters, tire gallery; `/login` renders; `/dashboard`
  login → logout by the owner.

## Traceability

| Task | Acceptance criteria |
| ---- | ------------------- |
| T1 | AC1, AC2, AC4 (baseline) |
| T2 | AC3 |
| T3, T4 | AC1, AC3 |
| T5 | AC5 (tests unchanged in behaviour) |
| T6 | AC3 |
| T7, T8 | AC6 |
| T9 | AC1, AC2, AC4 |
| T10 | AC7 |
| T11 | AC1, AC2 |
| T-DoD | AC5, AC6, AC7 |
