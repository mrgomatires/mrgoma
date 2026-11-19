import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
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

describe("the sellers' login form is imported by path", () => {
  it('so its zod and react-hook-form do not ride along with every page', () => {
    // 056: it sat in the components barrel, which nearly every client
    // component imported, so every shopper downloaded it. The barrel is gone
    // since 057 (see the guard below); /login imports the form by its path.
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
    // 058: it starts from the server's session, so the browser reads none on load.
    expect(read('src/app/(sellers)/dashboard/layout.tsx')).toContain(
      '<SessionProvider session={session}>'
    );
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

/**
 * 057: the components, icons and sections index files bundled everything they
 * listed together, so every page downloaded all ~40 icons and nearly every
 * widget — 70–80 KB gz it never ran. There are no index files in `src/app/ui`:
 * every import names the file it uses.
 */
describe('no barrel files in src/app/ui', () => {
  const BARRELS = [
    'src/app/ui/components/index.ts',
    'src/app/ui/icons/index.tsx',
    'src/app/ui/sections/index.ts',
  ];

  it('the index files do not exist', () => {
    expect(BARRELS.filter(p => existsSync(p))).toEqual([]);
  });

  it('and nothing imports a ui folder as a whole', () => {
    const bare = /from '@\/app\/ui\/(components|icons|sections)\/?(index)?'/;
    const offenders = filesUnder('src').filter(f => bare.test(read(f)));
    expect(offenders).toEqual([]);
  });
});

/**
 * 058: signing in failed on a local `next start` ("UntrustedHost"). The fix is
 * an environment variable for local runs only — not `trustHost` in the auth
 * configuration, which would trust the request's Host header everywhere.
 */
describe('local sign-in is configured, not coded', () => {
  it('the auth configuration does not trust every host', () => {
    expect(read('src/app/utils/authOptions.ts')).not.toMatch(/trustHost/);
  });

  it('the template documents AUTH_TRUST_HOST as local-only', () => {
    const template = read('.env.template');
    expect(template).toMatch(/^AUTH_TRUST_HOST=true$/m);
    expect(template).toMatch(/Never set it in Vercel/);
  });
});
