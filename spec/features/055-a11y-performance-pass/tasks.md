# Tasks — Accessibility and performance pass

> Feature: `055-a11y-performance-pass` · Based on: [plan.md](./plan.md) · Created: 2026-11-19

Each task is one sitting, leaves the build green, and names its check. Part A
can merge alone if Part B needs more time.

## Tooling and baselines (before any fix)

- [x] **T0** — Read modern-web-guidance: accessibility (contrast, target size,
      label in name), `optimize-image-priority`, `defer-rendering-heavy-content`,
      `out-of-order-html-streaming`; notes in `results.md` · check: written.
- [x] **T1** — `lighthouse@13.6.0` as a devDependency; `scripts/a11y-check.mjs`
      (`npm run a11y`): starts `next start` on a free port over the existing
      build, runs accessibility-only Lighthouse on the 10 key pages, mobile and
      desktop, fails on the listed audits or a score < 100 not allow-listed
      (each allow-list entry: audit, page, written reason; printed every run) ·
      files: `package.json`, `scripts/a11y-check.mjs` · check: on today's site
      it **fails** and lists the known findings (it would have caught them).
- [x] **T2** — `scripts/perf-lab.mjs` (`npm run perf:lab`): 5 runs per page ×
      mobile/desktop on `/`, `/tires`, a tire page, a store page, `/checkout`;
      medians of LCP, TBT, CLS, FCP, TTFB, the LCP element, top long-task
      scripts and layout-shift culprits, written to JSON; `--runs 3 --page /x`
      for quick checks between changes · files: `scripts/perf-lab.mjs`, `package.json`
      · check: runs end to end.
- [x] **T3** — Record the **baselines**: `npm run a11y` report and
      `npm run perf:lab` → `spec/features/055-…/baseline.json`; screenshots at
      390 and 1280 px of every page Part A touches · check: AC9; files saved.

## Part A — Accessibility

- [x] **T4** — Contrast rule on dark pages: `text-gray-500`/`600` → the
      approved secondary grey in `LocationDetail`, `ServiceDetail`, `AboutUs`,
      `/services`, `/locations`, `/guides`, `/contact`, `/legal-policies` and any
      shared dark breadcrumb · files: those containers ·
      check: `darkContrast.guard.test.ts` green (it fails on the old classes).
- [x] **T5** — Light-grey surfaces (size pages' grey pills and any found by
      T3): `gray-500` → `gray-600` · check: no `color-contrast` there in
      `npm run a11y` (AC1).
- [x] **T6** — Targets: `LocationsSlider` (and `InfoSlider`) dots inside 24 ×
      24 px buttons, same look; `TireCard` size pill as a 24 px tall link, same
      look · check: no `target-size` on home and `/tires/used` (AC2); visual
      check against T3 screenshots.
- [x] **T7** — `LocationCard` address control as a real `<a href={mapLink}
      target="_blank" rel="noopener noreferrer">` (was a `<button>` with
      `window.open`): name = visible text + sr "(opens Google Maps in a new
      tab)" · files: `LocationCard.tsx` (+ test) · check: AC3; link semantics.
- [x] **T8** — `ArrowsToRight`: unique clip id (`useId`) or no clip; section
      `<h2>` above the grid on size and brand pages · check: no `duplicate-id`
      / `heading-order` (AC4); tests.
- [x] **T9** — Logo approval sheet: for the 24 brands, the official source and
      a preview, **asking before each download**; owner approves · check: the
      approved list recorded in `results.md`.
- [x] **T10** — Add the approved logos (`{brandId}-logo.webp`, existing size);
      `scripts/brand-logos.mjs` generates `src/app/utils/brandLogos.ts` from the
      folder; `BrandImage` and `CompareBrand` show the name as text for any id
      not in it, with no request · files: as listed (+ tests) · check: folder ↔
      list test; no logo 404 on a listing (AC5).
- [x] **T11** — Part A done: `npm run a11y` passes (score 100 or allow-listed
      with reason), screenshots after vs T3 · check: AC1–AC8.

## Part B — Performance

- [x] **T12** — `BrandImage`: not `priority` (lazy), so listings stop preloading
      20–24 logos at high priority · check: `perf:lab` after; network shows the
      logos at low priority.
- [x] **T13** — LCP image per page (from T3's LCP elements): only it gets
      `priority`/`fetchPriority="high"` · check: `perf:lab` LCP medians (AC13).
- [x] **T14** — Home TBT: defer the client islands T3's long tasks name
      (below the fold or on interaction) · check: home mobile median TBT
      < 200 ms (AC10); manual: everything still works. If not reachable within
      scope: stop, document the cause, ask the owner (spec D5).
- [x] **T15** — `/checkout`: fix the shift culprits T3's baseline names (the
      hypothesis: a reserved skeleton until the cart is read from storage) ·
      files: `Checkout.tsx` (+ test) · check: CLS < 0.1 mobile and desktop
      (AC11).
- [x] **T16** — Meta description: `curl` the tire page as Bingbot,
      facebookexternalhit, Googlebot and Lighthouse 13; extend `htmlLimitedBots`
      only with the missing token if needed · files: `next.config.mjs` (maybe)
      · check: meta in `<head>` for those UAs; Lighthouse SEO 100 (AC12).
- [x] **T17** — Re-measure with `perf:lab` (5 runs, all pages); before/after table in `results.md`
      with each change's cause · check: AC9, AC13.

## Docs and checks

- [x] **T18** — Docs: `tech-stack.md` (contrast rule, `npm run a11y` in the
      Definition of Done after `npm run build`, a local pre-deploy gate like
      `perf:budget`, `perf:lab`, logo list), roadmap (Track 1 P1.0 done),
      `results.md` · check: written.
- [x] **T-tests** — Tests for the guards, `brandLogos`, `LocationCard`,
      `ArrowsToRight`, checkout skeleton; full suite green · check: `npm test`.
- [x] **T-DoD** — `npx tsc --noEmit` + `npm run lint` + `npm test` +
      `npm run build` + `npm run perf:budget` + `npm run a11y` green; manual in
      Chrome at 1280, 820 and 390 px on every touched page (no loops, cart and
      checkout work, carousel and 3D still work) · check: AC1–AC13.

## Traceability

| Task | Acceptance criteria |
| ---- | ------------------- |
| T1 | AC6, AC7 |
| T2, T3 | AC9 |
| T4, T5 | AC1, AC8 |
| T6 | AC2, AC8 |
| T7 | AC3 |
| T8 | AC4 |
| T9, T10 | AC5 |
| T11 | AC1–AC8 |
| T12, T13 | AC13 |
| T14 | AC10 |
| T15 | AC11 |
| T16 | AC12 |
| T17 | AC9, AC13 |
| T-DoD | AC1–AC13 |
