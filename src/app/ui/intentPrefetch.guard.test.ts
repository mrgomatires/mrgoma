import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * 060: links people rarely follow pre-load only on hover / touch
 * (`IntentPrefetchLink`). A plain `next/link` pre-loads on sight — for a tire
 * page that is a database read per visible link (~20 per scroll of /tires),
 * for the menu and footer ~120 KB per desktop page view.
 *
 * Checked on the source: every surface below may use a plain `<Link>` only for
 * the destinations listed (the ones people usually do follow). Rendering tests
 * for the card and the menu: `TireCard.prefetch.test.tsx`,
 * `menu.prefetch.test.tsx`.
 */

/**
 * The `href` of every plain `<Link …>` element in a source file. Brace values
 * are read with their nesting (`{`/tires/${slug}`}`), so an arrow function in
 * another prop cannot end the element early.
 */
function plainLinkHrefs(source: string): string[] {
  const hrefs: string[] = [];
  for (const m of source.matchAll(/<Link\b/g)) {
    const at = source.indexOf('href=', m.index);
    const next = source.indexOf('<', m.index + 1);
    if (at < 0 || (next >= 0 && at > next)) {
      hrefs.push('(no href)');
      continue;
    }
    const open = source[at + 5];
    if (open === '"') {
      hrefs.push(source.slice(at + 5, source.indexOf('"', at + 6) + 1));
      continue;
    }
    let depth = 0;
    let i = at + 5;
    for (; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}' && --depth === 0) break;
    }
    hrefs.push(source.slice(at + 5, i + 1));
  }
  return hrefs;
}

const SITES: { file: string; plainAllowed: string[]; intent?: false }[] = [
  // Links to a tire's page.
  { file: 'src/app/ui/sections/TireCard/TireCard.tsx', plainAllowed: [] },
  { file: 'src/app/ui/components/TireTable/TireTable.tsx', plainAllowed: [] },
  { file: 'src/app/ui/sections/OtherSizes/OtherSizes.tsx', plainAllowed: [] },
  { file: 'src/app/ui/sections/TireSet/SoldTireAlternative.tsx', plainAllowed: [] },
  { file: 'src/app/ui/sections/CompareTray/CompareDialog.tsx', plainAllowed: [] },
  // The cart's "Checkout" button is followed: it keeps the default.
  { file: 'src/app/ui/sections/CartModal/CartModal.tsx', plainAllowed: ['"/checkout"'] },
  // Checkout's "continue shopping" links keep the default; its items don't.
  {
    file: 'src/app/(shop)/checkout/container/Checkout/Checkout.tsx',
    plainAllowed: ['"/tires"', '"/"'],
  },
  // The menu: only the logo keeps the default.
  { file: 'src/app/ui/sections/Header/Header.tsx', plainAllowed: ['"/"'] },
  { file: 'src/app/ui/sections/MenuMobile/components/MenuItem.tsx', plainAllowed: [] },
  {
    file: 'src/app/ui/sections/MenuMobile/components/MenuHeader.tsx',
    plainAllowed: ['"/"'],
    intent: false,
  },
  // The footer.
  { file: 'src/app/ui/sections/Footer/Footer.tsx', plainAllowed: [] },
  { file: 'src/app/ui/sections/Footer/FooterSection.tsx', plainAllowed: [] },
];

describe('rarely-followed links pre-load on intent (060)', () => {
  it('reads plain Link hrefs, across lines', () => {
    expect(
      plainLinkHrefs(
        '<Link\n  href={`/tires/${slug}`}\n  className="x"\n>a</Link><Link href="/">b</Link>'
      )
    ).toEqual(['{`/tires/${slug}`}', '"/"']);
  });

  it.each(SITES)('$file', ({ file, plainAllowed, intent }) => {
    const source = readFileSync(file, 'utf8');
    const disallowed = plainLinkHrefs(source).filter(h => !plainAllowed.includes(h));
    expect(disallowed, 'plain <Link> where IntentPrefetchLink belongs').toEqual([]);
    if (intent !== false) {
      expect(source).toContain(
        "import IntentPrefetchLink from '@/app/ui/components/IntentPrefetchLink/IntentPrefetchLink'"
      );
    }
  });

  it('the set builder links other tires with a plain <a target="_blank">, never pre-loaded', () => {
    const source = readFileSync('src/app/ui/sections/TireSet/TireSetBuilder.tsx', 'utf8');
    expect(plainLinkHrefs(source)).toEqual([]);
  });
});
