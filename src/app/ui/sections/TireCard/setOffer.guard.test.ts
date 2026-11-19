import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * One set rule (054, AC8). The tire page's builder, the chat (044) and the
 * listing cards all decide what a set is in `tireSets.ts`; the card's endpoint
 * and the card itself only call it. A second copy of "2/32 inch", or of how a
 * set is priced, is how the card and the builder would start to disagree.
 */
const ENDPOINT = readFileSync('src/app/api/tires/sets/route.ts', 'utf8');
const CARD = readFileSync('src/app/ui/sections/TireCard/TireCard.tsx', 'utf8');
const TABLE = readFileSync('src/app/ui/components/TireTable/TireTable.tsx', 'utf8');

describe('the set offer has one rule (054)', () => {
  it('the endpoint asks tireSets.ts and the builder’s own candidates', () => {
    expect(ENDPOINT).toMatch(/import \{[^}]*cardSetOffer[^}]*\} from '@\/app\/utils\/tireSets'/);
    expect(ENDPOINT).toContain('getCachedSetCandidates');
    expect(ENDPOINT).toContain('mapTireRecordToSingleTire');
  });

  it('neither the endpoint nor the card decides tread or price on its own', () => {
    for (const source of [ENDPOINT, CARD]) {
      expect(source).not.toMatch(/MAX_TREAD_SPREAD|effectiveTread|\.reduce\([^)]*price/);
    }
  });

  it('the card writes the builder link with the chat’s own writer', () => {
    expect(CARD).toContain("from '@/app/utils/chatSets'");
    expect(CARD).toMatch(/setHref\(/);
  });

  it('the table view shows no set line (AC9, D5)', () => {
    expect(TABLE).not.toMatch(/useSetOffers|set_offer_select/);
  });
});
