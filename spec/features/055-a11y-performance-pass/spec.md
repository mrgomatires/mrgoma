# Spec — Accessibility and performance pass from the site review

> Feature: `055-a11y-performance-pass` · Status: Clarified · Created: 2026-11-19
> Roadmap: Mission "Accessible to WCAG 2.1 AA" + Track 1 (P1.0 baseline, P1.1, P1.4, P1.6) · Branch: `feat/055-a11y-performance-pass`

## Why — problem & value

The site review before 052 (Lighthouse on a production build, 14 runs, plus
a page-by-page audit at 1280 / 820 / 390 px) left nine pre-existing findings
in `spec/features/052-used-tire-filters/results.md`. The mission ranks
**trust/correctness → accessibility → performance → scope** and makes WCAG
2.1 AA a requirement, not a nice-to-have. Five of the nine are accessibility
failures that real buyers hit:

| # | Finding | Where | Measured |
| --- | --- | --- | --- |
| A1 | Grey text too faint on the dark pages | store pages (breadcrumbs, "Address/Phone/Hours" labels, notes), service pages, about | `gray-500` on `#0a0a0a`/`#111`/`#161616` = 3.7–4.1:1; `gray-600` on `#111` = 2.5:1 (AA asks 4.5:1) |
| A2 | Grey text on light grey | size pages | `gray-500` on `gray-100` = 4.4:1 |
| A3 | Targets too small to tap | home store-carousel dots; the size pill on every listing card | 8 × 8 px; ~88 × 20 px (WCAG 2.5.8 asks 24 × 24) |
| A4 | A button's name hides its text | home store cards: "Open address link" while showing the address | WCAG 2.5.3 label-in-name |
| A5 | Structure | a duplicate SVG id on `/tires` and `/checkout` (`ArrowsToRight` icon); a size page and a brand page skip a heading level | axe `duplicate-id`, `heading-order` |
| A6 | Missing brand logos | **24 brands in stock have no logo** (~160 tires): APLUS 47, ROCKBLADE 26, FULDA 16, DELMAX 15, MILESTAR 11, DOHVAN (2481) 8, … | each card requests a file that 404s, then shows the name |

The other four are **performance/SEO** — the roadmap's Track 1 (Core Web
Vitals, P1.0–P1.8, not started), included here by decision (D1):

| # | Finding | Measured |
| --- | --- | --- |
| P1 | Home on a phone blocks the main thread | TBT 3.6 s in one run (10 ms in another — needs a proper baseline) |
| P2 | Mobile LCP late | 3.6–6.3 s on home, `/tires`, `/tires/used`, the tire page, a store page |
| P3 | Tire page meta description streamed into `<body>` | Lighthouse SEO 92 |
| P4 | `/checkout` layout shift | CLS 0.30 on desktop (the cart fills after mount) |

## Decisions (clarified 2026-11-19)

- **D1 — Both:** A1–A6 and P1–P4 in this feature. Accessibility fixes land
  first (mission order), performance after a measured baseline.
- **D2 — Contrast: one rule.** One approved "secondary text" grey for dark
  backgrounds (≥ 4.5:1 on `#0a0a0a`, `#111`, `#161616`) and one for light
  greys, used on every page; a guard stops the failing shades coming back on
  dark sections.
- **D3 — Carousel dots keep their look** (8 px) with an invisible 24 × 24 px
  hit area each; the listing card's size pill gets a 24 px tall target the
  same way.
- **D4 — Logos: I find them, the owner approves.** Each from the brand's
  official site, shown on one approval sheet before anything is added; brands
  without a clear official logo stay as text — and no card requests a file
  that does not exist. (Downloading each file is asked for first.)
- **D5 — Performance: improve and measure.** Baseline first (5 Lighthouse runs
  per page, median, production build) on `/`, `/tires`, a tire page, a store
  page, `/checkout`; fix the causes found; before/after documented. Targets:
  **home mobile TBT < 200 ms, CLS < 0.1 everywhere (checkout included), the
  tire page's meta description in `<head>`**, and mobile LCP clearly better
  than the baseline (no fixed number — reaching < 2.5 s in the lab may need
  hero/3D changes that are out of scope). If home TBT stays ≥ 200 ms after
  every in-scope deferral, the work stops there: the cause is documented and
  the owner decides before anything out of scope is touched; only the
  criteria actually met count as done.
- **D6 — Regression check: a local script in the Definition of Done**
  (`npm run a11y`): axe/Lighthouse on the key pages of a local production
  build, failing on contrast, target size, label-in-name, duplicate id or
  heading order. No new service.

