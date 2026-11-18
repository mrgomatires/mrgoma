import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TireFacets } from '@/repositories/facetQuery';

import FilterRail, { RAIL_ORDER } from './FilterRail';
import FilterRailMobile from './FilterRailMobile';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
beforeEach(() => vi.clearAllMocks());

const FACETS: TireFacets = {
  condition: { used: 2687, new: 1440 },
  width: { '225': 400, '245': 300 },
  sidewall: { '50': 200, '55': 100 },
  rim: { '20': 825, '23': 93, '19.5': 1 },
  brand: { PIRELLI: 964, MICHELIN: 303 },
  price: { p1: 417, p2: 1342, p3: 1021 },
  life: { l1: 2045, l2: 1018 },
  patched: { no: 3000, yes: 1127 },
  runFlat: { yes: 494, no: 3633 },
  total: 4127,
};

const RANGES = {
  minPrice: 70,
  maxPrice: 2002,
  minTreadDepth: 2,
  maxTreadDepth: 12,
  minRemainingLife: 50,
  maxRemainingLife: 99,
};

const renderRail = (filters = {}, search = '') =>
  render(
    <FilterRail
      facets={FACETS}
      filters={filters}
      search={search}
      basePath="/tires"
      ranges={RANGES}
    />
  );

describe('FilterRail', () => {
  /**
   * **Brand first**, at the owner's direction: it is the filter buyers reach
   * for, and it had been sitting under three long size lists. Asserted against
   * the exported constant so the order cannot drift from the decision.
   */
  it('reads the groups in the agreed order, brand first', () => {
    renderRail();
    const headings = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(headings).toEqual([
      'Brand',
      'Condition',
      'Width',
      'Profile',
      'Rim size',
      'Price',
      'Tread life',
      'Patched',
      'Run-flat',
    ]);
    expect(headings).toHaveLength(RAIL_ORDER.length);
  });

  /**
   * Width, profile and rim hold 22, 17 and 14 values. Drawn flat they were 53
   * rows between the top of the rail and the price filter — most of a screen in
   * a 240 px column, spent on lists most buyers never open because they already
   * know their size.
   */
  it('folds the three size groups away', () => {
    const { container } = renderRail();
    // Only the group headings — the range facets have their own disclosure for
    // the exact-range slider, and its summary carries no heading.
    const summaries = [...container.querySelectorAll('summary')]
      .map(s => s.querySelector('h3')?.textContent)
      .filter(Boolean);
    expect(summaries).toEqual(['Width', 'Profile', 'Rim size']);
  });

  /**
   * **Every option must reach the markup**, not just the ones drawn.
   *
   * Rendering a slice looked identical and was not: only the first eight
   * survived, so without JavaScript — and to a crawler — the rim group offered
   * 13" to 19.5" and **23", 24" and 26" did not exist**. Those are the 102 tires
   * this rail was built to make reachable, put back out of reach by a button
   * that needs JavaScript to work.
   */
  it('puts every rim size in the markup, however few are drawn', () => {
    const { container } = renderRail();
    const rimLinks = [...container.querySelectorAll('a')]
      .map(a => a.getAttribute('href'))
      .filter(h => h?.includes('d='));
    for (const size of Object.keys(FACETS.rim)) {
      expect(
        rimLinks.some(h => h?.includes(`d=${size}`)),
        `no link for ${size}"`
      ).toBe(true);
    }
  });

  it('opens a size group that has something applied, so it is never hidden', () => {
    const { container } = renderRail({ diameter: '20' }, '?d=20');
    const rimDetails = [...container.querySelectorAll('details')].find(
      d => d.querySelector('h3')?.textContent === 'Rim size'
    );
    expect(rimDetails).toHaveAttribute('open');
    // And says so while folded, for the ones that are not open.
    expect(rimDetails?.querySelector('summary')).toHaveTextContent('20"');
  });

  it('leaves the short groups open, since folding two options saves nothing', () => {
    const { container } = renderRail();
    const folded = [...container.querySelectorAll('summary')].map(
      s => s.querySelector('h3')?.textContent
    );
    for (const short of ['Condition', 'Price', 'Tread life', 'Patched', 'Run-flat']) {
      expect(folded).not.toContain(short);
    }
  });

  it('gives every long group its own search box', () => {
    renderRail();
    for (const plural of ['brands', 'widths', 'profiles', 'sizes']) {
      expect(screen.getByLabelText(`Search ${plural}`)).toBeInTheDocument();
    }
  });

  it('offers every rim the catalogue holds, including the ones the old chips hid', () => {
    renderRail();
    // 23" has 93 tires and was unreachable; 19.5" existed and had no chip at all.
    expect(screen.getByRole('link', { name: /23"/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /19\.5"/ })).toBeInTheDocument();
  });

  it('puts a count on every option', () => {
    renderRail();
    expect(screen.getByText('2,687')).toBeInTheDocument();
    expect(screen.getByText('825')).toBeInTheDocument();
    expect(screen.getByText('964')).toBeInTheDocument();
  });

  it('filters with links and marks the applied one with aria-current', () => {
    const { container } = renderRail({ diameter: '20' }, '?d=20');
    // Scoped to the rim group: the applied chip above also reads 20".
    const rimGroup = screen.getByRole('heading', { name: 'Rim size' }).closest('section')!;
    expect(within(rimGroup).getByRole('link', { name: /20"/ })).toHaveAttribute(
      'aria-current',
      'true'
    );
    expect(within(rimGroup).getByRole('link', { name: /23"/ })).not.toHaveAttribute('aria-current');
    expect(container.querySelectorAll('[aria-pressed]')).toHaveLength(0);
    expect(container.querySelectorAll('form')).toHaveLength(0);
  });

  it('shows what is applied, each removable on its own', () => {
    renderRail({ diameter: '20', brands: ['PIRELLI'] }, '?d=20&brands=PIRELLI');
    expect(screen.getByRole('link', { name: 'Remove 20" filter' })).toHaveAttribute(
      'href',
      '/tires?brands=PIRELLI'
    );
    expect(screen.getByRole('link', { name: 'Remove Pirelli filter' })).toHaveAttribute(
      'href',
      '/tires?d=20'
    );
  });

  it('offers Clear all only once something is applied', () => {
    const { unmount } = renderRail();
    expect(screen.queryAllByRole('link', { name: 'Clear all' })).toHaveLength(0);
    unmount();

    renderRail({ diameter: '20' }, '?d=20&view=table');
    // Clearing keeps how the buyer is reading the list.
    for (const link of screen.getAllByRole('link', { name: 'Clear all' })) {
      expect(link).toHaveAttribute('href', '/tires?view=table');
    }
  });

  it('hides a group that cannot narrow anything', () => {
    render(
      <FilterRail
        facets={{ ...FACETS, patched: { no: 4127 }, runFlat: {} }}
        filters={{}}
        search=""
        basePath="/tires"
        ranges={RANGES}
      />
    );
    const headings = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(headings).not.toContain('Patched');
    expect(headings).not.toContain('Run-flat');
  });
});

describe('FilterRailMobile', () => {
  const renderMobile = (search: string) =>
    render(
      <FilterRailMobile
        facets={FACETS}
        filters={{}}
        search={search}
        basePath="/tires"
        ranges={RANGES}
      />
    );

  it('collapses, and says nothing extra when nothing is applied', () => {
    const { container } = renderMobile('');
    const summary = container.querySelector('summary')!;
    expect(summary).toHaveTextContent('Filters');
    expect(within(summary).queryByText(/active/)).not.toBeInTheDocument();
  });

  /**
   * A closed control that only says "Filters" leaves the buyer wondering why
   * they are seeing 40 tires and not 4.127.
   */
  it('says how many filters are on while it is shut', () => {
    renderMobile('?brands=PIRELLI&d=20');
    expect(screen.getByText('2 active')).toBeInTheDocument();
  });

  it('counts a price band as the one choice it is', () => {
    renderMobile('?minPrice=100&maxPrice=149');
    expect(screen.getByText('1 active')).toBeInTheDocument();
  });

  it('does not count how the buyer is reading the list', () => {
    renderMobile('?view=table&sort=price-asc&page=3');
    expect(screen.queryByText(/active/)).not.toBeInTheDocument();
  });

  it('opens with the browser, so it needs no JavaScript to disclose', () => {
    const { container } = renderMobile('');
    expect(container.querySelector('details')).toBeInTheDocument();
    expect(container.querySelector('summary')).toBeInTheDocument();
  });
});

/**
 * On a phone the disclosure's summary already says "Filters". The panel said it
 * again four lines below — the page telling the buyer what they had just tapped.
 */
describe('the mobile panel does not repeat its own summary', () => {
  const props = {
    facets: FACETS,
    filters: {},
    search: '',
    basePath: '/tires',
    ranges: RANGES,
  };

  it('says Filters once, in the summary', () => {
    render(<FilterRailMobile {...props} />);
    expect(screen.getAllByText(/^Filters/)).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Filters' })).not.toBeInTheDocument();
  });

  it('but keeps Clear all inside the panel', () => {
    render(<FilterRailMobile {...props} filters={{ diameter: '20' }} search="?d=20" />);
    expect(screen.getByRole('link', { name: 'Clear all' })).toBeInTheDocument();
  });

  it('and the desktop rail still carries its heading', () => {
    render(<FilterRail {...props} />);
    expect(screen.getByRole('heading', { name: 'Filters' })).toBeInTheDocument();
  });
});

/**
 * The summary and the panel each drew their own bordered card, with a gap
 * between them: on a phone the control and the thing it opens read as two
 * unrelated sections.
 */
describe('the mobile disclosure is one card, not two', () => {
  const props = { facets: FACETS, filters: {}, search: '', basePath: '/tires', ranges: RANGES };

  it('the card is on the details element', () => {
    const { container } = render(<FilterRailMobile {...props} />);
    const details = container.querySelector('details')!;
    expect(details.className).toContain('border');
    expect(details.className).toContain('rounded-xl');
  });

  it('and neither the summary nor the panel draws its own', () => {
    const { container } = render(<FilterRailMobile {...props} />);
    const summary = container.querySelector('summary')!;
    expect(summary.className).not.toContain('rounded-xl');
    // The rail inside is bare: no second border, no second background.
    const panel = container.querySelector('details > div')!;
    expect(panel.firstElementChild?.className ?? '').not.toContain('rounded-xl');
  });

  it('while the desktop rail keeps its card', () => {
    const { container } = render(<FilterRail {...props} />);
    expect(container.firstElementChild?.className).toContain('rounded-xl');
  });
});

describe('the way to every size (050)', () => {
  it('links the size index at the end of the Rim size group', () => {
    renderRail();
    const link = screen.getByRole('link', { name: 'See all sizes →' });
    expect(link).toHaveAttribute('href', '/tires/size');
    expect(link).toHaveAttribute('data-track', 'see_all_sizes');
    expect(link).toHaveAttribute('data-track-surface', 'rail');
    // After the Rim size heading, before Price: inside the rim group.
    const rim = screen.getByRole('heading', { name: 'Rim size' });
    const price = screen.getByRole('heading', { name: 'Price' });
    expect(rim.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(link.compareDocumentPosition(price) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
