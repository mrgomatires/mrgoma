import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  brand?: string;
  condition?: string;
  image?: string;
  setId?: string;
  tread?: number;
  city?: 'Miami' | 'Orlando';
  size?: string;
  code?: string;
  life?: string;
  patched?: boolean;
  dot?: string;
};

const cart = vi.hoisted(() => ({
  value: {
    cartItems: [] as CartItem[],
    removeFromCart: vi.fn(),
    removeSet: vi.fn(),
    cartTotal: 0,
    showCartModal: true,
    setShowCartModal: vi.fn(),
  },
}));

vi.mock('@/app/context/CartContext', () => ({ useCart: () => cart.value }));
vi.mock('@/app/utils/cartTracking', () => ({ trackViewCart: vi.fn(), trackRemoval: vi.fn() }));
const { trackViewCart, trackRemoval } = await import('@/app/utils/cartTracking');
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: unknown; alt?: string }) => (
    <img src={typeof src === 'string' ? src : ''} alt={typeof alt === 'string' ? alt : ''} />
  ),
}));

import CartModal from './CartModal';

beforeEach(() => {
  vi.mocked(trackViewCart).mockClear();
  vi.mocked(trackRemoval).mockClear();
  cart.value = {
    cartItems: [],
    removeFromCart: vi.fn(),
    removeSet: vi.fn(),
    cartTotal: 0,
    showCartModal: true,
    setShowCartModal: vi.fn(),
  };
});

describe('CartModal', () => {
  it('shows the empty state when there are no items', () => {
    render(<CartModal />);
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });

  it('lists items and removes one on click', async () => {
    const user = userEvent.setup();
    cart.value.cartItems = [
      {
        id: '1',
        name: 'Michelin Pilot',
        price: 99,
        quantity: 1,
        brand: 'Michelin',
        condition: 'New',
      },
    ];
    cart.value.cartTotal = 99;

    render(<CartModal />);
    expect(screen.getByRole('heading', { name: 'Michelin Pilot' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remove michelin pilot from cart/i }));
    expect(cart.value.removeFromCart).toHaveBeenCalledWith('1');
  });

  it('shows the site placeholder, not "No image", for a tire without a photo', () => {
    cart.value.cartItems = [{ id: '7', name: 'Tire', price: 99, quantity: 1 }];
    const { container } = render(<CartModal />);
    expect(screen.queryByText('No image')).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/assets/images/generic-tire-image.webp'
    );
  });

  it('links each tire to its detail page and closes the drawer on the way', async () => {
    const user = userEvent.setup();
    cart.value.cartItems = [
      { id: '7', name: '(7) | MICHELIN | 225/65/17', price: 99, quantity: 1, brand: 'Michelin' },
    ];
    render(<CartModal />);
    const link = screen.getByRole('link', { name: '(7) | MICHELIN | 225/65/17' });
    expect(link).toHaveAttribute('href', '/tires/7-michelin-225-65-17');
    await user.click(link);
    expect(cart.value.setShowCartModal).toHaveBeenCalledWith(false);
  });

  it('closes via the close button', async () => {
    const user = userEvent.setup();
    render(<CartModal />);
    await user.click(screen.getByRole('button', { name: /close cart/i }));
    expect(cart.value.setShowCartModal).toHaveBeenCalledWith(false);
  });

  it('shows the subtotal footer and closes on checkout', async () => {
    const user = userEvent.setup();
    cart.value.cartItems = [{ id: '1', name: 'Tire', price: 99, quantity: 1 }];
    cart.value.cartTotal = 99;

    render(<CartModal />);
    expect(screen.getByText('Subtotal')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /^checkout$/i }));
    expect(cart.value.setShowCartModal).toHaveBeenCalledWith(false);
  });
});

describe('CartModal — Google rating (053)', () => {
  it('shows the stores’ rating under Checkout only with something in the cart (AC4)', () => {
    const { unmount } = render(<CartModal />);
    expect(screen.queryByText(/Google reviews/)).toBeNull();
    unmount();
    cart.value.cartItems = [
      {
        id: '1',
        name: 'Michelin Pilot',
        price: 99,
        quantity: 1,
        brand: 'Michelin',
        condition: 'New',
      },
    ];
    cart.value.cartTotal = 99;
    render(<CartModal />);
    expect(screen.getByText(/^Rated$/).parentElement).toHaveTextContent(
      'Rated 4.7 out of 5 from 5,952 Google reviews'
    );
    // Text, not a link: nothing sends the buyer away before paying.
    expect(screen.queryByRole('link', { name: /Google reviews/ })).toBeNull();
  });
});

