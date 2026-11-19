import { describe, expect, it } from 'vitest';

import { locationsConfig } from '@/app/(shop)/locations/locationsConfig';

import {
  combinedRating,
  isStale,
  newestReadOn,
  ratingSentence,
  ratingValue,
  readMonth,
  reviewCount,
  storeRating,
} from './googleRatings';

const store = (slug: string, rating: number, reviews: number, readOn = '2026-11-18') => ({
  slug,
  google: { rating, reviews, readOn },
});

describe('googleRatings (053)', () => {
  it('combines the seven stores, weighted by reviews (AC1)', () => {
    const c = combinedRating();
    expect(ratingValue(c)).toBe('4.7');
    expect(reviewCount(c)).toBe('5,952');
    expect(c.readOn).toBe('2026-11-18');
  });

  it('moves when one store changes, with no other edit (AC1)', () => {
    const stores = locationsConfig.map(l =>
      l.slug === 'east-orlando' ? { ...l, google: { ...l.google, rating: 1, reviews: 5000 } } : l
    );
    const c = combinedRating(stores);
    expect(c.reviews).toBe(5952 - 69 + 5000);
    expect(c.rating).toBeLessThan(4);
  });

  it('weights by reviews, rounds half up and always shows one decimal', () => {
    expect(combinedRating([store('a', 5, 1), store('b', 4, 3)]).rating).toBe(4.3); // 4.25
    expect(ratingValue({ rating: 5 })).toBe('5.0');
  });

  it("reads a store's own figure", () => {
    expect(storeRating('cutler-bay')).toEqual({ rating: 4.8, reviews: 2083, readOn: '2026-11-18' });
    expect(storeRating('nowhere')).toBeUndefined();
  });

  it('says the rating in words (AC6)', () => {
    expect(ratingSentence({ rating: 4.7, reviews: 5952 })).toBe(
      'Rated 4.7 out of 5 from 5,952 Google reviews'
    );
    expect(ratingSentence({ rating: 5, reviews: 1 })).toBe(
      'Rated 5.0 out of 5 from 1 Google review'
    );
  });

  it('names the month typed, whatever the time zone (AC10)', () => {
    expect(readMonth('2026-11-18')).toBe('Nov 2026');
    expect(readMonth('2026-11-01')).toBe('Nov 2026');
  });

  it('takes the newest read date', () => {
    expect(newestReadOn([store('a', 4, 1, '2026-10-01'), store('b', 4, 1, '2026-11-02')])).toBe(
      '2026-11-02'
    );
  });

  it('is stale after 90 days, fresh at 90 (AC9)', () => {
    const day = (d: string) => new Date(`${d}T12:00:00Z`);
    expect(isStale('2026-11-18', day('2027-02-16'))).toBe(false); // day 90
    expect(isStale('2026-11-18', day('2027-02-17'))).toBe(true); // 91
  });
});
