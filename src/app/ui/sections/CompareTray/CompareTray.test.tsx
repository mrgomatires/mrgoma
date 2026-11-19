import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CompareProvider } from '@/app/context/CompareContext';
import type { TransformedTire } from '@/app/interfaces/tires';
import CompareToggle from '@/app/ui/components/CompareToggle/CompareToggle';

const h = vi.hoisted(() => ({
  path: '/tires',
  track: vi.fn(),
  addToCart: vi.fn(),
  inCart: new Set<string>(),
  ecommerce: vi.fn(),
}));
vi.mock('next/navigation', () => ({ usePathname: () => h.path }));
vi.mock('@/app/utils/analytics', () => ({ trackEvent: h.track, trackEcommerce: h.ecommerce }));
vi.mock('@/app/context/CartContext', () => ({
  useCart: () => ({ addToCart: h.addToCart, isInCart: (id: string) => h.inCart.has(String(id)) }),
}));

import CompareTray from './CompareTray';

// jsdom has no showModal / ResizeObserver.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
  window.sessionStorage.clear();
  h.path = '/tires';
  h.track.mockReset();
  h.addToCart.mockReset();
  h.inCart = new Set();
});
afterEach(() => vi.unstubAllGlobals());

const tire = (
  id: string,
  over: Partial<TransformedTire> = {},
  feats: Record<string, string> = {}
): TransformedTire =>
  ({
    id,
    name: `(${id}) | PIRELLI | P ZERO | 235/45/18`,
    model: 'P ZERO',
    size: '235/45/18',
    brand: 'PIRELLI',
    brandId: 1,
    price: '100',
    condition: 'Used',
    color: 'Black',
    href: '#',
    imageSrc: '',
    imageAlt: '',
    city: 'Miami',
    dot: '2324',
    loadIndex: '94',
    speedIndex: 'V',
    features: Object.entries({
      'Tread depth': '8',
      'Remaining life': '80%',
      Patched: 'No',
      'Run Flat': 'No',
      ...feats,
    }).map(([name, value]) => ({ name, value })),
    ...over,
  }) as TransformedTire;

const TIRES = [
  tire('1', { price: '120' }, { 'Tread depth': '9' }),
  tire('2', { price: '90' }, { Patched: 'Yes' }),
  tire('3', { size: '245/40/18' }),
  tire('4'),
];

const renderAll = () =>
  render(
    <CompareProvider>
      {TIRES.map(t => (
        <CompareToggle key={t.id} tire={t} />
      ))}
      <CompareTray />
    </CompareProvider>
  );

const stubCheck = (body: unknown, ok = true) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response))
  );

describe('CompareTray (051)', () => {
  it('appears with the picks, empty slots and Compare from two (AC1)', async () => {
    const user = userEvent.setup();
    renderAll();
    expect(screen.queryByRole('complementary', { name: 'Tires to compare' })).toBeNull();
    const boxes = screen.getAllByRole('checkbox');
    await user.click(boxes[0]);
    const tray = screen.getByRole('complementary', { name: 'Tires to compare' });
    expect(within(tray).getByRole('button', { name: 'Pick one more' })).toBeDisabled();
    await user.click(boxes[1]);
    expect(within(tray).getByText('2 of 3 tires')).toBeInTheDocument();
    expect(within(tray).getByText('Add another tire to compare')).toBeInTheDocument();
    expect(within(tray).getByRole('button', { name: 'Compare' })).toBeEnabled();
  });

  it('explains the limit and drops nothing (AC2)', async () => {
    const user = userEvent.setup();
    renderAll();
    for (const b of screen.getAllByRole('checkbox')) await user.click(b);
    const tray = screen.getByRole('complementary', { name: 'Tires to compare' });
    expect(within(tray).getByRole('status')).toHaveTextContent(/up to 3 tires/);
    expect(within(tray).getAllByRole('button', { name: /^Remove/ })).toHaveLength(3);
  });

  it('is not shown on /checkout (AC14)', async () => {
    const user = userEvent.setup();
    h.path = '/checkout';
    renderAll();
    await user.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.queryByRole('complementary', { name: 'Tires to compare' })).toBeNull();
  });
});

