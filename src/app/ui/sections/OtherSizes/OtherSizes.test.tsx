import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SingleTire } from '@/app/interfaces/tires';
import type { ModelSizeGroup } from '@/repositories/otherSizesRepository';

const h = vi.hoisted(() => ({ groups: [] as ModelSizeGroup[], fail: false }));
const track = vi.hoisted(() => vi.fn());

vi.mock('@/repositories/otherSizesRepository', () => ({
  getCachedModelSizeGroups: async () => {
    if (h.fail) throw new Error('db down');
    return h.groups;
  },
}));
vi.mock('@/app/utils/analytics', () => ({ trackEvent: track }));

import OtherSizes from './OtherSizes';

const g = (size: string, over: Partial<ModelSizeGroup> = {}): ModelSizeGroup => ({
  brand: 'FIRESTONE',
  model: 'DESTINATION LE3',
  size,
  rim: size.split('/')[2],
  units: 1,
  minPrice: 100,
  tireId: `9${size.replace(/\D/g, '')}`,
  isNew: false,
  ...over,
});

const tire: SingleTire = {
  id: 500138,
  name: '(1) | FIRESTONE | 235/55/18',
  color: '',
  price: '145',
  brand: 'FIRESTONE',
  brandId: 1,
  condition: 'Used',
  patched: 'No',
  remainingLife: '90%',
  treadDepth: '9.0',
  size: '235/55/18',
  model2: 'DESTINATION LE3',
  images: [],
  details: [],
  status: 'available',
  city: 'Miami',
};

const renderIt = async (t: SingleTire = tire) => {
  const ui = await OtherSizes({ tire: t });
  return render(<>{ui}</>);
};

beforeEach(() => {
  h.fail = false;
  track.mockReset();
  h.groups = [
    g('235/55/18'),
    g('225/60/18', { units: 4, minPrice: 80 }),
    g('235/55/17', { isNew: true, minPrice: 220 }),
    g('235/50/19', { units: 3, minPrice: 115 }),
  ];
});

describe('OtherSizes (049)', () => {
  it('lists other sizes by rim with price, count and a link to the cheapest tire (AC6, AC8)', async () => {
    const { container } = await renderIt();
    expect(screen.getByRole('heading', { level: 2, name: 'Other sizes of this tire' })).toBeVisible();

    const groups = container.querySelectorAll('details');
    expect([...groups].map(d => d.dataset.rim)).toEqual(['17', '18', '19']);
    expect([...groups].map(d => d.open)).toEqual([false, true, false]);

    const link = screen.getByRole('link', { name: /225\/60\/18/ });
    expect(link).toHaveAttribute('href', '/tires/92256018-firestone-225-60-18');
    expect(link).toHaveTextContent('From $80');
    expect(link).toHaveTextContent('4 available');
    expect(link).toHaveAttribute('data-track', 'other_size_select');
    expect(link).toHaveAttribute('data-track-from', '235/55/18');
    expect(link).toHaveAttribute('data-track-label', '225/60/18');

    // A closed group keeps its links in the HTML (crawlable, findable).
    expect(within(groups[0] as HTMLElement).getByRole('link', { hidden: true })).toHaveTextContent(
      'New'
    );
    expect(screen.getByRole('link', { name: /235\/50\/19/, hidden: true })).toHaveTextContent(
      'From $115'
    );
  });

  it('shows its own size highlighted and not linked', async () => {
    await renderIt();
    const own = screen.getByText('This tire').closest('li')!;
    expect(own).toHaveAttribute('aria-current', 'true');
    expect(own).toHaveTextContent('235/55/18');
    expect(within(own).queryByRole('link')).toBeNull();
  });

  it('a single tire of a size reads "$X", not "From" (FR14)', async () => {
    await renderIt();
    expect(screen.getByRole('link', { name: /235\/55\/17/, hidden: true })).toHaveTextContent(
      /\$220 · 1 available/
    );
  });

  it('renders nothing when the model has no other size, or the lookup fails (AC7)', async () => {
    h.groups = [g('235/55/18')];
    expect((await renderIt()).container).toBeEmptyDOMElement();
    h.fail = true;
    expect((await renderIt()).container).toBeEmptyDOMElement();
  });

  it('appears on a sold tire too (AC7b)', async () => {
    h.groups = h.groups.filter(x => x.size !== '235/55/18');
    await renderIt({ ...tire, status: 'sold' });
    expect(screen.getByRole('heading', { name: 'Other sizes of this tire' })).toBeInTheDocument();
    expect(screen.queryByText('This tire')).toBeNull();
  });

  it('reports a rim group opened, never a close (AC9)', async () => {
    const { container } = await renderIt();
    // Let the tracker's hydration guard pass.
    await new Promise(r => setTimeout(r, 60));
    const rim17 = container.querySelector<HTMLDetailsElement>('details[data-rim="17"]')!;
    rim17.open = true;
    fireEvent(rim17, new Event('toggle'));
    rim17.open = false;
    fireEvent(rim17, new Event('toggle'));
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'other_sizes_open', label: '17' })
    );
  });
});
