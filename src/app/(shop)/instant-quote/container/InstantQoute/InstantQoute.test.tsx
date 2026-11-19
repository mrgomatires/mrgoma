import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SelectedFiltersContext } from '@/app/context/SelectedFilters';
import { trackEvent } from '@/app/utils/analytics';

// SearchByText pulls next/navigation's router; stub it via the barrel.
// `vi.mock` is hoisted, so these apply despite sitting below the imports.
vi.mock('@/app/ui/components/SearchByText/SearchByText', () => ({
  default: () => <div data-testid="search-by-text" />,
}));

vi.mock('@/app/utils/analytics', () => ({ trackEvent: vi.fn() }));

import InstantQuote from './InstantQoute';

const tracked = vi.mocked(trackEvent);

const renderWithSize = (size = { width: '', sidewall: '', diameter: '' }) =>
  render(
    <SelectedFiltersContext.Provider value={{ selectedFilters: size, setSelectedFilters: vi.fn() }}>
      <InstantQuote />
    </SelectedFiltersContext.Provider>
  );

// The submit button only enables once size, quantity, name, a contact method
// and the pickup store are all set; these fill the ones a case isn't asserting on.
const fillRequired = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.selectOptions(screen.getByLabelText(/how many tires/i), '4');
  await user.type(screen.getByLabelText('Name'), 'John Doe');
  await user.type(screen.getByLabelText('Email'), 'john@example.com');
  const store = screen.getByLabelText(/choose a store for pick-up/i);
  await user.selectOptions(store, within(store).getAllByRole('option')[1]);
};

// `delay: null` on every setup below: user-event's default inter-keystroke
// delay uses real timers, so on a loaded machine these typing-heavy cases
// intermittently blew the 5s budget. Removing the delay makes them
// deterministic without changing what they assert.
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('InstantQuote form', () => {
  it('shows an email error only for invalid input', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithSize();
    const email = screen.getByLabelText('Email');

    await user.type(email, 'bad');
    expect(screen.getByText('Enter a valid email.')).toBeInTheDocument();

    await user.clear(email);
    await user.type(email, 'a@b.co');
    expect(screen.queryByText('Enter a valid email.')).not.toBeInTheDocument();
  });

  it('auto-formats the phone number', () => {
    renderWithSize();
    const phone = screen.getByLabelText('Phone');
    fireEvent.change(phone, { target: { value: '1234567890' } });
    expect(phone).toHaveValue('(123) 456-7890');
  });

  it('keeps submit disabled until all required fields are valid', () => {
    renderWithSize();
    expect(screen.getByRole('button', { name: /get my quote/i })).toBeDisabled();
  });

  it('submits the lead to /api/instant-quote when complete', async () => {
    const user = userEvent.setup({ delay: null });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    renderWithSize({ width: '225', sidewall: '40', diameter: '18' });

    await fillRequired(user);

    const submit = screen.getByRole('button', { name: /get my quote/i });
    expect(submit).toBeEnabled();

    await user.click(submit);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/instant-quote');
    // The quantity travels as a number, matching what the API forwards to n8n.
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).quantity).toBe(4);
    expect(await screen.findByText(/thanks for choosing mrgoma tires/i)).toBeInTheDocument();

    // AC7: an accepted submission is exactly one lead, and it carries none of
    // the name/email/phone the form just collected.
    const leads = tracked.mock.calls.filter(([e]) => e.action === 'generate_lead');
    expect(leads).toHaveLength(1);
    expect(JSON.stringify(leads[0][0])).not.toMatch(/john|example\.com/i);
  });

  it('surfaces an error when the submission fails upstream', async () => {
    const user = userEvent.setup({ delay: null });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: 'Upstream failed' }) })
    );

    renderWithSize({ width: '225', sidewall: '40', diameter: '18' });
    await fillRequired(user);

    await user.click(screen.getByRole('button', { name: /get my quote/i }));
    expect(await screen.findByText('Upstream failed')).toBeInTheDocument();

    // AC6: a rejected submission is not a lead. This is the whole point of
    // moving the event off the button — the click happened, the lead did not.
    expect(tracked).not.toHaveBeenCalled();
  });

  it('shows an error when the form is submitted incomplete', async () => {
    const { container } = renderWithSize();
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    expect(
      await screen.findByText(/please complete all required fields correctly/i)
    ).toBeInTheDocument();
  });

  it('keeps submit disabled until a tire quantity is chosen', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithSize({ width: '225', sidewall: '40', diameter: '18' });

    await user.type(screen.getByLabelText('Name'), 'John Doe');
    await user.type(screen.getByLabelText('Email'), 'john@example.com');
    const store = screen.getByLabelText(/choose a store for pick-up/i);
    await user.selectOptions(store, within(store).getAllByRole('option')[1]);

    const submit = screen.getByRole('button', { name: /get my quote/i });
    expect(submit).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/how many tires/i), '2');
    expect(submit).toBeEnabled();
  });

  it('toggles a tire-condition checkbox', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithSize();
    const used = screen.getByRole('checkbox', { name: 'Used' });
    expect(used).not.toBeChecked();
    await user.click(used);
    expect(used).toBeChecked();
  });

  it('auto-capitalizes the vehicle details', () => {
    renderWithSize();
    const vehicle = screen.getByLabelText(/vehicle details/i);
    fireEvent.change(vehicle, { target: { value: 'toyota camry 2019' } });
    expect(vehicle).toHaveValue('Toyota Camry 2019');
  });

  it('warns when the vehicle details lack a 4-digit year', () => {
    renderWithSize();
    const vehicle = screen.getByLabelText(/vehicle details/i);
    fireEvent.change(vehicle, { target: { value: 'Honda Civic' } });
    expect(screen.getByText(/please include a 4-digit model year/i)).toBeInTheDocument();
  });

  it('shows a phone error only for an incomplete number', () => {
    renderWithSize();
    const phone = screen.getByLabelText('Phone');
    fireEvent.change(phone, { target: { value: '123' } });
    expect(screen.getByText('Enter a valid phone.')).toBeInTheDocument();
    fireEvent.change(phone, { target: { value: '1234567890' } });
    expect(screen.queryByText('Enter a valid phone.')).not.toBeInTheDocument();
  });
});
