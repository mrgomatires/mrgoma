# Plan — Compare up to three tires side by side

> Feature: `051-compare-tires` · Based on: [spec.md](./spec.md) · Created: 2026-11-18

## Technical approach

Four pieces: the data the cards carry, a small client store for the picks, the
tray, and the comparison dialog — plus one tiny read endpoint for the re-check.

### 1. Data: three more public fields on listing tires (D2)

Listing queries already `SELECT *`, so `DOT`, `loadIndex` and `speedIndex` are
read; they are dropped on the way to the browser. Two paths carry listing
tires and both get the three fields:

- **Server-rendered listings** (`/tires` first page, size, brand, new, used):
  `transformTireData()` (`src/app/utils/transformTireData.ts`) — add
  `dot`, `loadIndex`, `speedIndex` to the transformed tire (and the
  `TransformedTire` type).
- **`/api/tires`** (the `/tires` client refetch): `pickTireListFields()`
  whitelist (`tireListFields.ts`) — add `DOT`, `loadIndex`, `speedIndex`
  (public: printed on the tire and already on every tire page). `VaultName`
  and `Location` stay out; `tireListFields.test` asserts it.

Side benefit: `factsFromCardTire()` (047) can now fill `dot` too, so a tire
added to the cart from a card carries its DOT to the cart's hover card.

### 2. The picks: `CompareContext` (client)

The **provider** is mounted next to `CartProvider` in `src/app/layout.tsx`
(state shared across every page, cheap); the **tray and dialog** render only
in the store layout (§4).

```ts
type CompareItem = {           // a public snapshot of the card's tire + its GA list
  tire: Pick<TransformedTire, 'id'|'name'|'model'|'size'|'brand'|'brandId'|'price'|
    'condition'|'city'|'imageSrc'|'features'|'dot'|'loadIndex'|'speedIndex'|'status'>;
  list?: GaList;
};
useCompare() → { items, has(id), toggle(item) → 'added'|'removed'|'full',
                 remove(id), clear(), open(), close(), isOpen, notice }
```

- **Max 3** (FR2): `toggle` on a fourth returns `'full'` and sets a notice;
  nothing is dropped.
- **Lasts for the visit** (D5): `sessionStorage['mg-compare']`, read after
  mount (no hydration mismatch), written on change; every access in
  `try/catch` (private mode). Survives reloads and page changes; a new tab or
  visit starts empty.
- Pure helpers in `src/app/utils/compare.ts` (store-agnostic, tested):
  `addItem`, `removeItem`, `MAX_COMPARE = 3`, and the comparison rows (§5).

### 3. The control on each tire

- **Card (grid):** a compact `Compare` control in the card's header row, next
  to the price/actions, on every listing using `TireCard` (D1).
- **List view (`TireTable`):** a last column "Compare" with the same control.
- The control is a **native checkbox** with a visible label
  (`<label><input type="checkbox"> Compare</label>`), not a toggle button:
  the state is announced natively, and `aria-pressed` is banned in `src/app`
  by `ariaPressed.guard.test.ts`. ≥ 44 px hit area via the label. When the
  tray is full and the box is unchecked, checking it is reverted and the
  tray's notice says "You can compare up to 3 tires — remove one first."
- `data-track="compare_toggle"` is not enough (it cannot tell add from
  remove), so the handler calls `trackEvent('compare_add' | 'compare_remove',
  { tire_id, count })`.

### 4. The tray: `CompareTray` (client, rendered once in the store layout)

- Rendered by `src/app/(shop)/layout.tsx` (listings, tire pages, the size
  index…), **not** by the root layout: it never shows on the sellers'
  dashboard. It renders nothing on `/checkout` (`usePathname`). Picks stay in
  the session meanwhile (spec D7, AC14).

