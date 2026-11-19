import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import nextConfig from '../next.config.mjs';

/**
 * `htmlLimitedBots` (055) is Next's own list plus Googlebot, so the tire
 * page's meta description is in `<head>` for Googlebot too. The list is a copy:
 * this fails when a Next upgrade changes its default, so the copy is updated
 * rather than silently dropping a bot Next added.
 */
const NEXT_DEFAULT = readFileSync(
  'node_modules/next/dist/esm/shared/lib/router/utils/html-bots.js',
  'utf8'
).match(/HTML_LIMITED_BOT_UA_RE = \/(.+)\/i;/)![1];

describe('htmlLimitedBots (055)', () => {
  const re = nextConfig.htmlLimitedBots as RegExp;

  it('keeps every bot in Next’s own list', () => {
    for (const token of NEXT_DEFAULT.split('|')) expect(re.source).toContain(token);
  });

  it('adds Googlebot, and leaves people on streaming', () => {
    expect(
      re.test('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
    ).toBe(true);
    expect(re.test('Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/131 Safari/537.36')).toBe(
      false
    );
  });
});
