# Roadmap — Mr. Goma Tires

> Project constitution · last updated: 2026-06-30
>
> **High-level** implementation order, in **very small work phases**. Each phase
> is deliverable on its own. Current priority:
> **1) Performance / Core Web Vitals → 2) Payments go-live (Stripe)**.

## How to read this roadmap

- Each phase is **small**: ideally one work session, a single goal.
- Each phase meets the **Definition of Done** in
  [tech-stack.md](./tech-stack.md) (tsc + lint + tests + build + verification)
  before it closes.
- One branch per phase (or per small group of phases). The user does the push.
- New work enters through the SDD flow: `/specify` creates the feature spec and
  branch under `spec/features/` (see [features/README](./features/README.md)).
- Phases within a track are ordered; **P1.0 baseline** gates the sequencing of
  the rest of Track 1.
- States: ⬜ pending · 🟡 in progress · ✅ done.

---

## Track 1 — Performance / Core Web Vitals (PRIORITY)

Goal: hit the Core Web Vitals targets (field, p75) —
**LCP < 2.5s · INP < 200ms · CLS < 0.1** — on the key routes (`/`, `/tires`,
detail).

**Exit criteria:** the three metrics meet target on all key routes and a
performance budget is in place (P1.8).

- ⬜ **P1.0 — Baseline.** Measure CWV (Lighthouse/PageSpeed + field data) on home,
  `/tires` and detail. Record LCP/INP/CLS and the top 3 offenders. _No code
  changes; produces the prioritized list._
- ⬜ **P1.1 — LCP image.** Identify the LCP image of each route and ensure
  `priority`/preload, correct `sizes`, and a modern format (webp/avif).
- ⬜ **P1.2 — Below-the-fold images.** Proper lazy-loading, reserved dimensions
  (no CLS), responsive `sizes` in the `/tires` grids.
- ⬜ **P1.3 — Fonts.** Verify `next/font` (Inter) with no CLS: `display: swap`,
  no flashes; subset if applicable.
- ⬜ **P1.4 — Structural CLS.** Reserve space for badges, carousels and media;
  avoid jumps on hydration.
