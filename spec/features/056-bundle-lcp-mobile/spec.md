# Spec — Less JavaScript on the shopper's critical path

> Feature: `056-bundle-lcp-mobile` · Status: Draft · Created: 2026-11-19
> Roadmap: Track 1 P1.5 (JS / bundle) · Branch: `feat/056-bundle-lcp-mobile`

## Why — problem & value

055 left mobile LCP at **3.8–5.6 s** (lab, simulated slow phone) and showed
why: the LCP images are requested at once and correctly prioritised, but the
phone first has to download and run the page's JavaScript and CSS. Most
shoppers browse on phones; a slow first view costs sales, and the mission
puts Core Web Vitals first in the roadmap (Track 1: LCP < 2.5 s at p75).

Measured on a production build on 2026-11-19 (Lighthouse, mobile):

| Page | JS downloaded | JS unused at load | Mobile LCP |
| --- | --- | --- | --- |
| Home | 312 KB | 128 KB | 4.4 s |
| `/tires` | 314 KB | 130 KB | 3.8 s |
| Tire page | **578 KB** | **273 KB** | 4.7–5.6 s |
| Store page | 310 KB | 143 KB | 3.8 s |

(KB = compressed, as sent.) Three causes account for most of it:

1. **The 3D tread viewer ships on every tire page at load** — three.js,
   **260 KB** — even though it sits below the fold and most visitors never
   scroll to it or turn it.
2. **The sellers' login form ships to every shopper** — its validation library
   (zod) and form library land in a **104 KB** chunk loaded on every page,
   ~75 KB of it unused, because the login form is exported from the shared
   components index the storefront imports.
3. **The sellers' session provider runs on every page** — next-auth's client
   (**39 KB**) and a `/api/auth/session` request on each visit — while only
   the seller dashboard uses a session.

4. **CSS blocks the first paint** — two stylesheets must arrive before
   anything shows (~600 ms estimated by Lighthouse): the site's styles
   (126 KB raw / 21 KB compressed, one file for every page, the seller
   dashboard's styles included) and the font declarations (2 KB).

## User stories

- As a **shopper on a phone**, I want **the tire page and the listings to show
  the tire faster**, so that **I don't leave before seeing it**.
- As a **shopper who wants the 3D view**, I want **it still to work when I go
  to it**, so that **nothing I used is lost**.
- As a **seller**, I want **login and the dashboard to work exactly as
  before**.
- As the **owner**, I want **the page weight measured and capped**, so that
  **it doesn't creep back**.

## Scope

- **In:** the four causes above; a before/after measurement with
  `npm run perf:lab`; the JS budget (`perf:budget`) lowered to the new weight.
- **Out:** redesigning the hero video or the home's 3D preview; INP work
  (P1.6); data/TTFB (P1.7); new features.

## Functional requirements

- **FR1:** The tire page does not download the 3D viewer at load; it
  downloads when the viewer is about to scroll into view (no button, no
  visible change). Until then its box keeps its size (no layout shift).
- **FR2:** Shopper pages do not download the sellers' login code.
- **FR3:** Shopper pages do not load the session client nor call
  `/api/auth/session`; the seller login and dashboard keep their session.
- **FR4:** CSS no longer delays the first paint as much: the render-blocking
  time Lighthouse estimates drops on shopper pages, with no visible change to
  any page. If the fix (inlining the CSS) makes mobile LCP worse or grows the
  HTML by more than 50 KB per page, it is reverted and the numbers are
  recorded instead.
- **FR5:** `perf:budget` limits are lowered to the new weight (with a margin),
  so the savings cannot quietly come back.
- **FR6:** Success is a measured saving, not a fixed LCP: JS down by the
  amounts in AC4 and mobile LCP on the tire page better by more than the
  run-to-run noise (> 0.2 s), documented before/after in `results.md` like
  055. Pages that do not improve beyond noise are reported as such.

## Acceptance criteria (testable)

- [ ] **AC1:** Given the tire page loads on a phone, then no three.js chunk is
  downloaded at load; when the viewer scrolls near the screen it loads and
  works as before (rotate, tread wear, GA4 events), with CLS still ≤ 0.05.
- [ ] **AC2:** Given any shopper page, then no chunk containing the login
  form, zod or the form library is downloaded (checked in the build output and
  the network log).
- [ ] **AC3:** Given any shopper page, then no `next-auth` client chunk and no
  `/api/auth/session` request; given `/login` and `/dashboard`, then
  login, session and logout work as before (checked by the owner, who signs
  in; a seller's password is never typed by the agent).
- [ ] **AC4:** Given `npm run perf:lab` before and after (5 runs, medians), then
  JS downloaded on the tire page drops by ≥ 250 KB and on the other pages by
  ≥ 100 KB, and mobile LCP on the tire page improves by > 0.2 s (median).
  If a page falls short, `results.md` says which part of the removed chunks
  was shared code that stayed.
- [ ] **AC4b:** Given Lighthouse's render-blocking estimate on home, `/tires`,
  the tire page and a store page, then it is lower than the 056 baseline —
  **or**, if inlining the CSS worsens mobile LCP or grows the HTML by more
  than 50 KB per page, it is reverted and documented with numbers in
  `results.md`; and screenshots at 390 and 1280 px of those pages plus `/dashboard` show no
  visual change.
- [ ] **AC5:** Given `npm run perf:budget`, then the limits reflect the new
  weight and pass.
- [ ] **AC6:** Given `npm run a11y`, then it still passes (100 on all pages).
- [ ] **AC7:** Given the AI chat, the cart, the compare tray, the set builder and
  the size picker, then they work as before (manual check at 390 and 1280 px).

## Non-functional / constraints

- No visible change for shoppers except speed.
- Sellers' login and dashboard unaffected.
- Checklist: modern-web-guidance, security (session stays server-validated
  for the dashboard), SEO (no change), responsive, GA4 unchanged (the tire
  page's 3D viewer has no events; the home's `open_tire_3d` is not touched).

## Clarifications (2026-11-19)

- **3D viewer:** loads when it is about to scroll into view (not behind a tap).
- **Render-blocking CSS:** in scope.
- **Target:** measured saving (AC4), not a fixed LCP.

---

_The WHAT and WHY only. The HOW lives in [plan.md](./plan.md)._
