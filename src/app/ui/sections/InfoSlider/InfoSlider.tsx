'use client';

import { useState, useEffect, useCallback } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { infoSliderData } from '@/app/ui/sections/InfoSlider/infoSliderData';

const InfoSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning || index === currentSlide) return;
      setIsTransitioning(true);
      setCurrentSlide(index);
      setTimeout(() => setIsTransitioning(false), 500);
    },
    [currentSlide, isTransitioning]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const nextSlide = (currentSlide + 1) % infoSliderData.length;
      goToSlide(nextSlide);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentSlide, goToSlide]);

  return (
    <div className="relative w-full overflow-hidden h-80 max-w-3xl mx-auto rounded-xl shadow-lg bg-black">
      <div className="relative w-full h-full">
        {infoSliderData.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentSlide
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none'
            }`}
            aria-hidden={index !== currentSlide}
          >
            <div className="absolute inset-0">
              <Image
                src={slide.backgroundImage || '/placeholder.svg'}
                alt={slide.title}
                fill
                className="object-cover brightness-75"
                loading={index === 0 ? 'eager' : 'lazy'}
                sizes="100vw"
              />
            </div>
            <div className="relative h-full flex items-center">
              <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="max-w-xl">
                  <h2 className="text-[#9dfb40] text-4xl font-bold mb-4">{slide.title}</h2>
                  <p className="text-white text-base mb-8">{slide.information}</p>
                  <Link
                    href={slide.buttonLink}
                    className="inline-block text-white text-base font-medium py-3 px-8 rounded-full border-2 border-[#9dfb40] hover:bg-[#9dfb40] hover:text-[#272727] transition-colors duration-300"
                  >
                    {slide.buttonText}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
        {infoSliderData.map((_, index) => (
          <button
            type="button"
            key={index}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === currentSlide ? 'true' : undefined}
            // A 24 px tall target around the 12 px bar (WCAG 2.5.8, 055).
            className="group grid h-6 w-12 cursor-pointer place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
          >
            <span
              aria-hidden="true"
              className={`h-3 w-12 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'bg-[#9dfb40]' : 'bg-gray-600 group-hover:bg-gray-400'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default InfoSlider;
