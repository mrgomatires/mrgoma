# Tech Stack — Mr. Goma Tires

> Project constitution · last updated: 2026-06-30
>
> This document fixes the **canonical** stack, the **conventions/structure**, and
> the **testing and quality** standards. It is the source of truth: stack changes
> are discussed and reflected here before being adopted.

## 1. Canonical stack

Versions taken from `package.json` (2026-06-30). Update here when they change.

### Core

- **Next.js 16.1.5** — App Router, Server Components, Turbopack.
- **React 19.2** + **React DOM 19.2**.
- **TypeScript 5.9** — strict mode; no `any` unless justified.
- **Tailwind CSS v4** (`tailwindcss` 4.1) via `@tailwindcss/postcss` and
  `@import "tailwindcss"`; design tokens live in CSS `@theme` in `globals.css`
  (there is no `tailwind.config.ts` — v4 has no JS-config auto-load — and no v3
  plugins).

### Data and backend

- **SQL Server** via **`mssql` 12** (repository pattern in `src/repositories/`).
- **NextAuth v5 (beta)** — credentials provider against `/api/login`.
- **Winston 3** — structured logging (`src/utils/logger.ts`), `LOG_LEVEL`.
- **Zod 4** — schema validation.

### Product / features

- **Stripe 20** — checkout (with a temporary fallback to WhatsApp orders).
  What Stripe's page shows per tire (name, description, image) comes from
  `stripeProduct()` (`src/app/api/_lib/stripeProduct.ts`, feature 048): the
  cart's title, a facts description, and never an image on the site's own
  host (the firewall answers Stripe with a 429 challenge); tires without a
  photo use `CHECKOUT_FALLBACK_IMAGE_URL` (generic PNG on Vercel Blob) or no
  image. The WhatsApp order message keeps the internal composed name.
- **@anthropic-ai/sdk** — dashboard AI chat (model `claude-haiku-4-5`).
- **Three.js 0.185** + **@react-three/fiber 9** + **@react-three/drei 10** — 3D
  visualizations (home size selector, tread & wear on the detail page).
- **react-hook-form 7** + **@hookform/resolvers** — forms.
- **@tanstack/react-table 8** — dashboard tables.

### Platform / analytics

- **Vercel** — hosting and deployment.
- **Google Analytics 4** (consent-gated) + **@vercel/analytics**.

## 2. Conventions and structure

### Folder layout (`src/`)

- `app/(shop)/` — store routes (home, `tires`, `detail`, `dashboard`,
  `checkout`, `services`, `guides`).
- `app/api/` — route handlers (tire, tires, brands, ranges, checkout, login,
  dashboard/_, `_/ai-chat`).
- `app/ui/components/` — reusable components (one per folder).
- `app/ui/sections/` — composed page sections.
- `app/ui/icons/` — icons.
- `app/hooks/`, `app/context/`, `app/utils/`, `app/interfaces/` — hooks, context,
  utilities and domain types for the app.
- `repositories/` — data access (SQL Server).
- `utils/` — cross-cutting utilities (e.g. `logger`).

### Naming and style

- Components in **PascalCase**, one component per folder with a same-named file.
- Hooks as `useX`, utilities in camelCase.
- Client Components marked with `'use client'` only when needed.
- **Reuse before creating**: existing endpoints (`/api/brands`, `/api/ranges`),
  components (`Dialog`, `RangeSlider`) and param names.
- Styling with Tailwind v4 (use `shrink-0`, not `flex-shrink-0`). Brand green:
  `green-600` / `hover:green-700`.

### Platform conventions

- Sensitive env vars **without** the `NEXT_PUBLIC_` prefix (server-only). Only
  non-sensitive/UI values carry `NEXT_PUBLIC_`.
- `NEXTAUTH_URL` must point to the production URL on Vercel.
- Remote image handling via `next/image` (the magnifier uses the original URL).
- **English-only UI** (US market) — no i18n layer yet.

### API & error conventions

- Route handlers live in `app/api/*` and return JSON with a correct HTTP status.
  Established contracts: **409** when a cart item is unavailable, **501** when a
  payment provider isn't configured, **200** with a sanitized payload for reads.
- Validate external input at the boundary with **Zod**.

### Data access & security

- All SQL goes through `src/repositories/` using **parameterized `mssql`
  queries** — never concatenate user input into SQL.
