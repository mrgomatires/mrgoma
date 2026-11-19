# Results — Used-tire filters

> Feature: `052-used-tire-filters` · Implemented: 2026-11-18

## What shipped

- **Tread depth in the rail:** steps 6/32"+, 7/32"+, 8/32"+, 9/32"+ with
  cumulative counts (`minTreadDepth`), after "Tread life".
- **Quick chips** above the results on `/tires` and `/tires/used`: "Not
  patched", "Run-flat", "8/32"+" (only "Run-flat" while browsing New).
- **Used filters mean used** (D3): applying tread, life or patched writes
  `condition=used`; a condition change keeps them only if the next set is
  exactly `used`; `normalizeUsedFilters` reads any URL the same way in the
  storefront. Tread, life and patched are hidden with New only.
- **`/tires/used` filters in place** (D4): the full rail without a Condition
  group or chip, the quick chips, the first 24 matches and "View all N used
  tires" carrying the filters to `/tires`. Hero, title, canonical, breadcrumb
  and JSON-LD unchanged (hero and `ItemList` keep the unfiltered used total).
- **Dashboard size selects** use `STOREFRONT_SELLABLE_WHERE` (D6) instead of
  `RemainingLife > '70%'`; a guard forbids comparing life as text again.
- **Robustness:** the tread filter uses `TRY_CAST(Tread AS float)`.
- **SEO:** `minTreadDepth` and every filter parameter on `/tires/used` are
  disallowed in `robots.txt`; `/tires/used` itself stays open.

## Measured (live catalog, 2026-11-18)

| Check | Result |
| --- | --- |
| Used tread buckets (whole 32nds) | 5: 4 · 6: 623 · 7: 1,449 · 8: 932 · 9: 576 · 10: 223 |
| Step 8/32"+ count vs `TRY_CAST(Tread) >= 8` used results | 1,731 = 1,731 |
| Facet query, median of 8 (old → new) | 742 ms → 761 ms (+2.6%, limit 15%) |
| "Patched" facet (used only) | No 1,802 · Yes 2,005 |
| `/tires/used?minTreadDepth=9&patched=no` | 451 tires; every card ≥ 9/32" and not patched |

## Deviations from the plan

- **The browse strip stays on `/tires/used`**, below the results. The plan
  replaced it with the rail, but `tiresPage.guard` protects it: it is the
  brand pages' inbound links (115 `/tires/brands/…` links). The rail's brand
  options are filters (`?brands=`), not those pages.
- **The results section moved up**, right under the hero, so a filter's
  reload lands near its results; "Why choose used" follows it.
- **`getCachedUsedLanding` lives in its own file**
  (`cachedUsedLanding.ts`): the facet repository opens the database on import
  and `/api/ranges` imports `cachedCatalog`.
- **T5 needed no change**: `minTreadDepth` was already in `FILTER_PARAMS`;
  tests now pin it.
- **Quick chips send `filter_apply`** whether they apply or clear, as the
  rail's options do.

## modern-web-guidance

- *Scrollability affordance hints*: the quick-chip row is a horizontal
  scroller, so it fades at the edge that has more (mask driven by a
  scroll-driven animation, `@property` lengths, `scroll-padding-inline` so a
  focused chip never stops under the fade); gated by
  `@supports (animation-timeline: scroll())`.
- Toggle state on links: `aria-current` (the project bans `aria-pressed`
  in `src/app`), plus a visible ✓ and a dark fill, not colour alone.

## Manual checks (Chrome, dev server)

- `/tires` mixed → "Not patched": URL `condition=used&patched=no`, chips
  "Used" and "Not patched", every card "Patched No".
- `/tires?condition=used&minTreadDepth=8`: every card ≥ 8/32", Used option
  shows 1,731, the New option leads to `condition=used,new` without the tread.
- `/tires?condition=new&minTreadDepth=8`: no Tread life / Tread depth /
  Patched groups, only "Run-flat" as a quick chip, no tread chip.
- `/tires/used`: no Condition group, canonical `/tires/used`, title unchanged,
  hero "3,807 available to buy online" on a filtered view too.
