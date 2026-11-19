import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import TrustStrip from './TrustStrip';

const CLAIMS = ['30-Day Warranty', '15,000+ tires across our 7 locations'];

describe('TrustStrip', () => {
  it('renders one list item per claim inside a single list', () => {
    render(<TrustStrip items={CLAIMS} />);

    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(CLAIMS.length);
    expect(items.map(li => li.textContent)).toEqual([`✦${CLAIMS[0]}`, `✦${CLAIMS[1]}`]);
  });

  it('exposes an accessible name for the list', () => {
    render(<TrustStrip items={CLAIMS} label="Why buy from us" />);
    expect(screen.getByRole('list', { name: 'Why buy from us' })).toBeInTheDocument();
  });

  it('hides the decorative marker from assistive technology', () => {
    const { container } = render(<TrustStrip items={CLAIMS} />);
    const markers = container.querySelectorAll('[aria-hidden="true"]');

    expect(markers).toHaveLength(CLAIMS.length);
    markers.forEach(marker => expect(marker.textContent).toBe('✦'));
  });

  it('does not layer ARIA roles over the native list semantics', () => {
    const { container } = render(<TrustStrip items={CLAIMS} />);
    expect(container.querySelectorAll('[role]')).toHaveLength(0);
  });

  it('uses an opaque backdrop when rendered over media, for contrast', () => {
    const { container } = render(<TrustStrip items={CLAIMS} variant="onMedia" />);
    const [item] = container.querySelectorAll('li');

    expect(item.className).toContain('bg-black/60');
    expect(item.className).toContain('text-white');
  });
});

describe('TrustStrip lead (053)', () => {
  it('renders a lead node as the first item, without the claim marker', () => {
    const { container } = render(
      <TrustStrip items={['Free shipping nationwide']} lead={<a href="/locations">Rating</a>} />
    );
    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Rating');
    expect(items[0].querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