- Secrets stay server-only (no `NEXT_PUBLIC_`); the client receives only
  non-sensitive UI values. Auth via NextAuth v5.
- **Sizes a shopper can pick come from the catalog's own list** (049):
  `GET /api/dimensions/stocked` serves `getCachedStockedSizes()` (the sellable
  rule, 5 min, edge-cached) and the picker derives width → ratio → rim from it
  (`sizeTree.ts`). Values are the parts of `RealSize` verbatim — `/tires`
  matches a complete size as the exact string `w/s/d`. The three
  `/api/dimensions/{heights,widths,sizes}` routes remain for the dashboard only.
- **The size index `/tires/size`** (050) is static, regenerated every five
  minutes from `getCachedSizeCounts()` (same sellable rule as `fetchSizes()`),
  and its search box matches against the list the page passes in — no API.
- **Listing tires carry `DOT`, `loadIndex`, `speedIndex`** (051) — public
  facts printed on the tire and shown on every tire page. Every listing path
  goes through `pickTireListFields` (the server pages too, since 051), so the
  city is derived from `VaultName` on the server and the warehouse name never
  leaves. `GET /api/tires/compare?ids=` (1–3 numeric ids, Zod) answers only
  `id`, `available`, `price`, `no-store`.
- **Set offers on listing cards** (054): `GET /api/tires/sets?ids=` (1–24
  numeric ids, Zod) answers, per id, the cheapest set of 4 *that includes that
  tire*, else of 2 — `{ size, total, ids }` only — from the tire page's own
  mapper, set group and candidates cache (`getCachedSetCandidates`), so a card
  never prices a set the builder cannot open. `public, s-maxage=60`. Asked for
  after the cards paint (`useSetOffers`); the card links to the builder through
  `setHref` (the chat's `?set=` writer). One set rule: `tireSets.ts`
  (`cheapestSetWith`, `cardSetOffer`); `setOffer.guard.test.ts`.
- **Google ratings** (053) are typed by hand into `locationsConfig.ts`
  (`google: { rating, reviews, readOn }` per store, from each store's Maps
  profile) — never pulled from the Business Profile API, whose content may not
  be stored over 30 days. Everything shown is derived in `googleRatings.ts`
  (weighted mean, total, "Rated 4.7 out of 5 from …", the read month in UTC).
  `GoogleRating` renders it; **no rating structured data** anywhere (Google's
  self-serving rule; `googleRatings.guard.test.ts`). **To update:** re-read the
  seven profiles on Maps, edit the figures and set `readOn` to that day. The
  same guard **fails `npm test` 90 days after the newest `readOn`** (D7) — a
  reminder, not a bug; the site keeps showing the figures meanwhile.
- **Used filters mean used tires** (052): tread (`minTreadDepth`, steps
  6–9/32"+), remaining life and patched. Links that apply one also write
  `condition=used`; a condition change keeps them only if the next set is
  exactly `used` (`usedFilters.ts`). The storefront (`/tires`, `/api/tires`,
  `fetchTiresServer`, `/tires/used`) reads URLs through
  `normalizeUsedFilters`; `buildTireFilters` stays raw because the seller
  dashboard uses it too. Their facet counts cover used tires only. The
  dashboard size selects use `STOREFRONT_SELLABLE_WHERE`; remaining life is
  never compared as text (`sellableRule.guard`). `/tires/used` filters in
  place (dynamic; the plain URL from `getCachedUsedLanding`, 5 min) and its
  filtered URLs are disallowed in `robots.txt` like `/tires`'.

### Analytics & tracking

- Instrument user actions **declaratively** with `data-track` (+
  `data-track-category` / `-label` / `-value`) attributes. One delegated listener
  (`InteractionTracker`) routes every one of them through `trackEvent`, which
  reports to **both** platforms. Add them to new interactive elements; there is
  no per-platform wiring to remember.
- **Two sinks, on purpose.** GA4 is the primary source of truth but is
  consent-gated and ad-blockable — measured at roughly **one visitor in five** in
  August 2026. **Vercel Web Analytics** is first-party and cookie-free, so it
  runs ungated and gives a fuller second count. Never gate it behind the banner:
  that would reproduce GA4's partial sample and the second reading would tell us
  nothing.
- **Never put personal data in an event name or property** — no email, phone,
  name, address, payment id, or anything traceable to one customer. Values are
  sent verbatim to two third parties.
- Name events for **what actually happened**, not for the click that might cause
  it. A conversion fires on the server's acceptance, not on a button press —
  `place_order` and `quote_submit` were retired on 2026-08-04 for exactly that
  sin, and `retiredEvents.guard.test.ts` stops them coming back. Prefer GA4's
  recommended ecommerce names, which GA recognises as conversions unconfigured.
- **Ecommerce events do not use `data-track`.** `view_item`, `add_to_cart`,
  `begin_checkout`, `add_shipping_info`, `add_payment_info` and `purchase`
  carry an `items` array that markup cannot hold, and GA4's ecommerce reports
  ignore them without it. They go through `trackEcommerce()` with a payload
  built by `src/app/utils/ecommerce.ts` — the one place a tire becomes a GA4
  item. GA4 gets the full payload; Vercel a flat summary. Events raised before
  gtag has loaded are held and replayed on `ga:ready`, never dropped; local and
  preview runs go to GA4 in `debug_mode`. See
  `spec/features/040-ga4-ecommerce/`.
- **Lists, cart and search (feature 046).** Listings report
  `view_item_list` / `select_item` through `TireCard`'s `list` prop (ids in
  `LISTS`, `ecommerce.ts`); `view_cart` fires when the cart drawer opens and
  `remove_from_cart` only at the shopper's own remove controls (never in
  `CartContext`, which also drops sold tires); GA4 `search` is sent once where
  every size search lands (`useSearchEvent` on `/tires`), keyed on the size
  only. Filters carry `filter_group` / `filter_value` and `tire_brand` /
  `tire_condition` as `data-track-*`. See `spec/features/046-ga4-catalog-events/`.
