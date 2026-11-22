# Spec — A filter on /tires loads its results once

> Feature: `061-tires-results-load-once` · Status: Clarified · Created: 2026-11-21
> Roadmap: P1.7 (Data / routes) · Branch: `feat/061-tires-results-load-once`

## Why — problem & value

Found while checking 060 (owner's browser, 2026-11-21): every time a shopper
changes something on `/tires`, the browser shows two problems in its network
log.

1. **The results are loaded twice.** The page asks the server for the new
   page, and the server already builds it with the new results; then the
   results list ignores those and asks the catalogue for the same results a
   second time (`/api/tires`). Two catalogue queries for one click, on the
   10-connection database pool that robots have already saturated once (see
   the `/tires` slowness notes).
2. **The set offers are asked for 3–4 times.** The line "Set of 4 · $X total"
   on each card is fetched after the cards appear. The cards appear, disappear
   behind the loading placeholder and appear again, and each time the request
   starts over; the earlier ones are cancelled in the browser (shown in red).
   Cancelling in the browser does not stop the server, so each cancelled one is
   likely still a database query.

Neither is visible to the shopper — the right results and offers end up on
screen — but each click costs several times the database work it needs, and
the phone downloads the same results twice. Mission fit: speed on phones and a
server that keeps up (P1.7).

## User stories

- As a **shopper filtering tires on my phone**, I want one click to fetch its
  results once, so that they arrive sooner and use less of my data.
- As the **owner**, I want each filter, page or sort change to cost the
  database one search, so that the small connection pool keeps up when
  traffic rises.
- As a **shopper**, I want the set offer on each card ("Set of 4 · $X total")
  to keep appearing as it does today.
- As a **shopper who hovers a tire and then opens it**, I want the page to
  open at once, without asking the server again for what the hover already
  fetched (added during /implement, owner's request).

## Scope

- **In:**
  - Measure first, on a production build: for one filter change on `/tires`,
    which requests the browser makes and how many database queries they cause
    (the temporary probe used in 060), and why the cards mount more than once.
  - A change on `/tires` that alters the results — a filter, a quick chip,
    clearing filters, the page number, the page size, the sort — loads its
    results **once**.
  - The list/table **view switch** shows the same results in the other layout
    **without any catalogue search** (the URL still records the view).
  - While new results load, the **current results stay on screen, dimmed and
    not clickable**, until the new ones replace them (instead of today's grey
    placeholder).
  - The set offers are asked for **once** per set of cards shown — on `/tires`
    and on **`/tires/used`** (same cards, filtered in place since 052), fixed
    here if it repeats there too.
  - **Opening a tire after hovering it** (added during /implement): the hover
    pre-load fetches the whole tire page, so the click needs no second
    request and the tire is read from the database once, not twice. Only
    plain links to a tire's page; the "Set of 2" link (`?set=`), the menu,
    the footer and the listing links keep 060's behaviour.
  - **Owner's review, round 2** (added during /implement):
    - The cards on `/tires/new`, the brand pages and the size pages are as
      wide as on `/tires` (they were 720 px against 944 px on a desktop).
      `/tires/used` already matched (059).
    - "Shop by size" (`/tires/size`) pre-loads a size page only on intent,
      like the rest of the site since 060; scrolling it pre-loaded every size.
  - The before/after numbers in `results.md`.
  - Mark 060 done in the roadmap (done with this spec).
- **Out:**
  - What the results are, their order, the filters' behaviour, the URLs, SEO,
    analytics events.
  - Other listing pages (`/tires/new`, size and brand pages) unless the
    measurement shows the same problem there (then noted for later).
  - Server-side caching of the catalogue; bot traffic.

## Functional requirements

- **FR1:** One change on `/tires` that alters the results causes **one**
  catalogue search on the server (not one from the page and another from the
  list).
- **FR2:** The cards' set offers are requested once per set of cards shown; no
  request is started only to be cancelled by the same change. A request may be
  cancelled only when its cards are replaced before it answers (e.g. a second
  filter within a second), and then the server stops querying the database for
  it.
- **FR3:** While new results are on their way, the current results stay on
  screen **dimmed and not clickable**, and the results area is announced as
  busy to assistive technology; they are never presented as the new results.
  When the new ones arrive they replace them, with the right count and
  pagination. A page change still scrolls to the top of the results.
- **FR6:** Switching between list and table view shows the same results in the
  other layout — **same page** — with no catalogue search and no set-offer
  request; the URL keeps recording the view, so a shared link opens in the same
  layout. (Today the switch sends the shopper back to page 1.)
- **FR4:** Everything else on `/tires` behaves as today: the results, counts,
  pagination, "no results" suggestions, scroll to the top on a page change,
  GA4 list events (`view_item_list` once per list shown, `select_item` with
  the right position).
- **FR5:** A test fails if a results change makes a second catalogue request,
  or if the set offers are requested more than once for the same cards.

## Acceptance criteria (testable)

- [ ] **AC1:** Given a production build, when a shopper changes one filter on
  `/tires`, then the browser makes **no** request to `/api/tires` (the
  results come with the page), and the database receives one catalogue search
  for it (measured with the temporary probe; before: two).
- [ ] **AC2:** Given the same, when the shopper goes to page 2, changes the
  page size and changes the sort, then each causes one catalogue search and no
  `/api/tires` request.
- [ ] **AC3:** Given any of those changes, then `/api/tires/sets` is requested
  **once** for the new cards and none is cancelled by that change (before:
  repeated and cancelled while the list re-fetched). Given two filters less
  than a second apart, then at most the first card set's request is cancelled,
  and the server's log shows it stopped before running all its size queries.
- [ ] **AC4:** Given a filter change on a slow connection (browser throttling),
  while the results load, then the previous results are dimmed, cannot be
  clicked, and the results area has `aria-busy="true"`; then the new results
  replace them with the right count and pagination, and the dimming is gone.
- [ ] **AC9:** Given `/tires` on page 2, when the shopper switches to table view
  and back, then neither switch makes a catalogue search, an `/api/tires`
  request or a set-offer request, the URL shows the current view, and the
  shopper stays on page 2.
- [ ] **AC10:** Given `/tires/used`, when the shopper changes a filter, then
  `/api/tires/sets` is requested once and none is cancelled (measured before
  and after).
- [ ] **AC5:** GA4: `view_item_list` fires once for the new list, and
  `select_item` from a card reports the right position on page 2.
- [ ] **AC6:** Tests cover FR1 and FR2 and fail if either regresses.
- [ ] **AC7:** `results.md` has the before/after: requests per change and
  database queries per change, for a filter, a page change and a sort.
- [ ] **AC11:** Given a production build and a card on `/tires`, when the
  shopper hovers its title (or touches it) and then clicks it, then the click
  makes **no** request for the tire page and the tire is read from the
  database **once** for hover + click (today: twice). A click while the
  pre-load is still on its way makes no second request either.
- [ ] **AC12:** Links to anything other than a tire's page (menu, footer,
  `/tires/used`, size and brand links) pre-load exactly as in 060; nothing
  pre-loads before intent. Tests fail if either regresses.
- [ ] **AC13:** At desktop width, the cards on `/tires/new`, a brand page
  and a size page are the same width as on `/tires` (944 px at ≥ 1280 px),
  with the section heading aligned to them; on phones the same side margins
  as `/tires`.
- [ ] **AC14:** Given a production build, scrolling `/tires/size` from top to
  bottom pre-loads no size page; hovering or touching a size starts its
  pre-load. A guard test fails if its size links go back to plain links.
- [ ] **AC8:** Definition of Done: tsc, lint, tests, build, `perf:budget`,
  `npm run a11y` all green; the `/tires` page looks and works the same.

## Non-functional / constraints

- **Mobile first:** fewer bytes per change on phones; checked at phone width
  if the browser allows (it has not resized in 058–060).
- **No visual change** other than the loading state (FR3): dimmed previous
  results instead of the grey placeholder.
- **Accessibility:** the dimmed results are not focusable or clickable while
  busy; `aria-busy` on the results area; contrast of the dimmed state is not a
  concern (it is temporary and not interactive), but text stays readable.
- **SEO:** URLs and server-rendered results unchanged.
- **Analytics:** GA4 events unchanged in name, count and payload.
- **Security:** nothing new exposed.

## Decisions (clarified 2026-11-21)

- **Loading state:** previous results stay, dimmed and not clickable, until the
  new ones arrive — no grey placeholder in between. It also stops the cards
  from disappearing and reappearing, which is what restarts the set-offer
  requests.
- **View switch** (list/table) is in scope and must not search the catalogue.
- **`/tires/used`** set-offer repeats are fixed in this branch if measured.
- **Tire page pre-load** (owner, during /implement): in this branch, not a
  separate feature. Accepted: a pre-loaded tire page is kept in the browser up
  to 5 minutes (Next's default for full pre-loads), so price and stock shown
  after a long pause between hover and click can be up to 5 minutes old;
  checkout validates the tire again.

## Assumptions

- The first load of `/tires` (a fresh visit) keeps its server-rendered results
  as today; this feature is about changes made on the page.
- Back/forward navigation behaves as today.

---

_The WHAT and WHY only. The HOW lives in [plan.md](./plan.md)._