- 🟡 **P1.5 — JS / bundle (`056-bundle-lcp-mobile` ✅ PR #217, 2026-11-19: tire page JS 578 → 272 KB; `057-split-barrels` ✅ PR #218, 2026-11-19: unused JS ~100 → 21 KB per page).** Audit heavy imports; confirm that 3D (three.js) and
  other non-critical chunks load deferred; trim the rest.
- ⬜ **P1.6 — INP / interactivity.** Reduce main-thread work; confirm the 3D
  canvases only run when active.
- 🟡 **P1.7 — Data / routes (`058-dashboard-requests-local-auth` ✅ PR #219, 2026-11-19: dashboard 13 → 5 requests on load; `059-tires-prefetch-repeats` ✅ PR #220, 2026-11-20: card and menu links pre-load on intent; after a filter 10 → 0 background requests; `060-intent-prefetch-site` ✅ PR #221, 2026-11-21: tire-page links, the menu and the footer pre-load on intent site-wide — 99 → 0 database reads from pre-loads across 8 pages, menu/footer 0 pre-loads; header-duplication guard; `061-tires-results-load-once` ✅ PR #222, 2026-11-22: every change on /tires loads its results once — no duplicate `/api/tires`, list dimmed while loading, view switch without a server render and keeping the page, set offers asked once).** Review caching/ISR where applicable and hot SQL
  queries that affect TTFB.
- ⬜ **P1.8 — Re-measure and budget.** Confirm CWV in the green and set a
  performance budget to prevent regressions.

## Track 2 — Payments go-live (Stripe)

Goal: move from WhatsApp orders to a **real Stripe checkout** in production,
safely and verifiably.

**Exit criteria:** a real payment completes in production and is verified — order
persisted (`SC_Order`/`SC_OrderDetail`), tire marked `sold`, and receipt shown.

- ⬜ **S2.0 — Pre-flight.** Checklist of Stripe account and keys (test + live),
  currency, taxes and env vars (`STRIPE_SECRET_KEY`, `ENABLE_STRIPE_CHECKOUT`,
  `NEXT_PUBLIC_ENABLE_STRIPE`, `NEXT_PUBLIC_STRIPE_CURRENCY`, `NEXT_PUBLIC_BASE_URL`).
- ⬜ **S2.1 — Checkout in test mode.** With test keys and `CHECKOUT_TEST_MODE=true`:
  validate `create-session`, redirect to Stripe and the confirmation page (no DB
  writes).
- ⬜ **S2.2 — Order persistence.** With test data, verify writes to
  `SC_Order`/`SC_OrderDetail` and the tire status update to `sold` (outside test
  mode).
- ⬜ **S2.3 — Edge cases.** Unavailable item (409), Stripe not configured (501),
  empty cart, amount/currency rounding.
- ⬜ **S2.4 — Confirmation and receipt.** Post-payment page:
  `GET /api/checkout/session`, `receipt_url`, email and a copyable reference.
- ⬜ **S2.5 — Switch default.** Make Stripe the default flow; keep WhatsApp as a
  fallback via flag.
- ✅ **Tires on Stripe Checkout (`048-stripe-line-items`).** Found on the
  production payment page (2026-11-13): broken images (the site's images get a
  firewall challenge; 72% of tires have no photo), internal-format names, and
  prices in the visitor's local currency. Readable names and descriptions, no
  broken image (a generic image on Vercel Blob), the firewall exception
  documented but not applied; Adaptive Pricing stays on. _Merged (PR #209,
  2026-11-13)._
- ⬜ **S2.6 — Live + smoke test.** Live keys on Vercel, a real end-to-end test,
  logging/monitoring of payment errors.

---

## Backlog (tracked, not prioritized yet)

To be resumed after the two tracks above; no fixed order yet.

- ✅ **Build your tire set (`041-tire-sets`).** Shoppers build a set of 2, 3 or
  4 compatible tires (same brand, model, size, run-flat; tread Δ ≤ 2/32"; same
  city) from the detail page and buy it in one go; pickup is restricted to the
  tires' city, closing a gap that also affects single tires. 70% of sellable
  units sit in groups of four or more. _Merged (PR #203, 2026-11-10); the public chat already adds a "Build your set" tip
  when a customer asks for a set (step 1, server-appended, tested). The city
  rule and the pickup restriction were lifted by 047._
- ❌ **Quote & receipt PDF + WhatsApp (`042`) — not approved (2026-11-10).** A PDF of the cart (pre-order,
  no stock hold) and of the paid order, shareable to Mr. Goma's WhatsApp from
  the cart and the confirmation page. Generated server-side (JS budget). Follows
  041 so sets are included.
- ✅ **Visitor city (`043-visitor-city`).** Approximate city (Miami/Orlando,
  within 60 miles of a store) from Vercel's IP geolocation headers, kept in the
  browser for one day; same HTML for everyone (no cloaking), no storage of the
  location, privacy-policy mention. Uses: "N like this in {city}" on tire pages
  and the nearest pickup store preselected. No visible city selector (D8).
  Shipped with the set builder panel and the step-by-step checkout. _Merged
  (PR #204, 2026-11-10)._
- ✅ **Sold and removed tire pages (`045-sold-tire-pages`).** Sold tire pages
  stay indexed but tell Google `SoldOut` (was a hard-coded `InStock`), link to
  the same tire in stock, and tires trashed without being sold are no longer
  published. Selling also trashes a record (all 19,387 sold rows), so the trash
  alone is not "removed". Sold tires show no price. _Merged (PR #205,
  2026-11-10)._
- ✅ **Tire sets in the AI chat (`044-chat-tire-sets`).** Step 2 after 041's chat tip: a
  `find_sets` tool for the public chat. Given a size (and optionally brand,
  condition or city) it returns 2–3 sets that can really be built — brand and
  model, city, total price, tread range — each linking to the tire page with
  the set block ready. Reuses 041's engine so the rules are identical; needs a
  new grouped count query per size, cached (the mssql pool of 10 has saturated
  before). The chat never adds to the cart (a wrong pick ends in a real
  payment); the shopper confirms on the page. Follows 041. _Merged (PR #206,
  2026-11-10)._
- ✅ **Catalog and search events in GA4 (`046-ga4-catalog-events`).** The
  consultant's review of 2026-11-11: `view_item_list`, `select_item`,
  `view_cart`, `remove_from_cart` and GA4's `search` are missing, and the
  home and catalog filters report counts and labels instead of the size,
  brand and condition searched. Builds on 040's item format. (The missing
  `items` they saw on `add_to_cart` / `begin_checkout` / `add_shipping_info`
  are production running pre-040 code — fixed by deploying 040.) _Merged
  (PR #207, 2026-11-11)._
- ✅ **Sets and pickup across Miami and Orlando (`047-sets-any-city`).** The
  owner approved sets (041/044) on 2026-11-13 with one change: location does
  not count for compatibility, and pickup is allowed at any store whatever the
  tires' city. Reverses 041's D1 and D5. Also a facts line and a hover card to
  compare tires in the cart. _Merged (PR #208, 2026-11-13)._
- **Lessons from a competitor (series 049–054).** From a 2026-11-18 walk-through
  of prioritytire.com, in this order. Every one covers modern-web-guidance,
  site security, SEO, phone width and GA4 events.
  - ✅ **Size picker and other sizes (`049-size-picker-other-sizes`).** Pick
    width → ratio → rim with buttons that only offer what is for sale (7 of 293
    sizes cannot be reached today); the tire page lists the same model's other
    sizes by rim (64% of tires have some). _Merged (PR #210, 2026-11-18)._
  - ✅ **Size index page (`050-size-index`).** A `/tires/size` hub: text search, popular
    sizes, sizes grouped by rim, linking to each size page. _Merged (PR #211,
    2026-11-18)._
  - ✅ **Compare up to 3 tires (`051-compare-tires`).** From the listing: tread, life,
    patch, DOT, price side by side. _Merged (PR #212, 2026-11-18)._
  - ✅ **Used-tire filters (`052-used-tire-filters`).** Minimum tread in 32nds, no
    patch, run-flat; used filters on `/tires/used`; out of the way for new tires.
    Also the dashboard size selects' text `> '70%'` rule. _Merged (PR #213,
    2026-11-18)._
  - ✅ **Google ratings (`053-google-ratings`).** Figures copied by hand from the 7 Business
    Profiles with their date (≈4.7 from 5,952 reviews on 2026-11-18): under
    the search on home and `/tires`, on the tire page and cart, and on each
    store page. No review stars in search results (Google's self-serving rule). _Merged (PR #214,
    2026-11-19)._
  - ✅ **Set total on listing cards (`054-set-total-on-cards`).** "Set of 4 from $X" where a set
    can be built. _Merged (PR #215, 2026-11-19)._

- ✅ **Accessibility and performance pass (`055-a11y-performance-pass`).** The
  052 site review's findings: contrast on dark pages, target sizes,
  label-in-name, duplicate id, heading order and 24 missing brand logos (WCAG
  2.1 AA); and, after a baseline (Track 1 P1.0), home TBT, late LCP images,
  the streamed meta description and the checkout layout shift. _Merged (PR #216, 2026-11-19)._

- ⬜ **Tailwind v4 config activation (bug).** `tailwind.config.ts` is ignored by
  Tailwind v4 (no `@config` directive), so its custom tokens are dormant **in
  production today**: `green-primary` (brand accent on focus rings/checkboxes),
  the `xs` (350px) breakpoint, and the `slide-in-right` cart animation. Activate
  them the v4 way (migrate to CSS `@theme` or add `@config`) and visually verify
  no regressions. Found during P1.3 (`006-fonts-cls`).
- 🟡 **GMC product feed (`011-gmc-product-feed`).** Token-protected XML feed at
  `/feed/google-merchant.xml` serving the online-sellable lot (reuses the
  `fetchTires` filter, no business-rule change) so Google Merchant Center reads an
  authoritative catalog instead of guessing via crawl. Owner registers the
  tokenized URL in the GMC admin. _In progress._
- 🟡 **Public-API security review (`012-public-api-hardening`).** Consistent
  defense-in-depth across the public API surface (`/api/tires`, `/api/tire`,
  `/api/brands`, `/api/ranges`, `/api/dimensions/*`, `/api/instant-quote`): generic
  error responses (no `err.message` leak), output field-whitelisting on `/api/tires`
  (drops internal columns), Zod coercion on numeric dimension params, and an
  instant-quote body-size cap — all with **zero contract change**. Follow-up to
  `011`. _In progress._
- ⬜ **SEO — phased plan.** 4 phases from the WJM audit; Phase 1 ready to
  implement.
- 🟡 **One way to describe a page (`021-page-metadata-og`).** The site describes
  itself twice over and the two descriptions disagree; which one a page gets
  depends on whether it happens to call a helper. `pageMetadata()` in `seo.ts`
  already gives a page an absolute title, its own canonical and its own `og:url` —
  **~400 pages use it, 15 do not** — and it emits no `og:image` and no
  `og:locale`, because a segment that declares `openGraph` in Next *replaces* the
  root's rather than merging. So the half that uses it has the right `og:url` and
  no preview image at all (every brand, size and store link still shares as bare
  text, the capability `019` unblocked the firewall for), while the half that does
  not keeps the image but claims the home page as its own `og:url` and prints the
  brand twice in the title — 30 of `/services/wheel-alignment`'s 88 characters are
  the brand repeated, pushing `Hunter HawkEye Elite®` to the edge of what Google
  shows. Also fixes two conversion pages the audit could not see: `/checkout`
  canonicalises to the site root (Screaming Frog never fetched it, `robots.txt`
  blocks the path) and `/instant-quote` has no metadata at all — it serves the
  root title and canonical **while sitting in the sitemap**, so we are asking
  Google to index a lead form that says it is the front page. Block 1 of the
  audit: nineteen tickets that are two edits to one helper plus a migration.
  Clarification pulled the audit's title and description copy in with it, and
  turned up two conflicts worth recording: T035 would have dropped the "30-Day
  Warranty" that `014` was built to put in the home title (resolved with a
  59-character synthesis that adds Orlando and keeps it), and the audit's
  "current" titles for three of the four guides do not match production — their
  real defect is length, 69–73 characters, not the duplication the audit named.
  **✅ Merged (#187) 2026-08-18.** The pre-change baseline is recorded in its
  results: **81.082 impressions and 1.454 clicks** across the affected pages, a
  1,79% aggregate CTR, with `/tires` at position **5,09** and a **0,51%** CTR —
  ranking fine and earning nothing. The 28-day comparison is due, and is the first
  real test of whether metadata is what costs these clicks.
- 🟡 **Crawl hygiene (`020-crawl-hygiene`).** A full Screaming Frog crawl on
  2026-08-18 found 2.106 real pages and **37.296 URLs that are not pages** — the
  `?_rsc=` addresses Next.js mints every time it prefetches a hovered link. The
  home page has generated 7.657 copies of itself and `/legal-policies` 5.923, all
  answering `200` with no instruction not to index them, so Google spends its
  visit on copies instead of on the catalog that changes daily. Same shape twice
  more: `/tires` filter URLs declare themselves canonical while carrying `/tires`'
  own title (47 variants, and the rule is self-contradictory — `?condition=new`
  points at `/tires`, `?d=20` points at itself), and five store URLs renamed after
  the May migration still rank in positions 3–4 while returning `404`. Four of the
  five have a confirmed destination and are redirected here; `miami-north-441`
  does not and stays a `404` until the owner says which store it was. Verifying
  the audit turned up a fourth leak it never saw and the worst of them:
  `/tires/size/` **fabricates a page for any three-part slug**, so
  `/tires/size/foo-bar-baz` answers `200` with an indexable title and a canonical
  pointing at itself — an unbounded URL space anyone can add to. Also unifies the
  two spellings of the site's own root: `absUrl('/')` returns the slashed form,
  which Next strips on the way to the canonical but not on the way into JSON-LD,
  so eight templates emit a `BreadcrumbList` "Home" of `…com/` while the canonical,
  `og:url`, sitemap and `Organization.url` all say `…com`. Block 0 of the
  audit: the only near-subtractive one — nothing a visitor sees changes except
  the invented pages, which stop existing — so it ships ahead of the metadata,
  content and URL-architecture blocks that do change what people see. Two audit
  items are deliberately dropped with the reasoning recorded: the `noindex` header
  on `?_rsc=` (inert behind a `robots.txt` block, and the canonical already
  handles indexation) and `Disallow: /_next/image` (would remove the catalog from
  Google Images to treat an inventory problem). **✅ Merged (#186) and deployed
  2026-08-18.** Post-deploy verified: both prefetch rules live, fabricated size
  slugs 404, eight real sizes sampled across the sitemap all 200. `AC12` was
  corrected — one hop from `www`, two from the apex, the extra one being Vercel's
  own domain redirect, served before any application code runs.
- 🟡 **SERP differentiators (`014-serp-differentiators`).** We rank for
  "tires miami" but the snippet says nothing a competitor couldn't. Puts the
  owner's real differentiators (30-day warranty, 15,000+ across 7 locations,
  free shipping) into the page above the fold and into the metadata, fixes the
  seven store entities that all pointed at the site root, and routes every
  JSON-LD node through one emitter. Code complete and verified; **merge is gated
  on capturing the Search Console baseline** — once the new titles are live the
  "before" numbers are gone. _In progress._
- 🟡 **Vercel event tracking (`015-vercel-event-tracking`).** The funnel we steer
  by is visible only in GA4, which ad-blockers silence and the cookie banner
  gates, so we cannot tell how partial our own numbers are. Fans the existing
  `data-track` events out to Vercel Web Analytics as a second, cookie-free
  reading (GA4 unchanged), fixes `place_order` and `quote_submit` — which today
  count a button press rather than a completed order or an accepted quote — and
  adds a server-side purchase event that no ad-blocker can suppress. Privacy
  policy and banner updated to name both tools. _Spec drafted._
- 🟡 **Consent withdrawal (`016-consent-withdrawal`).** The cookie banner is a
  one-way switch: accepting binds the visitor for a year and no control anywhere
  undoes it. The code has admitted the gap for months ("reversible via settings
  page if added later" — that page was never added). It matters now because
  `015` rewrote the privacy policy to state that Google Analytics runs only after
  acceptance; claiming that while offering no exit undercuts the transparency the
  mission puts first. **Cookie Preferences** in the footer reopens the same
  banner, so withdrawing costs the same two clicks as consenting. Withdrawal
  genuinely revokes — verified in production, where both real `_ga` cookies were
  removed — and closes a latent bug that kept events flowing to Google after a
  withdrawal, because unmounting a component cannot unload a script that has
  already run. Escape now dismisses the banner from anywhere, which it never
  did. _Complete; awaiting merge._
- 🟡 **Seven stores that read like one (`022-store-pages`).** Block 2 of the
  Screaming Frog audit, and the block with the largest number attached to it — and
  the largest caveat. The seven store pages drew **20.376 impressions in the top
  four positions and fifty clicks** in three months (0,25% CTR); Miami Airport was
  shown 2.757 times and clicked **zero**, and Orlando West Colonial does not
  appear in Search Console at all. Their seven meta descriptions are one template
  differing by a name, their seven `<h1>`s are the name of a suburb, no title says
  "used tires" while `used tires near me` is the site's biggest non-brand query,
  and East Orlando tells people it is near Orlando **International** when it is
  beside Orlando **Executive**, 20 km away. The audit projects +30% of site
  traffic from fixing the copy; the query data disagrees — `mr goma tires us1`
  sits at position **1.1** with a **0,78%** CTR, which no title can explain and
  the local pack can. So this ships as a fix *and* a measurement: the airport
  error and the templating are worth correcting regardless, and a flat CTR at 28
  days is the finding that sends the next effort to `017` (Google Business
  Profile) instead of more copy. **✅ Merged (#188) 2026-08-18.** The pre-change
  baseline is in its spec. Two manual steps remain: URL Inspection on
  `/locations/orlando-west-colonial`, which has never appeared in Search Console
  and may be unindexed as a duplicate of the other six, and the 28-day comparison
  — where **a flat CTR is the finding**, not a failure.
- 🟡 **Headings that read as words (`023-heading-text`).** Block 3. The largest
  text on most pages of this site is two words jammed together — `MICHELINTires`,
  `235/50/20Tires in Miami`, `AboutMrGomaTires` — because the headings break
  across two lines with a `<br />`, and a `<br />` is a line break, **not
  whitespace**. It looks right and reads as one run-on token to Google, to a
  screen reader, and to anyone who copies it. The audit counted thirteen pages;
  it is **eleven templates covering ~400**, including all 272 size pages and all
  113 brand pages — the routes `020` fought to keep indexed and `021` gave preview
  cards to. The fix is already written: `022` hit this building the store headings
  and replaced the `<br />` with a `block` span and a real space. Also folds in
  three neighbours: the guides list marks section names and card names both as
  `<h2>` (T092), the mobile menu carries a Spanish `aria-label` on an
  English-declared site (T098), and one guide has three different names because
  the config field called `title` drives the heading while the one called
  `headline` drives the cards (T100). _Implemented; awaiting manual verification._
- 🟡 **Telling Google what these pages are (`024-structured-data`).** Block 4.
  Five of the site's most important pages — the home, `/tires`, `/guides`,
  `/about-us` and `/contact` — declare **only** the `Organization` and `WebSite`
  the root layout gives every page, which means none of them says anything about
  itself: the catalog does not say it is a catalog, and the home page shows seven
  stores and declares none. A store page and a guide already do this properly, so
  the pattern exists and simply is not applied. What the site does declare, it
  declares badly: `Organization.logo` is a **32×32 favicon** while a 512×512 asset
  sits unused, and every guide's `publisher` inlines a second, worse copy of the
  organisation instead of referencing the `@id` the site mints for exactly that —
  the same duplication shape as the WhatsApp number, the founding year and the
  airport. Three tickets are closed rather than built: T009 was fixed on 18 Aug,
  and **T014 is not applicable** — `SearchAction` needs a free-text query
  parameter and this site has none, only structured filters. T011 and T013 stay
  blocked on the owner. Worth stating plainly: structured data does not raise
  rankings, it changes how a result renders — which is the right lever here, since
  `021` and `022` measured a site that ranks well and is not chosen.
  _Implemented; awaiting the Rich Results check after deploy._
- 🟡 **Titles that fit in a search result (`025-tire-detail-titles`).** Found while
  analysing `021`, and not in the Screaming Frog audit, whose title tickets stop at
  section pages. `productTitle()` builds a title that reaches **100 characters** in
  production —
  `Used BRIDGESTONE ALENZA A/S 02 RSC RFT 235/50/20 Tire in Miami | $135 | Free Shipping | MrGoma Tires`
  — so Google shows `…Tire in Mia…` and **the price and "Free Shipping" never
  appear**, which are the two differentiators `014` added to that builder
  specifically to lift CTR. Measured over 1.400 real units, **100% of titles
  exceed 60 characters** (median 96) and **not one** keeps its price inside the
  visible portion. The route also still returns a plain `title` string, so the
  root template appends the brand a second time — the `021` defect surviving on
  the one route `021` did not convert. It affects **1.622 pages**, more than
  everything in `021` combined, and was kept out of `021` on purpose: that many
  titles deserve their own Search Console baseline, and folding them in would make
  the effect of `021`'s fifteen unattributable. This is path "C" of block 5 — it
  changes what searchers see without touching a single URL.
- ⬜ **TireCard redesign.** UX/UI improvements for the `/tires` cards (analysis
  done).
- ⬜ **Filters that say how much is behind them (`030-tires-filter-rail`).** On
  `/tires` the filters never say what is behind them: of the 1.610 brand × rim
  combinations the page offers, **only 338 have stock**, so four clicks in five
  land on "No Tires Found" with all 114 brand chips still on screen and nothing
  saying which would have worked. The rim list is hardcoded, so it offers 14"
  (one tire) and hides 23", 24", 26" and 19.5" — **102 tires in stock that no
  buyer can reach**. Moves every filter into a left rail that travels with the
  results, gives each option its live count, adds the brand search the 115-chip
  carousel needs, and drops the duplicate chip rows. The room comes from the
  **448 px the layout already wastes** — the results list is capped at 768 px and
  centred in a 1216 px container — so the rows end up wider, not narrower. Also
  clears **254 links carrying `aria-pressed`**, a WCAG 2.1 AA violation eight
  times the size of the one fixed in the sister project. Grounded in
  `spec/analysis/2026-08-25-tires-filter-rail.md`.
- 🟡 **AI chat: search on what was said (`018-ai-chat-filters-and-surface`).**
  Ask the assistant for Michelin and it shows nothing: it demands a tire size
  first, even though it can already filter by brand, rim, condition and price.
  The home page filters by brand in two clicks, so the feature built to reduce
  friction is the one place with more of it. Unblocks partial filters, makes
  "cheapest first" expressible, and — because otherwise we could not tell whether
  any of it worked — separates public from `/dashboard` activity in the events
  (today both surfaces emit identical ones) and finally counts the moment filters
  are actually applied, which nothing records. _Implemented; awaiting manual verification._
- 🟡 **Ask about this tire on WhatsApp (`019-whatsapp-tire-enquiry`).** The detail
  page offers one way forward — Add to cart — and nothing smaller for the buyer
  who is nearly convinced but still has a question. WhatsApp is already this
  business's primary contact channel everywhere except the page where the
  customer is actually looking at a product. Adds a one-tap enquiry carrying the
  stock number, size, real condition and displayed price, plus the canonical link
  — which makes WhatsApp render the tire's photo as a preview card from the Open
  Graph metadata we have published since `003` and never used. Also collapses the
  WhatsApp number's eleven hand-written copies into one source of truth, the same
  fix `018` applied to store hours. **Depends on a Vercel firewall rule**: Bot
  Protection currently answers `facebookexternalhit` with `429`, so every link
  from this site shared on WhatsApp or Facebook arrives today as bare text.
  The firewall rule was published on 2026-08-17 and verified: preview crawlers
  now get `200` while ordinary non-browser clients still get `429`.
  _Implemented; awaiting the Rich Results check after deploy._
- 🟡 **Every deploy is built from scratch (`062-turbopack-build-cache-off`).**
  On 2026-11-22 the production deploy of 049–061 reused the previous release's
  build cache and shipped the new JavaScript with the old `globals.css`: the
  comparison window went out unstyled and every check was green. Turbopack's
  build cache (on by default since Next 16.3) is now off, held by a guard test,
  and `tech-stack.md` has a post-deploy check. Shipped JS/CSS unchanged.
  _Implemented; awaiting the first deploy and its post-deploy check._
- ⬜ **Document Stakeholders/Requirements** if formal sources appear.

## Recently delivered (context)

_As this list grows it will move to a dedicated CHANGELOG._

- ✅ Brand/Condition/Price filters in the home hero.
- ✅ Magnifier/zoom on detail photos (desktop + mobile).
- ✅ Discovery cue for the home 3D selector.
- ✅ Tread & wear 3D model with a curved surface (tire section).

---

_Sibling documents: [mission.md](./mission.md) · [tech-stack.md](./tech-stack.md)_
