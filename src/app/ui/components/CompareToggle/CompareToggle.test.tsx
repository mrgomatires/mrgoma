import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CompareProvider, useCompare } from '@/app/context/CompareContext';
import type { TransformedTire } from '@/app/interfaces/tires';

vi.mock('@/app/utils/analytics', () => ({ trackEvent: vi.fn() }));

import CompareToggle from './CompareToggle';

const tire = (id: string) =>
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
    imageSrc: '/x.webp',
    imageAlt: 'x',
    features: [],
  }) as TransformedTire;

function Count() {
  return <output data-testid="count">{useCompare()!.items.length}</output>;
}

beforeEach(() => window.sessionStorage.clear());

describe('CompareToggle (051)', () => {
  it('is a labelled checkbox that adds and removes the tire (AC1, AC7)', async () => {
    const user = userEvent.setup();
    render(
      <CompareProvider>
        <CompareToggle tire={tire('1')} />
        <Count />
      </CompareProvider>
    );
    const box = screen.getByRole('checkbox', { name: /Compare Pirelli P Zero 235\/45\/18/i });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    await user.click(box);
    expect(box).not.toBeChecked();
  });

  it('stays unchecked when the comparison is full (AC2)', async () => {
    const user = userEvent.setup();
    render(
      <CompareProvider>
        {['1', '2', '3', '4'].map(id => (
          <CompareToggle key={id} tire={tire(id)} />
        ))}
        <Count />
      </CompareProvider>
    );
    const boxes = screen.getAllByRole('checkbox');
    for (const b of boxes.slice(0, 3)) await user.click(b);
    await user.click(boxes[3]);
    expect(boxes[3]).not.toBeChecked();
    expect(screen.getByTestId('count')).toHaveTextContent('3');
  });

  it('disables the other boxes when full and says why; the picked ones stay usable (052 review)', async () => {
    const user = userEvent.setup();
    render(
      <CompareProvider>
        {['1', '2', '3', '4'].map(id => (
          <CompareToggle key={id} tire={tire(id)} />
        ))}
      </CompareProvider>
    );
    const boxes = screen.getAllByRole('checkbox');
    for (const b of boxes.slice(0, 3)) await user.click(b);
    expect(boxes[3]).toBeDisabled();
    expect(boxes[3]).toHaveAccessibleName(/^Compare .*up to 3 tires — remove one to add another/);
    expect(boxes[3].closest('label')).toHaveAttribute('title', expect.stringMatching(/up to 3/));
    expect(boxes[0]).toBeEnabled();
    // Removing one re-enables the rest.
    await user.click(boxes[0]);
    expect(boxes[3]).toBeEnabled();
  });

  it('renders nothing without the provider', () => {
    const { container } = render(<CompareToggle tire={tire('1')} />);
    expect(container).toBeEmptyDOMElement();
  });
});
