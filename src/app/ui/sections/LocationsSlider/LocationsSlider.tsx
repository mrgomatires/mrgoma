'use client';

import React, { useState, useEffect } from 'react';

import { LocationCard } from '@/app/ui/components';
import type { LocationData } from '@/app/ui/components/LocationCard/location-card';
import { locationsData } from '@/app/ui/sections/LocationsSlider/locationsData';

interface LocationsSliderProps {
  locations?: LocationData[];
  className?: string;
}

export const LocationsSlider = ({
  locations = locationsData,
  className = '',
}: LocationsSliderProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [cardsPerSlide, setCardsPerSlide] = useState(2);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState(0);

  // Effect to handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      // Check if we're on mobile (less than 768 px width)
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setCardsPerSlide(mobile ? 1 : 2);
    };

    // Set initial value
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const totalSlides = Math.ceil(locations.length / cardsPerSlide);

  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + totalSlides) % totalSlides);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      nextSlide();
    } else if (e.key === 'ArrowLeft') {
      prevSlide();
    }
  };

  // Basic touch swipe support
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchDeltaX(0);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX !== null) {
      const delta = e.touches[0].clientX - touchStartX;
      setTouchDeltaX(delta);
    }
  };

  const handleTouchEnd = () => {
    const threshold = 50; // minimum px to trigger swipe
    if (touchDeltaX > threshold) {
      prevSlide();
    } else if (touchDeltaX < -threshold) {
      nextSlide();
    }
    setTouchStartX(null);
    setTouchDeltaX(0);
  };

  if (!locations.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No locations available.</p>
      </div>
    );
  }

  return (
    <section className={`py-16 bg-white ${className}`}>
      <div className="container mx-auto px-6 lg:px-8">
        <div
          className="relative group"
          role="region"
          aria-roledescription="carousel"
          aria-label="Locations carousel"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="overflow-hidden rounded-2xl ring-1 ring-gray-100 shadow-sm">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {Array.from({ length: totalSlides }).map((_, slideIndex) => {
                const startIdx = slideIndex * cardsPerSlide;
                const locationsForSlide = locations.slice(startIdx, startIdx + cardsPerSlide);

                return (
                  <div key={slideIndex} className="w-full flex-shrink-0 px-2 flex gap-4">
                    {locationsForSlide.map(location => (
                      <div key={location.id} className={isMobile ? 'w-full' : 'w-1/2'}>
                        <LocationCard {...location} className="mx-auto" />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={prevSlide}
            className="absolute cursor-pointer left-3 sm:left-4 top-1/2 -translate-y-3/6 bg-[#9DFB40]/90 hover:bg-[#9DFB40] text-black p-2 rounded-full transition-all duration-200 shadow-md backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 border border-black/10 opacity-95 group-hover:opacity-100"
            aria-label="Previous location"
            title="Previous"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="absolute cursor-pointer right-3 sm:right-4 top-1/2 -translate-y-1/2 bg-[#9DFB40]/90 hover:bg-[#9DFB40] text-black p-2 rounded-full transition-all duration-200 shadow-md backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 border border-black/10 opacity-95 group-hover:opacity-100"
            aria-label="Next location"
            title="Next"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 18L15 12L9 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="flex flex-col items-center justify-center gap-3 mt-8">
            <span className="text-sm text-gray-500" aria-live="polite">
              Slide <span className="font-semibold text-gray-700">{currentSlide + 1}</span> of{' '}
              <span className="font-semibold text-gray-700">{totalSlides}</span>
            </span>
            {/* Each dot sits in a 24 × 24 px button (WCAG 2.5.8, 055): the dot keeps
                its 8 px look, the target is what a finger can hit. No gap — the
                buttons' own width spaces the dots. */}
            <div className="flex justify-center">
              {Array.from({ length: totalSlides }).map((_, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={index === currentSlide ? 'true' : undefined}
                  className="group grid h-6 min-w-6 cursor-pointer place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                >
                  <span
                    aria-hidden="true"
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentSlide
                        ? 'bg-[#9dfb40] w-6'
                        : 'bg-gray-300 group-hover:bg-gray-400 w-2'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocationsSlider;
