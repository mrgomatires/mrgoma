# Plan — Each page loads only the components it shows

> Feature: `057-split-barrels` · Based on: [spec.md](./spec.md) · Created: 2026-11-19

## Technical approach

**1. Remove the three index files and import by path (FR1, FR3, FR4).**
Today:

- `src/app/ui/components/index.ts` — 47 `export { default as X } from './X/X'`
  plus two named lines (`Dialog`, `DialogBackdrop`, `DialogPanel`;
  `PlusIcon`, `MinusIcon`, `XMarkIcon`).
- `src/app/ui/icons/index.tsx` — 36 `export * from './X'` (named exports; a
  file's name is not always its export's name, e.g. `./Car`).
- `src/app/ui/sections/index.ts` — 27 `export { default as X } from './X/X'`.

72 source files import from them (some several times, some multi-line, some
from inside the folders themselves — e.g. `LoginForm` imports `BrandHeadline`
from its own barrel), plus 2 tests that `vi.mock` a whole barrel
(`Home.test.tsx`, `InstantQoute.test.tsx`).

A **one-off codemod** (Node, kept in the scratchpad, not committed) does the
rewrite deterministically:

1. Build `name → { path, kind }` from the three barrels: `export { default as
   X } from './P'` → default import of `@/app/ui/<dir>/P`; named re-exports →
   named import of that path; `export * from './P'` → read `P.tsx`'s own
   `export const|function|class Name` to know which names live there.
2. For every `import { A, B as C } from '@/app/ui/<dir>'` (single- or
   multi-line, `import type` too), emit one import per source module:
   `import A from '@/app/ui/components/A/A'`, `import { B as C } from
   '@/app/ui/icons/B'`, grouping names that share a module.
3. Fail loudly on a name it can't map (no silent drop).

Then `eslint --fix` (import order) and `prettier` on the touched files only;
delete the three index files; rewrite the 2 `vi.mock` calls to mock the
specific module paths they stub.

Bundlers then see per-file client references: a page bundles only the
components and icons its own tree imports. Server components were already
fine in principle; client components importing the barrel are what pulled
everything into one chunk (056's audit: 62 KB + 36 KB, ~70–80 KB unused).

**2. Guard (AC3).** Extend `src/bundle.guard.test.ts`: the three index files
must not exist, and no file under `src/` may import `@/app/ui/components`,
`@/app/ui/icons` or `@/app/ui/sections` bare or through `/index` (regex on
`from '…'`), the failure listing the offending files. `perf:budget`
limits are lowered after measuring (FR5).

**3. Cookie banner vs. chat button (FR6).** Reuse the pattern the compare tray
already uses (051): it publishes its height as `--compare-tray-h` on `<html>`
and fixed bottom controls add it to their `bottom`.

- `CookieConsent`: while visible, a `ResizeObserver` on its region sets
  `--cookie-banner-h` on `<html>` (0px when hidden/unmounted).
- `AiChat` launcher (`bottom-[calc(1.5rem+var(--compare-tray-h,0px))]`):
  bottom becomes `1.5rem + max(tray, banner)` so it sits above whichever is
  taller; with no banner it is exactly as today. Same change for the
  `CollapsibleSearchBar` floating button (`FloatingButton`, `CompactForm`),
  which sit at the bottom-left under the same full-width banner — same bug,
  same one-line fix (spec FR6/AC6).
- The banner keeps `z-[9999]` and is otherwise untouched.

## Reuse first

- `--compare-tray-h` pattern (`CompareTray.tsx`, `globals.css`, `AiChat.tsx`).
- `src/bundle.guard.test.ts` (056) for the import guard.
- `scripts/perf-lab.mjs` (`--path` to pin the tire page), `perf-budget.mjs`
  (`shopperPageJs`), `npm run a11y`, the 056 screenshot script.

## Files to add / change

- **Delete:** `src/app/ui/components/index.ts`, `src/app/ui/icons/index.tsx`,
  `src/app/ui/sections/index.ts`.
- **~72 files** under `src/app` — import lines only (codemod).
- `src/app/(home)/container/Home/Home.test.tsx`,
  `src/app/(shop)/instant-quote/container/InstantQoute/InstantQoute.test.tsx`
  — `vi.mock` per module.
- `src/app/ui/components/CookieConsent/CookieConsent.tsx` — publish
  `--cookie-banner-h`; test in its existing test file.
- `src/app/ui/components/AiChat/AiChat.tsx`,
  `src/app/ui/components/CollapsibleSearchBar/components/{FloatingButton,CompactForm}.tsx`
  — `max()` of the two variables.
- `src/bundle.guard.test.ts` — barrel guard.
- `perf-budget.json` — lowered limits.
- `spec/tech-stack.md` — the 056 note about the barrel becomes "no barrels:
  import by path".
- `spec/features/057-split-barrels/{baseline,after}.json`, `results.md`.

## Data & flow

No data, API or route changes. Only module boundaries (which chunk a component
lands in) and one CSS variable.

## Acceptance criteria → implementation

| AC | How it's met | How it's verified/tested |
| --- | --- | --- |
| AC1 | Per-file imports → per-page chunks | `perf:lab` 5 runs, mobile, before/after (`--path` pins the tire page): `jsKB` −40 and `unusedJsKB` −50 on 5 pages |
| AC2 | Same | Same runs: mobile LCP within ±0.2 s or better |
| AC3 | Barrels deleted + guard | `bundle.guard.test.ts` (red with a barrel or a bare import, green after) |
| AC4 | Import lines only | Screenshots 390/1280 of 5 pages before/after compared |
| AC5 | Same | Manual on the local build: cart, chat, compare, set builder, size picker, filters, gallery; `/login`, `/dashboard` render (owner signs in) |
| AC6 | `--cookie-banner-h` + `max()` | Unit test: `CookieConsent` sets the variable when shown and 0px after a choice; manual at 390/1280 on a first visit: chat above banner, opens on click, returns after Decline |
| AC7 | Lowered limits | `npm run perf:budget`, `npm run a11y` green |

## Tradeoffs / alternatives

- **Keep barrels for server code** — rejected by the owner (two import styles).
- **`optimizePackageImports`** — works for packages in `node_modules`, not for
  local `@/` folders; and it would hide the rule rather than state it.
- **Hand-editing 72 files** — error-prone; the codemod is deterministic and
  fails on anything it can't map.
- **Hiding the chat button while the banner shows** — would hide the assistant
  from every first visit; moving it up keeps both usable.

## Risks

- **A name mapped wrong** → build/tsc fails loudly (good); codemod refuses
  unknown names.
- **Circular imports that the barrel masked** — tsc/build catch the import,
  runtime order issues would show in tests; the full suite runs.
- **Test mocks** — any `vi.mock` of a barrel would silently stop matching;
  searched: only 2, both rewritten.
- **Savings smaller than measured "unused"** — Lighthouse's unused bytes
  include code a page does use later (on interaction); AC1's −40 KB is set
  below the measured 70–80 KB for that reason.
- **CSS variable left set** if the banner unmounts mid-animation — the effect
  cleanup resets it to 0px (same as the tray).

## Out of scope

- Further splits (route-level `dynamic()` of heavy widgets) — measure after
  this and decide.

---

_The concrete steps live in [tasks.md](./tasks.md)._
