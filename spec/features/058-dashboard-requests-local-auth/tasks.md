# Tasks — Dashboard asks once; seller login works on a local production build

> Feature: `058-dashboard-requests-local-auth` · Based on: [plan.md](./plan.md) · Created: 2026-11-19

Ordered, **very small, independently verifiable** tasks. Check each off as it is
completed.

### Count first

- [x] **T1** — `Dashboard.requests.test.tsx`: render `<Dashboard />` (and
  `DashboardHeader` inside a `SessionProvider`) with `fetch` and
  `next/navigation` mocked; count requests per path and router pushes on
  mount; record the caller of each extra one · files:
  `src/app/(sellers)/dashboard/container/Dashboard.requests.test.tsx` · check:
  red today, naming the doubled endpoints and any mount-time push; causes of
  `_rsc` and the second session read written in `results.md`.

### Fixes

- [x] **T2** — `sharedJson(url, { ttlMs })`: one in-flight promise per URL,
  value kept `ttlMs` (60 s), errors not cached · files:
  `src/app/utils/sharedFetch.ts` (+ `.test.ts`) · check: unit tests — two
  concurrent calls → one fetch; a call within TTL → no fetch; after TTL →
  fetch; a failed call → next call fetches.
- [x] **T3** — `useFilters` reads ranges, stores and brands through
  `sharedJson` (drop `brandsRequestCache`) · files: `useFilters.tsx` · check:
  `useFilters.locations.test.tsx` green; T1 shows ranges/brands/stores 1×.
- [x] **T4** — `useTireDynamicOptions` reads heights (and widths/diameters)
  through `sharedJson` · files: `useTireDynamicOptions.ts` · check: T1 shows
  heights 1×; picking a width still loads its sidewalls.
- [x] **T5** — `DashboardTable`: one effect on search + page; a new search
  resets to page 1 with a single request · files: `DashboardTable.tsx`
  (+ test) · check: T1 tires 1× on mount; new test — params change → 1
  request at page 1; next page → 1 request.
- [x] **T6** — No `router.push` when the target URL equals the current one
  (`useFilters` sync effect, and any other push T1 finds on mount) · files:
  `useFilters.tsx` (+ whatever T1 names) · check: T1 — 0 pushes on mount;
  existing filter tests green (a real change still pushes).
- [x] **T7** — Session: if T1 still shows 2 reads, remove the second reader;
  keep `refetchOnWindowFocus`. If jsdom does not reproduce it (it may come
  from a real navigation the mocked router does not make), find the caller in
  the browser and confirm in T10 · check: T1 session 1×, or T10's network log
  1×.

### Local sign-in

- [x] **T8** — `.env.template` gains `AUTH_TRUST_HOST=true` with its comment;
  `scripts/lab.mjs` `startServer` sets it for the spawned server;
  `spec/tech-stack.md` explains starting a local production build that can
  sign in · check: `perf:lab`/`a11y` still run; template and doc present.
- [x] **T9** — Guard: `authOptions.ts` has no `trustHost`; `.env.template`
  lists `AUTH_TRUST_HOST` · files: `src/bundle.guard.test.ts` · check: green;
  red if `trustHost` is added.

### Verify

- [x] **T10** — Build; `next start` with `AUTH_TRUST_HOST=true`; the **owner
  signs in**; network log of `/dashboard` load (10 s), a width filter, the next
  page, a sort; tab hidden/shown → one session read; at 390 px (headless or
  owner's phone) the filter panel opens with options and no request; `/tires`
  filters and size picker re-checked at 1280 and 390 px with their network log
  (AC9) · check: counts recorded in `results.md`; no
  `UntrustedHost` in the server log.
- [x] **T11** — `results.md`: before/after request counts, causes found in T1,
  AC table · check: every AC evaluated.
- [x] **T-tests** — T1, T2, T5, T9 in `npm test` · check: `npm test` covers
  them.
- [x] **T-DoD** — `npx tsc --noEmit` + `npm run lint` + `npm test` +
  `npm run build` + `npm run perf:budget` + `npm run a11y` green; manual as in
  T10.

## Traceability

| Task | Acceptance criteria |
| ---- | ------------------- |
| T1 | AC1, AC3, AC6 |
| T2, T3, T4 | AC1, AC4 |
| T5 | AC1, AC2, AC6 |
| T6, T7 | AC1, AC3 |
| T8 | AC5 |
| T9 | AC7 |
| T10 | AC1–AC5, AC9 |
| T11 | all |
| T-DoD | AC8 |
