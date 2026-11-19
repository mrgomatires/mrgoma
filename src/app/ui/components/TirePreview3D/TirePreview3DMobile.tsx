'use client';

import { ComponentProps, FC, useContext, useEffect, useRef, useState } from 'react';

import dynamic from 'next/dynamic';

import { createPortal } from 'react-dom';

import { SelectedFiltersContext } from '@/app/context/SelectedFilters';
import ButtonSearch from '@/app/ui/components/ButtonSearch/ButtonSearch';
import { XMarkIcon } from '@/app/ui/components/Icons/Icons';
import SizePicker from '@/app/ui/components/SizePicker/SizePicker';
import { ArrowsToRight } from '@/app/ui/icons/ArrowsToRight';
import { CarFront } from '@/app/ui/icons/CarFront';

import { TIRE_3D_HINT_KEY, useDiscoveryHint } from './useDiscoveryHint';
import { isWebglAvailable } from './webgl';

const TireScene = dynamic(() => import('./TireScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="h-16 w-16 rounded-full border-4 border-gray-200 border-t-green-500 animate-spin" />
    </div>
  ),
});

/**
 * Mobile-only entry point for the 3D tire. On phones the desktop preview is
 * hidden to save space and bandwidth, so we surface a small button that opens
 * the 3D model in a modal — three.js loads only when the user taps it.
 */
const TirePreview3DMobile: FC<{
  /** The home picker's state, shared so the model follows the size (049). */
  selector: Omit<ComponentProps<typeof SizePicker>, 'surface' | 'onComplete'>;
  onSearch: () => void;
  canSearch: boolean;
}> = ({ selector, onSearch, canSearch }) => {
  const { selectedFilters } = useContext(SelectedFiltersContext);
  const [supported, setSupported] = useState(false);
  const [open, setOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const hint = useDiscoveryHint(TIRE_3D_HINT_KEY);
  const searchRef = useRef<HTMLButtonElement>(null);
  const [searchReady, setSearchReady] = useState(false);

  useEffect(() => {
    setSupported(isWebglAvailable());
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motion.matches);
    const onMotion = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    motion.addEventListener('change', onMotion);
    return () => motion.removeEventListener('change', onMotion);
  }, []);

  // Lock body scroll + close on Escape while the modal is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!supported) return null;

  const size = {
    width: selectedFilters.width,
    aspect: selectedFilters.sidewall,
    diameter: selectedFilters.diameter,
  };
  const sizeLabel = `${selectedFilters.width || '000'}/${selectedFilters.sidewall || '00'}/${
    selectedFilters.diameter || '00'
  }`;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          hint.dismiss();
          setOpen(true);
        }}
        data-track="open_tire_3d"
        data-track-category="home_search"
        className={`md:hidden inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
          hint.show ? 'mg-attention' : ''
        }`}
      >
        <CarFront className="h-3.5 w-3.5" />
        View in 3D
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="3D tire preview"
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div className="relative flex h-[75dvh] max-h-[600px] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <span className="text-sm font-semibold text-gray-900">Tire preview</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close 3D preview"
                  className="rounded-md p-1 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  <XMarkIcon className="h-6 w-6" aria-hidden />
                </button>
              </div>

              {/* Size selectors live inside the modal so changing Width/Sidewall/
                Diameter updates the model in view — making the link obvious. */}
              <div className="max-h-[45%] shrink-0 overflow-y-auto overscroll-contain border-b border-gray-100 px-4 py-3">
                <SizePicker
                  {...selector}
                  onChange={next => {
                    selector.onChange(next);
                    setSearchReady(false);
                  }}
                  onComplete={() => {
                    setSearchReady(true);
                    requestAnimationFrame(() => searchRef.current?.focus());
                  }}
                  surface="3d"
                />
                <p className="mt-2 text-center text-[11px] font-medium text-green-700">
                  Change a size — the model updates live below.
                </p>
              </div>

              <div className="relative min-h-0 flex-1" aria-hidden="true">
                <TireScene size={size} reducedMotion={reducedMotion} />
                <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-neutral-800/90 px-4 py-1 shadow-xl">
                  <ArrowsToRight className="w-8" />
                  <span className="text-sm font-medium text-green-400">{sizeLabel}</span>
                </div>
              </div>

              {/* Footer — search straight from the preview without closing it. */}
              <div className="border-t border-gray-100 px-4 py-3">
                <ButtonSearch
                  ref={searchRef}
                  onClick={onSearch}
                  disabled={canSearch}
                  highlight={searchReady && canSearch}
                />
                <p className="mt-2 text-center text-[10px] leading-snug text-gray-400">
                  Drag to rotate · Visual size aid only — not an exact representation of the
                  tire&apos;s condition, measurements or physical aspects.
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default TirePreview3DMobile;
