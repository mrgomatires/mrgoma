import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The compare tray is mounted by the store layout, so it stays alive across
 * pages. With the listing's `BrandImage` imported into it, `next dev` refetched
 * the page's RSC payload about once a second, forever (`/tires` also refetched
 * `/api/tires` each time). Production builds were not affected, but the loop
 * hid everything else in the network panel and hammered the database in dev.
 * Found in 051's owner review; `CompareBrand` replaces it.
 */
describe('the compare tray does not import BrandImage', () => {
  it('in any of its files', () => {
    const dir = 'src/app/ui/sections/CompareTray';
    for (const f of readdirSync(dir).filter(n => n.endsWith('.tsx') && !n.includes('.test.'))) {
      expect(readFileSync(join(dir, f), 'utf8'), f).not.toMatch(/from ['"][^'"]*BrandImage/);
    }
  });
});