- 390px: no horizontal page scroll; chips 44px tall; on `/tires` the row
  shares the line with List/Table and scrolls sideways with the fade.
- No repeated requests on `/tires/used` while idle.

## Pending after deploy

- Watch `/tires/used` function invocations in Vercel for a week (it is
  dynamic now).
- The dashboard dimension routes keep their cached list up to an hour.

## Owner review, first round

- **The storefront AI chat** (`/api/tires/ai-chat`) now searches the used
  filters as the rail writes them (`_lib/catalogFilters.ts`):
  - "no patches" did not filter at all: the tool sent `patched=true|false`,
    which the catalog ignores (it reads `yes|no`). The schema is now `no|yes`
    and old booleans are still read.
  - Tread was described to the model "in mm"; it is in 32nds of an inch
    (whole numbers, 6–10 for used tires).
  - Run-flat was not searchable; `runFlat` → `kindSale`.
  - Tread, life and patched narrow to used, and are dropped with New — the
    same rule as the rail. The dashboard assistant is untouched.
- **Compare (051), "View tire"** opened the tire page behind the open
  comparison. The link now closes the dialog as it is followed, and any
  pathname change closes it too (Back, the header). The picks stay in the
  tray. Checked in Chrome: dialog gone, tire page visible, tray present.
- **Compare (051), "Add to cart"** opened the cart behind the comparison: a
  modal `<dialog>` sits in the top layer, so nothing the page opens can show
  above it. Adding now closes the comparison first, so the cart is seen at
  once; the picks stay in the tray to compare again. Checked in Chrome (the
  dev cart was restored afterwards).
