import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SLOGAN } from '@/app/utils/brandClaims';

// The hero's heading and trust strip are what this test is about. The rest of
// the page pulls in the 3D size selector, sliders and image loading, none of
// which affect the heading outline — so they're stubbed to keep the test honest
// about what it verifies.
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img alt={String(props.alt ?? '')} />,
}));
vi.mock('react-dom', async importOriginal => ({
  ...(await importOriginal<typeof import('react-dom')>()),
  preload: () => {},
}));
// One mock per module: the sections barrel is gone (057).
vi.mock('@/app/ui/sections/InfoCardsSection/InfoCardsSection', () => ({
  default: () => <div data-testid="info-cards" />,
}));
vi.mock('@/app/ui/sections/PromoBanner/PromoBanner', () => ({ default: () => null }));
vi.mock('@/app/ui/sections/SearchContainer/SearchContainer', () => ({
  // Mirrors the real component: it renders the slogan at h2 now that the
  // page's h1 lives in the server component above it.
  default: () => <h2>{SLOGAN}</h2>,
}));
vi.mock('@/app/ui/sections/LocationsSlider/LocationsSlider', () => ({
  LocationsSlider: () => <div data-testid="locations-slider" />,
}));

const { default: Home } = await import('./Home');

describe('Home heading outline', () => {
  it('has exactly one h1', () => {
    render(<Home />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('names the product and the market in the h1', () => {
    render(<Home />);
    const h1 = screen.getByRole('heading', { level: 1 });

    expect(h1).toHaveTextContent(/tires/i);
    expect(h1).toHaveTextContent(/miami|florida/i);
  });

  // The h1 stays tire-focused: naming the wider service range would broaden the
  // keyword surface at the cost of relevance on our strongest query.
  it('keeps non-tire services out of the h1', () => {
    render(<Home />);
    const h1 = screen.getByRole('heading', { level: 1 });

    expect(h1.textContent).not.toMatch(/complete auto care|auto repair|oil change/i);
  });

  // AC19 — "used tires" is the searched term; "like-new" is a body-copy
  // qualifier, never a replacement for it in a heading.
  it('keeps "like-new" out of the h1', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toMatch(/like-new/i);
  });

  it('keeps the brand slogan on the page at a lower level', () => {
    render(<Home />);
    const slogan = screen.getByText(SLOGAN);

    expect(slogan.tagName).toBe('H2');
  });
});

describe('Home above-the-fold claims', () => {
  it('states the warranty, the inventory and the locations before the search', () => {
    render(<Home />);
    const strip = screen.getByRole('list', { name: /why buy/i });

    expect(strip).toHaveTextContent(/30-day warranty/i);
    expect(strip).toHaveTextContent(/15,000\+/);
    expect(strip).toHaveTextContent(/7 locations/i);
  });

  it('renders the claims as prose Google can lift, not only as badges', () => {
    render(<Home />);

    // A full sentence carrying the differentiators — a row of badge words gives
    // a search engine nothing to quote.
    expect(screen.getByText(/largest selections of like-new used tires/i)).toHaveTextContent(
      /30-day warranty/i
    );
  });
});