describe('CompareDialog (051)', () => {
  const openWith = async (count: number, check: unknown = undefined, ok = true) => {
    stubCheck(
      check ?? {
        tires: TIRES.slice(0, count).map(t => ({
          id: t.id,
          available: true,
          price: Number(t.price),
        })),
      },
      ok
    );
    const user = userEvent.setup();
    renderAll();
    const boxes = screen.getAllByRole('checkbox');
    for (let i = 0; i < count; i++) await user.click(boxes[i]);
    await user.click(screen.getByRole('button', { name: 'Compare' }));
    return { user, dialog: screen.getByRole('dialog', { name: /^Compare \(\d\)/ }) };
  };

  it('shows a table of facts with the better values marked (AC3, AC7)', async () => {
    const { dialog } = await openWith(2);
    const table = within(dialog).getByRole('table');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(2);
    const rowHeaders = within(table)
      .getAllByRole('rowheader')
      .map(h => h.textContent);
    expect(rowHeaders).toContain('Made (DOT)');
    expect(rowHeaders).toContain('Speed rating');
    const tread = within(table).getByRole('rowheader', { name: 'Tread' }).closest('tr')!;
    expect(within(tread).getAllByRole('cell')[0]).toHaveTextContent(/^9\/32" ✓Best$/);
    const price = within(table).getByRole('rowheader', { name: 'Price' }).closest('tr')!;
    expect(within(price).getAllByRole('cell')[1]).toHaveTextContent(/^\$90 ✓Best$/);
    expect(h.track).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'compare_open', params: { count: 2, same_size: true } })
    );
  });

  it('hides equal rows with "Show only differences" (AC4)', async () => {
    const { user, dialog } = await openWith(2);
    await user.click(within(dialog).getByRole('switch', { name: 'Show only differences' }));
    const labels = within(dialog)
      .getAllByRole('rowheader')
      .map(h => h.textContent);
    expect(labels).toContain('Price');
    expect(labels).not.toContain('Speed rating');
  });

  it('adds to the cart as a card does, and links the tire page (AC5)', async () => {
    const { user, dialog } = await openWith(2);
    await user.click(within(dialog).getAllByRole('button', { name: /^Add to cart/ })[0]);
    expect(h.addToCart).toHaveBeenCalledWith(expect.objectContaining({ id: '1', tread: 9 }));
    expect(h.ecommerce).toHaveBeenCalledWith('add_to_cart', expect.anything());
    expect(within(dialog).getAllByRole('link', { name: 'View tire' })[0]).toHaveAttribute(
      'href',
      '/tires/1-pirelli-235-45-18'
    );
  });

  it('marks a sold tire and shows the current price (AC12)', async () => {
    const { dialog } = await openWith(2, {
      tires: [
        { id: '1', available: false, price: 120 },
        { id: '2', available: true, price: 85 },
      ],
    });
    await waitFor(() => expect(within(dialog).getByText('Sold')).toBeInTheDocument());
    expect(within(dialog).getAllByRole('button', { name: /^Add to cart/ })).toHaveLength(1);
    expect(within(dialog).getAllByText(/\$85/).length).toBeGreaterThan(0);
  });

  it('says so when availability cannot be confirmed (AC12)', async () => {
    const { dialog } = await openWith(2, {}, false);
    await waitFor(() =>
      expect(within(dialog).getByText(/couldn.t confirm availability/)).toBeInTheDocument()
    );
  });

  it('warns about different sizes (AC13)', async () => {
    const { dialog } = await openWith(3);
    expect(within(dialog).getByText(/different sizes/)).toBeInTheDocument();
    expect(within(dialog).getByRole('rowheader', { name: /Size/ })).toHaveTextContent(
      'Size differs'
    );
  });
});
