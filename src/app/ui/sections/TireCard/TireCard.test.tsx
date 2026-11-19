import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CartProvider } from '@/app/context/CartContext';
import type { TransformedTire } from '@/app/interfaces/tires';

import TireCard from './TireCard';

vi.mock('@/app/utils/analytics', () => ({ trackEcommerce: vi.fn(() => Promise.resolve()) }));
const { trackEcommerce } = await import('@/app/utils/analytics');
const track = vi.mocked(trackEcommerce);

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: unknown; alt?: string }) => (
    <img src={typeof src === 'string' ? src : ''} alt={typeof alt === 'string' ? alt : ''} />
  ),
}));

const product = {
  id: '42',
  name: '(ABC) | Michelin | Pilot | 225/40/18',
  color: 'Black',
  href: '#',
  imageSrc: '/tire.jpg',
  imageAlt: 'Michelin tire',
  price: '99',
  brand: 'Michelin',
  brandId: 7,
  condition: 'new',
  features: [],
} as unknown as TransformedTire;

const renderCard = () =>
  render(
    <CartProvider>
      <TireCard products={[product]} />
    </CartProvider>
  );

describe('TireCard', () => {
  beforeEach(() => {
    localStorage.clear();
    track.mockClear();
  });

  it('renders the parsed product title', () => {
    renderCard();
    expect(screen.getByRole('heading', { name: 'Michelin Pilot' })).toBeInTheDocument();
  });

  it('adds the product to the cart on click', async () => {
    const user = userEvent.setup();
    renderCard();
    const addButtons = screen.getAllByRole('button', { name: /add to cart/i });
    expect(addButtons.length).toBeGreaterThan(0);
    await user.click(addButtons[0]);
    expect(screen.getAllByRole('button', { name: /in cart/i }).length).toBeGreaterThan(0);
  });

  it('renders the spec strip and used-condition link for a used tire', () => {
    const used = {
      ...product,
      condition: 'used',
      features: [
        { name: 'Remaining life', value: '70%' },
        { name: 'Tread depth', value: '8' },
        { name: 'Patched', value: 'No' },
        { name: 'Run Flat', value: 'No' },
      ],
    } as unknown as TransformedTire;

    render(
      <CartProvider>
        <TireCard products={[used]} />
      </CartProvider>
    );

    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Used' })).toBeInTheDocument();
  });

  // Feature 040. The card renders a desktop and a mobile button (CSS hides one);
  // jsdom shows both, in that order.
  it.each([
    ['desktop', 0],
    ['mobile', 1],
  ])('reports add_to_cart with the item from the %s button', async (_label, index) => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getAllByRole('button', { name: /add to cart/i })[index]);

    expect(track).toHaveBeenCalledTimes(1);
    const [name, payload] = track.mock.calls[0];
    expect(name).toBe('add_to_cart');
    expect(payload).toMatchObject({ currency: 'USD', value: 99 });
    expect(payload.items).toEqual([
      expect.objectContaining({ item_id: '42', item_name: 'New Michelin Pilot 225/40/18' }),
    ]);
  });

  it('reports nothing from a button that is disabled because the tire is in the cart', async () => {
    const user = userEvent.setup();
    renderCard();
    const [desktop] = screen.getAllByRole('button', { name: /add to cart/i });
    await user.click(desktop);
    track.mockClear();

    for (const button of screen.getAllByRole('button', { name: /in cart/i })) {
      await user.click(button);
    }
    expect(track).not.toHaveBeenCalled();
  });

  it('no longer carries the declarative add_to_cart marker (it would double-count)', () => {
    const { container } = renderCard();
    expect(container.querySelector('[data-track="add_to_cart"]')).toBeNull();
  });
});