- **Compare (051), the fourth tire.** With three picked, another tire's box
  ticked and unticked itself while only the tray explained why — it read as a
  bug. Now every other box is **disabled** (grey, not-allowed cursor), its
  label says why on hover ("You can compare up to 3 tires — remove one to add
  another"), its accessible name carries the same reason, and the tray reads
  "3 of 3 tires · remove one to add another". The picked boxes stay enabled,
  and removing one re-enables the rest. `compare_limit` can now only fire if a
  fourth is added some other way (a stale tab); kept as a safety net. Checked
  in Chrome on `/tires` (cards); the table view uses the same toggle.

## Site review before commit (2026-11-18)

**Method.** Dev server: every sitemap page (31 static + samples of a tire,
brand and size page, `/checkout`, a 404) loaded in a same-origin iframe at
1280, 820 and 390 px — 73 loads — checking JS errors, repeated requests while
idle (loops), broken images, horizontal overflow, `undefined`/`NaN` text and
one `h1`; server HTML for title, description, canonical, robots, JSON-LD,
`lang`, unnamed links/buttons, duplicate ids. Production build (`next start`):
Lighthouse 13.6.0 on 9 pages mobile + 5 desktop. Manual: phone menu, tablet
`/tires`, the full cart flow.

**Fixed in this branch**

| Finding | Fix |
| --- | --- |
| Listing cards for a tire with no usable photo showed a broken image: the fallback `/images/default-tire.png` does not exist (404). A guard only checked the path's *shape*. | `ProductImage` falls back to `/assets/images/generic-tire-image.webp` (what the gallery and the comparison use); `imageHosts.guard` now asserts the file exists. |
| The tire page had **no `<main>`** (Lighthouse `landmark-one-main`; screen readers' "skip to main" had no target). | `DetailView` renders `<main>`. Detail accessibility 99 → 100. |
| **052's own regression**: the tread steps and the 8/32"+ chip were named "Minimum tread, 8/32 inch or more", which does not contain the visible `8/32"+` (WCAG 2.5.3, `label-content-name-mismatch`). | Visible text first, then a screen-reader hint as its own node: "8/32"+ minimum tread". `/tires` accessibility 100. |
| Browse strip on `/tires/used`, `/tires/new` and brand pages: "Browse by…" labels 2.6:1; active "Used" chip white on amber 2.13:1; its name "Clear used tires filter" did not contain "Shop Used". | Labels `gray-600`; active Used `gray-950` on `amber-400`; active New `green-700`; visible text first, then "(showing now, tap for all tires)" for screen readers. `/tires/used` and `/tires/new` desktop accessibility 100. |

**Verified, no issue**

- No loops on any page at any width once idle. A pair of `/api/auth/session`
  calls every ~7 s seen on `/instant-quote` came from NextAuth's cross-tab
  sync reacting to the audit's own iframes; with them stopped: 0 requests in
  25 s.
- Totals agree: `/tires` 6,900 = used 3,807 + new 3,093; tread step 8/32"+
  1,731 everywhere.
- Cart: listing add → 1 / $200; detail add → 2 / $400, button "In Cart"; a
  set of 2 ($160 + $100 = $260) → 4 / $660; checkout subtotal $660, total
  $660; remove a line → $460; reload keeps it; remove the set → 1 / $200;
  header badge matches each step. 53 page loads in other iframes never touched
  the stored cart.
- Phone menu opens, expands Shop Tires, navigates and closes; tablet `/tires`
  has no overflow.
- SEO: every indexable page has a title (31–59 chars), a description
  (140–160), a self canonical, `index, follow`, `lang="en"` and valid JSON-LD;
  `/checkout` is `noindex, nofollow`; the 404 answers 404.
- Console errors in Lighthouse are local-only: Auth.js `UntrustedHost` on
  `localhost:3100` (Vercel trusts its host) and `/_vercel/insights` (Vercel
  only). The hydration warning on `/checkout` in dev is a browser extension's
  attribute on `<html>`.

**Lighthouse (production build, after fixes where re-run)**

| Page | Mobile P / A / BP / SEO | Desktop P / A / BP / SEO |
| --- | --- | --- |
| Home | 54 / 97 / 96 / 100 | 72 / 97 / 96 / 100 |
| `/tires` | 78 / 100 / 96 / 100 | 93 / 100 / 96 / 100 |
| `/tires/used` | 79 / 96 / 96 / 100 | 100 / 100 / 96 / 100 |
| `/tires/new` | — | 100 / 100 / 96 / 100 |
| Tire page | 76 / 99* / 96 / 92 | 98 / 100 / 96 / 92 |
| `/tires/size` | 100 / 100 / 96 / 100 | — |
| A size page | 88 / 95 / 96 / 100 | — |
| A store page | 82 / 96 / 96 / 100 | — |
| A service page | 91 / 96 / 96 / 100 | — |
| A guide | 91 / 100 / 96 / 100 | — |
| `/checkout` | — | 85 / 98 / 96 / 69 (noindex on purpose) |

\* before the `<main>` fix. BP 96 everywhere is the local-only console errors.

**Pending, outside this branch (pre-existing)**

1. **Home on a phone: TBT 3.6 s** (Lighthouse mobile, 4× CPU) — one 2.9 s
   task in the main framework chunk while the home hydrates. Worth its own
   feature.
2. **Mobile LCP 4.4–6.3 s** on home, `/tires`, `/tires/used`, the tire page,
   a store page: the hero/first photo is discovered late.
3. **Tire page meta description is streamed into `<body>`** (Next 16 streaming
   metadata for dynamic pages); Lighthouse flags it (SEO 92). Google renders
   JS and Next serves blocking metadata to the bots it knows; other crawlers
   may miss it.
4. **Contrast on dark pages**: `text-gray-500` on `#0a0a0a`/`#111`/`#161616`
   (breadcrumbs, labels on store and service pages, 3.7–4.1:1) and
   `text-gray-600` on `#111` (2.5:1); `gray-500` on `gray-100` on size pages
   (4.4:1).
5. **Small targets**: home carousel dots 8 px; the size pill on listing cards
   20 px tall (WCAG 2.5.8 asks 24 px).
6. "Open address link" buttons on home: name does not contain their visible
   text.
7. `/checkout` desktop CLS 0.30 (the cart fills after mount).
8. A duplicate SVG id `clip0_199_1053` on `/tires` and `/checkout`; a size and
   a brand page skip a heading level.
9. Brand logo `2481-logo.webp` missing (the name shows instead).
