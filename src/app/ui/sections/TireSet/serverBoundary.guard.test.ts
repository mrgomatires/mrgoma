import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Feature 041 broke the production build once: `TireInformation` imported the
 * set block, which reads the database through `mssql`, and `TireInformation` is
 * exported from the `@/app/ui/sections` barrel that client components import.
 * Turbopack then tried to bundle `mssql` (and `dgram`, `dns`) for the browser.
 *
 * The fix passes the block in as `setSlot` from `DetailView`. These checks keep
 * the database side out of the barrel's reach. Since 057 there is no sections
 * barrel at all (`src/bundle.guard.test.ts`), which removes this trap; the
 * checks on `TireInformation` and `DetailView` still stand.
 */
const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('the set block stays on the server side of the barrel', () => {
  it('cannot be exported from a sections barrel: there is none', () => {
    expect(existsSync(join(root, 'src/app/ui/sections/index.ts'))).toBe(false);
  });

  it('is not imported by TireInformation (which the barrel exports)', () => {
    expect(read('src/app/ui/sections/TireInformation/TireInformation.tsx')).not.toMatch(
      /TireSetSection|SoldTireAlternative|tireSetsRepository/
    );
  });

  it('is mounted from DetailView, which only server pages import', () => {
    expect(read('src/app/(shop)/detail/container/DetailView/DetailView.tsx')).toMatch(
      /TireSetSection/
    );
    expect(read('src/app/(shop)/detail/container/DetailView/DetailView.tsx')).toMatch(
      /SoldTireAlternative/
    );
  });
});

describe('"Other sizes" (049) stays on the server side of the barrel', () => {
  it('cannot be exported from a sections barrel: there is none', () => {
    expect(existsSync(join(root, 'src/app/ui/sections/index.ts'))).toBe(false);
  });

  it('is mounted from DetailView', () => {
    expect(read('src/app/(shop)/detail/container/DetailView/DetailView.tsx')).toMatch(
      /<OtherSizes tire=/
    );
  });
});
