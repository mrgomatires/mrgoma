import { useState } from 'react';

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSizeTree } from '@/app/utils/sizeTree';

import SizePicker, { type SizePick } from './SizePicker';

const track = vi.hoisted(() => vi.fn());
vi.mock('@/app/utils/analytics', () => ({ trackEvent: track }));

const tree = buildSizeTree([
  '205/55/16',
  '235/45/18',
  '235/45/19',
  '235/40/19',
  '245/45/18',
  '35/12.50/20',
]);

function Host({ onComplete }: { onComplete?: (p: SizePick) => void }) {
  const [value, setValue] = useState<SizePick>({ w: '', s: '', d: '' });
  return (
    <>
      <SizePicker
        tree={tree}
        value={value}
        onChange={setValue}
        onComplete={onComplete}
        surface="home"
      />
      <output data-testid="value">{`${value.w}|${value.s}|${value.d}`}</output>
    </>
  );
}

const step = (name: RegExp) => screen.getByRole('button', { name });

beforeEach(() => track.mockReset());

describe('SizePicker (049)', () => {
  it('advances width → ratio → rim, offering only what exists (AC1)', async () => {
    const user = userEvent.setup();
    const done = vi.fn();
    render(<Host onComplete={done} />);

    await user.click(step(/^Width/));
    const widths = screen.getByRole('group', { name: 'Choose the width' });
    expect(within(widths).getByRole('group', { name: 'Truck flotation' })).toBeInTheDocument();
    await user.click(within(widths).getByRole('button', { name: '235' }));

    const ratios = screen.getByRole('group', { name: 'Choose the aspect ratio' });
    expect(
      within(ratios)
        .getAllByRole('button')
        .map(b => b.textContent)
    ).toEqual(['40', '45']);
    expect(document.activeElement).toBe(within(ratios).getByRole('button', { name: '40' }));
    await user.click(within(ratios).getByRole('button', { name: '45' }));

    const rims = screen.getByRole('group', { name: 'Choose the rim size (inches)' });
    expect(
      within(rims)
        .getAllByRole('button')
        .map(b => b.textContent)
    ).toEqual(['18', '19']);
    await user.click(within(rims).getByRole('button', { name: '19' }));

    expect(screen.getByTestId('value')).toHaveTextContent('235|45|19');
    expect(screen.queryByRole('group', { name: /Choose/ })).not.toBeInTheDocument();
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith({ w: '235', s: '45', d: '19' });
  });

  it('works with the keyboard alone, and Escape returns to the step (AC5)', async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.tab();
    expect(document.activeElement).toBe(step(/^Width/));
    await user.keyboard('{Enter}');
    expect(step(/^Width/)).toHaveAttribute('aria-expanded', 'true');
    expect(document.activeElement).toHaveTextContent('205');
    await user.keyboard('{Escape}');
    expect(step(/^Width/)).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(step(/^Width/));

    await user.keyboard('{Enter}'); // focus lands on the first width: 205
    expect(document.activeElement).toHaveTextContent('205');
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('value')).toHaveTextContent('205||');
    // Focus is on the first ratio; Enter picks it and moves to rims.
    await user.keyboard('{Enter}{Enter}');
    expect(screen.getByTestId('value')).toHaveTextContent('205|55|16');
  });

  it('keeps later steps only while they exist when an earlier one changes (FR5)', async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.click(step(/^Width/));
    await user.click(screen.getByRole('button', { name: '235' }));
    await user.click(screen.getByRole('button', { name: '40' }));
    await user.click(screen.getByRole('button', { name: '19' }));
    await user.click(step(/^Width/));
    await user.click(screen.getByRole('button', { name: '245' }));
    expect(screen.getByTestId('value')).toHaveTextContent('245||');
  });

  it('does not open a step before the previous one is chosen', async () => {
    const user = userEvent.setup();
    render(<Host />);
    expect(step(/^Rim/)).toHaveAttribute('aria-disabled', 'true');
    await user.click(step(/^Rim/));
    expect(step(/^Rim/)).toHaveAttribute('aria-expanded', 'false');
  });

  it('marks the chosen value and carries the tracking attributes (AC9)', async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.click(step(/^Width/));
    const b235 = screen.getByRole('button', { name: '235' });
    expect(b235).toHaveAttribute('data-track', 'size_picker_select');
    expect(b235).toHaveAttribute('data-track-step', 'width');
    expect(b235).toHaveAttribute('data-track-label', '235');
    expect(b235).toHaveAttribute('data-track-surface', 'home');
    await user.click(b235);
    await user.click(step(/^Width/));
    expect(screen.getByRole('button', { name: '235' })).toHaveAttribute('aria-current', 'true');
  });

  it('reports a completed size once, with the surface', async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.click(step(/^Width/));
    await user.click(screen.getByRole('button', { name: '35' }));
    await user.click(screen.getByRole('button', { name: '12.50' }));
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'size_picker_complete',
        label: '35/12.50/20',
        params: { surface: 'home' },
      })
    );
  });

  it('shows a loading state and an error without breaking', () => {
    const { rerender } = render(
      <SizePicker tree={null} value={{ w: '', s: '', d: '' }} onChange={() => {}} surface="tires" />
    );
    expect(step(/^Width/)).toHaveTextContent('Loading…');
    expect(step(/^Width/)).toHaveAttribute('aria-disabled', 'true');
    rerender(
      <SizePicker
        tree={null}
        value={{ w: '', s: '', d: '' }}
        onChange={() => {}}
        surface="tires"
        error
      />
    );
    expect(screen.getByText(/couldn.t load the sizes/)).toBeInTheDocument();
  });
});
