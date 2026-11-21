# Tasks — The catalog stops pre-loading the same pages again and again

> Feature: `059-tires-prefetch-repeats` · Based on: [plan.md](./plan.md) · Created: 2026-11-20

Ordered, **very small, independently verifiable** tasks. Check each off as it is
completed.

- [x] **T1** — Baseline, before any code: production build (`npm run build`,
  `AUTH_TRUST_HOST=true npm run start` on a free port), Chrome network log on
  `/tires` at desktop and phone width. Count background `?_rsc` requests on
  load, after one filter change, after three more and a full scroll — grouped
  by destination (`/tires/new`, `/tires/used`, `/tires/size/*`,
  `/tires/brands/*`, set and detail pages, header/footer links) and by the link
  each came from. Confirm the cause in the plan (viewport prefetch of routes
  under `loading.tsx`, repeated after re-render). · files:
  `spec/features/059-tires-prefetch-repeats/results.md` (draft table) · check:
  the "before" table is written; if the cause differs from the plan, stop and
  report before T2. If the browser window will not resize to phone width (as
  in 058), say so in `results.md` and measure desktop only; the touch path is
  covered by T3's test.
- [x] **T2** — `IntentPrefetchLink`: `next/link` with `prefetch={false}` until
  `mouseenter` or `touchstart`, then `prefetch={null}`; forwards all props,
  composes the caller's `onMouseEnter`/`onTouchStart`. · files:
  `src/app/ui/components/IntentPrefetchLink/IntentPrefetchLink.tsx` · check:
  T3 passes.
- [x] **T3** — Its tests: `prefetch` false before intent; null after
  `mouseenter`; null after `touchstart`; caller's `onClick`, `onMouseEnter`,
  `onTouchStart` still called; renders `<a href>` with the given class. ·
  files: `src/app/ui/components/IntentPrefetchLink/IntentPrefetchLink.test.tsx`
  · check: `npx vitest run IntentPrefetchLink` green.
- [x] **T4** — `TireCard`: condition badge, size pill, brand link and set-offer
  link use `IntentPrefetchLink` (same href, classes, `onClick`); the two detail
  links stay plain `Link`. · files: `src/app/ui/sections/TireCard/TireCard.tsx`
  · check: existing `TireCard.test.tsx` and `setOffer.guard.test.ts` still
  pass; no visual diff (same markup and classes).
- [x] **T5** — Regression test in `TireCard.test.tsx`: with `next/link` mocked
  to expose `prefetch` as a data attribute, the four secondary links render
  `prefetch=false` and the detail links the default. · files:
  `src/app/ui/sections/TireCard/TireCard.test.tsx` · check: green; fails if T4
  is reverted (try it once).
- [x] **T5b** — Header (re-scope after T1): `prefetchOnIntent` on `MenuChild`,
  set on "Used tires", "New tires", "Shop by size"; `Header.tsx` dropdown and
  `MenuMobile/components/MenuItem.tsx` render `IntentPrefetchLink` for flagged
  children. Test in `menu.test.tsx`: flagged children `prefetch=false`, others
  default, desktop and phone. · files: `src/app/ui/sections/Header/MenuItems.ts`,
  `Header.tsx`, `src/app/ui/sections/MenuMobile/components/MenuItem.tsx`,
  `src/app/ui/sections/Header/menu.test.tsx` · check: test green; fails if
  the flag is removed.
- [x] **T6** — Dashboard title: `title: 'Dashboard'` in the page's `metadata`
  (robots unchanged), and a test that the metadata has that title and still
  `noindex`. · files: `src/app/(sellers)/dashboard/page.tsx`, its test
  (existing nearest or a new `page.test.ts`) · check: test green; browser tab
  on the production build reads "Dashboard | MrGoma Tires" (needs the owner's
  session: if it has expired, the owner signs in — the agent never types a
  password).
- [x] **T7** — After: same build-and-log method as T1. `/tires` load, one filter
  change, three more and a full scroll (desktop + phone width) → 0
  secondary-link prefetches and no re-download of `/tires/new` or
  `/tires/size` (detail and other header/footer links counted apart); hover
  one size pill → one `?_rsc` for it and nothing more while it stays; move
  away and back → record what happens;
  tap a pill, a badge and a card body → right pages open. Repeat load + one
  filter on `/tires/used`, `/tires/new` and one size page. · files:
  `results.md` (after table, AC evaluation, detail/header/footer findings) ·
  check: table complete; AC1–AC5, AC7, AC8 evaluated; phone-width check done
  or its absence stated (same rule as T1).
- [x] **T8** — Roadmap and notes: P1.7 line mentions 059's result (058 ✅
  already done). · files: `spec/roadmap.md` · check: diff reads correctly.
- [x] **T9** — Owner's check: submenu child for the current page highlighted
  (`currentChild` in `MenuItems.ts`, used by `Header.tsx` and the phone
  `MenuItem.tsx`, with `aria-current`) and `/tires/used` cards full column
  width (`TireGrid besideRail`). · files: `MenuItems.ts`, `Header.tsx`,
  `MenuItem.tsx`, `menu.current.test.tsx`, `TireGrid.tsx`, `TireGrid.test.tsx`,
  `used/page.tsx`, `tiresPage.guard.test.ts` · check: tests green; browser:
  "Used tires" green on `/tires/used`, cards 944 px there and on `/tires`.
- [x] **T-DoD** — `npx tsc --noEmit` + `npm run lint` + `npm test` +
  `npm run build` + `npm run perf:budget` + `npm run a11y` green; manual check
  done in T7; stage with explicit pathspecs; no commit until the user approves.

## Traceability

| Task | Acceptance criteria |
| ---- | ------------------- |
| T1   | AC7 (before), AC1–AC2 baseline |
| T2   | AC1, AC2, AC3 |
| T3   | AC3, AC6 |
| T4   | AC1, AC2, AC4, AC5 |
| T5   | AC6 |
| T5b  | AC1, AC2, AC6 |
| T6   | AC8 |
| T7   | AC1, AC2, AC3, AC4, AC5, AC7, AC8 |
| T8   | — (roadmap) |
| T9   | AC10, AC11 |
| T-DoD | AC9 |
