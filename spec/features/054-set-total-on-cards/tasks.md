# Tasks — Set total on listing cards

> Feature: `054-set-total-on-cards` · Based on: [plan.md](./plan.md) · Created: 2026-11-19

Each task is one sitting, leaves the build green, and names its check.

## Research

- [x] **T0** — Read modern-web-guidance for content that loads after the page
      (reserved space, no layout shift) and for card links; note what applies
      in `results.md` · check: notes written before T5.

## Logic

- [x] **T1** — `cheapestSetWith(anchor, candidates, size)` and
      `cardSetOffer(anchor, candidates)` in `tireSets.ts` · files:
      `src/app/utils/tireSets.ts` (+ test) · check: the anchor is always in the
      set and counted once (removed from the candidates first); the preferred
      city is the anchor's; 2/32" window respected; tie-break = `cheapestSet`'s (patched, total,
      city, id); 4 when possible, else 2, else null; new tires work (AC1, AC2).
- [x] **T2** — `setHref(anchorId, brand, size, ids)` exported from
      `chatSets.ts` and used by `toChatSetCard` · files:
      `src/app/utils/chatSets.ts` (+ test) · check: chat cards' hrefs unchanged;
      `resolvePresetSet(parseSetParam(ids))` of a card offer is `exact` with the
      same total (AC2).

## Endpoint

- [x] **T3** — `GET /api/tires/sets?ids=` — Zod (1–24 ids, digits), server-side
      `fetchTiresByIds` → `mapTireRecordToSingleTire` → `setGroupOf` /
      `anchorFromTire` → `getCachedSetCandidates` (concurrency 4) →
      `cardSetOffer`; answers `{ offers }` with `size`, `total`, `ids`
      only; `Cache-Control: public, s-maxage=60, stale-while-revalidate=60`;
      `withLogging`, `jsonError` · files: `src/app/api/tires/sets/route.ts`
      (+ `route.test.ts`) · check: 400 on junk / too many ids; only public
      fields; a tire with no group → no offer; robots test still disallows
      `/api/` (AC1, AC7).

## Interface

- [x] **T4** — `useSetOffers(tires)`: one request after mount for the list's
      ids (deduped, sorted), re-requested when the ids change (client paging on
      `/tires`), a stale answer dropped, abort on unmount, `{}` on error ·
      files: `src/app/hooks/useSetOffers.ts` (+ test) · check: one fetch per
      list, a new page → a new fetch, an old answer ignored, error → no offers
      (AC7).
- [x] **T5** — `TireCard`: reserved one-line slot (fixed min-height), filled
      with "Set of N · $X total" linking to `setHref(…)`, accessible name "Set of
      4, $640 total — build this set", `data-track="set_offer_select"` with
      `set_size`, `list`, `tire_id`; `TireTable` untouched · files:
      `src/app/ui/sections/TireCard/TireCard.tsx` (+ test) · check: AC1, AC3,
      AC4 (attrs), AC5, AC6, AC9.
- [x] **T6** — Guard: the card and the endpoint import the set rule from
      `tireSets.ts`, no local tread/size logic · files:
      `src/app/ui/sections/TireCard/setOffer.guard.test.ts` · check: AC8.

## Docs and checks

- [x] **T7** — Docs: `tech-stack.md` (endpoint, event, one set rule),
      roadmap, `results.md` (live-data check, timings) · check: written.
- [x] **T-tests** — Tests for T1–T6; full suite green · check: `npm test`.
- [x] **T-DoD** — `npx tsc --noEmit` + `npm run lint` + `npm test` +
      `npm run build` + `npm run perf:budget` green. Live script: for one page
      of `/tires` cards, each offer's ids resolve `exact` in the builder with
      the same total. Endpoint timing cold and warm. Manual in Chrome at 1280,
      820 and 390 px on `/tires`, used, new, a brand and a size page: line
      appears after the cards with no shift, tap opens the builder on that size
      with the same total, table view has no line, a failed request leaves the
      cards intact; Lighthouse CLS on `/tires` unchanged · check: AC1–AC9.

## Traceability

| Task | Acceptance criteria |
| ---- | ------------------- |
| T1 | AC1, AC2, AC8 |
| T2 | AC2, AC4 |
| T3 | AC1, AC7 |
| T4 | AC7 |
| T5 | AC1, AC3, AC4, AC5, AC6, AC9 |
| T6 | AC8 |
| T-DoD | AC1–AC9 (manual and live) |
