# Spec — Pick a size in three taps, see the other sizes of a tire

> Feature: `049-size-picker-other-sizes` · Status: Implemented (owner review pending) · Created: 2026-11-18
> Roadmap: Backlog — series 049–054 (lessons from prioritytire.com) · Branch:
> `feat/049-size-picker-other-sizes`

## Why — problem & value

On 2026-11-18 we walked through a large online competitor, Priority Tire, to
see what their search does better. Two things stood out, and both serve our
first experience pillar, **frictionless search**:

1. **Choosing a size.** They show the widths as a grid of buttons; picking one
   jumps straight to the aspect ratios that exist for it, then to the rim sizes
   that exist for both. Three taps, no lists to scroll, and nothing offered
   that leads to an empty result. We use three drop-down lists (Width,
   Sidewall, Diameter). On a phone each one opens the system picker, hides the
   page, and shows a long column of numbers.
2. **Other sizes of the same tire.** Their tire page lists, grouped by rim
   size (15", 16", 17"…), every other size of the same model they sell, with
   its price. A buyer who likes a tire but needs another size, or who is
   checking a second car, stays on that tire instead of starting over. Our tire
   page has nothing like it.

What our inventory says (sellable catalog, 2026-11-18):

- **The size space is small:** 6,851 tires in **293 sizes**, built from **24
  widths, 17 aspect ratios and 14 rim sizes** (most stock is on 18"–22" rims).
  Widths run 110–195, 205–295 and 305–335, plus flotation sizes for trucks
  (35×12.50, 37×12.50…), which read differently (`35/12.50/20`).
  A button grid fits on one screen, even on a phone.
- **Most tires have siblings:** for **4,365 of 6,851 tires (64%)** the same
  brand and model is for sale in at least one other size; for 1,589 (23%) in
  four or more. The other 2,486 (36%) are the only size of their model.
- **The current lists miss some sizes:** the size lists use a stricter rule
  than the catalog (more than 70% remaining life instead of 50% or more), so
  **7 of the 293 sizes for sale (286 shown)** cannot be reached from them,
  and the options shown reflect 1,217 fewer tires than the catalog has.

This is the first of a series (049–054) drawn from that walk-through; the rest
are listed in the roadmap.

## User stories

- As a **shopper on my phone**, I want to pick my tire size by tapping a few
  numbers, so that I get to the tires that fit without fighting drop-down
  lists.
- As a **shopper**, I want to be offered only the sizes that are actually for
  sale, so that I never land on an empty result.
- As a **shopper looking at a tire I like**, I want to see the other sizes of
  that same tire and their prices, so that I can find it in my size or for my
  other car.
- As **Mr. Goma**, I want each tire page to link to its sibling sizes, so that
  buyers and search engines reach more of the catalog from every tire.

## Scope

- **In:**
  - **The size picker** that replaces the three drop-down lists wherever the
    shopper chooses a size by width, ratio and rim: the home page hero, the
    floating "Edit tire size" form of the tire listing (`/tires`), and the size
    selector of the home page's 3D preview on phones (D1). The sellers'
    dashboard keeps its own search.
  - **"Other sizes"** on the tire page: the other sizes of the same brand and
    model for sale, grouped by rim size, each with its starting price and a
    link.
  - The measurements this needs: events in Google Analytics for the new
    interactions.
- **Out:**
  - A page that lists every size (050).
  - Search by vehicle (year, make, model): we have no fitment data.
  - Different front and rear sizes (staggered sets).
  - Suggesting other brands in the same size: that is "similar tires", not
    this feature.
  - Changes to the brand, condition and price filters, the text search and the
    AI chat.
  - The width, profile and rim groups of the `/tires` filter rail: they are
    links (crawlable, shareable), not drop-down lists, and stay as they are.

## Functional requirements

### The size picker

- **FR1 — Step by step.** The shopper picks the **width**, then the **aspect
  ratio**, then the **rim size**, in that order. Each step shows its choices
  as buttons. Choosing one moves on to the next step by itself.
- **FR2 — Only what exists.** The width step offers every width for sale; the
  ratio step only ratios that exist with the chosen width; the rim step only
  rims that exist with both. Every complete choice leads to at least one tire.
- **FR3 — Exactly the sizes for sale.** The choices come from the same rule
  that decides what the catalog sells, so every size for sale can be picked
  (today 7 cannot) and none that is not.
- **FR4 — Grouped widths.** Widths are grouped so they scan fast: 100s, 200s,
  300s, and flotation sizes (35, 37…) apart, labelled so a non-expert
  recognises them: rows "100s", "200s", "300s" and "Truck flotation" (D2).
- **FR5 — Going back.** The shopper sees what they picked so far
  (`235 / 45 / R18`) and can change any step. Changing the width clears the
  ratio and rim if they no longer exist.
- **FR6 — What happens at the end.** Picking the rim completes the size: the
  picker closes and the **Search** button is highlighted. Nothing is searched
  until the shopper presses it, on every page (D3), so the brand, condition
  and price filters can still be added. The 3D preview keeps following the
  size as it is picked, as today.
- **FR7 — Nothing else is lost.** The selected-size chips, the brand,
  condition and price filters, and searching without a size (only those
  filters) keep working as today. The links and addresses produced are the
  same as today's, so bookmarks, shared links and analytics keep their
  meaning.
- **FR8 — Phone and keyboard.** On a phone the picker opens in a panel that
  fits the screen and does not hide what was picked. It can be used with a
  keyboard alone and with a screen reader: each step is announced, the choices
  say what they are ("Width 235"), and the current step is clear.

### Other sizes on the tire page

- **FR9 — The list.** Under the tire's details, a section "Other sizes of
  this tire" lists the sizes in which the **same brand and model** is for sale,
  grouped by **rim size** in ascending order (17", 18", 19"…). Each size shows
  its **starting price** (the cheapest tire for sale in that size), **how many
  are available** ("4 available": units for sale of that brand, model and
  size, never which store; D6), and links to **that cheapest tire's page**
  (D4).
- **FR10 — The current size.** The tire's own size appears in its group,
  highlighted and not linked, so the shopper sees where they are — always for
  a tire that is not sold, even one the catalog does not list (e.g. reached by
  its address with less than 50% life left).
- **FR11 — Open where it matters.** The group of the tire's own rim size is
  open; the others are closed and open with one tap.
- **FR12 — Empty means hidden.** When the model has no other size for sale
  (36% of tires today), the section does not appear: no empty box, no "none
  found".
- **FR13 — Sold tires.** On the page of a sold tire the section still shows
  the model's other sizes for sale (D5), alongside 045's link to the same tire
  in stock. The sold tire's own size is listed only if units of it are still
  for sale.
- **FR13b — New and used together.** Sizes are listed whatever the
  condition; when the cheapest tire of a size is new, the row says "New"
  (D5b).
- **FR14 — Honest prices.** Prices are the catalog's, current as of the
  page's render, rounded as everywhere else on the site; "From $X" when a size
  has several tires, "$X" when it has one.

### Applies to both (standing requirements of the series)

- **FR15 — Analytics.** The new interactions are measured in Google Analytics,
  following the event conventions of 040 and 046: a step of the picker
  completed (which step and value), a size completed, a search launched from
  the picker (as today's search event), a rim group opened, and an other-size
  link followed (from which size to which). Consent rules and the no-personal-
  data rule apply as everywhere.
- **FR16 — Search engines.** The other-size links are ordinary links that a
  search engine can follow. The feature adds **no new kind of address** to
  the site and the section has a proper heading.
- **FR17 — Security.** Any new data the page or the picker asks the server for
  validates its inputs, returns only public fields (never the warehouse or
  shelf code), and does not let an outsider make the site run unbounded or
  expensive queries.

## Acceptance criteria (testable)

- [ ] **AC1:** Given the home page on a phone (390 px), when the shopper taps
      the width 235, then the ratio step opens by itself and shows only ratios
      that exist with 235; tapping 45 opens the rim step with only rims that
      exist with 235/45.
- [ ] **AC2:** Given any complete size picked in the picker, then the search
      returns at least one tire.
- [ ] **AC3:** Given the catalog's sizes for sale, then every one of them can
      be picked (today 286 of 293 can), including flotation sizes such as
      35/12.50/20.
- [ ] **AC4:** Given a size picked (and, on the home page, filters staged),
      when the search runs, then the address is the same as today's for the
      same choices.
- [ ] **AC5:** Given only the keyboard, then the shopper can pick a size and
      search; given a screen reader, then each step and choice is announced
      by name and the current step is identifiable.
- [ ] **AC6:** Given the page of a used Firestone Destination LE3 (for sale in
      15 sizes), then "Other sizes of this tire" lists those sizes grouped by
      rim in ascending order, its own rim's group open, its own size
      highlighted and not linked, and each other size with its starting
      price, its count ("N available") and a link to the cheapest tire of that
      size; a size whose cheapest tire is new says "New".
- [ ] **AC7:** Given a tire whose model is for sale in no other size, then the
      section is absent from the page.
- [ ] **AC7b:** Given a sold tire whose model is for sale in other sizes, then
      the section appears with those sizes, next to 045's alternative.
- [ ] **AC7c:** Given the picker on the home page, `/tires` or the 3D
      preview, when the rim completes the size, then the picker closes, the
      Search button is visibly highlighted, and no search runs until it is
      pressed.
- [ ] **AC8:** Given the section, then its links are plain links present in
      the page's HTML, and the feature creates no address that did not exist
      before.
- [ ] **AC9:** Given analytics consent, when the shopper completes the picker
      steps, opens a rim group or follows an other-size link, then the events
      of FR15 reach Google Analytics with the values described and no personal
      data; given no consent, then nothing is sent.
- [ ] **AC10:** Given the tire page, then no warehouse name or shelf code
      appears in the section or in any data it loads; given malformed or
      abusive input to any new request, then it is rejected without a server
      error or an expensive query.
- [ ] **AC11:** Given the home page, `/tires` and a tire page at 390 px and at
      desktop width, then nothing overflows sideways, tap targets are at least
      44 px, and the page's speed and layout stability stay within the
      project's budget (no regression in `perf:budget`).

## Non-functional / constraints

- **Mobile first, WCAG 2.1 AA:** contrast, focus visible, targets ≥ 44 px,
  reduced motion respected; the picker uses the platform's modern patterns
  (researched with the modern-web-guidance skill before designing).
- **Speed:** the tire page is rendered fresh on every visit and the database
  connection pool has saturated before (`project_tires_slowness_pool`); the
  new section must not add a slow or uncached query to every tire page view.
  The picker must not delay the home page's first paint or add layout shift.
- **One source of truth:** what the picker offers and what the catalog sells
  follow the same rule.
- **Voice:** US English, plain words ("Width", "Aspect ratio", "Rim size"),
  with a short hint of where to read them on the tire's sidewall.

## Decisions (2026-11-18)

- **D1:** The picker replaces the drop-downs on the home hero, the `/tires`
  floating "Edit tire size" form and the home 3D preview's selector on phones.
  The sellers' dashboard is not touched.
- **D2:** Widths are grouped: 100s, 200s, 300s, and truck flotation apart.
- **D3:** Completing the size never searches by itself: the picker closes and
  Search is highlighted, on every page.
- **D4:** Each other size links to the page of its cheapest tire for sale.
- **D5:** "Other sizes" also appears on sold tire pages.
- **D5b:** New and used are listed together; a row whose cheapest tire is new
  says "New".
- **D6:** Each size shows how many units are for sale ("4 available").

## Open questions

None.

---

_The WHAT and WHY only. The HOW lives in [plan.md](./plan.md)._