describe('CartModal with sets (feature 041)', () => {
  const member = (id: string, tread: number): CartItem => ({
    id,
    name: `(${id}) | MICHELIN | 225/65/17`,
    size: '225/65/17',
    price: 100,
    quantity: 1,
    setId: 's1',
    tread,
  });

  it('groups a set under one header with total and tread range (AC7)', () => {
    cart.value.cartItems = [member('1', 9), member('2', 10), member('3', 9)];
    render(<CartModal />);
    expect(screen.getByText(/Set of 3 · \$300\.00/)).toBeInTheDocument();
    // What the tires share is said once, in the header (047).
    expect(screen.getByText('225/65/17 · tread 9–10/32', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Set of 3' }).querySelectorAll('li')).toHaveLength(3);
  });

  it('removes the whole set or one tire', async () => {
    const user = userEvent.setup();
    cart.value.cartItems = [member('1', 9), member('2', 9)];
    render(<CartModal />);
    await user.click(screen.getByRole('button', { name: 'Remove set of 2 from cart' }));
    expect(cart.value.removeSet).toHaveBeenCalledWith('s1');
    await user.click(screen.getAllByRole('button', { name: /^Remove \(1\)/ })[0]);
    expect(cart.value.removeFromCart).toHaveBeenCalledWith('1');
  });

  it('names both cities for a mixed set and each tire its own (047, AC13)', () => {
    cart.value.cartItems = [
      { ...member('1', 9), city: 'Miami' },
      { ...member('2', 9), city: 'Orlando' },
    ];
    render(<CartModal />);
    expect(screen.getByText('Miami and Orlando')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Set of 2' });
    expect(list.textContent).toMatch(/Located in Miami/);
    expect(list.textContent).toMatch(/Located in Orlando/);
  });

  it('names a one-city set once, in its header', () => {
    cart.value.cartItems = [
      { ...member('1', 9), city: 'Miami' },
      { ...member('2', 9), city: 'Miami' },
    ];
    render(<CartModal />);
    expect(screen.getAllByText('Miami')).toHaveLength(1);
    expect(screen.getByRole('list', { name: 'Set of 2' }).textContent).not.toMatch(/Located in/);
  });

  it('shows a set reduced to one tire as a single tire', () => {
    cart.value.cartItems = [member('1', 9)];
    render(<CartModal />);
    expect(screen.queryByText(/Set of/)).toBeNull();
  });
});

describe('cart events (046)', () => {
  const tire = (id: string, over: Partial<CartItem> = {}): CartItem => ({
    id,
    name: `(C${id}) | MICHELIN | PILOT | 225/40/18`,
    price: 100,
    quantity: 1,
    ...over,
  });

  it('sends view_cart with the cart when the drawer opens, once (AC5)', () => {
    cart.value.showCartModal = false;
    cart.value.cartItems = [tire('1'), tire('2'), tire('3')];
    const { rerender } = render(<CartModal />);
    expect(trackViewCart).not.toHaveBeenCalled();

    cart.value = { ...cart.value, showCartModal: true };
    rerender(<CartModal />);
    rerender(<CartModal />);

    expect(trackViewCart).toHaveBeenCalledTimes(1);
    expect(vi.mocked(trackViewCart).mock.calls[0][0]).toHaveLength(3);
  });

  it('reports a removed tire and a removed set (AC6)', async () => {
    const user = userEvent.setup();
    cart.value.cartItems = [
      tire('1'),
      ...['2', '3', '4', '5'].map(id => tire(id, { setId: 'set-a' })),
    ];
    render(<CartModal />);

    await user.click(screen.getByRole('button', { name: /remove set of 4/i }));
    expect(trackRemoval).toHaveBeenCalledTimes(1);
    expect(vi.mocked(trackRemoval).mock.calls[0][0].map(i => i.id)).toEqual(['2', '3', '4', '5']);
    expect(cart.value.removeSet).toHaveBeenCalledWith('set-a');

    const removeOne = screen
      .getAllByRole('button', { name: /remove/i })
      .find(b => !/set/i.test(b.getAttribute('aria-label') ?? b.textContent ?? ''))!;
    await user.click(removeOne);
    expect(trackRemoval).toHaveBeenCalledTimes(2);
    expect(vi.mocked(trackRemoval).mock.calls[1][0]).toHaveLength(1);
  });
});

describe('comparing tires in the cart (047, owner review)', () => {
  const tire: CartItem = {
    id: '7',
    name: '(7) | CONTINENTAL | 235/50/19',
    size: '235/50/19',
    price: 140,
    quantity: 1,
    condition: 'Used',
    city: 'Miami',
    tread: 8.6,
    life: '86%',
    patched: true,
    dot: '2325',
  };

  it('keeps the line short: tread, life and patch; no DOT, code or "Qty 1"', () => {
    cart.value.cartItems = [{ ...tire, code: '257012' }];
    render(<CartModal />);
    expect(screen.getByText('8.6/32 · 86% life · Patched')).toBeInTheDocument();
    expect(screen.getByText('235/50/19 · Used')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Cart items' });
    expect(list.textContent).not.toMatch(/DOT|257012|Qty/);
  });

  it('drops size and condition from set members (the header says them)', () => {
    cart.value.cartItems = [
      { ...tire, id: '1', setId: 's' },
      { ...tire, id: '2', setId: 's' },
    ];
    render(<CartModal />);
    expect(screen.getByText(/235\/50\/19 · Used · tread 8\.6\/32/)).toBeInTheDocument();
    expect(screen.queryByText('235/50/19 · Used')).toBeNull();
  });

  it('shows no facts line for an old line without them', () => {
    cart.value.cartItems = [
      { ...tire, tread: undefined, life: undefined, patched: undefined, dot: undefined },
    ];
    render(<CartModal />);
    expect(screen.queryByText(/\/32/)).toBeNull();
  });

  const withHover = (matches: boolean) =>
    vi.stubGlobal('matchMedia', (q: string) => ({ matches, media: q }) as MediaQueryList);

  it('opens the card beside the drawer after a short hover with a mouse', () => {
    vi.useFakeTimers();
    withHover(true);
    cart.value.cartItems = [tire];
    render(<CartModal />);
    const panel = document.querySelector('[data-cart-panel]') as HTMLElement;
    panel.getBoundingClientRect = () => ({ left: 900, top: 0 }) as DOMRect;
    const line = screen.getByText('8.6/32 · 86% life · Patched').closest('li')!;
    fireEvent.pointerEnter(line, { pointerType: 'mouse' });
    const card = screen.getByTestId('cart-tire-card');
    expect(card).toBeEmptyDOMElement(); // not before the delay
    act(() => void vi.advanceTimersByTime(300));
    expect(card).toHaveAttribute('aria-hidden', 'true');
    expect(card).toHaveTextContent('Remaining life86%');
    expect(card).toHaveTextContent('PatchedYes');
    expect(card).toHaveTextContent('LocationMiami');
    expect(card.style.left).toBe(`${900 - 288 - 12}px`);
    expect(card.style.getPropertyValue('--card-y')).toBe('8px');
    expect(card).toHaveTextContent('DOT2325');
    expect(card).toHaveAttribute('data-state', 'open');
    // The line sits at 0 and the card is held at 8 px: the pointer keeps its 16 px minimum.
    expect(card.style.getPropertyValue('--arrow-y')).toBe('16px');
    // Moving onto the card keeps it open…
    fireEvent.pointerLeave(line);
    fireEvent.pointerEnter(card);
    act(() => void vi.advanceTimersByTime(400));
    expect(card).toHaveAttribute('data-state', 'open');
    // …and leaving the card closes it.
    fireEvent.pointerLeave(card);
    act(() => void vi.advanceTimersByTime(150));
    // Closed, but it keeps the tire while it fades out.
    expect(card).toHaveAttribute('data-state', 'closed');
    expect(card).toHaveTextContent('Remaining life86%');
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('never opens on a touch screen or without room beside the drawer', () => {
    vi.useFakeTimers();
    cart.value.cartItems = [tire];
    withHover(false);
    const { unmount } = render(<CartModal />);
    const line = () => screen.getByText('8.6/32 · 86% life · Patched').closest('li')!;
    fireEvent.focus(line());
    act(() => void vi.advanceTimersByTime(400));
    expect(screen.getByTestId('cart-tire-card')).toBeEmptyDOMElement();
    unmount();

    withHover(true);
    render(<CartModal />);
    (document.querySelector('[data-cart-panel]') as HTMLElement).getBoundingClientRect = () =>
      ({ left: 100, top: 0 }) as DOMRect;
    fireEvent.pointerEnter(line(), { pointerType: 'mouse' });
    act(() => void vi.advanceTimersByTime(400));
    expect(screen.getByTestId('cart-tire-card')).toBeEmptyDOMElement();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
