# Spec — Dashboard asks once; seller login works on a local production build

> Feature: `058-dashboard-requests-local-auth` · Status: Draft · Created: 2026-11-19
> Roadmap: Track 1 P1.7 (Data / routes) · Branch: `feat/058-dashboard-requests-local-auth`

## Why — problem & value

Two loose ends from the 057 review, both found with the owner's session on a
local production build (2026-11-19):

1. **The seller dashboard asks the server for everything twice when it
   opens.** On load: the tire list (`/api/dashboard/tires`), brands, ranges,
   tire heights, the session and the page data are each requested **2×**
   (stores 1×). It is not a loop — nothing repeats after load, and a filter
   change asks once — but every visit to the dashboard doubles its database
   work. That matters here: the database pool is small (10 connections) and
   was already the bottleneck for slow pages (see the `/tires` slowness
   notes); the dashboard's tire query is the heaviest one staff run.
2. **Signing in fails on a local production build** (`next build` +
   `next start`, the setup `perf:lab`, `npm run a11y` and the manual checks
   use). Auth.js answers "UntrustedHost" and the login silently doesn't stick;
   on Vercel it works because Vercel is trusted automatically. Any check of
   the dashboard on a production build (the Definition of Done asks for one)
   needs a workaround nobody has written down.

## User stories

- As a **seller**, I want **the dashboard to load its data once**, so that
  **it opens faster and doesn't load the shared database for nothing**.
- As the **owner / a developer**, I want **to sign in to the dashboard on a
  local production build**, so that **I can test it the way it runs live**.

## Scope

- **In:** one request per endpoint when the dashboard opens; keeping one per
  endpoint when a filter changes (as today); making local sign-in on a
  production build work and documented.
- **Also touched:** the storefront's `/tires` filters and size picker use the
  same filter hooks, so they get the same de-duplication; they must look and
  behave exactly as today (AC9).
- **Out:** speeding up the dashboard's SQL itself; any other storefront
  change; production auth settings on Vercel (already working).

## Functional requirements

- **FR1:** When the dashboard opens, each data endpoint (tires, brands,
  ranges, heights, stores) is requested **once**.
- **FR2:** When a filter, the page or the sort changes, each affected endpoint
  is requested once — no change from today.
- **FR3:** The session is read **once** when the dashboard opens. next-auth's
  refresh when the tab regains focus stays (cheap, and it notices a sign-out
  in another tab).
- **FR4:** The desktop and phone filter panels **share** one load of the
  filter options (brands, ranges, heights, stores): requested once when the
  dashboard opens, and the phone panel opens with them already there — no
  loading state, no change in how it looks or works.
- **FR5:** Signing in works on `next start` locally by **documenting**
  `AUTH_TRUST_HOST=true` for local use (`.env.template` and tech-stack), and
  the local check scripts (`perf:lab`, `npm run a11y`) set it for the server
  they start. No change to the auth configuration in code, so production
  trusts hosts exactly as today (Vercel).
- **FR6:** Production sign-in on Vercel is unchanged.

## Acceptance criteria (testable)

- [ ] **AC1:** Given a signed-in seller opening `/dashboard` on a production
  build, then the network log shows each of `/api/dashboard/tires`,
  `/api/dashboard/brands`, `/api/dashboard/ranges`, `/api/dimensions/heights`,
  `/api/dashboard/stores` **once**, no navigation beyond the initial one (no
  extra page-data `?_rsc` request), and nothing new over the following 10 s.
- [ ] **AC2:** Given the dashboard open, when the seller changes the width
  filter, the page, or the sort, then each affected endpoint is requested once
  and the table shows the matching tires (as today).
- [ ] **AC3:** Given the dashboard opening, then `/api/auth/session` is
  requested **once**; when the tab is hidden and shown again, one more read is
  allowed (next-auth's focus refresh).
- [ ] **AC4:** Given a phone width (390 px), when the seller opens the filter
  panel, then its options (brands, ranges…) are already there — no request is
  made on opening — and filtering works.
- [ ] **AC5:** Given a fresh `npm run build && npm run start` locally with
  `AUTH_TRUST_HOST=true` set as documented, when the owner signs in, then `/dashboard` opens with the
  session (no "UntrustedHost" in the server log).
- [ ] **AC6:** Given automated tests, then a test fails if the dashboard table
  fetches the same page twice on mount.
- [ ] **AC7:** Given `src/app/utils/authOptions.ts`, then it has no
  `trustHost` (production unchanged); given `.env.template`, then it lists
  `AUTH_TRUST_HOST` with a comment saying it is for local production builds
  only.
- [ ] **AC8:** `tsc`, lint, tests, build, `perf:budget`, `npm run a11y` green.
- [ ] **AC9:** Given `/tires` (desktop and 390 px), when a shopper uses the
  filters (brand, ranges, condition) and the size picker, then they work and
  look as before, and no filter-option endpoint is requested twice on load.

## Non-functional / constraints

- Filter options (brands, ranges, heights, stores) may be **up to 60 s old**
  within one page visit: a brand that just entered the inventory can take up
  to a minute to appear in the filter list; a reload refreshes it, and the
  table itself is always live. Accepted (owner, 2026-11-19 /analyze).

- Security: no weakening of how the dashboard is protected (server-side, in
  `proxy.ts`); the auth configuration in code is untouched (FR5).
- Sign-in checks are done by the owner (the agent never types a seller's
  password).
- Checklist: modern-web-guidance (n/a — no new UI), security (FR5), SEO (n/a — dashboard is `noindex`), responsive
  (AC4), GA4 (n/a — no storefront change).

## Clarifications (2026-11-19)

- **Local sign-in:** document `AUTH_TRUST_HOST=true` (template, tech-stack,
  local scripts); no `trustHost` in code.
- **Phone filter panel:** shares the desktop panel's single load of options.
- **Session:** once on load; next-auth's refresh on tab focus stays.

---

_The WHAT and WHY only. The HOW lives in [plan.md](./plan.md)._