- A **fixed bar at the bottom** while ≥ 1 tire is picked, not a modal: the
  page stays usable. Desktop: three slots (thumbnail — the generic image when
  none —, name, size, price, ✕) + empty slots ("Add another tire to
  compare") + "Clear" + **Compare** (enabled from 2). Phone: compact — three
  thumbnails, "2 of 3", Compare.
- **Floating controls stay reachable** (AC6): the tray publishes its height as
  `--compare-tray-h` on `<html>`; the chat bubble (`AiChat`, `bottom-6`) and
  the `/tires` floating search button (`FloatingButton`, `bottom-4`) offset
  their `bottom` by it. Page content gets the same padding at the end so the
  tray never hides the last cards.
- A polite `role="status"` inside the tray for "2 of 3 tires" and the full
  notice (no announcement for loading).
- Entry with `@starting-style` (slide up), reduced-motion aware.

### 5. The comparison: `CompareDialog`

- **Native `<dialog>` opened with `showModal()`** (modern-web-guidance,
  `dialog`: top layer, inert page, focus containment, Esc and focus return for
  free; no `role`, no `aria-modal`, no focus trap, no body `overflow` lock —
  `overscroll-behavior: contain` instead). The existing `Dialog` component is a
  hand-built `div` overlay; it is not reused here. Full screen on a phone,
  wide panel on desktop. No address of its own (D4); closing returns to the
  same scroll position.
- **Table** (modern-web-guidance, `responsive-table`): `<table>` with a
  `<caption>`, one `<th scope="col">` per tire (photo, name, ✕ remove), one
  `<th scope="row">` per fact; the fact column is `position: sticky` so on a
  phone the columns scroll sideways while the fact names stay — three values
  of one fact stay on one line (FR9).
- **Rows** (FR4, in order): Size · Condition · Price · Tread · Remaining life ·
  Patched · DOT · Load index · Speed rating · Run-flat · Location (city).
  Built by a pure `compareRows(items)` →
  `[{ key, label, values: string[], best: number[], differs: boolean }]`:
  - better = more tread, more life, not patched, lower price, newer DOT (FR5);
    no "best" for size, condition, load, speed, run-flat, city;
  - `—` for a missing fact; no best when only one tire has the fact;
  - `parseDot()` reads `WWYY` (e.g. `2324` → week 23 of 2024) and `YYYY`.
- The best value gets a "Best" badge **and** text (`aria-label`/visually
  hidden "best"), not colour alone.
- **"Show only differences"** — a switch-styled checkbox; rows with
  `differs === false` are hidden.
- **Different sizes** (D3): when sizes differ, a notice above the table
  ("These tires are different sizes — only the size approved for your car
  fits.") and the Size row marked.
- **Per tire** (FR6): "View tire" (`/tires/{slug}`, `data-track=
  "compare_view_tire"`), "Add to cart" through the **same function the card
  uses** — extracted from `TireCard.handleAddToCart` into
  `useAddTireToCart()` (cart line with 047 facts + `trackEcommerce(
  ADD_TO_CART)`), "Remove".
- **Re-check on open** (D6, FR7): `GET /api/tires/compare?ids=1,2,3` →
  `[{ id, available, price }]`. Sold or removed → "Sold", no Add to cart;
  price changed → the current price; request failed → the saved data and
  "We couldn't confirm availability — the tire page and checkout always
  check." Loading shows the saved data immediately (no spinner over the
  table).

### 6. The re-check endpoint

`src/app/api/tires/compare/route.ts`:

- Zod: `ids` = 1–3 comma-separated values matching `^\d{1,10}$`; anything else
  → 400 with a generic message.
- One query: `fetchTiresByIds()` (already exists, parameterised `IN`).
- Availability with the existing helpers (`isSoldStatus`, `isRemoved`,
  `tireAvailability.ts`) plus `Price > 0`. Response carries **only** `id`,
  `available`, `price` — no other column.
- `Cache-Control: no-store` (it answers "right now"); `withLogging`.

### 7. Analytics (FR10)

| Event | How | Params |
| --- | --- | --- |
| `compare_add` / `compare_remove` | `trackEvent` in the toggle / remove handlers | `tire_id`, `count` (after) |
| `compare_open` | `trackEvent` on Compare | `count`, `same_size` (true/false) |
| `compare_view_tire` | `data-track` on the dialog's link | `-tire-id` |
| `add_to_cart` | `useAddTireToCart` (040's payload) | as from a card |
| `compare_limit` | `trackEvent` when a 4th is refused | `count: 3` |

## Reuse first

- `transformTireData`, `pickTireListFields`, `TransformedTire`.
- `factsFromCardTire` / `factsParts` (047) for tread, life, patch labels;
  `treadDepthLabel` used by `TireCard`.
- `fetchTiresByIds`, `isSoldStatus` / `isRemoved`, `jsonError`, `withLogging`,
  Zod.
- `useCart`, `trackEcommerce`, `cartPayload`, `EVENTS.ADD_TO_CART` — via the
  extracted `useAddTireToCart`.
- `buildTireSlug` for "View tire"; the generic tire image.
- 047's `@starting-style` patterns; `trackEvent`.

## Files to add / change

Add:

- `src/app/utils/compare.ts` (+ `.test.ts`) — `MAX_COMPARE`, add/remove,
  `compareRows`, `parseDot`, `sameSize`.
- `src/app/context/CompareContext.tsx` (+ test) — provider + `useCompare`.
- `src/app/hooks/useAddTireToCart.ts` (+ test) — extracted from `TireCard`.
- `src/app/ui/components/CompareToggle/CompareToggle.tsx` (+ test).
- `src/app/ui/sections/CompareTray/CompareTray.tsx` (+ test).
- `src/app/ui/sections/CompareTray/CompareDialog.tsx` (+ test).
- `src/app/api/tires/compare/route.ts` (+ `route.test.ts`).
- `spec/features/051-compare-tires/results.md`.

Change:

- `src/repositories/tireListFields.ts` (+ test) — three fields.
- `src/app/utils/transformTireData.ts`, `src/app/interfaces/tires.d.ts` —
  `dot`, `loadIndex`, `speedIndex`.
- `src/app/utils/cartFacts.ts` — `factsFromCardTire` reads `dot`.
- `src/app/ui/sections/TireCard/TireCard.tsx` — `CompareToggle`;
  `useAddTireToCart`.
- `src/app/ui/components/TireTable/TireTable.tsx` — Compare column.
- `src/app/layout.tsx` — `CompareProvider`.
- `src/app/(shop)/layout.tsx` — `CompareTray` (hidden on `/checkout`).
- `src/app/ui/components/AiChat/AiChat.tsx`,
  `CollapsibleSearchBar/components/FloatingButton.tsx` — offset by
  `--compare-tray-h`.
- `src/app/globals.css` — tray entry, dialog sizing, sticky fact column,
  `dialog:modal` scroll rules.
- `spec/tech-stack.md` — events; the endpoint.

## Data & flow

- Card render → `CompareToggle` reads `useCompare().has(id)`.
- Toggle → snapshot `{ tire, list }` into context → `sessionStorage`.
- Compare → `compare_open` → dialog `showModal()` → table from snapshots →
  `GET /api/tires/compare?ids=…` (one indexed `IN` query) → availability and
  price merged into the view (not into storage).
- Add to cart from the dialog → `useAddTireToCart` → same cart + event as a
  card.
- No DB writes; no new page or URL.

## Acceptance criteria → implementation

| AC | How it's met | How it's verified/tested |
| --- | --- | --- |
| AC1 | `CompareToggle` + context + tray | `CompareTray.test`: two toggles → two slots + empty slot, Compare enabled |
| AC2 | `toggle` returns `'full'`, notice | context test; tray test: notice text, three items kept |
| AC3 | `compareRows`, best marks, `—` | `compare.test` (tread/life/patch/price/DOT best; missing → `—`; DOT `WWYY`/`YYYY`); dialog test renders rows |
| AC4 | `differs` + switch | dialog test |
| AC5 | `useAddTireToCart`, slug link | hook test (same cart line + event as card); dialog test href |
| AC6 | compact phone tray, `--compare-tray-h` offsets, sticky column | manual at 390 px with chat + floating search visible; `perf:budget` |
| AC7 | checkbox control, native dialog, `<th scope>` | tests by role (`checkbox` "Compare …", `table`, `rowheader`); manual keyboard pass |
| AC8 | `trackEvent` / `data-track` | tests assert calls/params; GA4 DebugView on Preview by the owner |
| AC9 | whitelist + three fields only; no route | `tireListFields.test`; endpoint returns only id/available/price |
| AC10 | small client JS, no per-card requests | `perf:budget`; manual check that cards make no requests |
| AC11 | `sessionStorage` | context test: reload (re-mount) restores; new storage → empty |
| AC12 | endpoint + merge | route test (sold, removed, price, invalid ids → 400, ≤ 3); dialog test (Sold, price, failure notice) |
| AC13 | `sameSize` + notice | dialog test |
| AC14 | tray in the store layout, hidden on `/checkout` | tray test (pathname `/checkout` → nothing); manual: dashboard has no tray |

## Tradeoffs / alternatives

- **Toggle button (`aria-pressed`)** — the textbook pattern, but banned in
  `src/app` by a guard written for links; a labelled checkbox is equally
  correct for "include in comparison" and needs no exception.
- **Reuse the existing `Dialog`** — it hand-rolls focus trap and scroll lock;
  the guide's native `<dialog>` gives that for free and correctly. Migrating
  `Dialog` itself is out of scope.
- **Re-check through `/api/tire?productId` × 3** — no new route, but three
  requests and three full records (more data than needed) per opening; one
  `IN` query returning three booleans and prices is cheaper and leaks less.
- **`localStorage` like the cart** — rejected by D5 (stale sold tires days
  later).

## Risks

- **Listing payload grows** by three short strings per tire (~2 KB per page of
  24) — acceptable.
- **Floating elements overlap** — the tray height variable must be honoured by
  every fixed bottom element; checked at 390 px on `/tires` (floating search +
  chat) and other listings.
- **Hydration**: picks are restored after mount, so checkboxes render
  unchecked on the server and update on the client (no mismatch warning).
- **Dialog support**: `<dialog>` + `showModal` are Baseline; fine for our
  Baseline-2025 target.

## Out of scope

- Comparing from the tire page or the cart; sharing comparisons; sets.
- Migrating the old `Dialog` component.

## Modern Web Guidance consulted

- `ui-components/dialog` — native modal `<dialog>`, no `role`/`aria-modal`/
  focus trap, scroll containment without locking `body`.
- `ui-atoms/responsive-table` — semantic table, sticky row headers for
  horizontal scroll on phones.
- `forms/forms` — checkbox for a binary, reversible choice.
- `ui-behaviors/animate-element-entry-exit` — tray entry.

---

_The concrete steps live in [tasks.md](./tasks.md)._
