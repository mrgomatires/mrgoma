'use client';

import { FC, FormEvent, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ButtonSearch } from '@/app/ui/components';
import TireSizeTextField, {
  isCompleteTireSize,
} from '@/app/ui/components/TireSizeTextField/TireSizeTextField';
import { trackEvent } from '@/app/utils/analytics';
import { closestSizes, findStocked, parseSizeQuery, sizeLabel } from '@/app/utils/sizeQuery';
import { slugify } from '@/app/utils/tireSlug';

type Outcome = { kind: 'idle' } | { kind: 'not_found'; label: string; closest: string[] };

/**
 * "Find your size" on the size index (feature 050).
 *
 * The same typed field as the home page's "Search by Text" tab
 * (`TireSizeTextField`): digits only, formatted as you type (`2555518` →
 * `255/55/18`), no autocomplete — one component, two uses (owner review).
 * Search is enabled once the size is complete, as on home.
 *
 * The match happens here, against the sizes the page passed in: a size we sell
 * opens its page; one we don't gets the closest sizes we have (D3). No request
 * to the server; analytics get the size, which by construction is digits only.
 */
const SizeSearch: FC<{ sizes: readonly string[] }> = ({ sizes }) => {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const isComplete = isCompleteTireSize(value);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = isComplete ? parseSizeQuery(value) : null;
    if (!parsed) return;
    const label = `${parsed.w}/${parsed.s}/${parsed.d}`;
    const stocked = findStocked(parsed, sizes);
    trackEvent({
      action: 'size_index_search',
      category: 'size_index',
      label,
      params: { result: stocked ? 'found' : 'not_found' },
    });
    if (stocked) {
      router.push(`/tires/size/${slugify(stocked)}`);
      return;
    }
    setOutcome({
      kind: 'not_found',
      label: sizeLabel(parsed),
      closest: closestSizes(parsed, sizes),
    });
  };

  return (
    <search className="block">
      <form onSubmit={onSubmit} className="space-y-6">
        <TireSizeTextField
          value={value}
          onValueChange={next => {
            setValue(next);
            setOutcome({ kind: 'idle' });
          }}
        />
        <ButtonSearch type="submit" disabled={isComplete} />
      </form>

      <div role="status" className="mt-3">
        {outcome.kind === 'not_found' && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
            <p className="font-semibold">We don&apos;t carry {outcome.label} right now.</p>
            {outcome.closest.length > 0 && (
              <>
                <p className="mt-1">These are the closest sizes we have:</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {outcome.closest.map(size => (
                    <li key={size}>
                      <Link
                        href={`/tires/size/${slugify(size)}`}
                        data-track="size_index_select"
                        data-track-category="size_index"
                        data-track-label={size}
                        data-track-source="closest"
                        className="inline-flex min-h-11 items-center rounded-md border border-gray-300 bg-white px-3 font-semibold tabular-nums text-green-700 hover:border-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                      >
                        {size}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-2 text-gray-600">
              Check the size on your tire&apos;s sidewall or your car&apos;s door jamb before you
              buy — a different size must be approved for your car.
            </p>
            <p className="mt-2">
              <Link
                href="/tires"
                className="font-semibold text-green-700 underline underline-offset-2 hover:text-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 rounded-sm"
              >
                Use the step-by-step size picker →
              </Link>
            </p>
          </div>
        )}
      </div>
    </search>
  );
};

export default SizeSearch;
