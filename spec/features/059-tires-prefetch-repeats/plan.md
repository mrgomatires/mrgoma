# Plan — The catalog stops pre-loading the same pages again and again

> Feature: `059-tires-prefetch-repeats` · Based on: [spec.md](./spec.md) · Created: 2026-11-20

## Technical approach

> **Re-scoped after T1 (2026-11-20).** The measurement (`results.md`) showed
> the cause below is only part of it: `/tires/new` and `/tires/size` are
> **static** pages, and the links that re-download them after each filter
> are the header's "New tires" / "Shop by size". Next re-prefetches them in
> full after client navigations on `/tires`. The fix is the same component;
> it is now applied to the card's secondary links **and** to the header's
> "Used tires", "New tires", "Shop by size" (desktop dropdown + phone menu).

**Why it repeats (to confirm in T1).** Next 16 (`node_modules/next/dist/docs/01-app/02-guides/prefetching.md`)
prefetches every `<Link>` as it enters the viewport. `/tires` has a
`loading.tsx` (`src/app/(shop)/tires/loading.tsx`), which also covers
`/tires/new`, `/tires/used`, `/tires/size/[size]` and `/tires/brands/…`: those
routes are prefetched "up to the loading boundary", and that kind of prefetch
has **no client cache** by default (`staleTimes.dynamic` off). A filter change
re-renders the grid with new cards, the links re-enter the viewport, and every
one is prefetched again. Twenty cards share a handful of hrefs, so the same
page goes out several times.

**Fix: an intent-only link for the card's secondary links.** Next documents
the pattern ("Hover-triggered prefetch"): render `<Link prefetch={false}>`
until the shopper shows intent, then switch to `prefetch={null}` (the default)
so Next prefetches that one link. We add touch to the documented hover so
phones get it too:

```tsx
// src/app/ui/components/IntentPrefetchLink/IntentPrefetchLink.tsx
'use client';
export default function IntentPrefetchLink(props: LinkProps & AnchorProps) {
  const [intent, setIntent] = useState(false);
  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onMouseEnter={e => { setIntent(true); props.onMouseEnter?.(e); }}
      onTouchStart={e => { setIntent(true); props.onTouchStart?.(e); }}
    />
  );
}
```

It is still a real `<a href>` (crawlable, keyboard-reachable, same classes and
`onClick`). One hover or touch prefetches that link once. Whether a later
hover repeats it depends on Next's client cache, which is **off by default**
for prefetches up to a loading boundary (prefetching guide, table "Automatic
prefetch"), so it may; AC3 asks only "once per hover", and T7 measures and
records the re-hover case.

**Which card links.** `TireCard.tsx` has six links:

| Link | href | Treatment |
| --- | --- | --- |
| Condition badge | `/tires/new` · `/tires/used` | intent-only (spec) |
| Size pill | `/tires/size/{slug}` | intent-only (spec) |
| Brand | `/tires/brands/{slug}` | intent-only — same kind of catalog page, same repeat |
| Set offer | `setHref(…)` (detail of a set) | intent-only — secondary action |
| Detail (image + title) | `detailUrl` ×2 | **unchanged** — the card's main action; T1 measures it |

The brand and set links are not named in the spec but are the same kind of
secondary link and repeat for the same reason; including them is what makes
AC1's "no background pre-load from a card" hold. If T1 shows the detail links
also repeat, that is written in `results.md` and not changed here (the card's
main tap should stay as fast as today).

**Header links.** `menuItems` (`src/app/ui/sections/Header/MenuItems.ts`) gains
an optional `prefetchOnIntent?: true` on `MenuChild`, set on the three "Shop
Tires" children. `Header.tsx` (desktop dropdown, children rendered but
invisible until hover — which is why Next prefetches them) and
`MenuMobile/components/MenuItem.tsx` (phone submenu) render
`IntentPrefetchLink` for those children and plain `Link` for the rest. Data
decides, so adding a child later does not need a component change.

> **Changed in /implement:** the menus use their own copy,
> `MenuPrefetchLink`, not `IntentPrefetchLink`. Importing the cards' module
> from the header made Turbopack load the header in two chunks on every page
> (+12.3 KB gzip on `shopperPageJs`); see `results.md`.

**Dashboard title.** `src/app/(sellers)/dashboard/page.tsx` already exports
`metadata` (`robots: noindex`); add `title: 'Dashboard'`. The root template
(`seo.ts`: `%s | ${SITE_NAME}`) makes it **"Dashboard | MrGoma Tires"** (the
site's real name; the spec's "or the agreed wording").

## Reuse first

- `next/link` with the documented `prefetch={false}` → `null` switch; no new
  library (ForesightJS rejected: a dependency for six links).
- The root title template in `src/app/utils/seo.ts`; the dashboard's existing
  `metadata` export.
- `scripts/lab.mjs` / the production-build + Chrome network log method from
  058 for before/after numbers.
- `TireCard.test.tsx` and its fixtures for the regression test.

## Files to add / change

- `src/app/ui/components/IntentPrefetchLink/IntentPrefetchLink.tsx` (new) — the
  link above; forwards every `Link`/anchor prop and composes the handlers.
