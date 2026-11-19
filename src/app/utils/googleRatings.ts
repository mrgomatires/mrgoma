import {
  type GoogleFigures,
  type LocationConfig,
  locationsConfig,
} from '@/app/(shop)/locations/locationsConfig';

/**
 * Google ratings (feature 053). Pure: the figures are typed by hand into
 * `locationsConfig` from each store's Maps profile; everything shown on the
 * site is derived here, so the combined figure is never typed anywhere.
 */

export type RatingFigures = GoogleFigures;

type Store = Pick<LocationConfig, 'slug' | 'google'>;

/** One decimal, half up: 4.739 → 4.7, 4.75 → 4.8. */
const oneDecimal = (n: number) => Math.round(n * 10 + Number.EPSILON) / 10;

/**
 * All the stores as one figure: the mean weighted by review count (a store with
 * 2,083 reviews says more than one with 69), the total count, and the newest
 * read date.
 */
export function combinedRating(stores: readonly Store[] = locationsConfig): RatingFigures {
  const reviews = stores.reduce((sum, s) => sum + s.google.reviews, 0);
  const weighted = stores.reduce((sum, s) => sum + s.google.rating * s.google.reviews, 0);
  return {
    rating: reviews > 0 ? oneDecimal(weighted / reviews) : 0,
    reviews,
    readOn: newestReadOn(stores),
  };
}

export function storeRating(
  slug: string,
  stores: readonly Store[] = locationsConfig
): RatingFigures | undefined {
  return stores.find(s => s.slug === slug)?.google;
}

/** `4.7` — always one decimal, so 5 reads `5.0`. */
export const ratingValue = (r: Pick<RatingFigures, 'rating'>) => r.rating.toFixed(1);

/** `5,952`. */
export const reviewCount = (r: Pick<RatingFigures, 'reviews'>) => r.reviews.toLocaleString('en-US');

/** What a screen reader says: "Rated 4.7 out of 5 from 5,952 Google reviews". */
export const ratingSentence = (r: Pick<RatingFigures, 'rating' | 'reviews'>) =>
  `Rated ${ratingValue(r)} out of 5 from ${reviewCount(r)} Google ${
    r.reviews === 1 ? 'review' : 'reviews'
  }`;

const utc = (date: string) => new Date(`${date}T00:00:00Z`);

/**
 * `Nov 2026`. Parsed and formatted in UTC on purpose: formatted in Miami's
 * time zone, `2026-11-01` (midnight UTC) would read "Oct 2026" — the label
 * must name the month that was typed.
 */
export const readMonth = (date: string) =>
  utc(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

export function newestReadOn(stores: readonly Store[] = locationsConfig): string {
  return (
    stores
      .map(s => s.google.readOn)
      .sort()
      .at(-1) ?? ''
  );
}

export const STALE_AFTER_DAYS = 90;

/**
 * Whether figures read on `readOn` are older than `days` on `today` (D7). The
 * date is an input so the rule is testable; the guard passes today's.
 */
export function isStale(readOn: string, today: Date, days = STALE_AFTER_DAYS): boolean {
  // Whole days, so "90 days" means the whole 90th day (the time of day the
  // check runs does not decide it).
  const ageDays = Math.floor((today.getTime() - utc(readOn).getTime()) / 86_400_000);
  return ageDays > days;
}
