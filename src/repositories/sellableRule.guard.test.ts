import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * "A tire we may sell online" is one rule: not local, not trashed, not sold, at
 * least 50% life left, and priced. It decides what the catalog shows, what the
 * Google Merchant feed publishes and what every facet counts.
 *
 * It existed twice — `STOREFRONT_SELLABLE_WHERE` and a character-identical
 * literal inside `fetchBrands`. Identical copies are the dangerous kind: nothing
 * fails while they agree, and nothing warns when one is edited. The same shape
 * is called out for consent rules in `tech-stack.md`, for the WhatsApp number in
 * `019` and for the store hours in `018`.
 *
 * So: the sentence may be written **once**, where the constant is defined.
 */

/**
 * The whole sentence, not a fragment. `Condition != 'sold'` alone also appears
 * in rules that are deliberately different — `fetchActiveTireIds` and the
 * dimension queries apply no life test at all — and flagging those would push
 * towards unifying rules that genuinely differ.
 */
const RULE = /Condition != 'sold' AND TRY_CAST\(REPLACE\(RemainingLife/;
const DEFINITION = 'src/repositories/feedQuery.ts';

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (/\.(ts|tsx)$/.test(entry)) found.push(full);
  }
  return found;
}

describe('the sellable rule is written once', () => {
  it('only the constant spells it out', () => {
    const offenders = sourceFiles('src')
      .filter(file => !file.endsWith('.test.ts') && !file.endsWith('.test.tsx'))
      .filter(file => file !== DEFINITION)
      .filter(file => RULE.test(readFileSync(file, 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('no query compares remaining life as text (052)', () => {
    // `RemainingLife > '70%'` orders lexicographically: '100%' < '70%'.
    const textCompare = /AND\s+RemainingLife\s*[<>]=?\s*'/;
    const offenders = sourceFiles('src')
      .filter(file => !file.endsWith('.test.ts') && !file.endsWith('.test.tsx'))
      .filter(file => textCompare.test(readFileSync(file, 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('and the constant still says what it should', () => {
    const source = readFileSync(DEFINITION, 'utf8');
    for (const part of [
      "Local = '0'",
      "Trash = 'false'",
      "Condition != 'sold'",
      "TRY_CAST(REPLACE(RemainingLife, '%', '') AS int) >= 50",
      'Price != 0',
    ]) {
      expect(source).toContain(part);
    }
  });
});
