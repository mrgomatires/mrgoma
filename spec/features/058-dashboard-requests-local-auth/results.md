# Results — Dashboard asks once; seller login works on a local production build

> Feature: `058-dashboard-requests-local-auth` · Implemented: 2026-11-19

## Requests when the dashboard opens

Production build, the owner's session, Chrome network log, watched 10 s after
load.

| Request | Before | After |
| --- | --- | --- |
| `/api/dashboard/tires` | 2 | **1** |
| `/api/dashboard/brands` | 2 | **1** |
| `/api/dashboard/ranges` | 2 | **1** |
| `/api/dimensions/heights` | 2 | **1** |
| `/api/dashboard/stores` | 1 | 1 |
| `/api/auth/session` | 2 | **0** (read on the server) |
| `/dashboard?_rsc` (page data) | 2 | **0** |
| **Total** | **13** | **5** |

Nothing new over the following 10 s. Width filter → one request each (tires,
brands, the sidewall list) and one navigation; next page → one request; a new
search from page 2 → **one** request, back on page 1; sorting → none (it sorts
in the browser, as before).

## Causes found (T1: `Dashboard.requests.test.tsx` reproduced every one)

| Double | Cause | Fix |
| --- | --- | --- |
| tires | `DashboardTable` fetched page 1 from two effects (`[searchParams]` and `[page]`) | One effect on search + page; a new search resets to page 1 and fetches once |
| ranges, brands, heights | Two `useFilters` (desktop panel; phone panel's `FiltersMobile`) and two size pickers, each fetching | `sharedJson` (`src/app/utils/sharedFetch.ts`): one request per URL, kept 60 s, failures not kept. Replaces the ad-hoc `brandsRequestCache` |
| page data `?_rsc` | When the ranges arrived, each `useFilters` re-derived its inputs and called `router.push` with an unchanged URL (500 ms debounce) | Push only when a parameter changed (`filterChanged`, already computed) |
| session | **next-auth 5.0.0-beta.32**: `SessionProvider` reads the session, announces it on a *new* `BroadcastChannel`, and its own "another tab changed the session" listener hears that and reads again | The dashboard layout reads the session on the server (`auth()`) and passes it in: the browser reads none on load |

Not reproduced by jsdom: the `?_rsc` double (the mocked router does not
navigate); confirmed fixed in the browser.

## Acceptance criteria

- **AC1 ✅** — each endpoint once, no extra navigation, nothing over 10 s
  (table above).
- **AC2 ✅** — filter, page and a new search: one request each; table updates.
- **AC3 — met on load, not quite on focus.** On load the browser reads the
  session **0** times (better than the 1 asked). The refresh when the tab is
  shown again is kept, but it reads **twice**: the same next-auth echo (its
  refresh broadcasts too). Removing it means patching the library; the read
  is a JWT check (no database) and happens only on tab return.
  `Dashboard.requests.test.tsx` pins 1–2 and says to tighten it if an upgrade
  drops the echo. Checked in the test, not the browser: the browser
  extension's tab switches don't fire `visibilitychange`.
- **AC4 ✅** — opening the phone filter panel makes no request (test: the panel
  mounts and the request log stays empty). Its options come from the shared
  load.
- **AC5 ✅** — `next start` with `AUTH_TRUST_HOST=true`: the owner's session
  works (`Welcome, webmaster`), the server log has no `UntrustedHost`.
  `npm run a11y` ran through `scripts/lab.mjs` with the variable set.
- **AC6 ✅** — `DashboardTable.test.tsx`: mount → one request; a new search
  from page 3 → one request at page 1. `Dashboard.requests.test.tsx` counts
  every endpoint.
- **AC7 ✅** — `bundle.guard.test.ts`: no `trustHost` in `authOptions.ts`;
  `.env.template` has `AUTH_TRUST_HOST=true` with "Never set it in Vercel".
- **AC8 ✅** — tsc, lint, 2309 tests, build, `perf:budget`, `npm run a11y`
  (100 on all pages).
- **AC9 ✅** — `/tires`: one API request on load (set offers; filters are
  server-rendered); a brand filter → one navigation and one `/api/tires`; the
  home size picker loads its ratios after a width. Same look.

## Found, not changed

- **After a filter change on `/tires`, Next prefetches `/tires/new` and
  `/tires/size` 3–4 times each** (`?_rsc`, from links on the page). Each is a
  server render of a dynamic route. Not from this branch; worth measuring in
  P1.7.
- The dashboard's `<title>` is the storefront's default ("Used & New Tires in
  Miami & Orlando | MrGoma"); it is `noindex`, so cosmetic.
