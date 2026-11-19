import { describe, expect, it } from 'vitest';

import { activeFilterCount, clearAll } from './filterHref';
import {
  conditionHref,
  usedCatalogHref,
  isNewOnly,
  normalizeUsedFilters,
  TREAD_SR_HINT,
  treadLabel,
  withUsed,
  withoutUsedFilters,
} from './usedFilters';

describe('used-filter links (052, D3)', () => {
  it('applying a used filter narrows to used', () => {
    expect(withUsed('?brands=PIRELLI')).toBe('?brands=PIRELLI&condition=used');
    expect(withUsed('?condition=new%2Cused&page=3')).toBe('?condition=used');
  });

  it('"View all" on /tires/used carries the filters to /tires (T12)', () => {
    expect(usedCatalogHref('?minTreadDepth=8&patched=no')).toBe(
      '/tires?condition=used&minTreadDepth=8&patched=no'
    );
    expect(usedCatalogHref('')).toBe('/tires?condition=used');
  });

  it('drops every used-only filter and the page', () => {
    expect(
      withoutUsedFilters(
        '?brands=PIRELLI&minTreadDepth=8&minRemainingLife=90&maxRemainingLife=100&patched=no&page=2'
      )
    ).toBe('?brands=PIRELLI');
  });

  it('keeps the used filters only when the next condition is exactly used', () => {
    const search = '?condition=used&minTreadDepth=8&patched=no';
    // To New: dropped.
    expect(conditionHref(search, ['new'])).toBe('?condition=new');
    // Adding New (both): dropped too — kept, the server would narrow back to used.
    expect(conditionHref(search, ['used', 'new'])).toBe('?condition=used%2Cnew');
    // Removing the Used condition: dropped.
    expect(conditionHref(search, [])).toBe('');
    // Staying on used: kept.
    expect(conditionHref(search, ['used'])).toBe('?condition=used&minTreadDepth=8&patched=no');
  });

  it('counts and clears the tread filter like any other (T5)', () => {
    expect(activeFilterCount('?condition=used&minTreadDepth=8')).toBe(2);
    expect(clearAll('?condition=used&minTreadDepth=8&page=2')).toBe('');
  });

  it('names the steps for eyes and for screen readers (AC12)', () => {
    expect(treadLabel(8)).toBe('8/32"+');
    expect(TREAD_SR_HINT).toBe('minimum tread');
  });
});

describe('normalizeUsedFilters (052)', () => {
  it('narrows to used when a used filter comes without a condition, or with both', () => {
    expect(normalizeUsedFilters({ minTreadDepth: 8 }).condition).toEqual(['used']);
    expect(normalizeUsedFilters({ patched: ['no'], condition: ['used', 'new'] }).condition).toEqual(
      ['used']
    );
  });

  it('drops the used filters when only new tires are asked for (AC5)', () => {
    const out = normalizeUsedFilters({
      condition: ['new'],
      minTreadDepth: 8,
      minRemainingLife: 90,
      patched: ['no'],
      kindSale: ['yes'],
    });
    expect(out).toEqual({ condition: ['new'], kindSale: ['yes'] });
  });

  it('ignores a tread bound outside 1–32', () => {
    expect(normalizeUsedFilters({ minTreadDepth: 99 })).toEqual({});
    expect(normalizeUsedFilters({ minTreadDepth: 0 })).toEqual({});
  });

  it('leaves filters without a used filter alone', () => {
    const f = { brands: ['PIRELLI'], kindSale: ['yes'] };
    expect(normalizeUsedFilters(f)).toEqual(f);
  });

  it('knows a New-only view', () => {
    expect(isNewOnly({ condition: ['new'] })).toBe(true);
    expect(isNewOnly({ condition: ['new', 'used'] })).toBe(false);
    expect(isNewOnly({})).toBe(false);
  });
});
