# Spec — Compare up to three tires side by side

> Feature: `051-compare-tires` · Status: Implemented (owner review pending) · Created: 2026-11-18
> Roadmap: Backlog — series 049–054 (lessons from prioritytire.com) · Branch:
> `feat/051-compare-tires`

## Why — problem & value

A used tire is not a commodity: two 235/45/18 tires of the same price can
differ by 3/32" of tread, by 30% of remaining life, by a patch, by four years
of age (DOT). That difference is exactly what our mission asks us to make
visible (**visual transparency**, **clear condition standard**). Today a
shopper who hesitates between two or three tires has to open each tire page
in turn and remember the numbers. The cart's hover card (047) compares what
is *already in the cart*; nothing helps **before** choosing.

Priority Tire puts a compare toggle on every card: picked tires gather in a
tray at the bottom of the screen ("Add a second product to compare"), and
"Start comparison" opens a table, one column per tire, one row per fact. Their
tires are new and identical by model, so they compare specifications. Ours
differ unit by unit, which makes comparison more useful here than there.

This is the third of the 049–054 series (049 size picker and other sizes, 050
size index).

## User stories

- As a **shopper hesitating between tires**, I want to put two or three side
  by side, so that I see at a glance which has more tread, more life, no patch
  and a newer DOT for its price.
- As a **shopper on my phone**, I want to add a tire to the comparison from
  the list without leaving it, and see the comparison in a view that fits my
  screen.
- As **Mr. Goma**, I want the comparison to show the real condition of each
  unit, so that the buyer trusts the price differences.

## Scope

- **In:**
  - A **compare control** on each tire card of every listing that uses it:
    `/tires` (grid and list views), size pages, brand pages, `/tires/new` and
    `/tires/used` (D1).
  - A **compare tray** that collects up to **3** tires, shows them, lets the
    shopper remove one or clear all, and opens the comparison.
  - The **comparison**: one column per tire, one row per fact, with the
    differences easy to spot.
  - From the comparison: open a tire's page, add a tire to the cart, remove
    it from the comparison.
  - Events in Google Analytics for the new interactions.
