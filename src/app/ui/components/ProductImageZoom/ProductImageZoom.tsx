'use client';

import { FC, useCallback, useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import { createPortal } from 'react-dom';

import { Dialog, XMarkIcon } from '@/app/ui/components';
import { isOptimisableImage } from '@/app/utils/imageHosts';

export type ZoomImage = { id: number | string; src: string; alt: string };

interface ProductImageZoomProps {
  /** Every photo in the gallery. All are rendered; only `index` is visible. */
  images: ZoomImage[];
  /** Which one is showing. */
  index: number;
  /** Disable zoom entirely (e.g. the generic fallback image has nothing to inspect). */
  enabled?: boolean;
  /** Passed through to the base next/image for correct responsive sizing. */
  sizes?: string;
  /** Prioritize the base image as the LCP (eager + fetchpriority=high). */
  priority?: boolean;
}

const LENS = 168; // lens diameter in px
const ZOOM = 2.4; // magnification factor

/**
 * The size the zoom layer is fetched at before the first hover, when the real
 * container width is not known yet. Close to the desktop main image, so the
 * variant requested now is the one wanted later.
 */
const ZOOM_PREFETCH_W = 600;
const ZOOM_PREFETCH_H = 340;

/**
 * Wraps the detail page's main product image with two complementary zoom modes:
 *
 *  - Desktop (hover + fine pointer): a circular magnifier lens follows the
 *    cursor. The lens shows the ORIGINAL image scaled by ZOOM with object-fit
 *    contain, so the magnified letterboxing matches the base image exactly (no
 *    distortion on white-background tire shots).
 *  - Touch / click: opens a full-screen view (reusing the accessible Dialog
 *    shell) where the photo can be panned and pinch-zoomed to inspect tread and
 *    condition up close.
 *
 * The lens is purely decorative (aria-hidden); keyboard and screen-reader users
 * open the same full-screen view via the button wrapper.
 */
const ProductImageZoom: FC<ProductImageZoomProps> = ({
  images,
  index,
  enabled = true,
  sizes,
  priority = false,
}) => {
  const active = images[index];
  const src = active?.src ?? '';
  const alt = active?.alt ?? '';
  /**
   * Guarded here rather than at the caller: `next/image` **throws during render**
   * for an unconfigured host, so a single bad URL takes the whole page down —
   * `/tires/405630-pirelli-285-40-22` answered 500 because one tire's photo is
   * hosted on eBay. Every caller of this component would otherwise have to
   * remember, and the one that mattered did not.
   */
  const safeSrc = isOptimisableImage(src) ? src : '/images/placeholder-tire.svg';

  const containerRef = useRef<HTMLButtonElement>(null);
  const [canHover, setCanHover] = useState(false);
  const [lens, setLens] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  /**
   * The magnifier's image is mounted **before** the first hover, once the page
   * is idle — and only where there is a pointer to hover with.
   *
   * It used to mount on the first mouse move, so the buyer hovered and then
   * waited **1.754 ms measured on a fully cached page** while a fresh file
   * downloaded, staring at an empty circle. Phones never show the lens, so they
   * fetch nothing extra.
   */
  const [zoomPrefetched, setZoomPrefetched] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!enabled || !canHover) return;
    /*
     * The magnifier's image is the single heaviest thing on this page — 146 KB
     * — and the only one a buyer may never ask for. On a metered or slow
     * connection it waits for the hover that justifies it; the photos
     * themselves still preload, because that is the fix.
     */
    const conn = (
      navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection;
    if (conn?.saveData || /^(slow-)?2g$/.test(conn?.effectiveType ?? '')) return;

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    // Idle, so it never competes with the photo the buyer is actually looking at.
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(() => setZoomPrefetched(true), { timeout: 3000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setZoomPrefetched(true), 1200);
    return () => clearTimeout(t);
  }, [enabled, canHover]);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!enabled || !canHover) return;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        setLens(null);
        return;
      }
      setLens({ x, y, w: rect.width, h: rect.height });
    },
    [enabled, canHover]
  );

  const closeFullscreen = useCallback(() => {
    setFullscreen(false);
    setZoomed(false);
  }, []);

  /**
   * **Every photo is rendered; only one is opaque.**
   *
   * Swapping a single `src` is what made the gallery feel broken: React replaced
   * the image, the browser had nothing cached for a photo nobody had asked for,
   * and the frame went **blank at 970 ms and stayed blank** — measured. Mounting
   * them all means the browser fetches them while the buyer reads the
   * description, and switching is a class change with no network at all.
   *
   * The one on screen keeps `priority`; the rest load normally, so they queue
   * behind it rather than competing with it.
   */
  const base = images.map((image, i) => {
    const isActive = i === index;
    const usable = isOptimisableImage(image.src) ? image.src : '/images/placeholder-tire.svg';
    return (
      <Image
        key={image.id}
        alt={isActive ? image.alt : ''}
        aria-hidden={!isActive}
        src={usable}
        fill
        className={`object-contain object-center transition-opacity duration-150 ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}
        sizes={sizes}
        /*
         * The photos behind the current one are fetched, not deferred — that is
         * the whole point of mounting them. Left to `lazy` they stayed
         * unrequested (measured: 1 of 4 loaded), so clicking a thumbnail still
         * waited on the network.
         *
         * `low` priority so they queue behind the photo the buyer is looking at
         * and behind the page itself: they are for the click that may come, not
         * for the frame on screen now.
         */
        // The photo on screen is the page's LCP: eager and `high` when the page
        // asks for it (Next 16's `priority` only preloads, without the hint — 055).
        loading="eager"
        fetchPriority={isActive ? (priority ? 'high' : undefined) : 'low'}
      />
    );
  });

  // Without zoom (the generic placeholder) keep the plain stack — no lens.
  if (!enabled) {
    return <div className="absolute inset-0">{base}</div>;
  }

  return (
    <>
      <button
        ref={containerRef}
        type="button"
        onMouseMove={onMove}
        onMouseLeave={() => setLens(null)}
        onClick={() => setFullscreen(true)}
        data-track="open_tire_image_zoom"
        data-track-category="product_detail"
        data-track-label={alt}
        aria-label="Open full-size image to zoom"
        className={`absolute inset-0 block focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 ${
          canHover ? 'cursor-zoom-in' : 'cursor-pointer'
        }`}
      >
        {base}

        {/*
         * The magnifier.
         *
         * Mounted as soon as the page is idle rather than on the first mouse
         * move, and kept mounted with the lens itself hidden — so the image is
         * already in the browser when the buyer hovers instead of being
         * requested at that moment.
         *
         * It reads the **optimized** variant, not the original file. The
         * original is a 283 KB JPEG at 1600×1200; `next/image` returns the same
         * 1600 px of detail as a **146 KB** WebP — measured, 48% less — for a
         * magnifier that can never show more than the source has.
         */}
        {zoomPrefetched && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute z-20 overflow-hidden rounded-full border border-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.35)] ring-1 ring-black/10"
            style={{
              width: LENS,
              height: LENS,
              left: (lens?.x ?? 0) - LENS / 2,
              top: (lens?.y ?? 0) - LENS / 2,
              background: '#fff',
              /*
               * Opacity, not `visibility: hidden` — **Chrome does not download
               * images inside a hidden subtree**, so the pre-mount that exists to
               * avoid the wait was avoiding nothing. Measured: the lens image
               * stayed unloaded until the first hover either way.
               */
              opacity: lens ? 1 : 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                width: (lens?.w ?? ZOOM_PREFETCH_W) * ZOOM,
                height: (lens?.h ?? ZOOM_PREFETCH_H) * ZOOM,
                left: -((lens?.x ?? 0) * ZOOM - LENS / 2),
                top: -((lens?.y ?? 0) * ZOOM - LENS / 2),
              }}
            >
              <Image
                src={safeSrc}
                alt=""
                aria-hidden="true"
                draggable={false}
                fill
                className="object-contain"
                sizes={`${Math.round((lens?.w ?? ZOOM_PREFETCH_W) * ZOOM)}px`}
                /*
                 * Explicit, because neither heuristic reaches it: the lens box
                 * sits mostly outside the viewport, so `lazy` never triggers,
                 * and it starts transparent, so nothing else prompts a fetch.
                 * `low` keeps it behind the photo actually on screen.
                 */
                loading="eager"
                fetchPriority="low"
              />
            </span>
          </span>
        )}
      </button>

      {/* Portaled to <body> so the overlay escapes the gallery's isolate/
          overflow-hidden stacking context and reliably covers the whole
          viewport (thumbnails included) with the close button reachable. */}
      {fullscreen &&
        typeof document !== 'undefined' &&
        createPortal(
          <Dialog
            open
            onCloseAction={closeFullscreen}
            ariaLabel={`Zoomed view: ${alt}`}
            className="fixed inset-0 z-[120] flex items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
              onClick={closeFullscreen}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={closeFullscreen}
              aria-label="Close zoomed view"
              className="fixed right-4 top-4 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white shadow-[0_2px_14px_rgba(0,0,0,0.6)] ring-2 ring-white transition-colors hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <XMarkIcon className="h-7 w-7" aria-hidden />
            </button>

            {/* Contained zoom: only the main image scales (tap to toggle), and
                page pinch-zoom is suppressed so the close button stays
                reachable. When zoomed the image overflows and can be panned. */}
            <div
              className={`relative h-[92dvh] w-full overflow-auto overscroll-contain ${
                zoomed ? 'block' : 'flex items-center justify-center'
              }`}
              style={{ touchAction: zoomed ? 'pan-x pan-y' : 'none' }}
            >
              {/*
               * The optimized variant here too. Full-screen is where detail
               * matters most, and the original buys none of it: the source is
               * 1600 px wide either way, so the 283 KB JPEG and the 146 KB WebP
               * carry the same pixels. The classes below drive the size, so
               * `width`/`height` only set the intrinsic ratio.
               */}
              {/*
               * The copy already on the page, shown while the sharp one loads.
               * Same `sizes` as the main photo on purpose: that is what makes it
               * the *same* request, already in the browser, so the view opens
               * instantly instead of on a blank screen.
               */}
              {!zoomed && (
                <Image
                  src={safeSrc}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes={sizes}
                  /*
                   * Stays underneath instead of being swapped out.
                   *
                   * Unmounting it the moment the sharp copy *started* fading in
                   * left 200 ms with nothing fully opaque — reported from a
                   * phone as a flicker between the photo appearing and settling.
                   * Kept behind, there is never a frame without pixels; the
                   * sharp copy simply covers it.
                   *
                   * `z-0` is load-bearing: an absolutely positioned sibling
                   * paints above an in-flow one, so without it the low-res copy
                   * would sit on top of the sharp one for good.
                   */
                  className="z-0 object-contain"
                />
              )}
              <Image
                src={safeSrc}
                alt={alt}
                width={1600}
                height={1200}
                draggable={false}
                onClick={() => setZoomed(z => !z)}
                data-track={zoomed ? 'tire_image_zoom_out' : 'tire_image_zoom_in'}
                data-track-category="product_detail"
                /*
                 * No opacity flag, no `onLoad`.
                 *
                 * Tracking "has the sharp copy arrived?" in state meant relying
                 * on `onLoad`, which **never fires for an image the browser
                 * already has** — so it sat invisible over a placeholder that had
                 * been removed, and the view opened empty. Compensating with a
                 * ref that checked `complete` on mount missed it too: the element
                 * exists before the decode does.
                 *
                 * An `<img>` with no pixels is simply transparent. Left alone, the
                 * copy underneath shows through and this one paints over it the
                 * moment it is ready. The browser was already doing the work.
                 */
                className={`relative z-10 block select-none ${
                  zoomed
                    ? 'h-auto w-[180%] max-w-none cursor-zoom-out'
                    : 'max-h-full max-w-full cursor-zoom-in object-contain'
                }`}
              />
            </div>

            <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white/90">
              Tap image to zoom · tap outside to close
            </p>
          </Dialog>,
          document.body
        )}
    </>
  );
};

export default ProductImageZoom;