- **Size picker and other sizes (feature 049).** `size_picker_select`
  (`step` width/ratio/rim, `label` value, `surface` home/tires/3d) on each
  option button, `size_picker_complete` (`label` `w/s/d`, `surface`) via
  `trackEvent` when the rim completes a size, `other_size_select` (`label`
  target size, `from`, `tire_id`) on each "Other sizes" link, and
  `other_sizes_open` (`label` rim) only when a rim group **opens** (a `toggle`
  listener: a `summary` click cannot tell open from close). GA4 `search` is
  unchanged. See `spec/features/049-size-picker-other-sizes/`.
- **Size index (feature 050).** `size_index_search` (`result` found /
  not_found; `label` = the size, which the shared field only lets be digits),
  `size_index_select` (`source` popular / list / closest,
  `label` size) and `see_all_sizes` (`surface` home / tires_form / rail). See
  `spec/features/050-size-index/`.
- **Compare (feature 051).** `compare_add` / `compare_remove` (`tire_id`,
  `count` after), `compare_limit` (a fourth refused), `compare_open` (`count`,
  `same_size`) via `trackEvent`; `compare_view_tire` as `data-track`; adding to
  the cart from the comparison sends the card's own `add_to_cart`
  (`useAddTireToCart`). See `spec/features/051-compare-tires/`.
- **Set offers (feature 054).** `set_offer_select` (`data-track`, category
  `sets`) with `set_size`, `list`, `tire_id`. See
  `spec/features/054-set-total-on-cards/`.
- **Google ratings (feature 053).** `google_rating_click` (the combined chip
  → `/locations`; `surface` home / tires / tire_page) and
  `google_reviews_open` (a store's Google profile, new tab; `surface`
  store_page / locations, `store` slug), both as `data-track`, category
  `reviews`. The cart and checkout show the rating as text: no event. See
  `spec/features/053-google-ratings/`.
