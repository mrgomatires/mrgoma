import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { locationsConfig } from '@/app/(shop)/locations/locationsConfig';
import { STALE_AFTER_DAYS, isStale, newestReadOn } from '@/app/utils/googleRatings';
import { buildLocationsJsonLd, organizationJsonLd } from '@/app/utils/seo';

/**
 * Guards for the Google ratings (feature 053).
 */

describe('the Google figures are current (D7)', () => {
  it(`were read on Maps within the last ${STALE_AFTER_DAYS} days`, () => {
    const readOn = newestReadOn();
    // Not a code bug: open each store's Google Maps profile, copy its rating
    // and review count into src/app/(shop)/locations/locationsConfig.ts and
    // set readOn to today. The site keeps showing the old figures meanwhile.
    expect(
      isStale(readOn, new Date()),
      `Re-read the Google ratings on Maps and update locationsConfig.ts (last read ${readOn})`
    ).toBe(false);
  });
});

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) found.push(full);
  }
  return found;
}

describe('no rating markup (AC8)', () => {
  /**
   * Google gives no review stars to a business's reviews about itself — the
   * self-serving rule names `LocalBusiness`/`Organization` and the Google
   * Business review widgets. Marking our own Google rating up would be a claim
   * about ourselves with nothing to gain, so the site shows it and never marks
   * it up.
   */
  it('no structured data in src/ carries a rating or a review', () => {
    const offenders = sourceFiles('src').filter(file =>
      /aggregateRating|reviewRating|['"]@type['"]\s*:\s*['"](Review|AggregateRating)['"]/.test(
        readFileSync(file, 'utf8')
      )
    );
    expect(offenders).toEqual([]);
  });

  it('the stores’ JSON-LD stays free of the figures', () => {
    const json = JSON.stringify([...buildLocationsJsonLd(locationsConfig), organizationJsonLd()]);
    expect(json).not.toMatch(/rating|review/i);
  });
});

describe('the combined figure is computed, never typed (AC1)', () => {
  // The files that show a rating. Scoped on purpose: across all of src/,
  // "4.7" appears in CSS values and coordinates.
  const PLACEMENTS = [
    'src/app/ui/components/GoogleRating/GoogleRating.tsx',
    'src/app/ui/components/TrustStrip/TrustStrip.tsx',
    'src/app/(shop)/tires/container/TiresHero.tsx',
    'src/app/(home)/container/Home/Home.tsx',
    'src/app/ui/sections/TireInformation/TireInformation.tsx',
    'src/app/ui/sections/CartModal/CartModal.tsx',
    'src/app/(shop)/checkout/container/Checkout/Checkout.tsx',
    'src/app/(shop)/locations/[location]/container/LocationDetail/LocationDetail.tsx',
    'src/app/(shop)/locations/page.tsx',
    'src/app/ui/components/LocationCard/LocationCard.tsx',
  ];

  // Comments may quote the format ("4.7 · 5,952 Google reviews"); code may not.
  const code = (file: string) =>
    readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

  it.each(PLACEMENTS)('%s types no figure', file => {
    expect(code(file)).not.toMatch(/\d\.\d ·|[\d,]{3,} Google|\d\.\d out of/);
  });
});
