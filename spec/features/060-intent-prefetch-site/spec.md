# Spec — Pages load in the background only when the shopper is about to open them

> Feature: `060-intent-prefetch-site` · Status: Clarified · Created: 2026-11-21
> Roadmap: P1.7 (Data / routes) · Branch: `feat/060-intent-prefetch-site`

## Why — problem & value

059 made the catalog's secondary card links and three menu links pre-load
their page only when the shopper shows intent (pointer on the link, finger on
it). An analysis of the whole site afterwards (2026-11-21, a production build
measured link by link, plus production traffic from Vercel, 9–21 Nov) found
two more places where background pre-loads cost something and are almost
never used:

1. **Links to a tire's page.** Every tire link that comes into view pre-loads
   that tire's page, and **each of those pre-loads is a database query** (seen
   directly: one pre-load, one `fetchTireById`). Scrolling `/tires` fired 20 at
   once against a pool of 10 connections; a size page 5; a tire page 2 more.
   In production, people triggered ~11,200 such requests against ~1,860 tire
   page views: **~800 database queries a day for pages nobody opened**, in
   bursts that compete with the shopper's own next click. The pre-load only
   brings the tire page's loading screen — the page itself is always fetched
   from the server on the click — so keeping it buys little.
2. **The desktop menu's dropdowns and the footer.** The dropdowns are laid out
   invisibly on every page, so their links (the 7 stores, and the rest) are
   pre-loaded on every desktop page view: about **119 KB and ~30 requests per
   page**, on top of the footer's when it scrolls into view. In production,
   `/about-us` got 4,954 such requests for 21 visits, a store page 20,957 for
   232, `/guides` 4,785 for 12. These pages come from Vercel's cache (no
   database), so this is the visitor's data and our edge requests, not server
   load.

Mission fit: speed and a server that works for real visits (P1.7), with no
change a shopper can see. Search engines are unaffected: they don't pre-load,
and the links stay ordinary links.

## User stories

- As a **shopper scrolling a list of tires on my phone**, I want the site not
  to fetch every tire's page in the background, so that the page I do tap
  isn't queued behind twenty I didn't.
- As the **owner**, I want the database to work for the tires people open, not
  for every tire that scrolls past, so that the small connection pool keeps
  up when traffic rises.
- As a **desktop shopper**, I want the menu and footer not to download a dozen
  pages I never open on every page I visit.
- As a **shopper who does click a tire, a store or a menu item**, I want it to
  open as quickly as it does today, or close to it.

## Scope

- **In (point 1):** every link to a tire's page pre-loads only on intent:
  - the tire cards on every listing (photo and title) — `/tires`, used, new,
    size and brand pages;
  - the table view of results;
  - "other sizes" and the alternatives offered for a sold tire on a tire page;
  - the compare dialog;
  - the cart (the panel and the checkout page's item links).
- **In (point 2):**
  - every link inside the desktop menu's dropdowns (Shop Tires and Locations,
    including "View all locations") and the phone menu's submenus;
  - every link in the footer;
  - the menu's **visible top-level items** on desktop (Shop Tires, Services,
    Locations, About us, Guides, Contact us) and the phone menu's top-level
    items.
- **In:** a before/after measurement with the same method as 059, and the
  production numbers above as the baseline to compare against after release.
- **Out:**
  - links with a high chance of being clicked keep today's behavior: the
    logo, the home page's main buttons, "View all … tires", pagination, the
    cart's "Checkout" button, the filter rail;
  - any change to what a link looks like, says, or where it goes;
  - server-side caching of tire pages, and bot traffic (separate topics);
  - the sellers' dashboard;
  - the set builder's links to the other tires of a set: plain links that open
    a new tab, which Next never pre-loads — nothing to change.

## Functional requirements

- **FR1:** A link to a tire's page, anywhere in scope, pre-loads that page only
  when the pointer rests on it or a finger touches it — never because it
  scrolled into view or because the list changed.
- **FR2:** The same for every menu link (top-level items, dropdowns and
  submenus, desktop and phone) except the logo, and for every footer link.
- **FR3:** Every affected link still opens the same page, looks the same and
  remains an ordinary, crawlable link; the card still opens the tire page when
  tapped anywhere outside its secondary links.
- **FR4:** Analytics are unchanged: the events fired when a tire is opened
  from a list (`select_item`, with its list and position) still fire.