- **Used-tire filters (feature 052).** No new events: the tread steps report
  `filter_apply` with `filter_group` `tread` and `filter_value` the step; the
  quick chips ("Not patched", "Run-flat", "8/32"+") send the same
  `filter_apply` with `surface` `quick_chips`. See
  `spec/features/052-used-tire-filters/`.
- **Tire sets (feature 041).** The rules live in one pure module,
  `src/app/utils/tireSets.ts` (compatible = same brand, model, size, run-flat
  and condition class; tread Δ ≤ 2/32"; **any city** — the city only breaks
  ties, since 047). A set in the cart is just lines sharing a `setId` — the
  cart stays a flat list of unique tires. Pickup is at any store whatever the
  tires' city (047); each tire still shows its city (`CityTag`). See
  `spec/features/041-tire-sets/` and `spec/features/047-sets-any-city/`.
- **Visitor city (feature 043).** The visitor's approximate city (Miami,
  Orlando or none — within 60 miles of a store) comes from
  `GET /api/visitor-city`, the **only** code that reads Vercel's
  `x-vercel-ip-*` headers (guard: `visitorCity.guard.test.ts`). Pages never
  vary by location: the city is applied in the browser after load through
  `VisitorCityProvider` / `useVisitorCity()` (lazy — nothing is fetched until a
  component asks). The browser keeps only the estimated city and a store id
  (`mg_city_guess`, 1 day; no manual choice since 043's D8), never coordinates;
  analytics carry at most the city name. `visitorCity.ts` ships to every page
  and has no imports; distance logic with the store directory lives in the
  server-side `visitorCityGeo.ts`. See `spec/features/043-visitor-city/`.
- Events emitted from a route handler use `@vercel/analytics/server` and must
  never delay or fail the request they observe. See
  `spec/features/015-vercel-event-tracking/`.
- **Consent is read and written only through `src/app/utils/consent.ts`.** Never
  touch `cookiesAccepted` or the decline timer directly: the rule was once
  duplicated between the banner and the analytics loader, and two copies of a
  consent rule eventually disagree — which means either tracking someone who
  said no or losing someone who said yes.
- **Revoking consent is not "stop rendering the analytics component".** By then
  gtag has run, its cookies are written and `window.gtag` is still callable.
  `revokeConsent()` sets Google's `ga-disable-*` property, deletes the `_ga*`
  cookies against every domain they may sit on, and clears the decision. See
  `spec/features/016-consent-withdrawal/`.
- A visitor can always reach their decision again from **Cookie Preferences** in
  the footer, which reopens the same banner. Declining a first time buys 1 day of
  silence; withdrawing an existing consent buys 30. Both periods are stated in
  the privacy policy, so changing one means changing that page too.

### Feature flags

- Client-visible flags use the `NEXT_PUBLIC_*` prefix (e.g. AI chat, Stripe
  toggle), mirrored by a server-only flag when server logic depends on it. Flags
  gate incomplete or rolling-out features.

### State management

- Prefer props and local state. Use React **Context** only for cross-cutting
  selection shared across a subtree (e.g. `SelectedFiltersContext` for tire
  size). Don't store server data in Context.

### Browser support

- Target **Baseline 2025** web features (e.g. the Popover API is fine). Avoid
  non-Baseline APIs (e.g. CSS Anchor Positioning) without a fallback; verify with
  the `modern-web-guidance` skill.

## 3. Testing and quality

### Tools

- **Vitest 4** (`npm test`) — jsdom, Testing Library (`react`, `jest-dom`,
  `user-event`). Current suite: **382 tests / 51 files** (2026-08-04).
- **ESLint 9** (`eslint-config-next`, `@typescript-eslint`) — `npm run lint`.
- **`tsc --noEmit`** — typecheck without emitting.
- **Prettier 3** — formatting (`npm run format` / `format:check`).

### Definition of Done

A change is done when:

1. `npx tsc --noEmit` passes (no type errors).
2. `npm run lint` passes.
3. `npm test` passes (382+ green; add tests for new logic).
4. `npm run build` compiles.
5. `npm run perf:budget` and **`npm run a11y`** pass (both run over the build,
   so after step 4; local pre-deploy gates, not CI — see below).
6. Manual behavior check when it's UI (ideally on mobile).

### Accessibility

- Target **WCAG 2.1 AA** on key flows: semantic HTML, labelled controls, keyboard
  operability, visible focus, and `prefers-reduced-motion` respected.
- **`npm run a11y`** (055, `scripts/a11y-check.mjs`): Lighthouse 13.6.0 (a
  pinned devDependency), accessibility only, on the key pages of the local
  production build — home, `/tires`, `/tires/used`, a tire page, a store, a
  service, `/about-us`, a size page, a brand page, `/checkout` — mobile and
  desktop, real paths taken from the sitemap. Any failing audit fails it unless
  `scripts/a11y-allowlist.json` names that audit and page **with a reason**
  (printed on every run).
- **Secondary text on dark sections** (`#0a0a0a`, `#111`, `#161616`) is
  `text-gray-400` (≥ 6.5:1), never `gray-500`/`600` (3.7–4.1:1 and 2.5:1);
  on `bg-gray-100`, `text-gray-600`. `darkContrast.guard.test.ts` lists the
  dark pages.
- **Targets ≥ 24 × 24 px** (WCAG 2.5.8): small visuals (carousel dots, the
  size pill) sit inside a 24 px button/link, the look unchanged.
- **A control's name contains its visible text** (2.5.3): extra words for
  screen readers go after it as `sr-only`, never in an `aria-label` that
  replaces it; spaces are their own text nodes.
- **Brand logos:** `src/app/utils/brandLogos.ts` is generated from
  `public/assets/images/TireBrand` (`node scripts/brand-logos.mjs`); a brand
  without a file shows its name and requests nothing.

### Performance budget

- Core Web Vitals targets (field, p75): **LCP < 2.5s · INP < 200ms · CLS < 0.1**
  on `/`, `/tires` and detail. Heavy/optional code (three.js) loads deferred;
  images through `next/image` with correct `sizes` / `priority`.
- **JS-weight budget.** Client JS is what drives INP/TBT, so its growth is capped
  in `perf-budget.json` (gzip): **shared First-Load JS ≤ 180 KB** (the JS every
  page loads) and **total client JS ≤ 680 KB** (all chunks, incl. deferred). After
  a build, run **`npm run perf:budget`** (`scripts/perf-budget.mjs`); it exits
  non-zero on a breach. Run it as part of the **Definition of Done** and before a
  deploy. (It's a local/pre-deploy gate, not a CI step: `next build` needs the DB
  for build-time data fetches, which CI doesn't have — see feature
  `009-perf-budget`.) Next 16/Turbopack doesn't emit per-route First-Load JS, so
  the shared floor + total are the reliable proxy. Bump the limits deliberately in
  a PR when a real increase is justified. Since 056 it also budgets
  **`shopperPageJs` ≤ 320 KB** — every chunk the prerendered `/about-us` and
  `/contact` HTML links, root layout included — and **fails if zod,
  react-hook-form or next-auth's client appear in any of them**.
- **No barrel files in `src/app/ui` — import by path (057).** There is no
  `index.ts` in `components/`, `icons/` or `sections/`: write
  `import TireCard from '@/app/ui/sections/TireCard/TireCard'`, never
  `from '@/app/ui/sections'`. A client barrel is not tree-shaken, so a page
  that used three icons downloaded all forty and nearly every widget (056–057:
  ~70–80 KB gz unused per page, and once the sellers' login form with zod).
  `src/bundle.guard.test.ts` fails if an index file or a whole-folder import
  comes back.
- **Seller-only client code stays out of the storefront's shared paths (056).**
  Providers only the dashboard needs (`SessionProvider`) wrap
  `(sellers)/dashboard/layout.tsx`, not the root layout; `perf:budget` fails
  if zod, react-hook-form or next-auth's client reach a shopper page.
- **Below-the-fold heavy widgets** (three.js) mount when near the viewport
  (`useNearViewport`) *and* idle (`useIdleReady`), not on idle alone — idle came
  within ~2 s of load, inside the window a phone is still loading the page.
- **Lab measurements:** `npm run perf:lab` (055, `scripts/perf-lab.mjs`) — 5
  Lighthouse runs per page and form factor on the local production build,
  medians of LCP/TBT/CLS/FCP/TTFB plus the LCP element, long-task scripts and
  shift culprits (`--runs 3 --page home` for quick checks), and since 056 the
  page weight (`jsKB`, `unusedJsKB`, `renderBlockingMs`, `htmlKB`). The
  sitemap's first tire changes as stock sells: pin it with `--path` for a
  before/after of the tire page. Compare runs made
  back to back on one machine; it is lab data, not field data.

### Working rules

- **Small, verifiable** changes; one branch per feature (never commit directly to
  `main`).
- Research modern UX/UI (the `modern-web-guidance` skill) before building new
  interfaces.
- Local commits; **the user does the push**.

---

_Sibling documents: [mission.md](./mission.md) · [roadmap.md](./roadmap.md)_
