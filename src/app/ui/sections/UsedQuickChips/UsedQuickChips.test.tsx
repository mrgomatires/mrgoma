import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import UsedQuickChips from './UsedQuickChips';

const names = () =>
  screen.getAllByRole('link').map(l => l.getAttribute('aria-label') ?? l.textContent);

describe('UsedQuickChips (052)', () => {
  it('offers Not patched, Run-flat and 8/32"+ on a mixed view; used filters narrow to used (AC6b, AC5)', () => {
    render(<UsedQuickChips filters={{}} search="?brands=PIRELLI" basePath="/tires" />);
    expect(screen.getByRole('list', { name: 'Quick filters' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Not patched' })).toHaveAttribute(
      'href',
      '/tires?brands=PIRELLI&condition=used&patched=no'
    );
    expect(screen.getByRole('link', { name: 'Run-flat' })).toHaveAttribute(
      'href',
      '/tires?brands=PIRELLI&kindSale=yes'
    );
    expect(screen.getByRole('link', { name: '8/32"+ minimum tread' })).toHaveAttribute(
      'href',
      '/tires?brands=PIRELLI&condition=used&minTreadDepth=8'
    );
  });

  it('offers only Run-flat while browsing new tires (AC4, AC6b)', () => {
    render(
      <UsedQuickChips filters={{ condition: ['new'] }} search="?condition=new" basePath="/tires" />
    );
    expect(names()).toEqual(['Run-flat']);
  });

  it('marks an applied chip and a second tap clears it', () => {
    render(
      <UsedQuickChips
        filters={{ condition: ['used'], patched: ['no'], minTreadDepth: 8 }}
        search="?condition=used&minTreadDepth=8&patched=no"
        basePath="/tires/used"
      />
    );
    const notPatched = screen.getByRole('link', { name: /Not patched/ });
    expect(notPatched).toHaveAttribute('aria-current', 'true');
    expect(notPatched).toHaveAttribute('href', '/tires/used?condition=used&minTreadDepth=8');
    expect(screen.getByRole('link', { name: /minimum tread/ })).toHaveAttribute(
      'href',
      '/tires/used?condition=used&patched=no'
    );
  });

  it('reports to GA4 like the rail, from the quick-chip surface, nothing personal (AC11)', () => {
    render(<UsedQuickChips filters={{}} search="" basePath="/tires" />);
    const chip = screen.getByRole('link', { name: 'Run-flat' });
    expect(chip).toHaveAttribute('data-track', 'filter_apply');
    expect(chip).toHaveAttribute('data-track-filter-group', 'runFlat');
    expect(chip).toHaveAttribute('data-track-filter-value', 'yes');
    expect(chip).toHaveAttribute('data-track-surface', 'quick_chips');
  });
});
