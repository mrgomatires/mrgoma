'use client';

import { FC, useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { brandName } from '@/app/utils/tireNaming';
import { slugify } from '@/app/utils/tireSlug';

type RouteVariant = 'browse' | 'new' | 'used';

interface BrowseFiltersProps {
  brands: string[];
  variant?: RouteVariant;
  activeBrand?: string;
  className?: string;
}

export const BrowseFilters: FC<BrowseFiltersProps> = ({
  brands,
  variant = 'browse',
  activeBrand,
  className = '',
}) => {
  const isNew = variant === 'new';
  const isUsed = variant === 'used';
  const isBrowse = variant === 'browse';

  return (
    <section className={`bg-white border-b border-gray-100 py-5 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-4">
        {brands.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.18em] mb-2.5">
              Browse by brand
            </p>
            {isBrowse && !activeBrand ? (
              <BrandScrollerWithSearchParam brands={brands} />
            ) : (
              <BrandScroller brands={brands} activeBrand={activeBrand} />
            )}
          </div>
        )}
        <div>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.18em] mb-2.5">
            Browse by rim size
          </p>
          <div className="flex gap-2 flex-wrap">
            {isBrowse ? <RimSizes /> : <RimSizesPlain />}

            <a
              href={isNew ? '/tires' : '/tires/new'}
              aria-current={isNew ? 'true' : undefined}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors duration-150 ${
                isNew
                  ? 'border-green-700 bg-green-700 text-white hover:bg-green-800 hover:border-green-800'
                  : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-600 hover:text-white hover:border-green-600'
              }`}
            >
              Shop New
              {/* The visible words stay first in the name (WCAG 2.5.3), then what a
                  tap does here (052 site review). */}
              {isNew && (
                <>
                  {' '}
                  <span className="sr-only">(showing now, tap for all tires)</span>
                  <ClearIcon />
                </>
              )}
            </a>

            <a
              href={isUsed ? '/tires' : '/tires/used'}
              aria-current={isUsed ? 'true' : undefined}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors duration-150 ${
                isUsed
                  ? 'border-amber-400 bg-amber-400 text-gray-950 hover:bg-amber-500 hover:border-amber-500'
                  : 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-500 hover:text-white hover:border-amber-500'
              }`}
            >
              Shop Used
              {isUsed && (
                <>
                  {' '}
                  <span className="sr-only">(showing now, tap for all tires)</span>
                  <ClearIcon />
                </>
              )}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

const RIM_SIZES = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

const RimSizes: FC = () => {
  const searchParams = useSearchParams();
  const diameter = searchParams?.get('d') || '';
  return (
    <>
      {RIM_SIZES.map(d => {
        const isActive = diameter === String(d);
        return (
          <a
            key={d}
            href={isActive ? '/tires' : `/tires?d=${d}`}
            aria-current={isActive ? 'true' : undefined}
            aria-label={isActive ? `Clear rim size ${d}" filter` : `Filter by rim size ${d}"`}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors duration-150 ${
              isActive
                ? 'border-green-600 bg-green-600 text-white hover:bg-green-700 hover:border-green-700'
                : 'border-gray-200 text-gray-700 hover:border-green-600 hover:text-green-700 hover:bg-green-50'
            }`}
          >
            {d}&quot;
            {isActive && <ClearIcon />}
          </a>
        );
      })}
    </>
  );
};

const RimSizesPlain: FC = () => (
  <>
    {RIM_SIZES.map(d => (
      <a
        key={d}
        href={`/tires?d=${d}`}
        aria-label={`Filter by rim size ${d}"`}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:border-green-600 hover:text-green-700 hover:bg-green-50 transition-colors duration-150"
      >
        {d}&quot;
      </a>
    ))}
  </>
);

const ClearIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    className="w-3 h-3"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface BrandScrollerProps {
  brands: string[];
  activeBrand?: string;
}

// Variant that reads the active brand from the URL — only used inside
// variant='browse' (route /tires). Highlights from either the singular `?brand=`
// (SEO/browse links) or a single `?brands=` value (the multi-filter scheme the
// home "More filters" panel uses), so arriving with one brand lights up the chip.
const BrandScrollerWithSearchParam: FC<BrandScrollerProps> = ({ brands, activeBrand }) => {
  const searchParams = useSearchParams();
  const brandsParam = searchParams?.get('brands') || '';
  const singleBrand = brandsParam && !brandsParam.includes(',') ? brandsParam : '';
  const fromParam = searchParams?.get('brand') || singleBrand || '';
  return <BrandScroller brands={brands} activeBrand={activeBrand || fromParam} />;
};

const BrandScroller: FC<BrandScrollerProps> = ({ brands, activeBrand }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeChipRef = useRef<HTMLAnchorElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);

  const active = (activeBrand || '').toLowerCase();

  const updateProgress = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setHasOverflow(max > 4);
    setProgress(max > 0 ? Math.min(1, el.scrollLeft / max) : 0);
  }, []);

  useEffect(() => {
    updateProgress();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      el.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [updateProgress, brands.length]);

  // Auto-scroll active chip into view on mount
  useEffect(() => {
    const chip = activeChipRef.current;
    const container = scrollRef.current;
    if (!chip || !container) return;
    const chipLeft = chip.offsetLeft;
    const chipRight = chipLeft + chip.offsetWidth;
    const viewLeft = container.scrollLeft;
    const viewRight = viewLeft + container.clientWidth;
    if (chipLeft < viewLeft || chipRight > viewRight) {
      container.scrollTo({
        left: Math.max(0, chipLeft - container.clientWidth / 2 + chip.offsetWidth / 2),
        behavior: 'smooth',
      });
    }
  }, [active]);

  const thumbLeft = progress * 72;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-3 sm:pb-2 [scrollbar-width:thin] [scrollbar-color:#d1d5db_#f3f4f6] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400"
      >
        {brands.map(brand => {
          const isActive = brand.toLowerCase() === active;
          return (
            <a
              key={brand}
              ref={isActive ? activeChipRef : undefined}
              href={isActive ? '/tires' : `/tires/brands/${slugify(brand)}`}
              aria-current={isActive ? 'true' : undefined}
              aria-label={
                isActive ? `Clear ${brandName(brand)} filter` : `Browse ${brandName(brand)} tires`
              }
              className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors duration-150 whitespace-nowrap ${
                isActive
                  ? 'border-green-600 bg-green-600 text-white hover:bg-green-700 hover:border-green-700'
                  : 'border-gray-200 text-gray-700 hover:border-green-600 hover:text-green-700 hover:bg-green-50'
              }`}
            >
              {/* The href keeps the slug from the stored value; only the chip's
                  text is written for a reader. */}
              {brandName(brand)}
              {isActive && <ClearIcon />}
            </a>
          );
        })}
      </div>

      {hasOverflow && (
        <div
          className="sm:hidden mt-1.5 h-1 rounded-full bg-gray-100 overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="h-full w-[28%] rounded-full bg-gray-400 transition-transform duration-100 ease-out"
            style={{ transform: `translateX(${thumbLeft}%)` }}
          />
        </div>
      )}

      {hasOverflow && progress < 0.98 && (
        <div
          className="sm:hidden pointer-events-none absolute right-0 top-0 bottom-3 w-8 bg-gradient-to-l from-white to-transparent"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default BrowseFilters;
