# Spec — Used-tire filters

> Feature: `052-used-tire-filters` · Status: Clarified · Created: 2026-11-18
> Roadmap: Lessons from a competitor, 5 of 6 (series 049–054) · Branch: `feat/052-used-tire-filters`

## Why — problem & value

More than half of what we sell online is used: **3,807 used tires against 3,093
new** (live catalog, 2026-11-18). A used tire is bought on how much rubber it
has left, whether it was patched and whether it is run-flat — the same facts
the 051 comparison puts side by side. Priority Tire lets a buyer narrow used
tires by those facts up front; we only half do.

What `/tires` offers today for used tires:

- **Tread life** (remaining life %) as a range slider, **Patched** and
  **Run-flat** in the filter rail.
- **No tread-depth filter.** Tread depth in 32nds of an inch is the number tire
  shops, the listing card and the comparison all use ("7.6/32""), and the one a
  buyer is told by their mechanic — but nothing filters by it.
- The used-only filters show the same way when the buyer picked **New**, where
  they mean nothing: every new tire is 10/32" and unpatched.
- **`/tires/used`** has only brand and rim chips: none of the used filters.

What the used stock looks like (2026-11-18):

| Tread (32nds) | Tires |   | Remaining life | Tires |
| ------------- | ----- | - | -------------- | ----- |
| 10 or more    | 223   |   | 90%+           | 773   |
| 8 – 9.9       | 1,508 |   | 80 – 89%       | 904   |
| 6 – 7.9       | 2,072 |   | 70 – 79%       | 1,449 |
| 4 – 5.9       | 4     |   | 60 – 69%       | 677   |
|               |       |   | 50 – 59%       | 4     |

Patched: 2,005 of 3,807 used tires (53%). Run-flat: 441.

**Side fix.** The seller dashboard's size selects (width → profile → rim) only
offer sizes that have a tire with **more than "70%"** life, compared as text
(the bug 029 removed from the storefront: `'100%'` sorts below `'70%'`). That
rule exists nowhere else; today it hides 7 of 294 sellable sizes from the
dashboard selects.

## Decisions (clarified 2026-11-18)

- **D1 — Tread as one-tap steps.** Minimum tread: **6/32"+, 7/32"+, 8/32"+,
  9/32"+**, each with its count, like the rail's other options (links, no
  JavaScript needed). Remaining life keeps its slider.
- **D2 — Quick chips above the results.** "Not patched", "Run-flat" and
  "8/32"+" as chips above the listing, as well as in the rail — within thumb
  reach on a phone.
- **D3 — Used filters mean used tires.** Tread, life and patched only describe
  used tires. Applying one on a mixed `/tires` view also narrows it to used
  (the Condition chip shows it). With **New** only they are not offered, and
  switching to New drops them, so the list never empties because of them.
  Run-flat is not a used filter: it stays for new tires.
- **D4 — `/tires/used` gets the full rail** of `/tires` (brand, size parts,
  price, tread, life, patched, run-flat), fixed to used. One way of filtering
  across the site.
- **D5 — Quick chips show** on `/tires/used` and on `/tires` unless New only is
  chosen.
- **D6 — Dashboard size selects use the storefront's sellable rule** (≥ 50%
  life as a number, online, not sold, priced): the same 294 sizes the site
  sells today, one rule everywhere.

## User stories

- As a **buyer of used tires**, I want to **ask for a minimum tread depth**
  ("8/32 or more"), so that I **only see tires with the rubber I need**.
- As a **buyer**, I want **one tap for "no patch" and "run-flat"** on the used
  listing, so that I **don't open a panel for the two things I care about**.
- As a **buyer of new tires**, I want **filters that don't apply to new tires
  out of my way**, so that **the panel is shorter and nothing filters to zero**.
- As a **phone user**, I want **the same filters within thumb reach**, so that
  **I narrow the list without scrolling a long panel**.
- As a **seller**, I want the **dashboard size selects to offer every size we
  sell**, so that **I can find any tire by size**.

## Scope

- **In:**
  - A minimum-tread filter for used tires, in 32nds, wherever the used filters
    are offered.
  - Used filters (tread, life, patched, run-flat) on `/tires` and on
    `/tires/used`, on desktop and phone.
  - Used-only filters out of the way when only new tires are being browsed.
  - Applied used filters shown as removable chips, like the other filters.
  - Every filtered view is a shareable URL (as today).
  - GA4 events for the new filters.
  - The dashboard size-select rule.
- **Out:**
  - Filters for DOT date, load index or speed rating (data is there since 051;
    a later feature if asked).
  - Changing what is sellable online (`≥ 50%` life stays the rule).
  - The brand pages, `/tires/new` and `/tires/size/[size]` filters.
  - Saving a buyer's filter preferences between visits.

