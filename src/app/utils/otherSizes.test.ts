import { describe, expect, it } from 'vitest';

import type { ModelSizeGroup } from '@/repositories/otherSizesRepository';

import { otherSizesFor, priceLabel } from './otherSizes';

const g = (size: string, over: Partial<ModelSizeGroup> = {}): ModelSizeGroup => ({
  brand: 'FIRESTONE',
  model: 'DESTINATION LE3',
  size,
  rim: size.split('/')[2],
  units: 1,
  minPrice: 100,
  tireId: `id-${size}`,
  isNew: false,
  ...over,
});

const GROUPS: ModelSizeGroup[] = [
  g('235/50/19', { units: 3, minPrice: 115 }),
  g('225/60/18', { minPrice: 80 }),
  g('235/55/17', { isNew: true, minPrice: 220 }),
  g('235/55/18'),
  g('205/55/16', { brand: 'MICHELIN' }), // another brand
  g('245/45/18', { model: 'DESTINATION A/T' }), // another model
];

const tire = { id: '500138', brand: 'FIRESTONE', model2: 'DESTINATION LE3', size: '235/55/18' };

describe('otherSizesFor (049)', () => {
  it('lists the same brand and model by rim, in numeric order, own rim open (AC6)', () => {
    const view = otherSizesFor(tire, GROUPS)!;
    expect(view.groups.map(r => r.rim)).toEqual(['17', '18', '19']);
    expect(view.groups.map(r => r.open)).toEqual([false, true, false]);
    expect(view.groups[1].sizes.map(s => s.size)).toEqual(['225/60/18', '235/55/18']);
    expect(view.otherCount).toBe(3);
  });

  it('marks the own size current and links the rest to their cheapest tire', () => {
    const rim18 = otherSizesFor(tire, GROUPS)!.groups[1].sizes;
    expect(rim18.find(s => s.size === '235/55/18')!.current).toBe(true);
    expect(rim18.find(s => s.size === '225/60/18')).toMatchObject({
      current: false,
      tireId: 'id-225/60/18',
      minPrice: 80,
    });
  });

  it('flags a size whose cheapest tire is new, and carries counts (D5b, D6)', () => {
    const view = otherSizesFor(tire, GROUPS)!;
    expect(view.groups[0].sizes[0]).toMatchObject({ size: '235/55/17', isNew: true });
    expect(view.groups[2].sizes[0]).toMatchObject({ size: '235/50/19', units: 3 });
  });

  it('returns null when the model has no other size (AC7)', () => {
    expect(otherSizesFor(tire, [g('235/55/18')])).toBeNull();
    expect(otherSizesFor(tire, [])).toBeNull();
    expect(otherSizesFor({ ...tire, model2: undefined }, GROUPS)).toBeNull();
  });

  it('still shows the own size for a tire the catalog does not list (FR10)', () => {
    const notListed = { ...tire, size: '255/40/20' };
    const view = otherSizesFor(notListed, GROUPS)!;
    const rim20 = view.groups.find(r => r.rim === '20')!;
    expect(rim20.open).toBe(true);
    expect(rim20.sizes).toEqual([expect.objectContaining({ size: '255/40/20', current: true })]);
  });

  it('on a sold tire, lists the other sizes; its own only if units remain (AC7b, FR13)', () => {
    const sold = { ...tire, size: '255/40/20', status: 'sold' };
    const view = otherSizesFor(sold, GROUPS)!;
    expect(view.groups.map(r => r.rim)).toEqual(['17', '18', '19']);
    expect(view.groups.flatMap(r => r.sizes).some(s => s.current)).toBe(false);

    const soldWithStock = otherSizesFor({ ...tire, status: 'sold' }, GROUPS)!;
    expect(soldWithStock.groups[1].sizes.find(s => s.current)?.size).toBe('235/55/18');
  });
});

describe('priceLabel', () => {
  it('says "From" only for several tires, keeps cents (FR14)', () => {
    expect(priceLabel({ units: 4, minPrice: 89 })).toBe('From $89');
    expect(priceLabel({ units: 1, minPrice: 89 })).toBe('$89');
    expect(priceLabel({ units: 2, minPrice: 1299.5 })).toBe('From $1,299.50');
  });
});
