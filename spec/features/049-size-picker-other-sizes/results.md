# Results — Pick a size in three taps, see the other sizes of a tire

> Feature: `049-size-picker-other-sizes` · Verified locally 2026-11-18 (`next
> start` and `next dev`, real inventory, Chrome at desktop width and at 390 px
> through a same-origin iframe).

## Definition of Done

`npx tsc --noEmit` ✓ · `npm run lint` ✓ · `npm test` ✓ (166 files, 2,033
tests; 43 new in 8 new files) · `npm run build` ✓ · `npm run perf:budget` ✓ —
shared First-Load 166.0 KB of 180, total client JS 639.3 KB of 680 (+1.1 KB
over 048).

## Measurements (sellable catalog)

| Fact | 2026-11-18 |
| --- | --- |
| Sizes for sale | 293 (294 by the afternoon) from 24 widths, 17 ratios, 14 rims |
| Sizes the old drop-downs could not reach | 7 (their rule was `RemainingLife > '70%'` as a string) |
| Tires whose model is for sale in another size | 4,365 of 6,851 (64%) |
| Brand + model + size groups (the cached query) | 1,883 rows, ~280 KB raw, ~4.5 s cold from outside Vercel |

A second bug the old drop-downs carried: they padded one-decimal values
(`19.5` → `19.50`), and `/tires` matches a complete size as the exact
`RealSize` string, so a 19.5" rim found nothing. The picker uses the parts of
`RealSize` verbatim.

## Browser checks

| Check | Result | AC |
| --- | --- | --- |
| Home: Width → 235 → ratios offered `30…80` (only those with 235), focus on the first; 45 → rims `17 18 19 20 21`; 18 → panel closes, **Search focused with the ring**, URL unchanged until Search | ✓ | AC1, AC7c |
| Search (Enter) → `/tires?w=235&s=45&d=18`, title "235/45/18 Tires…" | same URL as before | AC4 |
| `/tires` floating "Edit tire size" at 390 px: form 32–600 px in a 680 px viewport, scrolls inside, no sideways overflow; 245 → 30 → 20, Search → one navigation to 245/30/20 | ✓ | AC4, AC7c, AC11 |
| 3D preview modal (phone): picker inside, Escape closes the panel and **not** the modal; picker area capped at 45% and the scene keeps the rest | ✓ | AC1, AC5, AC11 |
| Firestone Destination LE3 235/55/18 (#500138): "Other sizes of this tire", 14 more sizes, 17"/18"/19"/20" groups, 18" open, "This tire" highlighted, "$80 · 1 available", "From $110 · 2 available", "New" on 235/55/17 | ✓ | AC6, FR14 |
| Same page, server HTML: 14 `<a>` with `data-track="other_size_select"`, including the closed groups; no `VaultName`/`Location` | ✓ | AC8, AC10 |
| Pirelli #215783 (model in one size): no section | ✓ | AC7 |
| Sold Firestone #392758 (245/70/17): "This tire is sold" + "Other sizes"; its own size listed because units of it remain | ✓ | AC7b, FR13 |
| 390 px: no sideways overflow on home or the tire page; every option and link ≥ 44 px tall (options ≥ 56 px wide) | ✓ | AC11 |
| `GET /api/dimensions/stocked`: 200, `public, s-maxage=300, stale-while-revalidate=600`, 6 ms warm | ✓ | AC10 |
| Dashboard: `TopFilters`, `TireSelector` and `/api/dimensions/{heights,widths,sizes}` unchanged (`git diff` empty) | ✓ | D1 |

The dev overlay's one "issue" is a hydration warning about
`data-xt-extension-active` on `<html>`, added by a browser extension — not
this feature.

## Changes found while verifying

- The home hero's search box had a fixed `h-64` with internal scrolling: the
  open picker scrolled inside a 256 px box. It is now `min-h-64` — same height
  closed, grows when a step is open (a user action, so not counted as CLS).
- **Owner review (2026-11-18):** with the box growing, the desktop 3D preview
  stretched to the box's height and the tire grew large and distracting when a
  step opened. The preview is now a fixed `h-56` (the box's closed content
  height) pinned to the top: 274 × 224 px closed and open, same position.
- Inside the 3D modal the scene squeezed the picker to ~100 px; the picker area
  is now `shrink-0` with `max-h-[45%]` and the scene `min-h-0`.
- The chips under the home picker said "Sidewall"; they now use the steps'
  names (Width, Aspect ratio, Rim).
- `aria-pressed` is banned in `src/app` (`ariaPressed.guard.test.ts`); the
  chosen option carries `aria-current="true"` instead.
- Opening a step moves focus to its chosen value or first option (like a menu
  button), so the keyboard does not tab past the other two steps first.

## Analytics (FR15)

`size_picker_select` (step, value, surface), `size_picker_complete` (size,
surface), `other_size_select` (from, to, tire id) and `other_sizes_open`
(rim, opens only). Asserted by unit tests; consent declined locally, so
**GA4 DebugView on a Preview is left for the owner**. Volume: at most four
picker events per search (three selects + one complete).

## Modern Web Guidance

Read from `~/.agents/skills/modern-web-guidance/guides` (the `npx` CLI is
blocked in this environment):

- `ui-components/accordion` — adjacent `<details>`, not exclusive, no heading
  inside `summary`, marker beside the label; closed content stays in the HTML.
- `forms/forms` — no auto-submit on change: the picker advances steps, Search
  submits (D3).
- `ui-behaviors/animate-element-entry-exit` and `ui-behaviors/motion` — the
  panel's entry uses `@starting-style` with `allow-discrete` after the
  shorthand, only under `prefers-reduced-motion: no-preference`.
- `accessibility/accessibility` — one polite live region, only for the
  completed size (not for loading states).
- `forms/custom-select-picker-layouts` — why not `appearance: base-select`
  (Chrome 135, Safari 27, no Firefox).

## Left for the owner

- GA4 DebugView on the Preview: the four events above.
- A real phone (iOS Safari) pass of the home picker, the `/tires` form and the
  3D modal.
