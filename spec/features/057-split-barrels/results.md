# Results — Each page loads only the components it shows

> Feature: `057-split-barrels` · Implemented: 2026-11-19

Lab: local production build, Lighthouse 13.6.0, 5 runs, medians
(`baseline.json` → `after.json`; the tire page pinned to
`/tires/499326-kumho-235-55-18` in both, `tire-pinned-after.json`). JS in KB
as transferred (compressed).

## What changed

| Change | Where | Effect |
| --- | --- | --- |
| The three index files (`ui/components`, `ui/icons`, `ui/sections`) deleted; every import names its file | 72 files, import lines only (one-off codemod: 0 unmapped names) | Each page bundles only the widgets and icons its own tree uses. Unused JS on every shopper page: ~92–106 KB → **~21 KB** (what is left is React's runtime) |
| Guard | `src/bundle.guard.test.ts` | Fails if an index file comes back, or a file imports `@/app/ui/{components,icons,sections}` bare, with a trailing `/` or through `/index` |
| Cookie banner publishes its height (`--cookie-banner-h`) | `CookieConsent.tsx` (+ 2 tests) | The AI chat button and the floating search button sit above the banner while it shows (`max()` of tray and banner) and return after Accept/Decline. The banner is unchanged |
| Tests that mocked a whole barrel now mock the module | `Home.test.tsx`, `InstantQoute.test.tsx`; `serverBoundary.guard.test.ts` checks the sections barrel is gone | — |

Found while rewriting: `@/app/ui/sections/` (trailing slash) in `TopFilters`
— caught by tsc once the barrel was gone; the guard now covers that form.
`CircleSpinner` only had a default export, so the icons barrel never exported
it (`export *` skips defaults); it is unused.

## Numbers (mobile)

| Page | JS KB | Unused JS KB | LCP | FCP | Score |
| --- | --- | --- | --- | --- | --- |
| home | 268 → **220** (−48) | 92 → 21 | 3.98 → **3.66 s** | 1.35 → 1.35 s | 87 → 90 |
| /tires | 270 → **242** (−28) | 94 → 21 | 3.55 → **3.36 s** | 1.35 → 1.35 s | 90 → 92 |
| tire page | 272 → **229** (−43) | 100 → 21 | 4.36 → **4.04 s** | 1.20 → 1.20 s | 85 → 87 |
| store | 266 → **217** (−49) | 106 → 22 | 3.68 → **3.28 s** | 1.20 → 1.20 s | 89 → 92 |
| checkout | 278 → **231** (−48) | 105 → 22 | 3.20 → **2.91 s** | 1.05 → 1.05 s | 93 → 95 |

Desktop: JS −16 to −46 KB on every page, LCP within noise (0.60–1.32 s); the
tire page 545 → 509 KB (its 3D viewer is near the fold on a desktop screen,
so it loads there by design — 056). TBT 0–2 ms and CLS 0 / ≤ 0.046
everywhere, as before.

`perf:budget` — `shopperPageJs` (JS of the prerendered `/about-us`):
293 → **215 KB**.

## Acceptance criteria

- **AC1 — mostly met.** Unused JS −70 to −84 KB on all five pages (≥ 50 ✅).
  JS downloaded ≥ 40 KB less on home, the tire page, store and checkout ✅;
  **`/tires` −28 KB ❌** — after the change its unused JS is the same ~21 KB of
  React runtime as every page, so the rest is code the listing does run
  (filters, cards, compare, set links). Nothing left to split there without
  changing behaviour.
- **AC2 ✅** — mobile LCP better on all five pages, three beyond noise (home
  −0.32 s, tire −0.32 s, store −0.40 s, checkout −0.29 s; `/tires` −0.19 s).
- **AC3 ✅** — guard red with the barrels (3 files + 72 importers named), green
  after.
- **AC4 ✅** — screenshots at 390/1280 compared pixel by pixel: identical at
  390 px on home, tire page, store and checkout; `/tires` differs only by
  inventory (6 913 → 6 915 tires, other cards first). At 1280 px the only
  differences are the chat button, now above the cookie banner (intended),
  and the home's hero video frame.
- **AC5 ✅** — on the local build: cart, AI chat, compare tray (and the chat
  clears it), brand filter, set builder (set of 3 · $450 into the cart), size
  picker, `/login`. Dashboard with the owner's session (they signed in; the
  agent never typed a password): header greets the user, table loads, width
  filter refetches once per endpoint, dashboard AI chat and cart open, no
  console errors, no request repeating after load (watched 10 s). Logout left
  to the owner.
- **AC6 ✅** — first visit (fresh origin): chat button above the banner
  (bottom 621 px vs banner top 651 px), opens with a real click; after Decline
  it is back in its corner and `--cookie-banner-h` is `0px`. At 390 px the
  floating "Edit Tire Sizes" button sits above the banner (headless
  screenshot; the chat button is off that crop, same CSS as desktop).
- **AC7 — passes, with one limit raised.** `npm run a11y` 100 on all pages.
  `perf:budget`: `shopperPageJs` limit lowered 320 → **240 KB**;
  `sharedFirstLoadJs` stays 180 KB (166). **`totalClientJs` raised 680 →
  740 KB** (now 702): without barrels a module several pages share can be
  copied into more than one chunk, so the sum of all chunks grew ~44 KB while
  what any one page downloads fell 28–49 KB. That sum counts chunks no single
  visitor loads together; the per-page number is the one that matters, and it
  is now budgeted. Recorded in `perf-budget.json`.

## Still on every page

React/Next runtime (~150 KB, of which Lighthouse counts ~21 KB unused at
load). Further cuts would be route-level `dynamic()` of widgets that open on
interaction (cart drawer, compare dialog, AI chat is already lazy) — measure
first, separate feature.

## Noted, not changed

- **Local `next start` cannot sign in without `AUTH_TRUST_HOST=true`**: Auth.js
  v5 answers `UntrustedHost` on `/api/auth/*` unless the host is trusted
  (automatic on Vercel). Seen on 056's local server too — not from this
  branch. The owner's check ran with the variable set for that process only;
  `.env` unchanged.
- **The dashboard fetches each endpoint twice on load** (tires, brands,
  ranges, heights, session, the page's RSC). Not a loop — nothing repeats
  after load — and not from this branch (those files changed only in import
  lines). Causes seen in code: `DashboardTable` fetches page 1 from two
  effects (`[searchParams]` and `[page]`), and the desktop and mobile filter
  panels are both mounted and each loads its options. Worth a small fix.

- The AI chat button overlaps the bottom of the open cart drawer when the
  compare tray is also open (the tray raises it); seen in the manual check.
  Not checked on `main`, but neither the drawer, the chat's z-index nor the
  tray offset changed here.
