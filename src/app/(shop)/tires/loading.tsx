import ResultsSkeleton from '@/app/ui/components/TireCardSkeleton/TireCardSkeleton';

/**
 * What a buyer sees the instant they change page, apply or clear a filter.
 *
 * `/tires` renders on the server on every request, and without this file the
 * App Router showed nothing at all until that render finished: the click gave
 * no sign it had registered. On 2026-09-25 that wait reached 30 s under crawler
 * load, and is still seconds on a normal day, because a single render runs
 * 9–11 catalog queries.
 *
 * The shape follows `page.tsx` — dark hero, then the rail beside the results —
 * so the real page replaces it in place instead of shifting it. The results
 * placeholder is `ResultsSkeleton`, whose width `resultsWidth.guard.test.ts`
 * already holds to the real list's.
 */
export default function Loading() {
  return (
    <main className="bg-gray-50">
      <div aria-hidden="true" className="h-56 bg-[#0a0a0a] sm:h-64" />

      <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mt-6 grid gap-8 lg:grid-cols-[15rem_1fr]">
          <div aria-hidden="true" className="hidden animate-pulse space-y-4 lg:block">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-gray-200" />
            ))}
          </div>
          <div className="min-w-0">
            <ResultsSkeleton />
          </div>
        </div>
      </div>
    </main>
  );
}
