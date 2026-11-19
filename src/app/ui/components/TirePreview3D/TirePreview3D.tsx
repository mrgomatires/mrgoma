'use client';

import { FC, useContext, useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import { SelectedFiltersContext } from '@/app/context/SelectedFilters';
import { ArrowsToRight } from '@/app/ui/icons/ArrowsToRight';

import { TIRE_3D_HINT_KEY, useDiscoveryHint } from './useDiscoveryHint';
import { useIdleReady } from './useIdleReady';
import { isWebglAvailable } from './webgl';
import TireDisplay from '../TireDisplay/TireDisplay';

/** Small circular-arrow glyph for the "Drag to rotate" cue (inline so it scales
 *  with the chip and inherits currentColor — the shared RotationIcon is fixed-
 *  size and un-styleable). */
const RotateGlyph = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 12a8 8 0 0 1 13.66-5.66M20 12a8 8 0 0 1-13.66 5.66"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M17 3v3.5h-3.5M7 21v-3.5h3.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Skeleton = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="h-20 w-20 rounded-full border-4 border-gray-200 border-t-green-500 animate-spin" />
  </div>
);

// three.js is heavy (~150 KB gzip): load it only when this component mounts on a
// capable desktop, never on the server or in the main bundle.
const TireScene = dynamic(() => import('./TireScene'), { ssr: false, loading: () => <Skeleton /> });

/**
 * Live 3D preview of the tire size selected in the home search. The model's
 * proportions update with Width / Sidewall / Diameter so customers can SEE what
 * a size code means. Falls back to the static <TireDisplay> when WebGL is
 * unavailable, and only mounts the canvas on desktop (≥ md) for performance.
 */
const TirePreview3D: FC = () => {
  const { selectedFilters } = useContext(SelectedFiltersContext);

  // null = still detecting; true/false = decision made (avoids SSR/hydration flash).
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Defer mounting the heavy three.js canvas until the browser is idle, so it
  // doesn't compete with hydration / the first interaction on load (P1.5/P1.6).
  const idleReady = useIdleReady();
  const hint = useDiscoveryHint(TIRE_3D_HINT_KEY);
  // Visually retire the "Drag to rotate" chip after a few seconds even without
  // interaction; persistence still only happens once the user actually drags.
  const [hintFaded, setHintFaded] = useState(false);

  useEffect(() => {
    if (!hint.show) return;
    const t = setTimeout(() => setHintFaded(true), 6000);
    return () => clearTimeout(t);
  }, [hint.show]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const evaluate = () => setEnabled(desktop.matches && isWebglAvailable());
    const onMotion = (e: MediaQueryListEvent) => setReducedMotion(e.matches);

    evaluate();
    setReducedMotion(motion.matches);
    desktop.addEventListener('change', evaluate);
    motion.addEventListener('change', onMotion);
    return () => {
      desktop.removeEventListener('change', evaluate);
      motion.removeEventListener('change', onMotion);
    };
  }, []);

  // Until we know, or when WebGL/desktop isn't available, use the static diagram.
  if (enabled === null) return <Skeleton />;
  if (!enabled) return <TireDisplay />;
  // Desktop + WebGL ready, but hold the canvas (behind the skeleton, same space)
  // until the browser is idle — keeps the main thread free during load.
  if (!idleReady) return <Skeleton />;

  const size = {
    width: selectedFilters.width,
    aspect: selectedFilters.sidewall,
    diameter: selectedFilters.diameter,
  };
  const allSelected = selectedFilters.width && selectedFilters.sidewall && selectedFilters.diameter;

  return (
    <div className="relative w-full h-full">
      {/* Decorative canvas (transparent — the white card shows through). The
          dropdowns + the badge below carry the meaning. A first drag dismisses
          the discovery hint for good. */}
      <div className="absolute inset-0" aria-hidden="true" onPointerDown={hint.dismiss}>
        <TireScene size={size} reducedMotion={reducedMotion} />
      </div>

      {/* One-time "this is interactive" cue so users notice the 3D selector and
          that they can spin it. Subtle, capped pulse; gone after the first drag
          or a few seconds, and never shown again once discovered. */}
      {hint.show && !hintFaded && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2">
          <span className="mg-attention inline-flex items-center gap-1.5 rounded-full bg-neutral-900/85 px-3 py-1 text-xs font-medium text-white shadow-lg ring-1 ring-white/10">
            <RotateGlyph className="h-3.5 w-3.5 text-green-400" />
            Drag to rotate
          </span>
        </div>
      )}

      {/* Disclaimer — this is a size-orientation aid, not an exact tire model. */}
      <span
        className="absolute top-1 right-1 flex h-5 w-5 cursor-help items-center justify-center rounded-full bg-gray-100/90 text-[11px] font-bold text-gray-500 ring-1 ring-black/5"
        title="Visual size aid only — not an exact representation of the tire's condition, measurements or physical aspects."
        aria-label="Visual size aid only — not an exact representation of the tire's condition, measurements or physical aspects."
      >
        i
      </span>

      {/* Size badge — kept accessible and readable over the model. */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1 bg-neutral-800/90 rounded-full shadow-xl">
        <ArrowsToRight className="w-8" />
        <span className={`text-sm font-medium ${allSelected ? 'text-green-400' : 'text-white/75'}`}>
          {selectedFilters.width || '000'}/{selectedFilters.sidewall || '00'}/
          {selectedFilters.diameter || '00'}
        </span>
      </div>
    </div>
  );
};

export default TirePreview3D;