- **FR5:** Tests fail if any in-scope link goes back to pre-loading on sight.
- **FR6:** The change does not make any page download more JavaScript. 059
  showed the menu can end up loaded twice when it shares code with the cards
  (+12 KB, which the current budget let through). Two guards:
  - the shopper-page JavaScript limit is lowered close to today's size, so
    a growth of that order fails the build check;
  - a check fails when the same component ships in two different chunks of
    one shopper page.
- **FR7:** After the release that contains this feature, production is compared
  with the baseline above (Vercel, human traffic: tire-page data requests vs
  tire page views, and requests to the static pages vs their visits) 1–2 weeks
  after the deploy, and the result is written into `results.md`.

## Acceptance criteria (testable)

- [ ] **AC1:** Given a production build, when a shopper opens `/tires` and
  scrolls the whole list, then **no** tire page is pre-loaded and the database
  receives no `fetchTireById` for tires that were only seen (measured with a
  temporary probe, as in the analysis; before: 20).
- [ ] **AC2:** Given a size page, a brand page, `/tires/used` and `/tires/new`,
  when loaded and scrolled, then no tire page is pre-loaded.
- [ ] **AC3:** Given a tire page, when loaded and scrolled, then the "other
  sizes", sold-tire alternatives and set links pre-load nothing (before: 2
  tire pages).
- [ ] **AC4:** Given any tire link in scope, when the pointer rests on it (or a
  finger touches it), then that one tire page is pre-loaded once.
- [ ] **AC5:** Given a desktop page (e.g. a store page), when loaded and
  scrolled, then nothing is pre-loaded from the menu (except the logo's home
  page) or the footer (before: ~30 requests / 119 KB from the menu on a store
  page). Links in the page body that point to the same pages keep their own
  behavior and are counted apart.
- [ ] **AC6:** Given any affected link, when clicked or tapped, then the right
  page opens; a card tapped outside its secondary links opens the tire page;
  `select_item` still fires with its list and position.
- [ ] **AC7:** Tests cover the pre-load setting of every in-scope link group
  (cards, table, other sizes, alternatives, compare, cart, checkout,
  menus, footer) and fail if one regresses.
- [ ] **AC8:** The shopper-page JavaScript does not grow beyond today's
  (`perf:budget`); the lowered limit fails on a +12 KB growth like 059's; the
  duplicate-component check fails on a page that ships the menu twice (shown
  once on purpose, then reverted).
- [ ] **AC9:** `results.md` has the before/after table for `/tires`, a size
  page, a tire page, the home page and a store page: requests, KB and database
  queries caused by pre-loads, measured the same way both times.
- [ ] **AC10:** `results.md` records the production baseline (9–21 Nov) and a
  dated follow-up to compare 1–2 weeks after the deploy (FR7); the follow-up
  itself happens after release.
- [ ] **AC11:** Definition of Done: tsc, lint, tests, build, `perf:budget`,
  `npm run a11y` all green; no visual change except the 404's (AC12).
- [ ] **AC12:** Given an unknown URL, when the 404 page shows, then it has the
  same header as every other page (sticky, no `TopHeader` bar), and the
  menu's code ships in one chunk (the duplicate check passes).

## Non-functional / constraints

- **Mobile first:** phones have no hover; pre-load starts on touch.
- **No visual change**, no copy change — with one exception: the root 404 page
  gets the site's standard header (see Decisions).
- **SEO:** links stay `<a href>`; nothing hidden from crawlers; no change to
  robots or sitemaps.
- **Analytics:** no GA4 event changes; no personal data.
- **Security:** nothing new exposed.
- **Performance budget:** shopper pages must not get heavier (FR6).

## Decisions (clarified 2026-11-21)

- **The menu's visible top-level items pre-load on intent too** (desktop and
  phone), not only their dropdowns. They are static pages from Vercel's cache,
  so a hover-started load opens them about as fast; the logo keeps today's
  behavior.
- **Both guards for FR6**: a lower shopper-page JS limit and a duplicate-
  component check.
- **Production follow-up** 1–2 weeks after the deploy, against the 9–21 Nov
  baseline.
- **The root 404 uses the site's standard header** (`/plan`, accepted at
  `/tasks`): it imported the header directly, a second entry point that made
  the build ship the menu twice once the menu shared a component with the
  cards. With the standard header the 404 loses the `TopHeader` bar and its
  header becomes sticky — what every other page already shows.

## Assumptions

- Keyboard users get no pre-load (the page loads on Enter, as for any link).
- A shopper who rests the pointer on several tires while moving across a list
  pre-loads those few; each only once per hover.

---

_The WHAT and WHY only. The HOW lives in [plan.md](./plan.md)._
