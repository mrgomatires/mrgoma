# Spec — Google ratings on the site

> Feature: `053-google-ratings` · Status: Clarified · Created: 2026-11-18
> Roadmap: Lessons from a competitor, 6 of 6 (series 049–054) · Branch: `feat/053-google-ratings`

## Why — problem & value

Mr. Goma's seven stores are rated **very well on Google** — and the website
never says so. A first-time buyer of *used* tires is deciding whether to trust
a shop they have never heard of; the strongest evidence they could get is what
thousands of other customers already said. Priority Tire shows its rating near
the search and on product pages; we show nothing.

Figures read by hand from each store's Google Maps profile on **2026-11-18**:

| Store | Rating | Reviews |
| --- | --- | --- |
| Cutler Bay | 4.8 | 2,083 |
| Miami Airport | 4.8 | 1,499 |
| Miami Gardens | 4.6 | 1,111 |
| Orlando West Colonial | 4.7 | 635 |
| Coral Gables | 4.7 | 394 |
| Hialeah | 4.7 | 161 |
| East Orlando | 4.5 | 69 |
| **All seven** | **4.7** (4.74, weighted by reviews) | **5,952** |

Decided before this spec (owner, 2026-11-18):

- **Source: entered by hand** in the stores' configuration, with the date they
  were read — not pulled from the Google Business Profile API (whose content
  may not be stored over 30 days, and needs approval).
- **Where:** home and `/tires` (near the search), the tire page and the cart,
  and each store page.
- **No review stars in Google's results:** Google does not give stars to a
  business's own reviews about itself (self-serving rule), so no rating markup
  is added for that purpose.
- **Asking for a review after payment** is out of this feature.

## Decisions (clarified 2026-11-18)

- **D1 — Stars and number:** five drawn stars filled to the rating, then
  "4.7 · 5,952 Google reviews". Screen readers hear one sentence in words.
- **D2 — Home and `/tires`: a hero chip**, next to "Free shipping", "7
  locations" and "30-Day Warranty" — a space that already exists, so the search
  does not move down.
- **D3 — Cart: both** the cart drawer (under Checkout) and the checkout page's
  order summary.
- **D4 — Stores: the page and the cards** — each store page, and each store's
  card on `/locations` and in the home store slider, show that store's figure.
- **D5 — The combined figure links to `/locations`**, where every store card
  shows its rating and "Read reviews on Google" (that store's profile, new
  tab).
- **D6 — Read date in fine print** on the store page and on `/locations`
  ("Google rating as of Nov 2026"); not on chips or in the cart.
