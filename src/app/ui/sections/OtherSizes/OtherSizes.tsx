import Link from 'next/link';

import type { SingleTire } from '@/app/interfaces/tires';
import { otherSizesFor, priceLabel } from '@/app/utils/otherSizes';
import { brandName, modelName } from '@/app/utils/tireNaming';
import { buildTireSlug } from '@/app/utils/tireSlug';
import { getCachedModelSizeGroups } from '@/repositories/otherSizesRepository';

import OtherSizesTracker from './OtherSizesTracker';

/**
 * "Other sizes of this tire" on the tire page (feature 049).
 *
 * The sizes in which the same brand and model are for sale, grouped by rim,
 * each with its price, how many there are and a link to the cheapest one. From
 * one cached query for the whole catalog (no query per page view).
 *
 * Built as an accordion of adjacent `<details>` (modern-web-guidance,
 * accordion): not exclusive, no heading inside `summary`, the marker beside the
 * label. Closed groups keep their links in the HTML, so search engines and
 * in-page search still find them; every link is an existing tire page.
 *
 * Mounted by `DetailView` inside `Suspense`, like 041's set block — database
 * code stays out of the client barrel. Renders nothing when the model has no
 * other size or the lookup fails.
 */
export default async function OtherSizes({ tire }: { tire: SingleTire }) {
  let view;
  try {
    view = otherSizesFor(
      {
        id: String(tire.id),
        brand: tire.brand,
        model2: tire.model2,
        size: tire.size,
        status: tire.status,
      },
      await getCachedModelSizeGroups()
    );
  } catch {
    return null;
  }
  if (!view) return null;

  const name = [brandName(tire.brand), tire.model2 ? modelName(tire.model2) : '']
    .filter(Boolean)
    .join(' ');

  return (
    <section aria-labelledby="other-sizes-heading" className="mt-10">
      <h2 id="other-sizes-heading" className="text-xl font-bold text-gray-900">
        Other sizes of this tire
      </h2>
      <p className="mt-1 mb-4 text-sm text-gray-600">
        {`${name} in ${view.otherCount} more ${view.otherCount === 1 ? 'size' : 'sizes'}. Check your size on the tire's sidewall before you buy.`}
      </p>

      <OtherSizesTracker>
        {view.groups.map(group => (
          <details
            key={group.rim}
            data-rim={group.rim}
            open={group.open}
            className="group rounded-lg border border-gray-200 bg-white"
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 py-2 font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 rounded-lg [&::-webkit-details-marker]:hidden">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 shrink-0 -rotate-90 text-gray-500 group-open:rotate-0 motion-safe:transition-transform"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              {`${group.rim}" rim`}
              <span className="text-sm font-normal text-gray-500">
                {`· ${group.sizes.length} ${group.sizes.length === 1 ? 'size' : 'sizes'}`}
              </span>
            </summary>

            <ul className="divide-y divide-gray-100 border-t border-gray-100">
              {group.sizes.map(s =>
                s.current ? (
                  <li
                    key={s.size}
                    aria-current="true"
                    className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 bg-green-50 px-4 py-2 text-sm"
                  >
                    <span className="font-semibold tabular-nums text-green-800">{s.size}</span>{' '}
                    <span className="font-medium text-green-800">This tire</span>
                  </li>
                ) : (
                  <li key={s.size}>
                    <Link
                      href={`/tires/${buildTireSlug(s.tireId, tire.brand ?? '', s.size)}`}
                      data-track="other_size_select"
                      data-track-category="detail"
                      data-track-label={s.size}
                      data-track-from={tire.size}
                      data-track-tire-id={s.tireId}
                      className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 px-4 py-2 text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-600"
                    >
                      <span className="font-semibold tabular-nums text-green-700 underline-offset-2 hover:underline">
                        {s.size}
                      </span>{' '}
                      {/* Real spaces between the parts: flex gaps are not text, and the
                          link's name would read "New$220· 1 available" (see 023). */}
                      <span className="flex items-center gap-2 text-gray-700">
                        {s.isNew && (
                          <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs font-semibold text-white">
                            New
                          </span>
                        )}
                        {s.isNew && ' '}
                        <span className="font-semibold text-gray-900">{priceLabel(s)}</span>{' '}
                        <span className="text-gray-500">{`· ${s.units} available`}</span>
                      </span>
                    </Link>
                  </li>
                )
              )}
            </ul>
          </details>
        ))}
      </OtherSizesTracker>
    </section>
  );
}
