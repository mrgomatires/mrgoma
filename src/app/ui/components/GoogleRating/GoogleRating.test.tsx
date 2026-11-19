import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import GoogleRating from './GoogleRating';

const COMBINED = { rating: 4.7, reviews: 5952, readOn: '2026-11-18' };

describe('GoogleRating (053)', () => {
  it('is read as one sentence and keeps the visible numbers in order (AC6)', () => {
    render(<GoogleRating figures={COMBINED} href="/locations" />);
    const link = screen.getByRole('link', {
      name: 'Rated 4.7 out of 5 from 5,952 Google reviews',
    });
    expect(link).toHaveAttribute('href', '/locations');
    // The stars are decoration; the words carry the figure.
    expect(link.querySelector('svg')?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(link.textContent).toMatch(/4\.7.*5,952 Google reviews/);
  });

  it('fills the stars to the rating', () => {
    const { container } = render(<GoogleRating figures={COMBINED} />);
    const clip = container.querySelector<HTMLElement>('[aria-hidden="true"] > span');
    expect(clip?.style.width).toBe('94%');
  });

  it("opens a store's profile in a new tab and says so, with its event (AC7)", () => {
    render(
      <GoogleRating
        figures={{ rating: 4.8, reviews: 2083, readOn: '2026-11-18' }}
        href="https://maps.google.com/?cid=1"
        external
        track={{ event: 'google_reviews_open', surface: 'store_page', store: 'cutler-bay' }}
      />
    );
    const link = screen.getByRole('link', {
      name: 'Rated 4.8 out of 5 from 2,083 Google reviews (opens in a new tab)',
    });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('data-track', 'google_reviews_open');
    expect(link).toHaveAttribute('data-track-surface', 'store_page');
    expect(link).toHaveAttribute('data-track-store', 'cutler-bay');
  });

  it('shows the read date only when asked (AC10)', () => {
    const { rerender } = render(<GoogleRating figures={COMBINED} />);
    expect(screen.queryByText(/as of/)).toBeNull();
    rerender(<GoogleRating figures={COMBINED} showDate />);
    expect(screen.getByText('Google rating as of Nov 2026')).toBeInTheDocument();
  });

  it('is plain text without a link', () => {
    render(<GoogleRating figures={COMBINED} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText(/5,952 Google reviews/)).toBeInTheDocument();
  });
});
