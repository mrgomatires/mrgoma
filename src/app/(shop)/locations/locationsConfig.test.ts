import { describe, expect, it } from 'vitest';

import { locationsConfig } from './locationsConfig';

/**
 * Guards for the store directory.
 *
 * Written after finding, on 2026-08-04, that the Miami Gardens "map link" opened
 * **KeyZoo Locksmiths** — a different business in the same plaza — and that the
 * store's `geo` had been derived from that wrong link, so the coordinates in our
 * JSON-LD had been pointing at the locksmith for as long as the entry existed.
 * Four other stores linked to a bare street address rather than to the business
 * profile, which loses the reviews, hours, photos and call button.
 *
 * None of that could fail a build. It was a plausible-looking URL that nobody
 * had reason to click. These tests make the class of mistake impossible to
 * reintroduce quietly.
 */
describe('locationsConfig — map links', () => {
  it('derives every link from the store CID', () => {
    // The point of the rule: a CID names exactly one Business Profile, whereas a
    // pasted Maps URL can name a neighbour and look identical at a glance.
    for (const store of locationsConfig) {
      expect(store.mapLink).toBe(`https://maps.google.com/?cid=${store.cid}`);
    }
  });

  it('uses no shortened or copied Maps URLs', () => {
    for (const store of locationsConfig) {
      expect(store.mapLink).not.toMatch(/goo\.gl|maps\.app|\/maps\/place\//);
      // Locale, session tokens and tracking parameters all rot; a canonical CID
      // link carries none of them.
      expect(store.mapLink).not.toMatch(/[?&](hl|g_ep|entry|ved|ictx|sa)=/);
    }
  });

  it('gives every store its own CID', () => {
    const cids = locationsConfig.map(s => s.cid);
    expect(new Set(cids).size).toBe(cids.length);
    for (const cid of cids) expect(cid).toMatch(/^\d+$/);
  });
});

describe('locationsConfig — addresses and pins', () => {
  it('names the actual municipality, not the metro area', () => {
    // Coral Gables and Miami Gardens are their own cities. Writing "Miami" broke
    // NAP consistency against the Business Profiles and threw away the keyword
    // for anyone searching that town by name.
    const byslug = Object.fromEntries(locationsConfig.map(s => [s.slug, s]));

    expect(byslug['coral-gables'].address).toContain('Coral Gables, FL');
    expect(byslug['miami-gardens'].address).toContain('Miami Gardens, FL');
  });

  it('gives every store its own pin', () => {
    // Two stores sharing coordinates would mean one was copied from the other —
    // the same failure mode as the wrong link, one step further along.
    const pins = locationsConfig.map(s => `${s.geo.latitude},${s.geo.longitude}`);
    expect(new Set(pins).size).toBe(pins.length);
  });

  it('places every pin inside Florida', () => {
    // A cheap sanity net: a transposed or truncated coordinate lands in the sea
    // or another state, and this catches it without needing a geocoder.
    for (const store of locationsConfig) {
      expect(store.geo.latitude).toBeGreaterThan(24.5);
      expect(store.geo.latitude).toBeLessThan(31.0);
      expect(store.geo.longitude).toBeGreaterThan(-87.7);
      expect(store.geo.longitude).toBeLessThan(-80.0);
    }
  });

  it('keeps the phone and tel forms in agreement', () => {
    for (const store of locationsConfig) {
      const digits = store.phone.replace(/\D/g, '');
      expect(store.tel).toBe(`tel:+1${digits}`);
    }
  });
});

describe('Google figures (053)', () => {
  it.each(locationsConfig.map(l => [l.slug, l.google] as const))(
    '%s has a rating, a count and the day it was read',
    (_slug, g) => {
      expect(g.rating).toBeGreaterThanOrEqual(1);
      expect(g.rating).toBeLessThanOrEqual(5);
      expect(Math.round(g.rating * 10)).toBe(g.rating * 10); // one decimal, as Maps shows
      expect(Number.isInteger(g.reviews) && g.reviews > 0).toBe(true);
      expect(g.readOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(`${g.readOn}T00:00:00Z`))).toBe(false);
      expect(Date.parse(`${g.readOn}T00:00:00Z`)).toBeLessThanOrEqual(Date.now());
    }
  );
});
