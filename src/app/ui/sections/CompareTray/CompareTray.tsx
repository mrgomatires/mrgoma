'use client';

import { FC, useEffect, useRef } from 'react';

import { usePathname } from 'next/navigation';

import { useCompare } from '@/app/context/CompareContext';
import { trackEvent } from '@/app/utils/analytics';
import { MAX_COMPARE, sameSize } from '@/app/utils/compare';
import { brandName, modelName } from '@/app/utils/tireNaming';

import CompareDialog from './CompareDialog';
import CompareThumb from './CompareThumb';

/**
 * The compare tray (feature 051): the tires picked for comparison, at the bottom
 * of the screen, while at least one is picked.
 *
 * A bar, not a modal — the listing stays usable. It publishes its height as
 * `--compare-tray-h` on `<html>` so fixed bottom controls (the chat button, the
 * `/tires` floating search) and the page's end move up instead of hiding behind
 * it. Rendered by the store layout only, and nothing on `/checkout` (D7).
 */
const CompareTray: FC = () => {
  const compare = useCompare();
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);

  // A comparison belongs to the page it was opened on: any navigation — a link
  // in it, Back, the header — closes it, so the next page is never under it.
  const lastPath = useRef(pathname);
  const close = compare?.close;
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    close?.();
  }, [pathname, close]);

  const items = compare?.items ?? [];
  const hidden = !compare || items.length === 0 || pathname?.startsWith('/checkout');

  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (hidden || !el) {
      root.style.setProperty('--compare-tray-h', '0px');
      return;
    }
    const set = () => root.style.setProperty('--compare-tray-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty('--compare-tray-h', '0px');
    };
  }, [hidden]);

  if (hidden || !compare) return null;

  const tires = items.map(i => i.tire);
  const canCompare = items.length >= 2;
  const openComparison = () => {
    trackEvent({
      action: 'compare_open',
      category: 'compare',
      params: { count: items.length, same_size: sameSize(tires) },
    });
    compare.open();
  };

  return (
    <>
      <aside
        ref={ref}
        aria-label="Tires to compare"
        className="compare-tray fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:py-3">
          <ul className="flex min-w-0 flex-1 items-center gap-2">
            {items.map(({ tire }) => {
              const name = [brandName(tire.brand), tire.model ? modelName(tire.model) : '']
                .filter(Boolean)
                .join(' ');
              return (
                <li
                  key={tire.id}
                  className="flex min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-white p-1 sm:flex-1 sm:p-2"
                >
                  <CompareThumb
                    src={tire.imageSrc}
                    className="h-10 w-10 shrink-0 rounded object-cover"
                  />
                  <div className="hidden min-w-0 flex-1 sm:block">
                    <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                    <p className="truncate text-xs text-gray-600">
                      {tire.size} · ${tire.price}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => compare.remove(tire.id)}
                    aria-label={`Remove ${name} ${tire.size ?? ''} from comparison`.trim()}
                    className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 sm:h-8 sm:w-8"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </li>
              );
            })}
            {Array.from({ length: MAX_COMPARE - items.length }, (_, i) => (
              <li
                key={`empty-${i}`}
                className="hidden flex-1 items-center justify-center rounded-lg border border-dashed border-gray-300 p-2 text-xs text-gray-500 sm:flex sm:min-h-[58px]"
              >
                Add another tire to compare
              </li>
            ))}
          </ul>

          <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
            <p role="status" className="text-xs text-gray-600">
              {compare.notice ??
                (items.length >= MAX_COMPARE
                  ? `${items.length} of ${MAX_COMPARE} tires · remove one to add another`
                  : `${items.length} of ${MAX_COMPARE} tires`)}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={compare.clear}
                className="hidden min-h-11 cursor-pointer rounded-full px-3 text-sm font-semibold text-gray-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 sm:inline-flex sm:items-center"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={openComparison}
                disabled={!canCompare}
                className={`min-h-11 rounded-full px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 ${
                  canCompare
                    ? 'cursor-pointer bg-green-600 text-white hover:bg-green-700'
                    : 'cursor-not-allowed bg-gray-300 text-gray-600'
                }`}
              >
                {canCompare ? 'Compare' : 'Pick one more'}
              </button>
            </div>
          </div>
        </div>
      </aside>
      {compare.isOpen && <CompareDialog />}
    </>
  );
};

export default CompareTray;
