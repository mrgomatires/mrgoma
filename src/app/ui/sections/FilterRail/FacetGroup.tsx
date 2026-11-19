import { FC } from 'react';

import Link from 'next/link';

export type FacetOption = {
  /** The stored value — a brand name, a rim size, a bucket id. */
  value: string;
  /** What the buyer reads. */
  label: string;
  /** How many tires selecting this returns. */
  count: number;
  href: string;
  applied: boolean;
  /**
   * Words for screen readers after a shorthand label (`8/32"+` → "minimum
   * tread", 052). Appended, never replacing it: the accessible name must
   * contain the visible text (WCAG 2.5.3).
   */
  srHint?: string;
};

interface FacetGroupProps {
  title: string;
  /**
   * The key this group reports under, e.g. `rim`.
   *
   * Not the title. Analytics labels are read months later next to each other,
   * and titles change with the copy — `Rim size` today, `Wheel size` tomorrow —
   * which silently splits one metric in two. This is the same key
   * `AppliedFilters` reports on removal, so applying and removing a filter share
   * a vocabulary.
   */
  trackGroup: string;
  options: FacetOption[];
  /**
   * Whether picking a second option **adds** to the first rather than replacing
   * it.
   *
   * This is not decoration. With Pirelli applied, the Bridgestone option reads
   * "Bridgestone 440" — and clicking it returns **1.397**, because the two
   * combine with OR. The count is true (there are 440 Bridgestones under the
   * other filters) and the result is true (Pirelli *or* Bridgestone), but a
   * plain list of links with a number beside each reads as "click this and you
   * will see 440". Found by clicking it.
   *
   * The box makes the addition visible, which is what every catalogue that
   * offers OR facets does and what the checkbox filters this rail replaced
   * already did.
   */
  multiSelect?: boolean;
  /** Rendered above the options — a search box lives here. */
  children?: React.ReactNode;
  className?: string;
  /**
   * Fold the group away behind its heading.
   *
   * Width, profile and rim hold 22, 17 and 14 values. Rendered flat they were
   * **53 rows** a buyer had to scroll past to reach price — in a 240 px rail
   * that is most of a screen spent on three lists most people never open,
   * because they already know their size and type it.
   *
   * A native `<details>`, so it folds without JavaScript and the browser owns
   * the disclosure semantics.
   */
  collapsible?: boolean;
  /** Shown in the summary when folded — what is applied, if anything. */
  summaryValue?: string;
  /** Open on load. A group with something applied must not hide it. */
  defaultOpen?: boolean;
}

/**
 * One group of counted filter links.
 *
 * **Every option carries its count**, because a facet without one makes the
 * buyer guess whether clicking it will empty the page — and on this catalogue
 * that guess was wrong four times in five: of the 1.610 brand × rim
 * combinations `/tires` offered, only 338 had stock.
 *
 * **Every option is a `<Link>`, not a button.** Filtering is navigation: the
 * result is a real URL that can be shared, indexed and reached without
 * JavaScript. That is also why the applied option is marked with `aria-current`
 * rather than `aria-pressed` — `aria-pressed` belongs to a button role, and
 * `/tires` was emitting **254 invalid ones** on a single page before this
 * feature.
 *
 * A server component: it holds no state and must not ship to the browser.
 */
const FacetGroup: FC<FacetGroupProps> = ({
  title,
  trackGroup,
  options,
  multiSelect = false,
  children,
  className = '',
  collapsible = false,
  summaryValue,
  defaultOpen = false,
}) => {
  // A group with a single option cannot narrow anything — every tire already has
  // that value — so it is noise rather than a filter.
  if (options.length < 2 && !children) return null;

  const body = (
    <>
      {children}
      <ul className="flex flex-col">
        {options.map(option => (
          <li key={option.value}>
            <Link
              href={option.href}
              aria-current={option.applied ? 'true' : undefined}
              data-track="filter_apply"
              data-track-category="tires_filter"
              data-track-label={`${trackGroup}:${option.value}`}
              data-track-filter-group={trackGroup}
              data-track-filter-value={option.value}
              className={`flex items-center justify-between gap-2 rounded-md px-2 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 lg:py-1.5 ${
                option.applied
                  ? 'bg-green-50 font-semibold text-green-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-green-700'
              }`}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {multiSelect && (
                  // Decoration, not a control: the link already announces its
                  // state through `aria-current`, and a checkbox role here would
                  // promise an interaction the element does not have.
                  <span
                    aria-hidden="true"
                    className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px] border text-[9px] font-bold leading-none ${
                      option.applied
                        ? 'border-green-700 bg-green-700 text-white'
                        : 'border-gray-300 bg-white text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                )}
                <span className="truncate">
                  {option.label}
                  {/* The space is its own text node, outside the span (the 023 lesson). */}
                  {option.srHint && (
                    <>
                      {' '}
                      <span className="sr-only">{option.srHint}</span>
                    </>
                  )}
                </span>
                {option.applied && !multiSelect && (
                  <span aria-hidden="true" className="shrink-0 text-green-800">
                    ×
                  </span>
                )}
              </span>
              <span
                className={`shrink-0 text-xs tabular-nums ${
                  option.applied ? 'text-green-800' : 'text-gray-500'
                }`}
              >
                {option.count.toLocaleString('en-US')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );

  if (collapsible) {
    return (
      <section className={`border-b border-gray-200 pb-4 last:border-b-0 ${className}`.trim()}>
        <details open={defaultOpen} className="group">
          <summary className="-mx-1 flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-1 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 lg:py-0.5">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
              {title}
            </h3>
            <span className="flex items-center gap-1.5">
              {summaryValue && (
                <span className="text-xs font-semibold text-green-800">{summaryValue}</span>
              )}
              <span
                aria-hidden="true"
                className="text-gray-500 transition-transform group-open:rotate-180"
              >
                ▾
              </span>
            </span>
          </summary>
          <div className="mt-2">{body}</div>
        </details>
      </section>
    );
  }

  return (
    <section className={`border-b border-gray-200 pb-4 last:border-b-0 ${className}`.trim()}>
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
        {title}
      </h3>
      {body}
    </section>
  );
};

export default FacetGroup;
