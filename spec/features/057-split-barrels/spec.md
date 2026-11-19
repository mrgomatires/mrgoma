# Spec — Each page loads only the components it shows

> Feature: `057-split-barrels` · Status: Draft · Created: 2026-11-19
> Roadmap: Track 1 P1.5 (JS / bundle, continued) · Branch: `feat/057-split-barrels`

## Why — problem & value

056 cut the tire page's JavaScript in half (578 → 272 KB) and moved mobile
LCP by 0.2–0.6 s on every shopper page, but the other pages only lost 44 KB:
what is left is mostly **code the page never runs**. Measured on the 056 build
(Lighthouse, mobile, 2026-11-19):

| Chunk | Downloaded on every page | Unused on that page |
| --- | --- | --- |
| Shared components (one bundle of nearly all the site's widgets) | 62 KB | 38–49 KB |
| Shared icons (all ~40 icons, incl. large service illustrations) | 36 KB | 31–35 KB |

So every shopper — home, `/tires`, a tire page, a store page, checkout —
downloads **~70–80 KB of JavaScript it does not use**, on a slow phone, before
the page settles. The cause is the shared "index" files the code imports
widgets and icons from: they bundle everything listed in them together, so a
page that shows three icons downloads all forty. Mobile LCP is still
3.3–4.9 s against the 2.5 s goal (mission: Core Web Vitals first).

## User stories

- As a **shopper on a phone**, I want **pages to download only what they
  show**, so that **they appear and respond sooner**.
- As the **owner**, I want **the saving to stay**, so that **a new widget
  doesn't quietly put it back**.

## Scope

- **In:** how storefront code reaches the shared components, icons and page
  sections, so each
  page bundles only what it uses; a guard so it stays that way; before/after
  measured with `npm run perf:lab`; the `perf:budget` limits lowered.
- **Out:** redesigning any widget; React/Next's own runtime (~150 KB, not
  ours); the home's 3D size preview; INP (P1.6).
- **Also in (owner, 2026-11-19):** the cookie banner no longer covers the AI
  chat button (found in 056: while the banner shows, tapping the chat does
  nothing). Small, and every first-time visitor meets it.

## Functional requirements

- **FR1:** A shopper page does not download components or icons it does not
  display (or open on interaction).
- **FR2:** Nothing changes for the shopper except speed: every page looks and
  behaves the same at 390 and 1280 px.
- **FR3:** The three shared index files (components, icons, sections) are
  removed: every import names the file it uses. A check fails if one comes
  back or if code imports a folder's index instead of the file.
- **FR4:** The sections index gets the same treatment as components and
  icons — one rule for all three, even where it weighs little today.
- **FR5:** `perf:budget` limits lowered to the new weight (with a margin).
- **FR6:** While the cookie banner is showing, the AI chat button — and the
  floating search button at the bottom left, which the banner covers the same
  way — sit just above it, visible and tappable at 390 and 1280 px, and return
  to their usual place once the visitor accepts or declines. The banner itself
  is unchanged.
- **FR7:** Success is a measured saving, documented before/after in
  `results.md` like 056 (same pages, the tire page pinned with `--path`).

## Acceptance criteria (testable)

- [ ] **AC1:** Given `npm run perf:lab` before and after (5 runs, medians,
  mobile), then JS downloaded drops by **≥ 40 KB** on home, `/tires`, the tire
  page, a store page and checkout, and unused JS by ≥ 50 KB.
- [ ] **AC2:** Given the same runs, then mobile LCP is not worse than before
  beyond noise (± 0.2 s) on any of those pages; improvements are reported.
- [ ] **AC3:** Given the guard of FR3, then `npm test` fails naming the file
  when (a) `src/app/ui/components/index.ts`, `src/app/ui/icons/index.tsx` or
  `src/app/ui/sections/index.ts` exists, or (b) any file imports
  `@/app/ui/components`, `@/app/ui/icons` or `@/app/ui/sections` without a file
  path after it, or through their `/index`.
- [ ] **AC4:** Given screenshots at 390 and 1280 px of home, `/tires`, the
  tire page, a store page and checkout before and after, then they match.
- [ ] **AC5:** Given the cart, AI chat, compare tray, set builder, size picker,
  filters and the tire gallery, then they work as before (manual, 390 and
  1280 px); `/login` and `/dashboard` render (dashboard login by the owner).
- [ ] **AC6:** Given a first visit (no consent choice yet) at 390 and 1280 px,
  when the banner shows, then the chat button is fully visible above it and a
  tap/click opens the chat, and the floating search button (where it shows)
  is likewise above it and opens the search; after Accept or Decline both are
  back in their usual corners; the banner's text, buttons and behaviour are unchanged.
- [ ] **AC7:** Given `npm run perf:budget` and `npm run a11y`, then both pass,
  the budget with lowered limits.

## Non-functional / constraints

- No visible change; accessibility stays at 100 on all audited pages.
- Checklist: modern-web-guidance (performance guides), security (no change),
  SEO (no change — server-rendered HTML identical), responsive (screenshots at
  390/1280), GA4 (events unchanged — `data-track` attributes untouched).

## Clarifications (2026-11-19)

- **Index files:** removed (not kept for server code) — imports name the file.
- **Sections index:** in scope, same treatment.
- **Cookie banner over the chat:** in scope; the chat button moves up above
  the banner while it shows.

---

_The WHAT and WHY only. The HOW lives in [plan.md](./plan.md)._
