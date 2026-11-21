# Spec — The catalog stops pre-loading the same pages again and again

> Feature: `059-tires-prefetch-repeats` · Status: Clarified · Created: 2026-11-20
> Roadmap: P1.7 (Data / routes) · Branch: `feat/059-tires-prefetch-repeats`

## Why — problem & value

While measuring 058 we saw that, on `/tires`, every filter change makes the
browser pre-load the pages its links point to: `/tires/new`, `/tires/used`
and the `/tires/size/{size}` pages, **3–4 times each**. Each pre-load is a
request to our server for a page the shopper has not asked for and usually
never opens.

That matters for two reasons the mission cares about:

- **Speed for the shopper on a phone.** These requests compete with the ones
  the shopper did ask for (the new results) on a mobile connection.
- **Server load.** Our database pool is small (10 connections) and was
  already saturated once by robots (see the `/tires` slowness notes). Requests
  nobody asked for add to that queue and to the Vercel bill.

The links themselves stay: they are how shoppers jump from a card to "all
used tires" or "all tires in this size". What changes is how often the site
pre-loads them in the background.

## User stories

- As a **shopper filtering on `/tires` on my phone**, I want the new results to
  arrive without competing with background downloads, so that filtering feels
  quick.
- As the **owner**, I want the server to do work only for pages shoppers open
  (or are about to), so that the small database pool and the hosting bill go
  to real visits.
- As a **shopper who taps a size pill or a "Used" badge on a card**, I want
  that page to still open quickly, so that the change costs me nothing.

## Scope

- **In:**
  - Measure, on a production build, exactly which background pre-loads `/tires`
    makes on load and after a filter change, and from which links.
  - Stop the repeats on the card's four **secondary links**: the condition
    badge (`/tires/new` · `/tires/used`), the size pill (`/tires/size/{size}`),
    the brand link (`/tires/brands/{brand}`) and the set-offer link (the set's
    page). They pre-load only on intent.
  - The header menu's **"Used tires", "New tires" and "Shop by size"** (under
    "Shop Tires", desktop dropdown and phone menu) pre-load only on intent
    too: the T1 measurement showed they are what re-downloads `/tires/new` and
    `/tires/size` after every filter (re-scoped 2026-11-20).
  - The card's **main links** (photo and title → the tire's detail page) keep
    today's behavior; they are measured and listed in `results.md` only, so
    the main tap stays as fast as today.
  - The pages with the same card links (`/tires/used`, `/tires/new`, the size
    pages) get the same behavior, since they show the same cards.
  - The seller dashboard's browser-tab title says it is the dashboard, not
    the storefront (found in 058).
  - Mark 058 done in the roadmap.
  - *Added during the owner's check (2026-11-20):* the submenu child for the
    current page is highlighted (desktop and phone), and `/tires/used`'s cards
    take the same width as on `/tires` (they were narrower).
- **Out:**
  - Removing or changing any link, its text, look or destination.
  - Caching or query changes on the server side of those pages.
  - The dashboard's requests (done in 058).
  - The rest of the header menu (Services, Locations, About us, Guides…), the
    footer and the rail's "See all sizes" links: left as they are; measured
    and listed only.

## Functional requirements

- **FR1:** The card's four secondary links (condition badge, size pill, brand,
  set offer) and the header's "Used tires", "New tires" and "Shop by size" are
  pre-loaded **only
  when the shopper shows intent**: the pointer rests on the link, or a finger
  touches it. Appearing on screen, scrolling past, or a filter change pre-loads
  nothing.
- **FR2:** Opening a page from any card link (secondary or main) still
  works exactly as today, and is not noticeably slower than today.
- **FR3:** The number of background requests on `/tires` (load + one filter
  change) is recorded before and after in `results.md`, with the source link
  of each.
- **FR4:** A test fails if the card links go back to the behavior that
  produced the repeats.