- **Out:**
  - Comparing tires already in the cart (047's hover card does that).
  - Sharing a comparison by link.
  - Comparing "sets" (041) as units.
  - New facts the inventory does not have (no UTQG, warranty miles, load
    range text).

## Functional requirements

- **FR1 — Add to compare.** Each tire card has a control to add the tire to
  the comparison, and shows when the tire is already in it (pressing again
  removes it). It is a real button, keyboard and screen-reader usable.
- **FR2 — Up to three.** The comparison holds at most 3 tires. Trying to add a
  fourth tells the shopper the limit and how to make room; it does not drop a
  tire silently.
- **FR3 — The tray.** While at least one tire is picked, a tray at the bottom
  of the screen shows the picked tires (photo or the generic image, name,
  size, price), an empty slot per remaining place ("Add another tire to
  compare"), a remove control per tire, "Clear", and **"Compare"** — enabled
  from 2 tires. It does not cover the cart button, the chat bubble or the
  page's own floating controls in a way that blocks them. The picks **last for
  the visit**: across pages and reloads, emptied when the tab closes (D5).
- **FR4 — The comparison.** One column per tire; rows, in this order:
  photo, name (brand + model), size, condition (New/Used), price, tread
  (x/32"), remaining life, patched, DOT (week/year of manufacture), load
  index, speed rating, run-flat, where it is (city) (D2). The listing carries
  DOT, load index and speed rating for this — public facts already on the tire
  page. Missing facts read "—", never blank.
- **FR5 — Differences stand out.** In each row where the tires differ, the
  better value is marked (more tread, more life, no patch, lower price, newer
  DOT); rows where all tires are equal can be hidden with a "Show only
  differences" switch.
- **FR6 — Actions per tire.** In the comparison each tire has "View tire"
  (its page), "Add to cart" (the cart's existing behaviour, including when the
  tire is already in the cart or sold) and "Remove".
- **FR7 — Honest data.** Facts come from the same data the card shows, as of
  when the tire was added, and **re-checked when the comparison opens** (D6):
  a tire that sold shows "Sold" and no "Add to cart"; a changed price shows the
  current one. The re-check uses the public tire data (no internal fields) and
  at most one request per tire; if it fails, the comparison still opens with
  the saved data and says it could not confirm availability.
- **FR8 — Different sizes (D3).** Allowed. When the tires are not all the same
  size, the comparison says so at the top ("These tires are different sizes —
  only the size approved for your car fits") and the size row is marked as
  differing.
- **FR9 — Phone first.** On a phone the tray is compact (thumbnails and a
  count) and the comparison fits the screen: columns scroll sideways with the
  fact names fixed, or the layout stacks — whichever keeps the three values of
  one fact visible together.
- **FR10 — Analytics.** Measured like 046/049/050: a tire added to / removed
  from the comparison (tire id, count after), the comparison opened (number of
  tires, whether all share a size), a tire added to the cart from the
  comparison (the same 040 `add_to_cart` a card sends), "view tire" from the
  comparison. No personal data; consent rules as everywhere.
- **FR11 — Security and SEO.** The comparison opens **over the listing** as a
  dialog — full screen on a phone — with no address of its own (D4); closing
  it returns to the same place in the list. It is built from data the page
  already has plus the re-check of FR7. No warehouse or shelf code anywhere.

## Acceptance criteria (testable)

- [ ] **AC1:** Given a listing, when the shopper presses "Compare" on two
      cards, then the tray appears with both tires and an empty slot, and
      "Compare" is enabled.
- [ ] **AC2:** Given three tires in the tray, when the shopper tries a fourth,
      then a message explains the limit of 3 and nothing is dropped.
- [ ] **AC3:** Given the comparison of two used tires of the same size, then
      it shows each fact of FR4 in rows (DOT, load and speed included), "—"
      for a missing fact, and the better tread, life, patch, price and newer
      DOT marked.
- [ ] **AC4:** Given "Show only differences" on, then rows where all tires
      are equal are hidden.
- [ ] **AC5:** Given the comparison, when the shopper presses "Add to cart"
      on a tire, then it is added exactly as from its card (same event, same
      rules), and "View tire" opens its page.
- [ ] **AC6:** Given a phone (390 px), then the tray does not block the cart,
      chat or page controls, the comparison keeps one fact's values visible
      together, nothing overflows the page sideways, and targets are ≥ 44 px.
- [ ] **AC7:** Given only the keyboard, then the shopper can add, remove,
      open and close the comparison; given a screen reader, then the compare
      buttons announce their state and the comparison reads as a table with
      fact names as row headers.
- [ ] **AC8:** Given analytics consent, then the events of FR10 reach Google
      Analytics with the values described; given no consent, nothing is sent.
- [ ] **AC9:** Given the page HTML and the listing's data, then the feature
      adds no new address and no warehouse or shelf code reaches the browser;
      DOT, load index and speed rating are the only fields added to listings.
- [ ] **AC11:** Given two tires picked on `/tires` and a third on a brand page,
      when the shopper reloads, then the tray still holds all three; given a
      new tab or visit, then it is empty.
- [ ] **AC12:** Given a tire that sold after it was picked, when the
      comparison opens, then it shows "Sold" without "Add to cart"; given a
      price change, then the current price shows; given the re-check fails,
      then the saved data shows with a notice.
- [ ] **AC13:** Given tires of different sizes, then the comparison shows the
      different-sizes notice and marks the size row.
- [ ] **AC14:** Given picked tires, then the tray and the comparison appear on
      the store's pages (listings and tire pages) and not on `/checkout` or the
      sellers' dashboard; the picks are kept while there and show again when
      the shopper returns to a store page.
- [ ] **AC10:** `perf:budget` stays within limits; the listings' speed (LCP,
      INP) does not regress.

## Non-functional / constraints

- **Mobile first, WCAG 2.1 AA:** the compare control is a labelled checkbox
  that announces whether it is checked; the comparison is a real table (row and column
  headers); modern patterns for the tray and the comparison view researched
  with modern-web-guidance before designing.
- **Speed:** listings are the busiest pages; the feature must add little
  JavaScript and no request per card.
- **Voice:** US English, plain ("Compare", "Add another tire to compare",
  "Show only differences").

## Decisions (2026-11-18)

- **D1:** The compare control is on every listing that uses the tire card:
  `/tires` (grid and list), size, brand, `/tires/new`, `/tires/used`.
- **D2:** The comparison includes DOT, load index and speed rating; listings
  carry those three public fields.
- **D3:** Different sizes can be compared, with a notice.
- **D4:** The comparison is a dialog over the listing; no address of its own.
- **D5:** The picks last for the visit (pages and reloads), not across visits.
- **D6:** Availability and price are re-checked when the comparison opens.
- **D7 (`/analyze`):** the tray and the comparison show on store pages only —
  not on `/checkout` or the sellers' dashboard.

## Open questions

None.

---

_The WHAT and WHY only. The HOW lives in [plan.md](./plan.md)._
