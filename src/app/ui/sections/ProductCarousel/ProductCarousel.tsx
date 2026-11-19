'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';

import { TireInformationProps } from '@/app/interfaces/tires';
import ProductCarouselMiniature from '@/app/ui/components/ProductCarouselMiniature/ProductCarouselMiniature';
import ProductImageZoom from '@/app/ui/components/ProductImageZoom/ProductImageZoom';
import StockBadge from '@/app/ui/components/StockBadge/StockBadge';

const FALLBACK_IMAGE = '/assets/images/generic-tire-image.webp';

const ProductCarousel: FC<TireInformationProps> = ({ singleTire }) => {
  const images = useMemo(() => singleTire.images || [], [singleTire.images]);
  const [index, setIndex] = useState<number>(0);

  const select = useCallback(
    (i: number) => {
      if (i < 0 || i >= images.length) return;
      setIndex(i);
    },
    [images.length]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (images.length <= 1) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        select((index + 1) % images.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        select((index - 1 + images.length) % images.length);
      }
    },
    [images.length, index, select]
  );

  /**
   * The gallery hands the viewer every photo, not just the selected one.
   *
   * Switching used to replace a single `src`, so the browser had to fetch a
   * photo nothing had asked for and the frame went blank while it waited —
   * measured at 970 ms to blank, still blank nine seconds later on a cold photo.
   */
  const zoomImages = useMemo(
    () =>
      (images.length ? images : [{ id: 0, name: 'Image', src: FALLBACK_IMAGE, alt: '' }]).map(
        (image, i) => ({
          id: image.id ?? i,
          src: image.src,
          alt: image.alt || image.name || `${singleTire.brand} ${singleTire.name}`,
        })
      ),
    [images, singleTire.brand, singleTire.name]
  );

  const current = images[index] || {
    id: 0,
    name: 'Image',
    src: FALLBACK_IMAGE,
    alt: `${singleTire.brand} ${singleTire.name}`,
  };

  // Nothing to inspect on the generic placeholder — disable zoom for it.
  const zoomEnabled = current.src !== FALLBACK_IMAGE;

  return (
    <div className="flex flex-col-reverse" aria-label="Product gallery">
      {/* Thumbnails */}
      <div className="mx-auto mt-6 w-full max-w-2xl sm:block lg:max-w-none">
        <div
          role="tablist"
          aria-label="Choose image"
          className="grid grid-cols-4 gap-3 max-[25rem]:gap-3"
        >
          {images.map((image, i) => {
            const selected = i === index;
            return (
              <button
                key={image.id}
                role="tab"
                aria-selected={selected}
                aria-controls={`image-panel-${image.id}`}
                id={`image-tab-${image.id}`}
                type="button"
                onClick={() => select(i)}
                className={`group relative flex h-24 cursor-pointer items-center justify-center rounded-md bg-white text-sm font-medium uppercase text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring ring-green-600 focus:ring-opacity-60 focus:ring-offset-4 ${selected ? 'ring-2 ring-green-600' : 'ring-2 ring-transparent'}`}
                title={image.name}
              >
                <span className="sr-only">{image.name}</span>
                <span className="absolute inset-0 overflow-hidden rounded-md">
                  <ProductCarouselMiniature
                    eager
                    product={{
                      imageAlt: image.name,
                      imageSrc: image.src,
                      brand: singleTire.brand,
                    }}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main image */}
      <div
        className="w-full overflow-hidden rounded-lg"
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Product image"
      >
        <div
          id={`image-panel-${current.id}`}
          role="tabpanel"
          aria-labelledby={`image-tab-${current.id}`}
          className="w-full"
        >
          <div className="relative isolate w-full bg-white rounded-lg overflow-hidden aspect-square sm:aspect-[16/10] lg:aspect-[16/9]">
            <ProductImageZoom
              images={zoomImages}
              index={index}
              enabled={zoomEnabled}
              priority
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
            />
            {/*
              No condition badge here. It said the same word as the pill in the
              hero directly above and as the labelled `Condition` cell in the
              spec grid beside it — three times in one viewport. Kept where it
              carries meaning: once at the top for context, once in the specs.
            */}
            {(() => {
              const statusVal = singleTire.status;
              const isSold =
                typeof statusVal === 'string' && statusVal.trim().toLowerCase() === 'sold';
              return !isSold ? (
                <div className="pointer-events-none absolute top-2 right-2 z-[60]">
                  <StockBadge />
                </div>
              ) : null;
            })()}
          </div>
        </div>
        <div className="sr-only" aria-live="polite">
          Showing image {index + 1} of {images.length}
        </div>
      </div>
    </div>
  );
};

export default ProductCarousel;
