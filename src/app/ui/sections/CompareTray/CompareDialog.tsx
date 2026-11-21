'use client';

import { FC, useEffect, useId, useMemo, useRef, useState } from 'react';

import { useCart } from '@/app/context/CartContext';
import { useCompare } from '@/app/context/CompareContext';
import { useAddTireToCart } from '@/app/hooks/useAddTireToCart';
import IntentPrefetchLink from '@/app/ui/components/IntentPrefetchLink/IntentPrefetchLink';
import { compareRows, MISSING, sameSize } from '@/app/utils/compare';
import { brandName, modelName } from '@/app/utils/tireNaming';
import { buildTireSlug } from '@/app/utils/tireSlug';
import { treadDepthLabel } from '@/app/utils/tireSpecs';

import CompareThumb, { CompareBrand } from './CompareThumb';

type Check = { available: boolean; price: number | null };
type Checks =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'done'; byId: Record<string, Check> };

/**
 * The comparison (feature 051): up to three tires side by side.
 *
 * A native `<dialog>` opened with `showModal()` (modern-web-guidance, dialog):
 * the browser makes the page inert, keeps focus inside, closes on Esc and
 * returns focus to the Compare button — none of it hand-built. `closedby="any"`
 * also closes it on a click outside. Full screen on a phone.
 *
 * A real table: one column per tire (`th scope="col"`), one row per fact
 * (`th scope="row"`, sticky so the facts stay put while a phone scrolls the
 * tires sideways). The better value of a row says "Best" in words, not only in
 * colour.
 *
 * On opening, availability and price are re-checked once (D6); until the answer
 * arrives the saved data shows.
 */
