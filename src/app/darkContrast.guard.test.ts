import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * One rule for secondary text on the dark pages (055, D2).
 *
 * On `#0a0a0a`, `#111` and `#161616`, Tailwind's `gray-500` reads 3.7–4.1:1 and
 * `gray-600` 2.5:1 — under WCAG AA's 4.5:1 — and Lighthouse flagged both on the
 * store and service pages. `gray-400` is 6.5:1 or better on all three. These
 * files render on a dark background throughout, so neither failing shade may
 * appear in them; `npm run a11y` checks the rendered pages for everything else.
 */
const DARK_PAGES = [
  'src/app/(shop)/locations/[location]/container/LocationDetail/LocationDetail.tsx',
  'src/app/(shop)/services/[service]/container/ServiceDetail/ServiceDetail.tsx',
  'src/app/(shop)/about-us/container/AboutUs/AboutUs.tsx',
  'src/app/(shop)/services/page.tsx',
  'src/app/(shop)/locations/page.tsx',
  'src/app/(shop)/guides/page.tsx',
  'src/app/(shop)/contact/container/Contact/Contact.tsx',
  'src/app/(shop)/legal-policies/page.tsx',
];

describe('secondary text on dark pages is legible (055)', () => {
  it.each(DARK_PAGES)('%s uses no gray-500 / gray-600 text', file => {
    expect(readFileSync(file, 'utf8')).not.toMatch(/\btext-gray-(500|600)\b/);
  });
});
