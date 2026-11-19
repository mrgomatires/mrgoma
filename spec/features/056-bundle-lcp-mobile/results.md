# Results — Less JavaScript on the shopper's critical path

> Feature: `056-bundle-lcp-mobile` · Implemented: 2026-11-19

Lab: local production build, Lighthouse 13.6.0, 5 runs, medians
(`baseline.json` → `after.json`). JS and HTML in KB as transferred
(compressed).

## What changed

| Change | Where | Effect |
| --- | --- | --- |
| The tire page's 3D tread viewer mounts when it is ~400 px from the screen **and** the browser is idle (was: idle only, ≤ 2 s after load) | `useNearViewport` (new), `TreadWearExplorer` | three.js (260 KB) no longer downloads at load; it arrives as the shopper scrolls towards the viewer. Its box is a fixed `h-64`: no shift |
| `LoginForm` out of the components barrel; `/login` imports it by path | `ui/components/index.ts`, `Login.tsx` | zod + react-hook-form (~40 KB) leave every shopper page |
| `SessionProvider` from the root layout to the dashboard layout | `app/layout.tsx`, `(sellers)/dashboard/layout.tsx` | next-auth's client (~6 KB) and the `/api/auth/session` request on every visit are gone from the storefront. Access control unchanged (server-side, `src/proxy.ts`) |
| `perf:budget`: new `shopperPageJs` (JS linked by the prerendered `/about-us` and `/contact`) and a check that fails if zod, react-hook-form or next-auth's client reach them | `scripts/perf-budget.mjs`, `perf-budget.json` | The leak cannot come back silently. Before the fix it failed naming both chunks |
| `perf:lab` reports `jsKB`, `unusedJsKB`, `renderBlockingMs`, `htmlKB`; `--path` pins a page | `scripts/perf-lab.mjs` | — |

Checked on the network log (Lighthouse, mobile) of home, the tire page and a
store: **0 requests to `/api/auth`**, **no three.js chunk** at load.

## Numbers

| Page | Form | JS KB | Unused JS KB | LCP | FCP | TBT | CLS | Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| home | mobile | 312 → **268** | 128 → 92 | 4.51 → **3.98 s** | 1.35 → 1.35 s | 0 → 1 ms | 0 → 0 | 84 → 87 |
| home | desktop | 586 → 546 | 251 → 216 | 0.96 → 0.83 s | 0.36 → 0.36 s | 0 → 0 ms | 0 → 0 | 99 → 99 |
| /tires | mobile | 314 → **270** | 130 → 94 | 3.76 → **3.56 s** | 1.35 → 1.35 s | 0 → 0 ms | 0 → 0 | 89 → 90 |
| /tires | desktop | 327 → 283 | 130 → 94 | 1.33 → 1.30 s | 0.36 → 0.36 s | 0 → 0 ms | 0 → 0 | 97 → 97 |
| **tire page** | **mobile** | **578 → 272** | **273 → 101** | **5.51 → 4.89 s** | 1.20 → 1.20 s | 30 → 0 ms | 0 → 0 | 80 → 82 |
| tire page | desktop | 589 → 284 | 272 → 101 | 1.09 → 1.09 s | 0.32 → 0.32 s | 0 → 0 ms | 0.042 → 0.045 | 98 → 98 |
| store | mobile | 310 → **266** | 143 → 106 | 3.83 → **3.61 s** | 1.20 → 1.20 s | 0 → 0 ms | 0 → 0 | 88 → 90 |
| store | desktop | 322 → 278 | 142 → 106 | 0.77 → 0.72 s | 0.32 → 0.32 s | 0 → 0 ms | 0 → 0 | 100 → 100 |
| checkout | mobile | 322 → **278** | 141 → 105 | 3.53 → **3.25 s** | 1.05 → 1.05 s | 0 → 0 ms | 0 → 0 | 91 → 93 |
| checkout | desktop | 335 → 291 | 141 → 105 | 0.68 → 0.66 s | 0.28 → 0.28 s | 0 → 0 ms | 0 → 0 | 100 → 100 |

**The tire page row (mobile) is `tire-same-page.json`**, not baseline/after:
`perf:lab` takes the sitemap's first tire, and it changed between the two runs
(the baseline tire sold). Two different tires are not a before/after, so
`main` (72867aa) and this branch were built back to back and measured on the
same page (`/tires/514355-…`, 5 runs each). The desktop tire row compares two
different tires — JS is comparable, LCP only roughly. `perf:lab --path` now
pins a page for this.

