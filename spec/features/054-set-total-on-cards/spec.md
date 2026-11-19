# Spec — Set total on listing cards

> Feature: `054-set-total-on-cards` · Status: Clarified · Created: 2026-11-19
> Roadmap: Lessons from a competitor, 7 of 7 (series 049–054) · Branch: `feat/054-set-total-on-cards`

## Why — problem & value

Most drivers replace tires two or four at a time, and Mr. Goma can sell
matching sets (041/044/047): same brand, model, size, run-flat and condition,
tread within 2/32", from any city. But a buyer only finds out on the tire
page — the listing shows one tire and one price, so it reads like "we sell
single used tires". Priority Tire shows the set price on the listing.

Live catalog on 2026-11-19 (same set rules as the site):

| | Tires | Share |
| --- | --- | --- |
| For sale | 6,900 | |
| Can be part of a set of **2** | 5,800 | 84% |
| Can be part of a set of **4** | 4,740 | 69% (2,736 new, 2,004 used) |

For the median card, the cheapest set of 4 *that includes that tire* costs
exactly 4 × its price; for the cheapest 10% of cases it is ≤ 71% of 4 × its
price (the other three units are cheaper). So a set figure on the card is
both common and sometimes noticeably better than the arithmetic a buyer would
do.

What exists to reuse: the set rules and the cheapest-set choice already drive
the tire page's "Need 2–4 tires? … from $X for 2" panel and the set builder.

## Decisions (clarified 2026-11-19)

- **D1 — Size: 4, else 2.** A card shows the set of 4 when one can be built
  with that tire; otherwise the set of 2; otherwise nothing.
- **D2 — Price: the cheapest set that includes this tire**, chosen by the
  existing cheapest-set rule — exactly what the tap delivers.
- **D3 — Wording: "Set of 4 · $640 total".** No per-tire price (the card has
  it). No "from": the figure is the set the builder opens with.
- **D4 — Tap: the tire page with the set builder open on that size**, holding
  that same set, ready to review the units and add it.
- **D5 — Where: every card listing** — `/tires`, `/tires/used`, `/tires/new`,
  brand pages, size pages. Not the table view.
- **D6 — Speed: after the cards.** The cards render as today; the set line
  fills its reserved space a moment later, so the listing is never slower and
  nothing shifts.
- **D7 — No one-tap "add set to cart" on the listing** for now: the builder
  shows each unit (tread, patch, city) before the buyer pays.

## User stories

- As a **driver who needs four tires**, I want to **see on the listing which
  tires come as a set and what the set costs**, so that **I compare totals,
  not single prices**.
- As a **buyer on a phone**, I want **one short line**, so that **the card
  stays readable**.
- As a **buyer who taps it**, I want to **land where I can build or take that
  set**, so that **I don't start over**.
- As the **owner**, I want **sets to be visible where people shop**, so that
  **more orders are sets**.

## Scope

- **In:**
  - A set line on listing cards where a set can be built ("Set of 4 from $X").
  - The figure follows the existing set rules and the existing cheapest-set
    choice, and is current when the page renders.
  - Where tapping it leads.
  - GA4 event.
  - Phone, tablet, desktop; accessible text.
- **Out:**
  - Changing the set rules (brand, model, size, run-flat, condition,
    tread ≤ 2/32", any city).
  - Discounts or special set pricing (a set costs the sum of its tires).
  - Front/rear staggered sizes.
  - Adding a whole set to the cart from the listing in one tap (D7).
  - The table view (D5).

## Functional requirements

- **FR1:** A card shows the set of 4 when one can be built with that tire,
  else the set of 2, else nothing (D1).
- **FR2:** The price is the total of the cheapest set that includes that tire,
  by the site's existing cheapest-set rule (D2).
- **FR3:** The line reads "Set of 4 · $640 total" (D3); it says it is a total
  for N tires.
- **FR4:** Tapping it opens the tire page with the set builder open on that
  size, holding the same set the card priced (D4).
- **FR5:** Every card listing shows it — `/tires`, used, new, brand and size
  pages — not the table view (D5).
- **FR6:** A sold or no-longer-available set never shows: the figure is
  computed when the page renders, and the set builder re-checks as today.
- **FR7:** New tires (all 10/32") read the same way.
- **FR8:** GA4 records the tap with the set size and the list, and no personal
  data.
- **FR9:** The listing is never slower: cards render as today and the set
  line arrives after them into reserved space; if the set figures fail or are
  slow, the cards simply show no set line (D6).

## Acceptance criteria (testable)

- [ ] **AC1:** Given a tire that can form a set of 4, its card shows "Set of 4 ·
  $X total"; given one that can form only a set of 2, "Set of 2 · $X total";
  given one that can form neither, nothing extra.
- [ ] **AC2:** Given a card's set line, then its total equals the total of the
  set the builder opens with for that tire and size (same rule, checked by a
  test and on live data).
- [ ] **AC3:** Given any set line, it reads "Set of N · $X total" — the word
  "total" present, no per-tire price, no "from".
- [ ] **AC4:** Given a tap on the set line, then the tire page opens with the
  set builder open on that size and the same total, and one GA4 event is sent
  with the size and the list.
- [ ] **AC5:** Given the listings in FR5 on a phone at 390px, then the line fits
  the card without overflow and its target is at least 24px tall (44px if it is
  the card's only extra control).
- [ ] **AC6:** Given a screen reader, then the line reads as words ("Set of 4,
  total from 640 dollars") and the link says where it goes.
- [ ] **AC7:** Given `/tires`, then the server response time and the cards'
  first paint are unchanged (measured before and after), the set line takes
  reserved space (CLS unchanged), and a failed set request leaves the cards
  intact with no line.
- [ ] **AC8:** Given the set rules change in the shared module, then the card
  figure follows with no separate edit (one rule).
- [ ] **AC9:** Given the table view, then no set line is shown.

## Non-functional / constraints

- One rule: the card uses the same set logic as the tire page and the chat.
- No new public data: price, tread and city are already public.
- No layout shift when the figure appears.
- Phone first; contrast ≥ 4.5:1.
- Checklist for the series: modern-web-guidance, security, SEO (no change to
  titles or structured data), responsive, GA4.

## Open questions

None — all resolved on 2026-11-19 (see Decisions).

---

_The WHAT and WHY only. The HOW lives in [plan.md](./plan.md)._
