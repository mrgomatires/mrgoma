import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * 056: three things shipped to every shopper that only sellers, or only a
 * scroll, need. Asserted against the source because the build output is
 * checked separately (`npm run perf:budget`), and that needs a build; this
 * fails in `npm test`, before anyone builds.
 */

const read = (p: string) => readFileSync(p, 'utf8');

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return filesUnder(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

describe("the sellers' login form is not in the shared components barrel", () => {
  it('so its zod and react-hook-form do not ride along with every page', () => {
    // 105 KB gz on every page: the barrel is imported by nearly every client
    // component, and a client barrel is not tree-shaken.
    expect(read('src/app/ui/components/index.ts')).not.toMatch(/export[^\n]*LoginForm/);
    expect(read('src/app/(sellers)/login/container/Login.tsx')).toContain(
      "from '@/app/ui/components/LoginForm/LoginForm'"
    );
  });
});

describe('the session client lives with the dashboard', () => {
  const ALLOWED = [
    join('src', 'app', '(sellers)', 'dashboard', 'layout.tsx'),
    join('src', 'app', 'ui', 'sections', 'DashboardHeader', 'DashboardHeader.tsx'),
    join('src', 'app', 'ui', 'components', 'LoginForm', 'LoginForm.tsx'),
  ];

  it('the root layout has no SessionProvider (39 KB gz + a /api/auth/session call per visit)', () => {
    const root = read('src/app/layout.tsx');
    expect(root).not.toMatch(/from 'next-auth/);
    expect(root).not.toContain('<SessionProvider>');
    expect(read('src/app/(sellers)/dashboard/layout.tsx')).toContain('<SessionProvider>');
  });

  it("and only seller code imports next-auth's client", () => {
    // `useSession` outside the dashboard would throw: there is no provider there.
    const importers = filesUnder('src').filter(f => /from 'next-auth\/react'/.test(read(f)));
    expect(importers.sort()).toEqual([...ALLOWED].sort());
  });
});

describe("the tire page's 3D viewer downloads on the way, not at load", () => {
  it('mounts the three.js scene only when near the viewport and the browser is idle', () => {
    const src = read('src/app/ui/components/TreadWearExplorer/TreadWearExplorer.tsx');
    expect(src).toContain('useNearViewport');
    expect(src).toMatch(/near && idleReady/);
  });
});