- `src/app/ui/components/IntentPrefetchLink/IntentPrefetchLink.test.tsx` (new) —
  `prefetch` is `false` before intent, `null` after `mouseenter` and after
  `touchstart`; caller's handlers still run; renders `<a href>`.
- `src/app/ui/sections/TireCard/TireCard.tsx` — condition, size, brand and set
  links use `IntentPrefetchLink`; detail links unchanged.
- `src/app/ui/sections/TireCard/TireCard.test.tsx` — with `next/link` mocked to
  expose its `prefetch` prop: the four secondary links render with
  `prefetch=false`, the detail links with the default. Fails if someone puts a
  plain `Link` back (AC6).
- `src/app/ui/sections/Header/MenuItems.ts` — `prefetchOnIntent` on
  `MenuChild`; set on "Used tires", "New tires", "Shop by size".
- `src/app/ui/sections/Header/Header.tsx` — dropdown children with the flag use
  `IntentPrefetchLink`.
- `src/app/ui/sections/MenuMobile/components/MenuItem.tsx` — same for the phone
  submenu.
- `src/app/ui/sections/Header/menu.test.tsx` — the three children carry the
  flag; desktop and phone menus render them with `prefetch=false`, the other
  children with the default.
- `src/app/(sellers)/dashboard/page.tsx` — `title: 'Dashboard'`.
- A dashboard metadata test (extend the nearest existing one or a small new
  `page.test.ts`): title is `'Dashboard'`, robots still `noindex`.
- `spec/features/059-tires-prefetch-repeats/results.md` (new) — before/after.
- `spec/roadmap.md` — already marks 058 ✅ (done in /specify).

## Data & flow

No API, query or DB change. Before: card mounts → link in viewport → Next
prefetches the route's RSC payload (`?_rsc`) → filter change → new cards →
again. After: card mounts → nothing; pointer enters / finger touches the link
→ that link prefetches once → click navigates (from the prefetch if it
finished, otherwise a normal navigation with the loading boundary, as today).

## Acceptance criteria → implementation

| AC | How it's met | How it's verified/tested |
| --- | --- | --- |
| AC1 | Secondary card links render `prefetch={false}` | Production build, Chrome network log: `/tires` load + one filter change, count `?_rsc` to `/tires/new`, `/tires/used`, `/tires/size/*`, `/tires/brands/*`, set pages (T1 before, T7 after); detail and header/footer counted apart |
| AC2 | Same; viewport entry never prefetches them | Same log: three more filter changes + full scroll → 0 |
| AC3 | `intent` flips to `null` on hover/touch | Unit test (prop flip); browser: hover one size pill → exactly one `?_rsc` for it, nothing more while it stays; move away and back → recorded |
| AC4 | Same `href`, `onClick={stopPropagation}` kept, same classes | Existing TireCard tests + browser: tap pill/badge opens the page, tap card body opens the detail |
| AC5 | Same `TireCard` is used by `TireGrid` (`/tires`) and `TireResults` (other catalog pages) | Browser check on `/tires/used`, `/tires/new`, one size page |
| AC6 | — | `TireCard.test.tsx` and `menu.test.tsx` prefetch assertions + `IntentPrefetchLink.test.tsx` |
| AC7 | — | `results.md` table, same method both times, header/footer links listed separately |
| AC8 | `metadata.title = 'Dashboard'` | Test on the page metadata + browser tab on the production build |
| AC9 | — | tsc, lint, tests, build, `perf:budget`, `npm run a11y` |

## Tradeoffs / alternatives

- **`prefetch={false}` alone** — in the App Router it disables hover prefetch
  too (rejected by the clarify answer: intent only, not never).
- **`staleTimes.dynamic` in `next.config`** — would cache the loading-boundary
  prefetches site-wide and stop the repeats while keeping viewport prefetch;
  rejected: still one request per visible distinct page (the "once per visit"
  option not chosen), and it changes back/forward freshness everywhere.
- **Removing `loading.tsx`** — would change prefetch semantics for every
  catalog route and the loading UX; out of scope.
- **ForesightJS** — cursor prediction; a dependency for six links.

## Risks

- **Slightly slower jump from a pill on a phone**: the prefetch starts at
  `touchstart`, ~100 ms before the click; the page shows its loading boundary
  as it does today for any un-prefetched link. Accepted in clarify.
- **Hover on many cards while moving the mouse across the grid** may prefetch
  a few pages; each only once. Lower than today's viewport prefetch.
- **Re-render loses `intent` state** after a filter change (new card) — the
  link simply waits for a new hover; no request.
- **`TireCard` already runs in the browser** (it uses `useCart`; its parents
  `TireGrid` and `TireResults` are `'use client'`), so the new client component adds no boundary; bundle delta is a few hundred
  bytes, checked by `perf:budget`.

## Out of scope

- The rest of the header, the footer and the rail's "See all sizes": measured
  and listed in `results.md` only.
- Card detail links: measured; unchanged.
- Server-side caching of the catalog pages.

---

_The concrete steps live in [tasks.md](./tasks.md)._
