# Plan — Less JavaScript on the shopper's critical path

> Feature: `056-bundle-lcp-mobile` · Based on: [spec.md](./spec.md) · Created: 2026-11-19

## Technical approach

Four independent changes, each measured, plus the tooling to measure them.

**1. 3D tread viewer loads near the viewport (FR1).** `TreadWearExplorer`
already imports `TreadScene` with `next/dynamic` (`ssr: false`), but mounts it
as soon as the browser is idle (`useIdleReady`, ≤ 2 s) — so three.js
(260 KB gz) still arrives inside the load window Lighthouse and a real phone
measure. Add a small hook `useNearViewport(ref, rootMargin = '400px')` (an
`IntersectionObserver`, disconnects after the first hit, `true` when IO is
missing) and mount the scene only when **near and idle**. The box is already a
fixed `h-64`, so the skeleton → canvas swap cannot shift layout. The home's
`TirePreview3D` is left as it is (out of scope; desktop-only, above the fold).

**2. Sellers' login code out of the shared bundle (FR2).** The build's chunk
`3zsjld_53k_0c.js` (370 KB raw / 105 KB gz) holds zod, react-hook-form and
`LoginForm`, and is linked from every prerendered page (checked in
`.next/server/app/about-us.html`, `contact.html`). Cause: `LoginForm` is
exported from the `@/app/ui/components` barrel, which nearly every client
component imports. Remove that export; `Login.tsx` imports
`@/app/ui/components/LoginForm/LoginForm` directly. zod on the server (API
routes) is unaffected.

**3. Session provider only where a session is read (FR3).** `SessionProvider`
wraps the whole app in `src/app/layout.tsx`: it ships next-auth's client
(`1spi3thgzbb8o.js`, 39.6 KB gz, on every page) and fetches
`/api/auth/session` on each visit. Only `DashboardHeader` calls
`useSession`/`signOut`; `LoginForm` calls `signIn`, which needs no provider.
Move `<SessionProvider>` into `src/app/(sellers)/dashboard/layout.tsx`. Route
protection is unchanged — it is server-side in `src/proxy.ts` (`/dashboard`,
`/login` matcher).

**4. Render-blocking CSS (FR4).** Two stylesheets: the site's Tailwind output
(126 KB raw / 21 KB gz — 114 KB of it utilities, 1 297 classes, all used in
`src/`; dashboard-only classes are ~3 KB, so splitting them buys nothing) and
the `next/font` declarations (2 KB). Trimming cannot remove a meaningful part,
so the lever is the request itself: Next 16's `experimental.inlineCss: true`
puts the CSS in a `<style>` in the HTML, removing the round trip before first
paint (docs: `node_modules/next/dist/docs/.../inlineCss.md` — recommended for
Tailwind and first-time visitors). Cost: ~21 KB gz more HTML per document
(plus a copy in the RSC payload on first load), no cross-page CSS cache.
**Kept only if the lab shows it pays:** FCP/LCP on mobile better and HTML
transfer growth ≤ 50 KB gz per page; otherwise reverted and reported (FR6:
pages that don't improve are reported as such).

**5. Measurement & guards (FR5, FR6).**
- `scripts/perf-lab.mjs` `summarise()` gains `jsKB` (script transfer size from
  `network-requests`), `unusedJsKB` (`unused-javascript` / insight bytes),
  `renderBlockingMs` (render-blocking insight's FCP saving), `htmlKB` (document
  transfer). Run a **056 baseline** on this branch before any code change
  (`baseline.json`), and `after.json` at the end.
- `scripts/perf-budget.mjs` gains a third metric, **`shopperPageJs`**: gzip of
  the JS chunks linked from prerendered shopper pages (`about-us.html`,
  `contact.html`, read from `.next/server/app`), largest of them; and a
  **forbidden-content check**: none of those chunks may contain zod
  (`ZodError`), react-hook-form or next-auth's client (`/api/auth/session`
  fetch marker). `perf-budget.json` limits lowered to the new weights + ~10 %.
- Source guard test `bundle.guard.test.ts`: the barrel does not export
  `LoginForm`; `next-auth/react` is imported only by `DashboardHeader`,
  `LoginForm` and the dashboard layout; the root layout has no
  `SessionProvider`; `TreadWearExplorer` gates the scene on `useNearViewport`.

## Reuse first

- `useIdleReady` (`TirePreview3D/useIdleReady.ts`) — kept, combined with the
  new hook; `useCanvasActive` shows the IO pattern already used.
- `next/dynamic` imports already in place for `TreadScene` / `TireScene`.
- `scripts/lab.mjs` (`startServer`, `pickPages`, `withLighthouse`) and
  `perf-lab.mjs`; `perf-budget.mjs` `measure`/`evaluateBudget` and its tests
  (`src/perf-budget.test.ts`, `src/lab-scripts.test.ts`).
- `npm run a11y` for AC6.

## Files to add / change

