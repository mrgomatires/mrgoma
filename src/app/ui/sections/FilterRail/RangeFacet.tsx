'use client';

import { FC, useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import RangeSlider from '@/app/ui/components/RangeSlider/RangeSlider';
import { useResultsNavigation } from '@/app/ui/components/ResultsNavigation/ResultsNavigation';
import { setRange } from '@/app/utils/filterHref';

export type RangeOption = {
  id: string;
  label: string;
  count: number;
  href: string;
  applied: boolean;
  min?: number;
  max?: number;
};

interface RangeFacetProps {
  title: string;
  /** The key this group reports under. See `FacetGroup`. */
  trackGroup: string;
  options: RangeOption[];
  /** The lowest and highest values in the catalogue — the slider's travel. */
  bounds: [number, number];
  /** What is applied right now; an absent end means "not set". */
  value: [number | undefined, number | undefined];
  minParam: string;
  maxParam: string;
  basePath: string;
  /** The current query string, so a change preserves every other filter. */
  search: string;
  /**
   * How to write a value — a name, not a function.
   *
   * A formatter passed as a prop crosses the server/client boundary, and
   * functions cannot: React throws "Functions cannot be passed directly to
   * Client Components" **at request time**. `tsc`, `lint`, `npm run build` and
   * the whole test suite stayed green while `/tires` answered 500, because none
   * of them render a server component into a client one. Naming the format keeps
   * the prop serialisable.
   */
  unit?: 'currency' | 'percent';
}

const FORMATTERS: Record<'currency' | 'percent', (value: number) => string> = {
  currency: value => `$${value}`,
  percent: value => `${value}%`,
};

/**
 * A range filter with two ways in and **one state**.
 *
 * The named bands carry counts, survive without JavaScript and can be shared as
 * a URL; the slider answers the buyer who wants $140 to $185 exactly. Offering
 * both is the thing that usually goes wrong — two controls, two pieces of state,
 * and eventually they disagree about the same filter.
 *
 * They cannot here, because there is only one piece of state: `minParam` and
 * `maxParam` in the URL. A band **writes** those numbers; the band that reads as
 * applied is **derived** from them. Nothing stores "which band is selected", so
 * there is nothing to fall out of sync — and dragging the slider onto a band's
 * exact bounds lights that band up, because that is genuinely the same filter.
 */
const RangeFacet: FC<RangeFacetProps> = ({
  title,
  trackGroup,
  options,
  bounds,
  value,
  minParam,
  maxParam,
  basePath,
  search,
  unit = 'currency',
}) => {
  const format = FORMATTERS[unit];

  /**
   * A span the buyer set by hand matches no band, so nothing in the list would
   * show it. The disclosure opens itself rather than hiding the only control
   * that says what is applied.
   */
  const handSet =
    (value[0] !== undefined || value[1] !== undefined) && !options.some(o => o.applied);
  // On /tires tracked as pending (061); on /tires/used a plain push, as before.
  const { navigate } = useResultsNavigation();
  const [low, high] = bounds;
  const current: [number, number] = [value[0] ?? low, value[1] ?? high];
  const [draft, setDraft] = useState<[number, number]>(current);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The URL is the source of truth: when it changes — a band was picked, a chip
  // removed, the Back button pressed — the slider follows it.
  useEffect(() => {
    setDraft([value[0] ?? low, value[1] ?? high]);
  }, [value, low, high]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const commit = (next: [number, number]) => {
    // A span covering everything is not a filter; write nothing rather than
    // pinning the catalogue's current extremes into a shareable URL.
    const min = next[0] <= low ? undefined : next[0];
    const max = next[1] >= high ? undefined : next[1];
    navigate(`${basePath}${setRange(search, minParam, maxParam, min, max)}`);
  };

  const handleChange = (next: [number, number]) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    // Dragging emits continuously; navigating on every pixel would be unusable.
    timer.current = setTimeout(() => commit(next), 400);
  };

  return (
    <section className="border-b border-gray-200 pb-4 last:border-b-0">
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
        {title}
      </h3>

      <ul className="flex flex-col">
        {options.map(option => (
          <li key={option.id}>
            <Link
              href={option.href}
              aria-current={option.applied ? 'true' : undefined}
              data-track="filter_apply"
              data-track-category="tires_filter"
              data-track-label={`${trackGroup}:${option.id}`}
              data-track-filter-group={trackGroup}
              data-track-filter-value={option.id}
              className={`flex items-center justify-between gap-2 rounded-md px-2 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 lg:py-1.5 ${
                option.applied
                  ? 'bg-green-50 font-semibold text-green-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-green-700'
              }`}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate">{option.label}</span>
                {option.applied && (
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

      {/*
       * The bands are the filter; the slider is the escape hatch for the buyer
       * who wants $140 to $185 exactly. Folded away because it is the rarer of
       * the two and it was costing ~80 px in a 240 px rail — twice over, since
       * price and tread life both have one.
       */}
      <details className="mt-2 group" open={handSet}>
        <summary className="-mx-1 flex min-h-[44px] cursor-pointer list-none items-center gap-1 rounded-md px-1 text-xs font-semibold text-gray-500 hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 lg:min-h-0 lg:py-0.5">
          <span aria-hidden="true" className="transition-transform group-open:rotate-180">
            ▾
          </span>
          Set an exact range
        </summary>
        <div className="mt-2 px-2">
          <div className="mb-1.5 flex items-center justify-between text-xs tabular-nums text-gray-500">
            <span>{format(draft[0])}</span>
            <span>{format(draft[1])}</span>
          </div>
          <RangeSlider
            min={low}
            max={high}
            value={draft}
            onChange={handleChange}
            label={title.toLowerCase()}
            format={format}
          />
        </div>
      </details>
    </section>
  );
};

export default RangeFacet;
