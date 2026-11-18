# Spec — Every tire size on one page

> Feature: `050-size-index` · Status: Implemented (owner review pending) · Created: 2026-11-18
> Roadmap: Backlog — series 049–054 (lessons from prioritytire.com) · Branch:
> `feat/050-size-index`

## Why — problem & value

We publish a page for every tire size we sell — `/tires/size/235-45-18` and
~290 more — and they are in the sitemap. But **no page on the site lists
them**. A shopper reaches one only from a tire card's size link, or when the
catalog's address folds into it; a search engine reaches them only through
the sitemap. `/tires/size` itself answers "not found".

Priority Tire has a "Search tires by size" page: a box to type a size, the
popular sizes as buttons, and every size they sell as a list of links. It is
both a shortcut for the shopper who knows their size and the page that ties
every size page together for search engines.

What our inventory says (sellable catalog, 2026-11-18):

- **~294 sizes** on **14 rim sizes** — but unevenly: 18", 19", 20" and 21"
  hold 190 sizes and 5,257 of the 6,851 tires; 13", 14", 19.5", 24" and 26"
  hold one to three sizes each.
- The sizes with most tires: 315/30/22 (270 tires), 315/35/21 (258),
  255/45/19 (206), 285/40/20 (184), 315/30/21 (174), 225/60/18 (159).
- **45 sizes have a single tire.**

This serves the first pillar, **frictionless search** (a size typed or tapped
lands on its page in one step), and the site's search visibility (every size
page reachable from a real page, not only the sitemap). It is the second of
the 049–054 series; 049 added the step-by-step picker and "Other sizes" on the
tire page.

## User stories

- As a **shopper who knows my size**, I want to type it in any common format
  (`235/45R18`, `235 45 18`, `2354518`) and land on that size's tires, so that
  I skip the filters.