- **FR5:** The seller dashboard's page title names the dashboard (e.g.
  "Dashboard | MrGoma"), and it stays out of search results as today.

## Acceptance criteria (testable)

- [ ] **AC1:** Given a production build, when a shopper opens `/tires` and
  then changes one filter, then the network log shows **no** background
  pre-load coming from a card's secondary links: `/tires/new`, `/tires/used`,
  any `/tires/size/{size}`, any `/tires/brands/{brand}` or any set page.
  And `/tires/new` and `/tires/size` are **not** downloaded again after the
  filter change (the header's links). Pre-loads of the detail pages (main
  links) and of other header/footer links are counted separately and do not
  fail this criterion.
- [ ] **AC2:** Given the same session, when the shopper changes filters three
  more times and scrolls the whole page, then still no pre-load from a
  card's secondary links or from those three header links appears.
- [ ] **AC3:** Given a card, when the pointer rests on its size pill (desktop)
  or a finger touches it (phone), then that one page is pre-loaded **once per
  hover / touch** — never repeatedly while the pointer stays on it, and no
  other card link is pre-loaded. Whether moving away and back pre-loads it
  again is measured and recorded in `results.md` (not part of the reported
  problem, which comes from filter changes).
- [ ] **AC4:** Given a card, when the shopper taps its size pill or condition
  badge, then the right page opens; tapping anywhere else on the card still
  opens the tire detail.
- [ ] **AC5:** Given `/tires/used`, `/tires/new` and a size page, when loaded
  and filtered, then they meet AC1–AC2 too (same cards).
- [ ] **AC6:** Tests cover the pre-load setting of the card's secondary links
  and of the three header links (desktop and phone menu) and fail if they
  regress.
- [ ] **AC7:** `results.md` has the before/after table (background requests on
  load and after one filter change, with the link each came from, header and
  footer included), measured the same way both times.
- [ ] **AC8:** Given a signed-in seller, when the dashboard opens, then the
  browser tab reads "Dashboard | MrGoma" (or the agreed wording), and the page
  is still `noindex`.
- [ ] **AC9:** Definition of Done: tsc, lint, tests, build, `perf:budget`,
  `npm run a11y` all green; no visual change on cards.

- [ ] **AC10:** Given a page that belongs to a submenu child (e.g.
  `/tires/used`, a size page, a store page), when the menu is open, then that
  child is highlighted and marked `aria-current`; "All tires" only on `/tires`.
- [ ] **AC11:** Given `/tires/used` on desktop, then its cards are as wide as on
  `/tires` (same results column).

## Non-functional / constraints

- **Mobile first:** measured at phone width as well as desktop.
- **No visual change:** links look and behave the same to the shopper.
- **SEO:** links stay real links (crawlable `<a href>`), nothing hidden from
  robots.
- **Analytics:** no GA4 event changes; no new personal data.
- **Security:** nothing new exposed; no change to what robots may crawl.

## Decisions (clarified 2026-11-20)

- **Card links pre-load on intent only** (hover / touch), not on sight and not
  after filters. Chosen over "once per visit" (still a request per visible
  size) and "never" (a slower jump).
- **Header and footer links unchanged**; measured and noted only.
  *Superseded 2026-11-20 after T1:* the repeats of `/tires/new` and
  `/tires/size` come from the header's "New tires" / "Shop by size" links, so
  "Used tires", "New tires" and "Shop by size" get intent-only pre-load too;
  the rest of the header and the footer stay as they are. Detail links stay
  unchanged (the owner chose not to slow the card's main tap).
- **Dashboard title fixed here** (small, found in 058).

## Assumptions

- Keyboard users who tab to a card link get no pre-load; the page loads when
  they press Enter, as for any normal link. Acceptable.
- A pre-load on intent that the shopper then does not follow is fine: one
  request for a page they were about to open.

---

_The WHAT and WHY only. The HOW lives in [plan.md](./plan.md)._
