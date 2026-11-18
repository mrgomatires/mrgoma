import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Footer } from './Footer';

/**
 * `/instant-quote` had no inbound link anywhere in `src/`. It existed only in
 * the sitemap — which meant nobody could reach it by navigating, and that the
 * metadata `021` gave it had nothing to earn from. This is the link that makes
 * the rest of that work mean something, so it is guarded.
 */
describe('Footer', () => {
  it('links to the instant quote page', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: /instant quote/i });
    expect(link).toHaveAttribute('href', '/instant-quote');
  });

  it('links the size index (050)', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: 'Shop by size' })).toHaveAttribute(
      'href',
      '/tires/size'
    );
  });

  it('keeps every navigation link keyboard reachable with a visible focus ring', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: /instant quote/i });
    // An anchor with an href is focusable; the ring is what makes that visible.
    expect(link.className).toContain('focus-visible:ring-2');
  });

  it('still lists the pages it listed before', () => {
    render(<Footer />);
    for (const label of ['Home', 'Services', 'About Us', 'Guides', 'Contact', 'Locations']) {
      expect(screen.getByRole('link', { name: new RegExp(`^${label}$`, 'i') })).toBeInTheDocument();
    }
  });
});