- **D7 — Stale after 90 days: warn the team, keep showing.** A test fails
  once the newest read date is more than 90 days old ("re-read the Google
  ratings on Maps"), so `npm test` — part of every feature's Definition of
  Done — surfaces it. The site keeps showing the figures.
- **D8 — "Google" as plain text**, no Google logo and nothing that imitates
  Google's interface.

## User stories

- As a **first-time buyer**, I want to **see that thousands of customers rate
  Mr. Goma highly**, so that **I trust buying used tires here**.
- As a **buyer about to pay**, I want **that reassurance next to the price and
  the cart**, so that **I don't leave to look the shop up**.
- As a **local customer choosing a store**, I want **each store's own rating**,
  so that **I know what to expect where I'm going**.
- As a **sceptical buyer**, I want to **open the real reviews on Google**, so
  that **I can check the number is true**.
- As the **owner**, I want **to update the figures in one place**, so that
  **every page shows the same, current number**.

## Scope

- **In:**
  - Per-store rating and review count, with the date read, kept in one place.
  - The combined figure (weighted average, total reviews) derived from them.
  - Showing it on: home and `/tires` near the search; the tire page and the
    cart; each store page (that store's figure).
  - A link to the real reviews on Google.
  - GA4 event for opening the reviews.
  - Phone, tablet and desktop; accessible text (not only stars).
- **Out:**
  - Pulling ratings or review text automatically (Business Profile API).
  - Showing individual review texts.
  - Asking for a review after purchase.
  - Rating structured data meant to get stars in search results.
  - The `/tires/used` and `/tires/new` heroes keep their own chip rows
    unchanged (a later feature may add the rating there).

## Functional requirements

- **FR1:** Each store has a rating (one decimal), a review count and the date
  they were read; the combined figure is computed from them, never typed.
- **FR2:** A rating shows five stars filled to the value (4.7 → four full and
  a 70% star) and "4.7 · 5,952 Google reviews" (D1); its accessible name is
  "Rated 4.7 out of 5 from 5,952 Google reviews".
- **FR3:** Home and `/tires` show the combined figure as a hero chip, first
  in the row of trust chips (D2).
- **FR4:** The tire page shows the combined figure near the price and Add to
  cart; the cart drawer shows it under Checkout and the checkout page in the
  order summary (D3).
- **FR5:** Each store page, its card on `/locations` and its card in the home
  store slider show that store's own figure (D4).
- **FR6:** The combined figure links to `/locations` (same tab). A store's
  figure links to that store's Google profile ("Read reviews on Google",
  new tab, announced as such) (D5).
- **FR7:** The read date shows in fine print on the store page and on
  `/locations`: "Google rating as of Nov 2026" (D6).
- **FR8:** More than 90 days after the newest read date, a test fails with a
  message to re-read the figures on Maps; the site keeps showing them (D7).
- **FR9:** "Google" appears as plain text; no Google logo or imitation of
  Google's interface (D8).
- **FR10:** GA4 records opening the reviews, with where it was opened (home,
  tires, tire page, cart, store) and no personal data.

## Acceptance criteria (testable)

- [ ] **AC1:** Given the seven stores' figures, then the combined figure reads
  4.7 and 5,952 everywhere it appears, and changing one store's figure changes
  the combined one with no other edit.
- [ ] **AC2:** Given the home page and `/tires` on a phone and on desktop, then
  the combined rating is the first hero chip, visible in the first screen, and
  causes no horizontal scroll at 390px.
- [ ] **AC3:** Given a tire page, then the rating is visible near the price and
  the Add to cart button.
- [ ] **AC4:** Given a cart with items, then the rating shows under Checkout in
  the cart drawer and in the checkout page's order summary; given an empty
  cart, the drawer shows no rating.
- [ ] **AC5:** Given a store page, its `/locations` card and its home slider
  card, then each shows that store's own rating and count (Cutler Bay 4.8 ·
  2,083), and the store page and `/locations` card link to its Google profile.
- [ ] **AC6:** Given a screen reader, then the rating is read as words ("Rated
  4.7 out of 5 from 5,952 Google reviews"), not as star symbols.
- [ ] **AC7:** Given the combined figure, then it links to `/locations`; given
  a store's "Read reviews on Google", then it opens that store's profile in a
  new tab, says so to screen readers, and sends one GA4 event with the surface
  and the store.
- [ ] **AC8:** Given the pages' structured data, then no rating markup is added
  to `LocalBusiness`/`Organization` (self-serving rule) — checked by test.
- [ ] **AC9:** Given a read date 91 days before "today", then the staleness
  check fails with "re-read the Google ratings"; at 90 days it passes (the
  check takes today as an input so this is testable).
- [ ] **AC10:** Given the store page and `/locations`, then "Google rating as
  of Nov 2026" shows in fine print; chips and the cart do not show the date.

## Non-functional / constraints

- No new request on page load: the figures ship with the page.
- No layout shift: the rating takes its space from the first paint.
- Contrast ≥ 4.5:1 for the text, star shapes ≥ 3:1; touch targets ≥ 44px for
  links.
- Copy in English (the site's language).
- The figures are public facts; nothing internal is exposed.
- Checklist for the series: modern-web-guidance, security, SEO (no rating
  markup for stars; no change to titles), responsive, GA4.

## Open questions

None — all resolved on 2026-11-18 (see Decisions).

---

_The WHAT and WHY only. The HOW lives in [plan.md](./plan.md)._