describe('lists and selection (046)', () => {
  const tire = (id: string, over: Partial<TransformedTire> = {}) =>
    ({ ...product, id, ...over }) as TransformedTire;
  const used = { id: 'used_tires', name: 'Used tires' };

  beforeEach(async () => {
    track.mockClear();
    const { resetViewItemList } = await import('@/app/ui/components/ViewItemList/useViewItemList');
    resetViewItemList();
  });

  const renderList = (list?: { id: string; name: string }) =>
    render(
      <CartProvider>
        <TireCard products={[tire('1'), tire('2'), tire('3')]} list={list} />
      </CartProvider>
    );

  it('reports the list it shows', () => {
    renderList(used);
    const lists = track.mock.calls.filter(([e]) => e === 'view_item_list');
    expect(lists).toHaveLength(1);
    expect(lists[0][1]).toMatchObject({ item_list_id: 'used_tires' });
    expect(lists[0][1].items).toHaveLength(3);
  });

  it('reports select_item from the photo and from the title, at the position (AC3)', async () => {
    renderList(used);
    const third = screen.getAllByRole('listitem')[2];
    const detailLinks = [...third.querySelectorAll('a[href^="/tires/3-"]')] as HTMLAnchorElement[];
    expect(detailLinks).toHaveLength(2);

    for (const link of detailLinks) {
      link.addEventListener('click', e => e.preventDefault());
      await userEvent.click(link);
    }

    const selects = track.mock.calls.filter(([e]) => e === 'select_item');
    expect(selects).toHaveLength(2);
    for (const [, payload] of selects) {
      expect(payload).toMatchObject({ item_list_id: 'used_tires' });
      expect(payload.items).toMatchObject([{ item_id: '3', index: 3 }]);
    }
  });

  it('Add to Cart is add_to_cart, never select_item', async () => {
    renderList(used);
    track.mockClear();
    await userEvent.click(screen.getAllByRole('button', { name: /add to cart/i })[0]);
    expect(track.mock.calls.map(([e]) => e)).toEqual(['add_to_cart']);
  });

  it('reports nothing without a list', async () => {
    renderList();
    expect(track).not.toHaveBeenCalled();
  });
});

describe('TireCard — set offer (054)', () => {
  const stubOffers = (offers: unknown) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ offers }) }))
    );

  beforeEach(() => vi.unstubAllGlobals());

  it('shows "Set of 4 · $X total" linking to the builder with that set (AC1, AC3, AC4, AC6)', async () => {
    stubOffers({ '42': { size: 4, total: 640, ids: ['42', '43', '44', '45'] } });
    render(
      <CartProvider>
        <TireCard products={[product]} list={{ id: 'catalog', name: 'Catalog' }} />
      </CartProvider>
    );
    const link = await screen.findByRole('link', {
      name: /^Set of 4 \$640 total — build this set/,
    });
    expect(link).toHaveAttribute('href', '/tires/42-michelin-225-40-18?set=42,43,44,45');
    expect(link.textContent).not.toMatch(/from|each/i);
    expect(link).toHaveAttribute('data-track', 'set_offer_select');
    expect(link).toHaveAttribute('data-track-set-size', '4');
    expect(link).toHaveAttribute('data-track-list', 'catalog');
    expect(link).toHaveAttribute('data-track-tire-id', '42');
    // The meta row no longer says "Single" alone when a set is on offer.
    expect(screen.getByText('Single or set · Free Shipping')).toBeInTheDocument();
  });

  it('shows a set of 2 when that is what the tire can form', async () => {
    stubOffers({ '42': { size: 2, total: 190, ids: ['42', '43'] } });
    renderCard();
    expect(await screen.findByRole('link', { name: /^Set of 2 \$190 total/ })).toBeInTheDocument();
  });

  it('shows nothing extra without an offer, or when the request fails (AC1, AC7)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 500 }))
    );
    renderCard();
    await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByRole('link', { name: /^Set of/ })).toBeNull();
    expect(screen.getByText('Single · Free Shipping')).toBeInTheDocument();
  });
});
