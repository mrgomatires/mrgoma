# Results — Every tire size on one page

> Feature: `050-size-index` · Verified locally 2026-11-18 (`next dev`, real
> inventory, Chrome at desktop width and at 390 px through same-origin
> iframes).

## Definition of Done

`npx tsc --noEmit` ✓ · `npm run lint` ✓ · `npm test` ✓ (172 files, 2,099
tests; 66 new) · `npm run build` ✓ (`/tires/size` static, revalidate 5 m) ·
`npm run perf:budget` ✓ — shared First-Load 166.0 KB of 180, total client JS
641.5 KB of 680 (+2.2 KB over 049).

## Data

| Fact | 2026-11-18 |
| --- | --- |
| Sizes for sale (`fetchSizeCounts`) | 294, identical to `fetchSizes()` |
| Tires counted | 6,885 |
| Popular (top by stock) | 315/30/22 (270), 315/35/21 (258), 255/45/19 (206), 285/40/20 (185)… |

## Browser checks

| Check | Result | AC |
| --- | --- | --- |
| `/tires/size`: 200, title "Shop Tires by Size — Miami & Orlando \| MrGoma", one H1, breadcrumb Home / Tires / Sizes | ✓ | AC1 |
| Server HTML: 306 links to size pages (294 in the list + 12 popular), canonical `https://www.mrgomatires.com/tires/size`, `ItemList` with `numberOfItems` 294, `BreadcrumbList` | ✓ | AC6 |
| `sitemap.xml` lists `/tires/size` | ✓ | AC6 |
| Typed `2354518` (shown `235/45/18`) + Enter → `/tires/size/235-45-18` | ✓ | AC2, AC5 |
| Flotation sizes reached from the list (`/tires/size/35-12-50-20`); typing them was dropped with D8 | ✓ | AC3 |
| `225/65R18` → "We don't carry 225/65R18 right now." + 225/40, /45, /50, /55, /60 on 18" + fit reminder + picker link | ✓ | AC4 |
| `155/80R12` → message + reminder + picker, no sizes | ✓ | AC4 |
| Incomplete size → Search stays off, "3 digits / 2 digits / 2 digits" | ✓ | AC4 |
| (superseded by D8) The field had a `<datalist>`; replaced by the home field | — | AC5 |
| Size page breadcrumb: Home / Tires / Sizes / 235/45/18 Tires, "Sizes" → `/tires/size`, also in its JSON-LD | ✓ | AC7 |
| Links in: home picker "See all sizes →", footer "Shop by size", header menu (tests also cover the `/tires` floating form and the filter rail's Rim size group) | ✓ | AC7b |
| Header, keyboard only: Tab onto "Shop Tires" opens the panel; Tab walks All tires → Used → New → Shop by size; Locations now opens on focus too and looks as before (Miami, FL / Orlando, FL / "View all 7 locations →") | ✓ | AC7c |
| Phone menu: collapsed Shop Tires panel is `inert`; opened, four links of 44 px | ✓ | AC7c |
| List shows counts ("· 1 tire", "· 45 tires"); 13" … 26" rims in order | ✓ | AC7d |
| 390 px: no sideways overflow on `/tires/size` or home | ✓ | AC10 |

Notes:

- A script `focus()` does not trigger `:focus-within` while the window lacks
  focus; with real keyboard focus the menu opens as intended.
- The breadcrumb links ("Home", "Tires") are under 44 px tall, as on every
  size page today; they meet WCAG 2.2's 24 px minimum.
- The dev overlay's one "issue" is the browser-extension hydration warning
  (`data-xt-extension-active` on `<html>`) already seen in 049.
- Events are asserted by unit tests (consent declined locally):
  `size_index_search` never carries text that does not parse as a size.

## Owner review (2026-11-18, spec D8)

- **The search box is the home field.** `TireSizeTextField` (extracted from
  `SearchByText`) now serves home, `/instant-quote` and `/tires/size`: digits
  formatted as typed (`2256518` → `225/65/18`), no autocomplete, no chevron.
  Verified: typing formats; Enter → `/tires/size/235-45-18`; Search on
  `225/65/18` → the five closest sizes.
- **Keyboard trap fixed.** The shared key filter blocked every non-digit key,
  Tab and Enter included: on home a keyboard user could not leave the field
  or submit with Enter. Named keys and shortcuts now pass.
- **Header dropdowns close after a navigation.** Clicking "New tires" in the
  Shop Tires menu landed on `/tires/new` with the panel still open (focus on
  the clicked link, pointer over the panel). Now focus is released and the
  panels stay shut until the pointer enters a menu again; verified with the
  pointer left where the link was (panel `visibility: hidden`), and a new
  hover opens it.
- The `aria-describedby` of the old field pointed to ids that did not exist;
  the shared field links its real help and error text.

## Cache windows (AC8)

The index regenerates every 5 minutes from the same cached list as the size
pages' lookup, so a sold-out size leaves it within minutes. A size page itself
is ISR for an hour; in the regeneration race a link from the index could reach
a page that has just started answering "not found". Accepted in the plan.

## Modern Web Guidance

Read from `~/.agents/skills/modern-web-guidance/guides` (the CLI is blocked
here):

- `forms/forms` — `<input list>` + `<datalist>` for a long dynamic list
  (native keyboard and screen-reader support), a visible-to-AT label, the
  `<search>` landmark, `enterkeyhint`, no auto-submit.
- `accessibility/accessibility` — one `role="status"` region for the result
  of a search, none for loading.

## Left for the owner

- GA4 DebugView on the Preview: `size_index_search`, `size_index_select`,
  `see_all_sizes`.
- iPhone: the size search field and the new phone menu.
