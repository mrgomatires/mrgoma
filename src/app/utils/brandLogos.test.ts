import { readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { BRAND_LOGO_IDS, brandLogoSrc, hasBrandLogo } from './brandLogos';
import { logoIds } from '../../../scripts/brand-logos.mjs';


describe('brand logos (055)', () => {
  it('the list matches the folder — run `node scripts/brand-logos.mjs` after adding a logo', () => {
    const onDisk = logoIds(readdirSync('public/assets/images/TireBrand'));
    expect([...BRAND_LOGO_IDS].sort((a, b) => a - b)).toEqual(onDisk);
  });

  it('knows which brands have a file', () => {
    const [first] = BRAND_LOGO_IDS;
    expect(hasBrandLogo(first)).toBe(true);
    expect(hasBrandLogo(2481)).toBe(BRAND_LOGO_IDS.has(2481));
    expect(hasBrandLogo(undefined)).toBe(false);
    expect(brandLogoSrc(42)).toBe('/assets/images/TireBrand/42-logo.webp');
  });

  it('reads only `{id}-logo.webp` names', () => {
    expect(logoIds(['10-logo.webp', 'no-brand.webp', '9-logo.webp', 'x.png'])).toEqual([9, 10]);
  });
});
