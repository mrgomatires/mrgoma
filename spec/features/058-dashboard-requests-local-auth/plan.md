# Plan — Dashboard asks once; seller login works on a local production build

> Feature: `058-dashboard-requests-local-auth` · Based on: [spec.md](./spec.md) · Created: 2026-11-19

## Technical approach

### Where the doubles come from (read from the code)

| Request ×2 | Cause |
| --- | --- |
| `/api/dashboard/tires` | `DashboardTable` fetches page 1 from **two effects**: `[searchParams]` (`setPage(1); fetchData(1)`) and `[page]` (`fetchData(page)`); both run on mount |
| `/api/dashboard/ranges`, `/brands` | `useFilters` is instantiated **twice** on the dashboard — `TopFilters` (desktop) and `FiltersMobile` (it calls `useFilters` only for `resetFilters`) — and each instance fetches ranges and brands. Brands has an ad-hoc `brandsRequestCache`, but it only dedupes identical keys in flight |
| `/api/dimensions/heights` | `useTireDynamicOptions` runs in **two** `TireSelector`s (the desktop search row and the phone one in `Dashboard`) |
| `/dashboard?_rsc` | to confirm in T1: `useFilters`' URL-sync effect calls `router.push` on mount from each instance even when the URL would not change |
| `/api/auth/session` | to confirm in T1: likely a side effect of the extra navigation above (the session is re-read on the `_rsc` round trip); next-auth's `SessionProvider` itself reads once on mount |

### Fixes

1. **Count first (T1).** A dashboard-level test renders `<Dashboard />` and
   `DashboardHeader` inside a `SessionProvider` with `fetch` and
   `next/navigation` mocked, and **counts requests per URL and router pushes**.
   It is red today (it reproduces the 2×) and is the regression guard (AC6).
2. **`DashboardTable` — one effect.** A single effect keyed on
   `searchParams.toString()` + `page`; a search change resets `page` to 1 in
   the same pass (a `useRef` of the last search string) so a new search costs
   one request, not two. Paging and sorting unchanged.
3. **Shared option loader (FR4).** New `src/app/utils/sharedFetch.ts`:
   `sharedJson<T>(url, { ttlMs })` — one in-flight promise per URL and the
   resolved value kept for `ttlMs` (default 60 s) in a module map, so every
   instance on the page gets the same answer from one request. `useFilters`
   uses it for ranges, stores and brands (replacing `brandsRequestCache`);
   `useTireDynamicOptions` uses it for heights (and widths/diameters, keyed by
   their URL). Errors are not cached. The storefront uses the same hooks, so
   `/tires` gets the same dedupe — its behaviour is unchanged.
4. **No navigation on mount.** `useFilters`' URL-sync effect (and any
   `router.push` found in T1) skips the push when the target URL equals the
   current one. That removes the mount-time `_rsc` round trips — and, per T1,
   the second session read.
5. **Session (FR3).** After 2–4, if `/api/auth/session` is still read twice,
   find the second reader in T1's test (it records each call's caller) and
   remove it; `SessionProvider` keeps its default `refetchOnWindowFocus`.
6. **Local sign-in (FR5).** `.env.template` gains
   `AUTH_TRUST_HOST=true` with a comment ("local `next start` only; Vercel
   trusts the host itself — never needed in Vercel env vars"). `scripts/lab.mjs`
   `startServer` sets `AUTH_TRUST_HOST: 'true'` in the spawned server's env
   (used by `perf:lab`, `npm run a11y` and manual runs through it).
   `spec/tech-stack.md` (Definition of Done section) says how to start a local
   production build that can sign in. `authOptions.ts` is not touched; a guard
   asserts it has no `trustHost`.

## Reuse first

- `useFilters`, `useTireDynamicOptions`, `useTireSearch` — fixed in place, no
  new hooks.
- Existing tests: `DashboardTable.test.tsx` (fetch stub pattern),
  `useFilters.locations.test.tsx`.
- `scripts/lab.mjs` `startServer`; `src/bundle.guard.test.ts` style for the
  auth guard.

## Files to add / change

- `src/app/utils/sharedFetch.ts` (+ `.test.ts`) — new.
- `src/app/ui/components/DashboardTable/DashboardTable.tsx` (+ test) — one
  effect.
- `src/app/ui/sections/FiltersMobile/hooks/useFilters.tsx` — `sharedJson` for
  ranges/stores/brands; no push when the URL is unchanged.
- `src/app/ui/components/CollapsibleSearchBar/hooks/useTireDynamicOptions.ts`
  — `sharedJson`.
- `src/app/(sellers)/dashboard/container/Dashboard.requests.test.tsx` — new
  count test.
- `.env.template`, `scripts/lab.mjs`, `spec/tech-stack.md`.
- `src/bundle.guard.test.ts` (or a small `auth.guard.test.ts`) — no
  `trustHost`; template lists `AUTH_TRUST_HOST`.
- `spec/features/058-…/results.md`.

## Data & flow

No API or SQL change. Fewer requests: on dashboard load 11 → 6 (tires,
brands, ranges, heights, stores, session); one more session read on tab
focus. Filter options are cached in memory for 60 s per URL — a second panel
or a re-mount within that window reuses them; a filter change that changes
the brands URL fetches the new one.

## Acceptance criteria → implementation

| AC | How it's met | How it's verified/tested |
| --- | --- | --- |
| AC1 | Fixes 2–4 | T1 count test (each endpoint 1×, 0 pushes on mount); network log on a local production build with the owner's session, watched 10 s |
| AC2 | One effect; `sharedJson` keyed by URL | Count test: change search params / page → one tires request; existing DashboardTable tests; manual width filter, page, sort |
| AC3 | Fix 4/5 | Count test: session 1× on mount; manual: hide/show tab → +1 |
| AC4 | Phone panel reads the shared options | Manual at 390 px (headless or owner's phone): open panel, options present, no request on open; filter works |
| AC5 | `AUTH_TRUST_HOST` in template + `startServer` | Owner signs in on `next start` with the variable; server log has no `UntrustedHost` |
| AC6 | Count test | Red before, green after |
| AC7 | Guard | `authOptions.ts` has no `trustHost`; `.env.template` lists `AUTH_TRUST_HOST` with its comment |
| AC8 | DoD | tsc, lint, tests, build, `perf:budget`, `a11y` |
| AC9 | Same hooks, same behaviour | Existing `useFilters` tests; manual `/tires` filters + size picker at 1280/390 with the network log |

## Tradeoffs / alternatives

- **Lifting the filter state into one provider** (one `useFilters` for both
  panels) — cleaner, but rewires both panels' props and their tests; the
  shared loader removes the duplicate requests with no UI change. Possible
  later.
- **SWR / React Query** — new dependency for five endpoints; a 30-line module
  map does it.
- **Unmounting the hidden panel** — the phone panel would refetch on every
  open (the option the owner did not choose).
- **`trustHost: true` in code** — rejected by the owner (global trust of the
  `Host` header).

## Risks

- **Stale options for 60 s** after inventory changes (brands list) — staff
  already see live data in the table; the filter list catching up within a
  minute is acceptable, and a page reload clears it.
- **Skipping a push that was needed** — the guard compares full URLs, so any
  real change still navigates; the count test plus the existing filter tests
  cover it.
- **Storefront side effects** (shared hooks) — `/tires` filters re-checked
  manually; existing `useFilters` tests run.

## Out of scope

- The dashboard tire query's own speed (SQL), storefront request audit.

---

_The concrete steps live in [tasks.md](./tasks.md)._