- As a **shopper browsing**, I want to see the sizes you sell grouped by rim
  size, so that I find mine (or my other car's) at a glance.
- As a **shopper**, I want to know when you don't carry my size, and what is
  close, so that I don't hit a dead end.
- As **Mr. Goma**, I want one page that links to every size page, so that
  search engines find and value them.

## Scope

- **In:**
  - A page at **`/tires/size`** — "Shop tires by size".
  - A **size search box** that understands the usual ways a size is written.
  - **Popular sizes** as buttons: the sizes with the most tires in stock (D1).
  - **Every size for sale, grouped by rim** (13" … 26"), each a link to its size
    page.
  - Links **to** this page (D4): the size pages' breadcrumb, "See all sizes"
    under the size pickers, the footer, and the header's "Shop Tires", which
    becomes a menu.
  - Its search-engine description (title, description, breadcrumb, list of
    sizes as structured data) and its place in the sitemap.
  - Events in Google Analytics for the new interactions.
- **Out:**
  - Changes to the size pages themselves (`/tires/size/{size}`), other than
    the breadcrumb step back to this page.
  - A brands index (`/tires/brands` does not exist either; a later feature).
  - Search by vehicle; staggered sizes.
  - The home and `/tires` pickers (049).

## Functional requirements

- **FR1 — The page.** `/tires/size` shows a title ("Shop tires by size"), one
  short paragraph on how to read a size on the sidewall, the search box, the
  popular sizes and the full list. Works without JavaScript for everything
  but the search box's live help.
- **FR2 — Search box (D8).** The **same field as the home page's "Search by
  Text"**: digits only, formatted as typed (`2354518` → `235/45/18`); a pasted
  `P235/45ZR18` is reduced to its digits the same way. No autocomplete. Search
  is enabled once the size is complete, as on home. Flotation sizes
  (`35x12.50R20`) and half-inch rims are reached from the list, not typed.
- **FR3 — Found.** When the typed size is one we sell, submitting goes to its
  size page.
- **FR4 — Not found.** When it is a valid size we don't sell, the page says so
  plainly and offers the closest sizes we do sell — the same width on the
  same rim (other aspect ratios); when there are none, the sizes on that rim —
  with a reminder to check the size fits the car (D3), plus the step-by-step
  picker on `/tires` as a way out. A size whose rim we don't sell at all gets
  the reminder and the picker only. An incomplete size shows the field's own
  "3 digits / 2 digits / 2 digits" message.
- **FR5 — As you type.** The value is formatted as typed, as on home; there
  is no suggestion list (D8). Enter submits, Tab leaves the field.
- **FR6 — Popular sizes.** The 12 sizes with the most tires in stock, as
  buttons, each a link to its size page (D1). Computed from the inventory, so
  the set follows the stock; to be revisited once GA4 search data exists.
- **FR7 — All sizes by rim.** Every size for sale, grouped by rim in ascending
  order (13", 14", 15" …), sizes in numeric order inside each group, each a
  link to its size page, with how many tires there are ("235/45/18 · 12
  tires", "· 1 tire") (D2). No price.
- **FR8 — Always the catalog's list.** The sizes shown are exactly the sizes
  for sale — the same list the picker (049), the sitemap and the size pages
  use. A size that sells out drops off within minutes; no link here leads to a
  "not found".
- **FR9 — Ways in (D4, D5, D6).**
  - Each size page's breadcrumb goes Home / Tires / **Sizes** / 235/45/18.
  - "See all sizes" under the home size picker, in the `/tires` floating
    "Edit tire size" form, and in the size groups (Width, Profile, Rim) of the
    `/tires` filter rail.
  - "Shop by size" in the footer's links.
  - The header's **"Shop Tires" becomes a menu** — on desktop and in the phone
    menu — with All tires (`/tires`), Used tires (`/tires/used`), New tires
    (`/tires/new`) and Shop by size (`/tires/size`), like "Locations" today.
- **FR10 — Search engines.** The page has its own title and description, a
  single H1, a breadcrumb, the list of sizes as structured data (an item
  list), a self-referencing canonical, and is in the sitemap. Every size link
  is an ordinary link in the page's HTML.
- **FR11 — Analytics.** Measured in Google Analytics like 046/049: a size
  searched from the box (found / not found, the size typed when it is valid),
  a suggestion chosen, a popular size chosen, a size chosen from the list.
  Consent and no-personal-data rules apply. The text typed is sent only when it
  parses as a size, never raw.
- **FR12 — Security.** The search box sends nothing the server must trust:
  matching uses the published list of sizes; any request the page makes takes
  validated input only, returns only public data, and cannot be used to run
  expensive queries.

## Acceptance criteria (testable)

- [ ] **AC1:** Given `/tires/size`, then it answers 200 with the title, the
      search box, the popular sizes and every size for sale grouped by rim
      (13" … 26"), each size linking to `/tires/size/{size}`.
- [ ] **AC2:** Given the search box, when the shopper types `2354518` (shown
      as `235/45/18`) or pastes `P235/45ZR18`, and submits with Search or
      Enter, then they land on `/tires/size/235-45-18` (when we sell it).
- [ ] **AC3:** Given the list, then flotation sizes such as 35/12.50/20 link to
      their pages (`/tires/size/35-12-50-20`).
- [ ] **AC4:** Given a valid size we don't sell (e.g. `225/65R18`; on
      2026-11-18 we sell 225/40, 225/45, 225/50, 225/55 and 225/60 on 18"),
      then the page says we don't carry it and lists those 225 sizes on 18"
      with a reminder to check the fit, plus a link to the step-by-step picker;
      given a rim we don't sell at all (e.g. `155/80R12`), then only the
      message, the reminder and the picker; given an incomplete size, then
      Search stays off and the format message shows. No server error.
- [ ] **AC5:** Given the field, then it is the home page's component (same
      formatting, no autocomplete list), usable with the keyboard alone: Enter
      submits and Tab leaves it.
- [ ] **AC6:** Given the page's HTML (no JavaScript), then every size for sale
      is an ordinary link, the page has one H1, a breadcrumb, a canonical to
      itself and an item list of the sizes; and `/tires/size` is in the
      sitemap.
- [ ] **AC7:** Given a size page, then its breadcrumb reads Home / Tires /
      Sizes / {size}, with "Sizes" linking to `/tires/size` (also in its
      structured data).
- [ ] **AC7b:** Given the home size picker, the `/tires` floating form, the
      `/tires` filter rail's size groups and the footer, then each has a link
      to `/tires/size`.
- [ ] **AC7c:** Given the header on desktop and the phone menu, then "Shop
      Tires" opens a menu with All tires, Used tires, New tires and Shop by
      size, usable with keyboard and screen reader like "Locations".
- [ ] **AC7d:** Given the list, then each size shows its count ("12 tires",
      "1 tire"), and the popular sizes are the 12 with the most tires.
- [ ] **AC8:** Given a size that sold out, then within the cache window it
      disappears from the list and no link on the page leads to a not-found
      page.
- [ ] **AC9:** Given analytics consent, then the events of FR11 reach Google
      Analytics with the values described and nothing typed that is not a
      size; given no consent, then nothing is sent.
- [ ] **AC10:** Given the page at 390 px and at desktop width, then nothing
      overflows sideways, tap targets are at least 44 px, and `perf:budget`
      stays within limits.

## Non-functional / constraints

- **Mobile first, WCAG 2.1 AA:** the search box is a labelled field with
  visible focus; suggestions follow the platform's combobox pattern
  (researched with the modern-web-guidance skill before designing).
- **Speed:** the page is mostly static (the list changes slowly); it must not
  add database load per visit (the pool has saturated before) and must load
  fast on a phone.
- **Crawl budget:** no new address space — no search-result URLs for typed
  text, no filter parameters (`robots.ts` closed those in 036/038).
- **Voice:** US English, plain ("Shop tires by size", "We don't carry
  175/65R14 right now").

## Decisions (2026-11-18)

- **D1:** Popular sizes = the 12 with the most tires in stock, computed from
  the inventory; revisit once GA4 search data exists.
- **D2:** Each size in the list shows its tire count, no price.
- **D3:** For a size we don't sell: same width on the same rim; if none, the
  sizes on that rim; always with a fit reminder.
- **D4:** Ways in: size pages' breadcrumb, "See all sizes" under the pickers,
  the footer, and the header's "Shop Tires" as a menu.
- **D5:** The "Shop Tires" menu: All tires, Used tires, New tires, Shop by size
  — desktop and phone.
- **D6:** On `/tires`, "See all sizes" goes in the floating form and in the
  filter rail's size groups.
- **D7 (`/analyze`):** suggestions use the browser's native list, which matches
  text as typed (`235`, `235/4`); a digits-only size is parsed on submit.
  A custom combobox was not worth its code and accessibility risk.
  **Superseded by D8.**
- **D8 (owner review, 2026-11-18):** the search box is the home page's typed
  field — one component, two uses (`TireSizeTextField`): formatted digits, no
  autocomplete, no datalist chevron. Reviewing it found the shared field
  blocked Enter and Tab (a keyboard trap on home too); fixed for every use.
  Also: header dropdowns close after a navigation.

## Open questions

None.

---

_The WHAT and WHY only. The HOW lives in [plan.md](./plan.md)._