- `src/app/ui/components/TirePreview3D/useNearViewport.ts` (+ `.test.ts`) — new hook.
- `src/app/ui/components/TreadWearExplorer/TreadWearExplorer.tsx` — ref on the
  `h-64` box; mount when `near && idleReady`.
- `src/app/ui/components/index.ts` — drop the `LoginForm` export.
- `src/app/(sellers)/login/container/Login.tsx` — direct import.
- `src/app/layout.tsx` — remove `SessionProvider`.
- `src/app/(sellers)/dashboard/layout.tsx` — wrap in `SessionProvider`.
- `next.config.mjs` — `experimental.inlineCss: true` (conditional on step 4's
  measurement), with a comment on the trade-off.
- `scripts/perf-lab.mjs` — new fields in `summarise()`.
- `scripts/perf-budget.mjs`, `perf-budget.json` — `shopperPageJs` + forbidden
  check; lowered limits.
- `src/perf-budget.test.ts`, `src/lab-scripts.test.ts` — cover the new pure
  functions.
- `src/bundle.guard.test.ts` — source guards.
- `spec/features/056-bundle-lcp-mobile/{baseline,after}.json`, `results.md`.
- `spec/tech-stack.md` — note: seller-only client code never goes in the
  shared barrel / root layout; `perf:budget` checks it.

## Data & flow

No API, DB or route changes. Client: the root provider tree loses
`SessionProvider`; `/dashboard/*` gains it (its subtree only). `/login` posts
via `signIn` as today. The tire page requests three.js on scroll instead of at
idle.

## Acceptance criteria → implementation

| AC | How it's met | How it's verified/tested |
| --- | --- | --- |
| AC1 | `useNearViewport` + `idleReady` gate; fixed `h-64` box | Unit test of the hook (IO mock: false → true on intersect, true without IO); guard test; perf-lab network: no three.js chunk on tire page load; manual scroll at 390/1280 — viewer renders, CLS ≤ 0.05 in perf-lab |
| AC2 | `LoginForm` out of the barrel | `perf:budget` forbidden check on shopper chunks; guard test; perf-lab `jsKB` |
| AC3 | `SessionProvider` moved to dashboard layout | Forbidden check (next-auth client); network log on home/tire page shows no `/api/auth/session`; **owner** signs in → dashboard (session shown) → logout (the agent never types a seller's password) |
| AC4 | 1–3 combined | `npm run perf:lab` 5 runs: `baseline.json` vs `after.json` — tire page `jsKB` −250, others −100, tire-page mobile LCP −0.2 s (median) |
| AC4b | `inlineCss` (kept only if it pays) | perf-lab `renderBlockingMs` below baseline on 4 pages and `htmlKB` growth ≤ 50 KB — or reverted with the numbers in `results.md`; screenshots 390/1280 of home, `/tires`, tire page, store before/after (`/dashboard` only with the owner's session) |
| AC5 | New `shopperPageJs` + lowered limits | `npm run perf:budget` green; unit tests for the new measure/check |
| AC6 | No markup change except the 3D gate | `npm run a11y` 100 on all pages |
| AC7 | Providers other than session untouched | Manual: AI chat, cart, compare tray, set builder, size picker at 390/1280 |

## Tradeoffs / alternatives

- **3D on tap** — lighter but a UI change; owner chose near-viewport.
- **Splitting the dashboard's CSS** — measured at ~3 KB of 126 KB; not worth a
  second Tailwind entry.
- **Critical-CSS extraction (beasties/critters)** — not supported by the App
  Router; `inlineCss` is Next's built-in equivalent.
- **Keeping `LoginForm` in the barrel and relying on tree-shaking** — that is
  what fails today (client barrel, side-effectful module graph).
- **A `SessionProvider` only around `DashboardHeader`** — the dashboard layout
  is the natural boundary and leaves room for future session reads there.

## Risks

- **`inlineCss` is experimental**: could change between Next minors; HTML grows
  for every visit and returning visitors lose the cached stylesheet. Gated on
  measurement, behind one config line, easy to revert.
- **Hidden session consumers**: a component calling `useSession` outside the
  dashboard would throw without a provider — guard test forbids
  `next-auth/react` outside the allowed files.
- **Barrel ripple**: other heavy exports may share chunks; re-run the chunk
  audit after step 2 and note findings (not fixed here unless trivial).
- **Shared code in the zod chunk**: if JS falls short of AC4's −100 KB, T9
  records which part of the chunk was shared storefront code that stayed.
- **No CSP header** today (checked `next.config.mjs`, `src/proxy.ts`), so an
  inline `<style>` is not blocked.
- **Lab noise**: medians of 5 runs; ±0.2 s treated as noise (as in 055).

## Out of scope

- Home's `TirePreview3D` / hero video; INP (P1.6); TTFB/data (P1.7).
- Any other barrel exports found heavy in the re-audit → follow-up.

---

_The concrete steps live in [tasks.md](./tasks.md)._