## User stories

- As a **buyer with low vision or on a phone in sunlight**, I want **every
  label and link legible**, so that **I can read a store's hours and address**.
- As a **buyer with large fingers or a tremor**, I want **controls I can hit**,
  so that **I don't open the wrong store or size**.
- As a **voice-control user**, I want to **say what I see** ("click 18200 S
  Dixie Hwy"), so that **the button responds**.
- As a **screen-reader user**, I want **a clean outline and unique ids**, so
  that **headings and icons don't confuse navigation**.
- As the **owner**, I want **the site to meet WCAG 2.1 AA as the mission
  says**, and **a check that keeps it there**.

## Scope

- **In:** A1–A6 on every page where they occur; P1–P4 per D5; the `npm run
  a11y` check; the logos approved by the owner.
- **Out:** redesigns beyond what the fixes need (hero video, 3D viewer, new
  layouts); field-data dashboards (CrUX) — the baseline is lab data; new
  features.

## Functional requirements

- **FR1 (A1, A2):** All text meets 4.5:1 (3:1 for large text) against its
  background, through one approved secondary grey for dark sections and one
  for light grey surfaces, used site-wide (D2).
- **FR2 (A3):** Every control is at least 24 × 24 px to tap; the carousel dots
  and the size pill keep their look with a larger hit area (D3).
- **FR3 (A4):** Each control's accessible name contains its visible text.
- **FR4 (A5):** No duplicate ids on any page; headings in order (no skipped
  level) on size and brand pages.
- **FR5 (A6):** The 24 brands get their official logo after the owner
  approves the sheet; any left without one show the name as designed text, and
  no page requests a logo file that does not exist (D4).
- **FR6:** `npm run a11y` fails when contrast, target size, label-in-name,
  duplicate ids or heading order regress on the key pages, and is part of the
  Definition of Done (D6).
- **FR7 (P1):** Home on a phone does not block the main thread for long while
  it starts: median TBT < 200 ms in the baseline method (D5).
- **FR8 (P2):** The largest image on home, `/tires`, `/tires/used`, the tire
  page and a store page is discovered and requested early; mobile LCP improves
  against the baseline.
- **FR9 (P3):** The tire page's meta description is in `<head>` in the HTML
  every crawler receives.
- **FR10 (P4):** `/checkout` does not shift while the cart fills: CLS < 0.1.

## Acceptance criteria (testable)

- [ ] **AC1:** Lighthouse accessibility on a production build reports **no
  `color-contrast` failures** on: a store page, a service page, `/about-us`, a
  size page, home, `/tires`, `/tires/used`, a tire page.
- [ ] **AC2:** No `target-size` failures on home and `/tires/used` (mobile).
- [ ] **AC3:** No `label-content-name-mismatch` on home.
- [ ] **AC4:** No `duplicate-id` on `/tires` and `/checkout`; no
  `heading-order` on a size page and a brand page.
- [ ] **AC5:** No 404 for a brand logo on any listing; the logos the owner
  approved show; the others show the name as text.
- [ ] **AC6:** Accessibility score 100 on the pages in AC1 (mobile and
  desktop), or each remaining item explained as not applicable.
- [ ] **AC7:** The regression check (FR6) fails when a contrast or target-size
  problem is introduced on a key page and passes on the fixed site.
- [ ] **AC8:** No visual regressions beyond the intended colour and size
  changes (screenshots before/after at 390 and 1280 px of each touched page).
- [ ] **AC9:** A baseline (5 runs, median, production build, mobile and
  desktop) of `/`, `/tires`, a tire page, a store page and `/checkout` is
  recorded before any performance change, and re-measured after.
- [ ] **AC10:** Home mobile median TBT < 200 ms.
- [ ] **AC11:** `/checkout` CLS < 0.1 (desktop and mobile).
- [ ] **AC12:** The tire page's HTML has `<meta name="description">` inside
  `<head>`; Lighthouse SEO 100 on it.
- [ ] **AC13:** Mobile LCP median on the five pages is lower than the baseline,
  each change attributed to a cause in `results.md`.

## Non-functional / constraints

- Keep the brand look (black, lime `#9dfb40`, green CTA): fixes change shades
  and sizes, not the design language.
- No new runtime dependency; no measurable cost on page weight.
- Checklist for the series: modern-web-guidance, security (no change),
  SEO (no change to titles/structured data), responsive, GA4 (no change).

## Open questions

None — all resolved on 2026-11-19 (see Decisions).

---

_The WHAT and WHY only. The HOW lives in [plan.md](./plan.md)._