Home desktop still carries three.js (546 KB): the home's 3D size preview,
out of scope (spec).

## Acceptance criteria

- **AC1 ✅** — no three.js at load on the tire page (network log); the viewer
  mounts on scroll (manual check, below). CLS ≤ 0.05 (0 mobile, 0.045 desktop).
- **AC2 ✅** — no chunk with zod or react-hook-form on any shopper page
  (`perf:budget` check, which failed before the change).
- **AC3 ✅ (storefront) / owner (dashboard)** — no next-auth client chunk and no
  `/api/auth/session` request on shopper pages. Login → dashboard → logout is
  the owner's check (a seller's password is never typed by the agent).
- **AC4 — partly met.**
  - Tire page: JS **−305 KB** (≥ 250 ✅), mobile LCP **−0.62 s** (> 0.2 ✅).
  - Other pages: JS **−44 KB**, not the ≥ 100 KB the spec asked for ❌. Mobile
    LCP still improved beyond noise on all four: home −0.53 s, `/tires`
    −0.20 s, store −0.22 s, checkout −0.28 s.
  - **Why short:** the audit counted the whole chunks that *contained* zod
    (105 KB) and next-auth (40 KB) as removable. They were mostly shared
    storefront code bundled together with them: the seller-only part was
    ~40 KB (zod + react-hook-form + the form, now only on `/login`) and ~6 KB
    (next-auth's client, now only on `/dashboard`). The shared code stayed and
    was regrouped into other chunks (total client JS unchanged: 657 KB).
- **AC4b — reverted with numbers (the spec's alternative).** See below.
- **AC5 ✅** — `perf:budget` green with `shopperPageJs` 293 KB (limit 320 KB)
  and the leak check.
- **AC6 ✅** — `npm run a11y`, see the DoD.
- **AC7 ✅** — manual check on the local build: cart (add from the tire page, drawer, subtotal), AI chat (opens, example queries), compare tray (2 tires), set builder (Set of 4 · $670 from a card), home size picker. The tire page's 3D viewer appears when scrolled to (canvas mounted, 2 more chunks then), none before.

## CSS: `experimental.inlineCss` tried and reverted (FR4 / AC4b)

The site's CSS is one Tailwind file (126 KB raw / 21 KB gz, 1 297 classes, all
used in `src/`; only ~3 KB is dashboard-only, so splitting it buys nothing)
plus 2 KB of `@font-face`. Lighthouse estimates they block the first paint
~450 ms on mobile. Next 16's `inlineCss` puts the CSS into the HTML.

Measured (1 run, mobile, same build otherwise):

| Page | render-blocking | FCP | LCP | HTML |
| --- | --- | --- | --- | --- |
| home | 450 → 0 ms | 1.36 → 1.25 s | 3.99 → 4.16 s | 47.5 → **111.7 KB** |
| /tires | 450 → 0 ms | 1.35 → 1.20 s | 3.56 → 3.70 s | 54.7 → **120.2 KB** |
| tire page | 450 → 0 ms | 1.20 → 1.05 s | 4.44 → 5.70 s | 31.7 → **97.2 KB** |
| store | 450 → 0 ms | 1.20 → 1.05 s | 3.68 → 3.83 s | 20.8 → **86.5 KB** |
| checkout | 450 → 0 ms | 1.05 → 1.05 s | 3.25 → 3.55 s | 13.1 → **80.5 KB** |

The blocking went, FCP gained ~0.15 s, but **every HTML grew by ~65 KB**
(over the 50 KB limit — the CSS goes in twice, in the `<style>` and again in
the RSC payload, a documented limitation) and **LCP did not improve** on any
page. Reverted; `next.config.mjs` says why.

## Found, not fixed (follow-up)

- **The cookie banner covers the AI chat button** while it is showing: the
  banner is a full-width `fixed inset-x-0 bottom-0 z-[9999]` region, so a
  click on the chat avatar lands on the banner and nothing happens. Not from
  this branch (neither component changed); seen during the manual check.

The re-audit of what a shopper page still loads (`/about-us`, 293 KB):

- **The components barrel** (`@/app/ui/components`) puts ~63 KB gz of
  components into one chunk loaded by every page — the home's 3D preview
  wrapper, filter UI and store data included, wherever they are used. The
  **icons barrel** (`@/app/ui/icons`) adds ~37 KB. Imports by path (or
  splitting the barrels) is the next lever for the other pages' JS; it touches
  most components, so it is its own feature (Track 1, P1.5 continued).
- The rest is React/Next runtime (~150 KB) — not ours to trim.
