# Tasks — Compare up to three tires side by side

> Feature: `051-compare-tires` · Based on: [plan.md](./plan.md) · Created: 2026-11-18

Each task is one sitting, leaves the build green, and names its check.

## Data

- [x] **T1** — Listing tires carry `dot`, `loadIndex`, `speedIndex`:
      `pickTireListFields` (+ test: the three fields present, `VaultName` /
      `Location` absent), `transformTireData`, `TransformedTire` type ·
      files: `src/repositories/tireListFields.ts`,
      `src/app/utils/transformTireData.ts`, `src/app/interfaces/tires.d.ts` ·
      check: AC9; tests green.
- [x] **T2** — `factsFromCardTire` fills `dot` from the card tire · files:
      `src/app/utils/cartFacts.ts` (+ test) · check: a card tire with DOT
      gives `DOT 2324` in `factsParts`.

## Pure logic

- [x] **T3** — `compare.ts`: `MAX_COMPARE = 3`, `addItem` (returns `'full'`
      at 3), `removeItem`, `sameSize`, `parseDot` (`WWYY`, `YYYY`, junk →
      null), `compareRows` (order of FR4, `—` for missing, best = more tread,
      more life, not patched, lower price, newer DOT; no best when < 2 values;
      `differs`) · files: `src/app/utils/compare.ts` (+ `.test.ts`) · check:
      AC2, AC3, AC4, AC13 (logic).

## Endpoint

- [x] **T4** — `GET /api/tires/compare?ids=` — Zod (1–3 ids, digits only,
      else 400), `fetchTiresByIds`, availability via `isSoldStatus` /
      `isRemoved` / price > 0, response `{ tires: [{ id, available, price }] }`
      only, `no-store`, `withLogging`, generic 500 · files:
      `src/app/api/tires/compare/route.ts` (+ `route.test.ts`) · check: AC12
      (server), AC9 (only three fields).

## State and actions

- [x] **T5** — `CompareContext` + `useCompare`: items, `has`, `toggle`
      (`added` / `removed` / `full` + notice), `remove`, `clear`, `open` /
      `close`; `sessionStorage['mg-compare']` read after mount, written on
      change, guarded by `try/catch`; `compare_add` / `compare_remove` /
      `compare_limit` events · files: `src/app/context/CompareContext.tsx`
      (+ test), `src/app/layout.tsx` · check: AC2, AC11, AC8 (events).
- [x] **T6** — Extract `useAddTireToCart()` from `TireCard.handleAddToCart`
      (cart line with 047 facts + `trackEcommerce(ADD_TO_CART)`); `TireCard`
      uses it · files: `src/app/hooks/useAddTireToCart.ts` (+ test),
      `TireCard.tsx` · check: existing `TireCard` tests green; hook test: same
      cart line and event.

## UI

- [x] **T7** — Re-read the modern-web-guidance guides for the build
      (`dialog`, `responsive-table`, `forms`, `animate-element-entry-exit`)
      and note what applies in `results.md` · check: notes.
- [x] **T8** — `CompareToggle`: labelled checkbox "Compare", ≥ 44 px, reverts
      when full; on `TireCard` (header row) and as a last column of
      `TireTable` · files: `src/app/ui/components/CompareToggle/CompareToggle.tsx`
      (+ test), `TireCard.tsx`, `TireTable.tsx` · check: AC1, AC7 (role
      `checkbox`, state announced).
- [x] **T9** — `CompareTray`: fixed bottom bar (desktop slots, phone compact),
      empty slots, ✕ per tire, Clear, Compare (enabled ≥ 2), polite status
      ("2 of 3 tires", full notice), `--compare-tray-h` on `<html>`, entry
      animation; AI chat button and `/tires` floating search offset by it;
      page bottom padding · files: `src/app/ui/sections/CompareTray/CompareTray.tsx`
      (+ test), `AiChat.tsx`, `FloatingButton.tsx`, `globals.css`,
      `src/app/(shop)/layout.tsx` (rendered there, nothing on `/checkout`) ·
      check: AC1, AC2, AC6, AC14.
- [x] **T10** — `CompareDialog`: native `<dialog>` via `showModal()`, full
      screen on phones; `<table>` with caption, tire `th[scope=col]` (photo,
      name, ✕), fact `th[scope=row]` sticky; rows from `compareRows` with a
      "Best" badge + text; "Show only differences"; different-sizes notice;
      per tire View tire (`compare_view_tire`) / Add to cart
      (`useAddTireToCart`, hidden when Sold or in cart) / Remove;
      `compare_open` (`count`, `same_size`); re-check on open merged into the
      view (Sold, current price, failure notice) · files:
      `src/app/ui/sections/CompareTray/CompareDialog.tsx` (+ test),
      `globals.css` · check: AC3, AC4, AC5, AC7, AC8, AC12, AC13.

## Docs and done

- [x] **T11** — `spec/tech-stack.md` (events; `/api/tires/compare`);
      `results.md` · check: review.
- [x] **T-DoD** — `npx tsc --noEmit`, `npm run lint`, `npm test`,
      `npm run build`, `npm run perf:budget`; manual by the agent in Chrome at
      390 px and desktop:
      - `/tires` grid and list, a size page, a brand page, `/tires/used`:
        Compare on cards; pick 2 on `/tires` and 1 on a brand page; reload →
        still 3; a 4th → notice;
      - tray does not cover the chat or the `/tires` floating search; last
        cards not hidden;
      - dialog: rows, Best marks, only differences, different sizes notice,
        View tire, Add to cart (cart updates), Remove, Esc closes and focus
        returns; keyboard only;
      - re-check: a sold tire (from DB) shows Sold; `/api/tires/compare` with
        bad ids → 400;
      - no sideways overflow; targets ≥ 44 px; new tab → tray empty;
      - `/checkout` and `/dashboard` show no tray (AC14);
      - network tab: cards make no new requests; the listing JSON grows only by
        the three fields (AC10) ·
      check: `results.md`.

## Traceability

| Task | AC |
| ---- | -- |
| T1 | AC3 (data), AC9 |
| T2 | — (047 cart facts gain DOT) |
| T3 | AC2, AC3, AC4, AC13 |
| T4 | AC9, AC12 |
| T5 | AC2, AC8, AC11 |
| T6 | AC5 |
| T7 | AC6, AC7 (research) |
| T8 | AC1, AC7 |
| T9 | AC1, AC2, AC6, AC14 |
| T10 | AC3, AC4, AC5, AC7, AC8, AC12, AC13 |
| T11 | — (docs) |
| T-DoD | AC1–AC14 |
