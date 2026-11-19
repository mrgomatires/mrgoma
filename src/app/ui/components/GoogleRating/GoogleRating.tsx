import { FC } from 'react';

import Link from 'next/link';

import { type RatingFigures, ratingValue, readMonth, reviewCount } from '@/app/utils/googleRatings';

type Variant = 'chip' | 'chipOnMedia' | 'inline' | 'card' | 'store';

interface GoogleRatingProps {
  figures: RatingFigures;
  /**
   * `chip` — a hero trust chip on dark; `inline` — on white, near a price or a
   * total; `card` — a store card on dark; `store` — a store page, larger.
   */
  variant?: Variant;
  /** Where it leads: `/locations` for the combined figure, a profile for a store. */
  href?: string;
  /** A Google profile: new tab, said so to screen readers. */
  external?: boolean;
  /** GA4 via `data-track` (InteractionTracker). */
  track?: { event: 'google_rating_click' | 'google_reviews_open'; surface: string; store?: string };
  /** "Google rating as of Nov 2026" in fine print (D6: store page, `/locations`). */
  showDate?: boolean;
  className?: string;
}

const STAR = 'M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z';

/** Five stars, the gold ones clipped to `rating / 5` of the width. Decoration only. */
const Stars: FC<{ rating: number; size: number; empty: string; full: string }> = ({
  rating,
  size,
  empty,
  full,
}) => {
  const row = (fill: string) => (
    <svg
      width={size * 5}
      height={size}
      viewBox="0 0 100 20"
      className={`block shrink-0 ${fill}`}
      fill="currentColor"
      focusable="false"
    >
      {[0, 1, 2, 3, 4].map(i => (
        <path key={i} d={STAR} transform={`translate(${i * 20} 0)`} />
      ))}
    </svg>
  );
  return (
    <span aria-hidden="true" className="relative inline-block shrink-0" style={{ width: size * 5 }}>
      {row(empty)}
      <span
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${Math.max(0, Math.min(1, rating / 5)) * 100}%` }}
      >
        {row(full)}
      </span>
    </span>
  );
};

const STYLES: Record<
  Variant,
  { root: string; size: number; empty: string; full: string; count: string; date: string }
> = {
  // Over the dark heroes: the same pill as the trust chips beside it.
  chip: {
    root: 'gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white',
    size: 12,
    empty: 'text-white/25',
    full: 'text-amber-400',
    count: 'text-gray-200',
    date: 'text-gray-400',
  },
  // Over the home hero video: the backdrop of the `onMedia` trust chips.
  chipOnMedia: {
    root: 'gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-semibold text-white sm:text-sm',
    size: 12,
    empty: 'text-white/30',
    full: 'text-amber-400',
    count: 'text-white',
    date: 'text-gray-300',
  },
  // On white: amber-600 keeps the stars at 3:1 against the page.
  inline: {
    root: 'gap-1.5 text-sm font-semibold text-gray-900',
    size: 14,
    empty: 'text-gray-300',
    full: 'text-amber-600',
    count: 'font-normal text-gray-700',
    date: 'text-gray-600',
  },
  card: {
    root: 'gap-1.5 text-sm font-semibold text-white',
    size: 13,
    empty: 'text-white/25',
    full: 'text-amber-400',
    count: 'font-normal text-gray-300',
    date: 'text-gray-400',
  },
  store: {
    root: 'gap-2 text-lg font-bold text-white',
    size: 18,
    empty: 'text-white/25',
    full: 'text-amber-400',
    count: 'text-base font-normal text-gray-200',
    date: 'text-gray-400',
  },
};

/**
 * A Google rating (feature 053): stars, then "4.7 · 5,952 Google reviews".
 *
 * **Read as one sentence.** The stars are hidden from assistive tech and the
 * words around the visible numbers are screen-reader-only, so the name is
 * "Rated 4.7 out of 5 from 5,952 Google reviews" and still contains what is on
 * screen in the same order (WCAG 2.5.3 — the 052 lesson). Spaces are their own
 * text nodes, outside the spans (the 023 lesson). The dot between the numbers
 * is drawn, not typed, so it is in neither the name nor the copy.
 *
 * Plain markup and no hooks: it renders the same on the server and inside the
 * cart and checkout client components. "Google" is plain text — no Google logo,
 * nothing that imitates Google's own interface (D8).
 */
const GoogleRating: FC<GoogleRatingProps> = ({
  figures,
  variant = 'inline',
  href,
  external = false,
  track,
  showDate = false,
  className = '',
}) => {
  const s = STYLES[variant];
  const body = (
    <>
      <Stars rating={figures.rating} size={s.size} empty={s.empty} full={s.full} />
      <span className="sr-only">Rated</span> <span>{ratingValue(figures)}</span>{' '}
      <span className="sr-only">out of 5 from</span>{' '}
      <span
        aria-hidden="true"
        className="inline-block h-1 w-1 shrink-0 rounded-full bg-current opacity-60"
      />{' '}
      <span className={s.count}>
        {reviewCount(figures)} Google {figures.reviews === 1 ? 'review' : 'reviews'}
      </span>
      {external && (
        <>
          {/* Seen: the arrow says "leaves the site"; heard: the words do. */}
          <span aria-hidden="true">↗</span> <span className="sr-only">(opens in a new tab)</span>
        </>
      )}
    </>
  );

  const trackAttrs = track
    ? {
        'data-track': track.event,
        'data-track-category': 'reviews',
        'data-track-surface': track.surface,
        ...(track.store ? { 'data-track-store': track.store } : {}),
      }
    : {};

  const rootClass = `inline-flex flex-wrap items-center ${s.root}`;
  const linkClass = `${rootClass} rounded-full underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9dfb40] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent`;

  const rating = !href ? (
    <span className={rootClass}>{body}</span>
  ) : external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass} {...trackAttrs}>
      {body}
    </a>
  ) : (
    <Link href={href} className={linkClass} {...trackAttrs}>
      {body}
    </Link>
  );

  if (!showDate) return <span className={className || undefined}>{rating}</span>;
  return (
    <span className={`inline-flex flex-col gap-1 ${className}`.trim()}>
      {rating}
      <span className={`text-xs font-normal ${s.date}`}>
        Google rating as of {readMonth(figures.readOn)}
      </span>
    </span>
  );
};

export default GoogleRating;
