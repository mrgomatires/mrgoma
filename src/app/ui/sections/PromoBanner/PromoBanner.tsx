'use client';

import React, { FC, useEffect, useMemo, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

export interface PromoContent {
  enabled: boolean;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageUrl?: string; // Optional right-side image
  dismissible?: boolean; // Allows users to close the banner
  bgColor?: string; // Tailwind bg classes (e.g., 'bg-green-600')
  textColor?: string; // Tailwind text classes (e.g., 'text-white')
  backgroundImageUrl?: string; // Optional background image
  startDate?: string; // ISO date to auto-enable within range
  endDate?: string; // ISO date to auto-enable within range
}

export interface PromoBannerProps {
  content: PromoContent;
  className?: string;
  storageKey?: string; // Used to persist dismissed state per banner config
}

// Dismissed state lives in a cookie (not localStorage) so a tiny pre-paint script
// in the root <head> can hide an already-dismissed banner before it ever paints —
// no reserved-space flash, no layout shift on hydration for returning users.
const DISMISS_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

const readCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const isWithinRange = (start?: string, end?: string): boolean => {
  try {
    const now = new Date();
    if (start && Number.isNaN(Date.parse(start))) return true;
    if (end && Number.isNaN(Date.parse(end))) return true;
    const s = start ? new Date(start) : undefined;
    const e = end ? new Date(end) : undefined;
    if (s && now < s) return false;
    return !(e && now > e);
  } catch {
    return true;
  }
};

const PromoBanner: FC<PromoBannerProps> = ({ content, className = '', storageKey }) => {
  const {
    enabled,
    title,
    description,
    ctaLabel,
    ctaHref,
    imageUrl,
    dismissible = true,
    bgColor = 'bg-green-600',
    textColor = 'text-white',
    backgroundImageUrl,
    startDate,
    endDate,
  } = content || {};

  const withinRange = useMemo(() => isWithinRange(startDate, endDate), [startDate, endDate]);

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!storageKey) return;
    setDismissed(readCookie(`promo_${storageKey}`) === 'dismissed');
  }, [storageKey]);

  const onClose = () => {
    setDismissed(true);
    if (!storageKey) return;
    try {
      document.cookie = `promo_${storageKey}=dismissed;path=/;max-age=${DISMISS_MAX_AGE}`;
    } catch {
      // ignore
    }
  };

  if (!enabled || !withinRange || dismissed) return null;

  return (
    <aside
      id={storageKey ? `promo-${storageKey}` : undefined}
      role="region"
      aria-label="Promotion"
      className={`w-full overflow-hidden rounded-lg ${bgColor} ${textColor} ${className} relative`}
      style={
        backgroundImageUrl
          ? {
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${backgroundImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              imageRendering: 'auto',
            }
          : {}
      }
    >
      {/* Attention accent bar */}
      <div className="relative h-1 w-full bg-linear-to-r from-lime-400 via-emerald-400 to-lime-400 animate-[pulse_3s_ease-in-out_infinite] opacity-80" />
      <div className="relative px-4 sm:px-5">
        <div className="relative flex items-stretch gap-4 py-4 sm:py-5">
          <div className="flex-1 min-w-0 pr-12 sm:pr-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold leading-tight drop-shadow-md">
                {title}
              </h2>
              {/* Limited time badge when date range exists */}
              {(startDate || endDate) && (
                <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-white/25">
                  Limited time
                </span>
              )}
            </div>
            {description && (
              <p className="mt-1 text-sm sm:text-base font-medium opacity-100 drop-shadow-sm whitespace-pre-line">
                {description}
              </p>
            )}
            {ctaLabel && ctaHref && (
              <div className="mt-3">
                <Link
                  href={ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-lime-400/90 text-black px-4 py-2 text-sm font-semibold shadow-sm hover:bg-lime-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lime-300 focus-visible:ring-offset-black transition-colors"
                >
                  {/* WhatsApp glyph */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="M20.52 3.48A11.86 11.86 0 0012.04 0C5.5 0 .2 5.3.2 11.85c0 2.09.55 4.14 1.58 5.95L0 24l6.36-1.73a11.78 11.78 0 005.68 1.47h.01c6.53 0 11.83-5.3 11.83-11.85 0-3.17-1.23-6.15-3.36-8.36zM12.04 21.3c-1.82 0-3.6-.49-5.15-1.42l-.37-.22-3.77 1.03 1.01-3.67-.24-.38a9.72 9.72 0 01-1.52-5.18c0-5.39 4.39-9.78 9.77-9.78 2.61 0 5.07 1.02 6.92 2.87a9.65 9.65 0 012.86 6.91c0 5.4-4.38 9.84-9.51 9.84zm5.44-7.34c-.3-.15-1.77-.87-2.04-.97-.27-.1-.46-.15-.66.15-.2.3-.75.97-.92 1.17-.17.2-.34.22-.64.07-.3-.15-1.27-.47-2.42-1.5-.9-.79-1.5-1.77-1.68-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.37.45-.56.15-.2.2-.34.3-.56.1-.22.05-.41-.02-.56-.07-.15-.66-1.6-.91-2.2-.24-.58-.49-.5-.66-.5h-.57c-.2 0-.56.08-.85.41-.29.33-1.12 1.09-1.12 2.65 0 1.56 1.15 3.07 1.3 3.28.15.2 2.28 3.48 5.52 4.88.77.33 1.37.53 1.84.68.77.24 1.47.2 2.02.12.62-.09 1.9-.78 2.17-1.52.27-.74.27-1.38.19-1.52-.08-.14-.28-.22-.58-.37z" />
                  </svg>
                  {ctaLabel}
                </Link>
              </div>
            )}
          </div>
          {imageUrl && (
            <div className="hidden sm:block shrink-0">
              <Image
                src={imageUrl}
                alt="Promotional banner image"
                width={80}
                height={80}
                className="w-auto object-contain drop-shadow"
                unoptimized
              />
            </div>
          )}
          {dismissible && (
            <button
              type="button"
              aria-label="Close promotion"
              onClick={onClose}
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default PromoBanner;