const CompareDialog: FC = () => {
  const compare = useCompare();
  const { isInCart } = useCart();
  const addTireToCart = useAddTireToCart();
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const uid = useId();
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [checks, setChecks] = useState<Checks>({ state: 'loading' });

  const items = useMemo(() => compare?.items ?? [], [compare?.items]);
  const ids = items.map(i => i.tire.id).join(',');

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    // The safe first focus (modern-web-guidance, dialog), not "Clear": React
    // does not write `autofocus` to the DOM, so the dialog cannot see it.
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!ids) return;
    let alive = true;
    setChecks({ state: 'loading' });
    fetch(`/api/tires/compare?ids=${encodeURIComponent(ids)}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((body: { tires: Array<{ id: string } & Check> }) => {
        if (!alive) return;
        const byId: Record<string, Check> = {};
        for (const t of body.tires ?? []) byId[t.id] = { available: t.available, price: t.price };
        setChecks({ state: 'done', byId });
      })
      .catch(() => alive && setChecks({ state: 'error' }));
    return () => {
      alive = false;
    };
  }, [ids]);

  if (!compare) return null;

  const checkOf = (id: string) => (checks.state === 'done' ? checks.byId[id] : undefined);
  // The table reads current prices once they are known.
  const tires = items.map(({ tire }) => {
    const c = checkOf(tire.id);
    return c?.price != null ? { ...tire, price: String(c.price) } : tire;
  });
  const soldIdx = new Set(tires.flatMap((t, i) => (checkOf(t.id)?.available === false ? [i] : [])));
  const rows = compareRows(tires, soldIdx).filter(r => !onlyDiff || r.differs);
  const mixedSizes = !sameSize(tires);
  const headingId = `${uid}-title`;

  const featureOf = (t: (typeof tires)[number], name: string) =>
    t.features?.find(f => f.name.toLowerCase() === name.toLowerCase())?.value;

  return (
    <dialog
      ref={ref}
      aria-labelledby={headingId}
      // Esc, the back gesture and a click outside close it (modern-web-guidance).
      {...{ closedby: 'any' }}
      onClose={compare.close}
      className="compare-dialog"
      // Sized to the tires shown: two tires do not sit in a three-tire frame.
      style={{ ['--compare-n' as string]: tires.length }}
    >
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <h2
          id={headingId}
          className="flex flex-1 items-center gap-2 text-lg font-bold text-gray-900"
        >
          <CompareIcon className="h-5 w-5 text-gray-900" />
          {`Compare (${tires.length})`}
        </h2>
        <button
          type="button"
          onClick={compare.clear}
          className="min-h-11 cursor-pointer rounded-full bg-gray-100 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
        >
          Clear
        </button>
        <form method="dialog">
          <button
            type="submit"
            aria-label="Close comparison"
            ref={closeRef}
            className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-gray-300 text-gray-900 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.25}
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </form>
      </div>

      {/* ── Notices ── */}
      {(mixedSizes || checks.state === 'error') && (
        <div className="flex flex-col gap-2 px-4 pt-4 sm:px-6">
          {mixedSizes && (
            <p className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              These tires are different sizes — only the size approved for your car fits.
            </p>
          )}
          {checks.state === 'error' && (
            <p className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
              We couldn&apos;t confirm availability right now — the tire page and checkout always
              check.
            </p>
          )}
        </div>
      )}

      {/* Right gutter = the column's own px-2 + this, matching the header's px-4 / px-6. */}
      <div className="compare-table-wrap mt-4 overflow-auto pb-6 pr-2 sm:pr-4">
        <table className="compare-table border-separate border-spacing-0 text-sm">
          <caption className="sr-only">
            {`Comparison of ${tires.length} tires: one column per tire, one row per fact`}
          </caption>
          <thead>
            <tr>
              {/* The corner above the fact names holds the switch: no empty gap
                  beside the cards, and the control sits by the rows it filters. */}
              <td className="compare-fact pb-4 pl-4 pr-2 align-top sm:pl-6">
                <label className="compare-switch flex min-h-11 cursor-pointer flex-col items-start gap-2 pt-1 text-xs font-semibold leading-snug text-gray-800">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={onlyDiff}
                    onChange={e => setOnlyDiff(e.target.checked)}
                  />
                  Show only differences
                </label>
              </td>
              {tires.map(t => {
                const c = checkOf(t.id);
                const sold = c ? !c.available : false;
                const name = [brandName(t.brand), t.model ? modelName(t.model) : '']
                  .filter(Boolean)
                  .join(' ');
                const inCart = isInCart(t.id);
                const tread = featureOf(t, 'Tread depth');
                const life = featureOf(t, 'Remaining life');
                const patched = featureOf(t, 'Patched');
                const ratings = [t.loadIndex, t.speedIndex].filter(Boolean).join('');
                const isNew = (t.condition ?? '').toLowerCase() === 'new';
                return (
                  <th
                    key={t.id}
                    scope="col"
                    className="compare-col px-2 pb-4 text-left align-top font-normal"
                  >
                    {/* Mr. Goma's own card language (the listing's TireCard): condition
                        accent on the left, photo on top with condition and size pills,
                        the dark spec strip with lime labels, the site's green CTA. */}
                    <article
                      className="compare-card overflow-hidden"
                      style={{ borderLeftWidth: 4, borderLeftColor: isNew ? '#22c55e' : '#f59e0b' }}
                    >
                      <div className="relative bg-gray-50">
                        <CompareThumb
                          src={t.imageSrc}
                          className="aspect-[2/1] h-auto w-full object-cover"
                        />
                        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              isNew
                                ? 'border border-green-300 bg-green-100 text-green-800'
                                : 'border border-amber-300 bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isNew ? 'New' : 'Used'}
                          </span>
                          <span className="rounded-full bg-[#0a0a0a] px-2.5 py-0.5 text-xs font-black tracking-wider text-[#9dfb40]">
                            {t.size}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => compare.remove(t.id)}
                          aria-label={`Remove ${name} ${t.size ?? ''} from comparison`.trim()}
                          className="group/remove absolute right-1 top-1 grid h-11 w-11 cursor-pointer place-items-center rounded-full focus-visible:outline-none"
                        >
                          {/* Solid white disc, dark cross, ring and shadow: visible on any
                              photo (WCAG 1.4.11, 3:1 for a control's boundary). */}
                          <span
                            aria-hidden="true"
                            className="grid h-9 w-9 place-items-center rounded-full bg-white text-gray-900 shadow-md ring-1 ring-black/15 group-hover/remove:bg-gray-100 group-focus-visible/remove:ring-2 group-focus-visible/remove:ring-green-600"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2.5}
                              strokeLinecap="round"
                            >
                              <path d="M6 6l12 12M18 6L6 18" />
                            </svg>
                          </span>
                        </button>
                        {sold && (
                          <span className="absolute inset-x-0 bottom-0 bg-[#0a0a0a]/80 py-1 text-center text-xs font-bold uppercase tracking-widest text-white">
                            Sold
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col gap-1.5 px-4 pb-3 pt-2.5">
                        {/* Fixed-height lines (logo, two-line name, ratings) so the
                            price and buttons line up across the cards. */}
                        <div className="flex h-6 items-center">
                          <CompareBrand
                            brand={t.brand}
                            brandId={t.brandId}
                            label={brandName(t.brand)}
                          />
                        </div>
                        {/* The logo says the brand; the heading is the model. With the
                            logo's alt text the column is still named "Pirelli P Zero…". */}
                        <h3 className="line-clamp-2 min-h-10 text-[15px] font-bold leading-5 text-gray-900">
                          {t.model ? modelName(t.model) : name}
                        </h3>
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-2xl font-black leading-none text-gray-900">
                            <span className="text-green-600">$</span>
                            {t.price}
                          </p>
                          {ratings && (
                            <p className="text-xs text-gray-600">{`Load/speed ${ratings}`}</p>
                          )}
                        </div>
                        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                          {!sold && (
                            <button
                              type="button"
                              onClick={() => {
                                // The cart opens on add, and nothing can show above a
                                // modal dialog: close the comparison so the cart is
                                // seen at once. The picks stay in the tray.
                                compare.close();
                                addTireToCart(t);
                              }}
                              disabled={inCart}
                              className={`min-h-11 grow-[3] basis-28 rounded-full px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 ${
                                inCart
                                  ? 'cursor-default bg-gray-100 text-gray-700'
                                  : 'cursor-pointer bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {inCart ? '✓ In cart' : 'Add to cart'}
                            </button>
                          )}
                          <IntentPrefetchLink
                            href={`/tires/${buildTireSlug(t.id, t.brand ?? '', t.size ?? '')}`}
                            // The tire page opens behind a modal otherwise: close the
                            // comparison as the link is followed (the picks stay in the tray).
                            onClick={compare.close}
                            data-track="compare_view_tire"
                            data-track-category="compare"
                            data-track-tire-id={t.id}
                            className={`inline-flex min-h-11 grow items-center justify-center rounded-full border border-green-700 px-4 text-sm font-semibold text-green-700 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600`}
                          >
                            View tire
                          </IntentPrefetchLink>
                        </div>
                      </div>

                      {/* The listing card's dark spec strip. */}
                      <dl className="grid grid-cols-3 divide-x divide-white/10 bg-[#0a0a0a]">
                        {[
                          ['Tread', tread ? treadDepthLabel(tread) : '—'],
                          ['Life', life ?? '—'],
                          ['Patched', patched ?? '—'],
                        ].map(([label, value]) => (
                          <div key={label} className="flex flex-col gap-0.5 px-3 py-2">
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-[#9dfb40]/70">
                              {label}
                            </dt>
                            <dd className="text-sm font-bold text-white">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </article>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.key}>
                <th
                  scope="row"
                  className="compare-fact py-3 pl-4 pr-2 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 sm:pl-6"
                >
                  {row.label}
                  {row.key === 'size' && mixedSizes && ' '}
                  {row.key === 'size' && mixedSizes && (
                    <span className="mt-0.5 block text-[10px] normal-case tracking-normal text-amber-700">
                      differs
                    </span>
                  )}
                </th>
                {row.values.map((v, i) => {
                  const isBest = row.best.includes(i);
                  return (
                    <td
                      key={tires[i].id}
                      // Starts where the card's text does: px-2 column + 4px accent + px-4.
                      className={`py-3 pl-[1.75rem] pr-2 text-[15px] tabular-nums ${
                        isBest
                          ? 'font-bold text-gray-900'
                          : v === MISSING
                            ? 'text-gray-400'
                            : 'text-gray-800'
                      }`}
                    >
                      {v}
                      {isBest && (
                        <>
                          {' '}
                          <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-[#9dfb40] px-2 py-0.5 align-middle text-[10px] font-black uppercase tracking-wide text-[#0a0a0a]">
                            <span aria-hidden="true">✓</span>Best
                          </span>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-600">These tires don&apos;t differ.</p>
        )}
      </div>
    </dialog>
  );
};

const CompareIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </svg>
);
export default CompareDialog;