## Functional requirements

- **FR1:** A buyer can ask for used tires with **at least** a given tread depth
  in 32nds, choosing one step: 6/32"+, 7/32"+, 8/32"+ or 9/32"+ (D1). Picking
  another step replaces it; picking the active one clears it.
- **FR2:** The tread filter combines with the others (AND with size, brand,
  price, life; the result shows only tires matching all).
- **FR3:** "Not patched", "Run-flat" and "8/32"+" are quick chips above the
  results (D2, D5), in addition to the rail. A chip shows its state and a second
  tap removes it.
- **FR4:** When only new tires are being browsed, tread, life and patched are
  hidden, in the rail and the quick chips (D3). Run-flat stays.
- **FR5:** Switching to New drops any tread, life or patched filter (D3).
  Applying one of them on a mixed `/tires` view narrows it to used.
- **FR6:** `/tires/used` offers the full `/tires` rail, fixed to used (D4); its
  page title, breadcrumb and SEO stay those of `/tires/used`.
- **FR7:** Each applied used filter shows as a chip that removes it; "Clear
  all" clears them too.
- **FR8:** The filter shows how many tires each choice leaves, as the rail's
  other groups do, when the count is known.
- **FR9:** Filtered URLs follow today's rule for filtered `/tires` views:
  closed to crawlers in `robots.txt`, canonical to the base page.
- **FR10:** The dashboard size selects offer exactly the sizes the storefront
  sells, by the one sellable rule (D6).
- **FR11:** GA4 records applying and clearing a used filter, with which filter
  and value, and no personal data.

## Acceptance criteria (testable)

- [ ] **AC1:** Given the used listing, when the buyer asks for tread 8/32" or
  more, then every tire shown has tread ≥ 8.0/32" and the count matches the
  catalog (1,731 on 2026-11-18, before other filters).
- [ ] **AC2:** Given a tread filter and a size, when both apply, then only tires
  of that size with that tread show.
- [ ] **AC3:** Given the used listing on a phone at 390px, then "Not patched"
  and "Run-flat" are reachable without opening the full filter panel, each at
  least 44px tall.
- [ ] **AC4:** Given only new tires are browsed, then neither the rail nor the
  quick chips offer tread, life or patched, and run-flat is offered.
- [ ] **AC5:** Given tread 8/32"+ is applied, when the buyer switches to New,
  then the URL and the chips no longer carry the tread filter and new tires
  show. Given a mixed `/tires` view, when the buyer taps "Not patched", then
  the list is used and not patched and the Condition chip reads Used.
- [ ] **AC6:** Given `/tires/used`, then the full rail is offered (brand, size
  parts, price, tread, life, patched, run-flat) without a Condition choice, and
  every filter works as on `/tires`; title, breadcrumb and canonical are
  unchanged.
- [ ] **AC6b:** Given `/tires/used` or a mixed `/tires` view, then the quick
  chips "Not patched", "Run-flat" and "8/32"+" show above the results; given
  New only, only "Run-flat" shows.
- [ ] **AC7:** Given an applied tread filter, then a chip "Tread 8/32"+" shows
  and removing it restores the list; "Clear all" removes it.
- [ ] **AC8:** Given a filtered URL is opened directly or shared, then the same
  filters are applied and shown.
- [ ] **AC9:** Given a filtered view of `/tires` or `/tires/used`, then
  `robots.txt` disallows it and its canonical is the base page.
- [ ] **AC10:** Given the seller dashboard, when picking width → profile → rim,
  then the sizes offered are exactly the storefront's sellable sizes (294 on
  2026-11-18; the 7 hidden today appear), and the rule is written once.
- [ ] **AC11:** Given a buyer applies or clears a used filter, then a GA4 event
  is sent with the filter and value, and nothing about the buyer.
- [ ] **AC12:** Given a keyboard or screen-reader user, then each used filter
  is reachable, named ("Minimum tread, 8/32 inch or more") and announces its
  state.

## Non-functional / constraints

- Works without JavaScript where the rail does today (filters are links).
- No new public data: tread, life, patched and run-flat are already on the
  card.
- Phone first: no horizontal page scroll at 390px; touch targets ≥ 44px.
- No measurable cost on the listing: the same queries, one more condition.
- Accessible names with real spaces between parts (the 023 lesson).
- Checklist for the series: modern-web-guidance, security (input validated,
  nothing internal leaked), SEO, responsive, GA4.

## Open questions

None — all resolved on 2026-11-18 (see Decisions).

---

_The WHAT and WHY only. The HOW lives in [plan.md](./plan.md)._
