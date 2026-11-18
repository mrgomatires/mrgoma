import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/app/utils/analytics', () => ({ trackEvent: track }));

import SizeSearch from './SizeSearch';

const SIZES = ['225/40/18', '225/45/18', '225/60/18', '235/45/18', '35/12.50/20', '215/75/14'];

const setup = () => {
  const user = userEvent.setup();
  render(<SizeSearch sizes={SIZES} />);
  const input = screen.getByRole('textbox', { name: 'Tire Size' });
  const submit = async (digits: string) => {
    await user.clear(input);
    await user.type(input, digits);
    await user.click(screen.getByRole('button', { name: 'Search Tires' }));
  };
  return { user, input, submit };
};

beforeEach(() => {
  push.mockReset();
  track.mockReset();
});

describe('SizeSearch (050) — the home page field, reused', () => {
  it('is the home field: formats as you type, no autocomplete list', async () => {
    const { user, input } = setup();
    expect(input.closest('search')).not.toBeNull();
    expect(input).not.toHaveAttribute('list');
    expect(input).toHaveAttribute('autocomplete', 'off');
    await user.type(input, '2354518');
    expect(input).toHaveValue('235/45/18');
  });

  it('keeps Search off until the size is complete', async () => {
    const { user, input } = setup();
    await user.type(input, '23545');
    expect(screen.getByRole('button', { name: 'Select all measurements' })).toBeDisabled();
    expect(screen.getByText(/3 digits \/ 2 digits \/ 2 digits/)).toBeInTheDocument();
  });

  it('opens the size page of a size we sell (AC2)', async () => {
    const { submit } = setup();
    await submit('2354518');
    expect(push).toHaveBeenCalledWith('/tires/size/235-45-18');
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'size_index_search',
        label: '235/45/18',
        params: { result: 'found' },
      })
    );
  });

  it('offers the closest sizes for one we do not carry (AC4)', async () => {
    const { submit } = setup();
    await submit('2256518');
    expect(push).not.toHaveBeenCalled();
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent("We don't carry 225/65R18 right now.");
    const links = [...status.querySelectorAll('a[data-track="size_index_select"]')];
    expect(links.map(a => a.textContent)).toEqual(['225/40/18', '225/45/18', '225/60/18']);
    expect(links[0]).toHaveAttribute('href', '/tires/size/225-40-18');
    expect(status).toHaveTextContent(/door jamb/);
    expect(screen.getByRole('link', { name: /step-by-step size picker/ })).toHaveAttribute(
      'href',
      '/tires'
    );
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ label: '225/65/18', params: { result: 'not_found' } })
    );
  });

  it('on a rim we do not sell: message, reminder and picker only (AC4)', async () => {
    const { submit } = setup();
    await submit('1558012');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent("We don't carry 155/80R12 right now.");
    expect(status.querySelectorAll('a[data-track]')).toHaveLength(0);
  });

  it('clears the not-found message when the size changes', async () => {
    const { user, input, submit } = setup();
    await submit('2256518');
    await user.type(input, '{Backspace}');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
