# Tasks — Less JavaScript on the shopper's critical path

> Feature: `056-bundle-lcp-mobile` · Based on: [plan.md](./plan.md) · Created: 2026-11-19

Ordered, **very small, independently verifiable** tasks. Check each off as it is
completed.

### Measure first

- [x] **T1** — `summarise()` in `perf-lab` reports `jsKB` (script transfer,
  `network-requests`), `unusedJsKB`, `renderBlockingMs` (render-blocking
  insight's FCP saving) and `htmlKB` (document transfer) · files:
  `scripts/perf-lab.mjs`, `src/lab-scripts.test.ts` · check: unit test with a
  fixture LHR gives the expected four numbers; `npm run perf:lab -- --runs 1
  --page home` prints them.
- [x] **T2** — 056 baseline on this branch, no code changes yet: production
  build, `npm run perf:lab` (5 runs, home / `/tires` / tire page / store /
  checkout, mobile + desktop) → `baseline.json`; screenshots at 390 and 1280 px
  of home, `/tires`, tire page, store → scratchpad (`/dashboard` only if the
  owner has a session open; never typing a seller's password) · files:
  `spec/features/056-bundle-lcp-mobile/baseline.json` · check: file has the
  four new fields for every page.

### Guards

- [x] **T3** — `perf-budget`: `measureShopperPages()` (gzip of the JS linked
  from `.next/server/app/{about-us,contact}.html`, largest) and
  `findForbidden()` (chunk contains `ZodError`, react-hook-form's marker or
  next-auth's `/api/auth/session` client) as pure, exported functions; the CLI
  fails on either · files: `scripts/perf-budget.mjs`, `src/perf-budget.test.ts`
  · check: unit tests (fixture dir with a clean and a dirty chunk); on today's
  build `npm run perf:budget` **fails** naming the zod and next-auth chunks.
- [x] **T4** — `src/bundle.guard.test.ts`: barrel has no `LoginForm` export;
  `next-auth/react` imported only by `DashboardHeader`, `LoginForm`, dashboard
  layout; root layout has no `SessionProvider`; `TreadWearExplorer` uses
  `useNearViewport` · check: test written red-first, goes green after T5–T8.

### The changes

- [x] **T5** — `useNearViewport(ref, rootMargin = '400px')`: IO, `true` once
  and disconnects; `true` when IO is missing · files:
  `src/app/ui/components/TirePreview3D/useNearViewport.ts` (+ `.test.ts`) ·
  check: hook tests (mocked IO: false → true on intersect; no IO → true;
  disconnect on unmount).
- [x] **T6** — `TreadWearExplorer` mounts `TreadScene` only when
  `near && idleReady` (ref on the `h-64` box; skeleton until then) · files:
  `src/app/ui/components/TreadWearExplorer/TreadWearExplorer.tsx` · check:
  perf-lab tire page: no three.js chunk in the load; manual scroll at 390/1280
  — viewer renders and rotates; CLS ≤ 0.05.
- [x] **T7** — `LoginForm` out of the barrel; `Login.tsx` imports it directly
  · files: `src/app/ui/components/index.ts`,
  `src/app/(sellers)/login/container/Login.tsx` · check: build; `grep` of the
  shopper pages' chunks has no `ZodError`; `/login` renders and validates.
- [x] **T8** — `SessionProvider` from the root layout to the dashboard layout
  · files: `src/app/layout.tsx`, `src/app/(sellers)/dashboard/layout.tsx` ·
  check: no `/api/auth/session` in the network log on home and tire page;
  **owner** signs in → dashboard header shows the session → logout → `/login`.
- [x] **T9** — Re-audit chunks after T7–T8 (which shared chunks still load on
  every page and why); if AC4's −100 KB falls short, say which part of the
  zod chunk was shared storefront code; note any further heavy barrel export
  in `results.md` (fix only if trivial) · check: note written.
- [x] **T10** — `experimental.inlineCss: true` with a comment on the
  trade-off; measure (perf-lab 5 runs, all pages) and keep only if mobile
  FCP/LCP better and `htmlKB` growth ≤ 50 KB per page, else revert and record
  (AC4b's alternative)
  · files: `next.config.mjs` · check: decision + numbers in `results.md`;
  screenshots 390/1280 of the five pages match T2's.

### Lock it in

- [x] **T11** — `perf-budget.json`: add `shopperPageJs`, lower all limits to
  the new weights + ~10 % · check: `npm run perf:budget` green; unit tests
  still green.
- [x] **T12** — `after.json` (perf-lab 5 runs) + `results.md` (before/after
  table: `jsKB`, `unusedJsKB`, `renderBlockingMs`, `htmlKB`, LCP, FCP, TBT,
  CLS, score; pages that did not improve reported as such) · check: AC4
  thresholds evaluated with medians.
- [x] **T13** — `spec/tech-stack.md`: seller-only client code stays out of the
  shared barrel and root layout; `perf:budget` checks it · check: section
  present.
- [x] **T-tests** — T1, T3, T4, T5 tests in `npm test` · check: `npm test`
  covers them.
- [x] **T-DoD** (dashboard login → logout pending: the owner's check) — `npx tsc --noEmit` + `npm run lint` + `npm test` +
  `npm run build` + `npm run perf:budget` + `npm run a11y` green; manual at 390
  and 1280: tire page 3D on scroll, AI chat, cart, compare tray, set builder,
  size picker; `/login` → `/dashboard` → logout **by the owner**.

## Traceability

| Task | Acceptance criteria |
| ---- | ------------------- |
| T1, T2 | AC4, AC4b (measurement) |
| T3 | AC2, AC3, AC5 |
| T4 | AC1, AC2, AC3 |
| T5, T6 | AC1 |
| T7 | AC2 |
| T8 | AC3 |
| T9 | AC4 |
| T10 | AC4b |
| T11 | AC5 |
| T12 | AC4, AC4b |
| T13 | AC5 |
| T-DoD | AC6, AC7, AC1, AC3 |
