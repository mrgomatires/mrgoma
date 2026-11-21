import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TransformedTire } from '@/app/interfaces/tires';

vi.mock('@/app/ui/sections/TireCard/TireCard', () => ({
  default: () => <ul data-testid="cards" />,
}));

const { TireGrid } = await import('./TireGrid');

const tires = [{ id: '1' }] as unknown as TransformedTire[];
const wrapper = (besideRail?: boolean) =>
  render(
    <TireGrid tires={tires} totalCount={1} viewAllHref="/tires" besideRail={besideRail} />
  ).getByTestId('cards').parentElement!;

describe('TireGrid width (059)', () => {
  it('beside the filter rail (/tires/used) it takes the column, like /tires', () => {
    expect(wrapper(true).className).not.toContain('max-w-3xl');
  });

  it('on pages with no rail it keeps the centred 768 px list', () => {
    expect(wrapper().className).toContain('max-w-3xl');
  });
});
