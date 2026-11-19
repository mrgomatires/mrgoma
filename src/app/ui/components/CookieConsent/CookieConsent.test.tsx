import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSENT_KEY, DECLINE_UNTIL_KEY } from '@/app/utils/consent';

import CookieConsent from './CookieConsent';

/**
 * Characterization tests — written against the banner **as it behaved on
 * 2026-08-04**, before feature 016 refactored it.
 *
 * The component had no tests at all, and it gates a legal obligation: whether
 * Google Analytics is allowed to run. Feature 016 moves its storage writes into
 * `consent.ts`, changes its timer, teaches it to reopen on demand and rewrites
 * its copy. These tests exist so that if any of that quietly breaks consent,
 * something fails loudly instead of a visitor being tracked without agreement.
 *
 * They describe what the code *does*, not what it ought to do. Where behaviour
 * is deliberately changed later, the corresponding test should be updated in the
 * same commit and the reason recorded — never deleted to make a build pass.
 */

const banner = () => screen.queryByRole('region', { name: /cookie consent/i });

/** Wipe every cookie visible to jsdom, plus the keys the banner writes. */
const clearStorage = () => {
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; path=/`;
  }
  window.localStorage.clear();
};

beforeEach(clearStorage);
afterEach(() => {
  clearStorage();
  vi.restoreAllMocks();
});

describe('CookieConsent — first visit', () => {
  it('shows the banner when no decision has been recorded', () => {
    render(<CookieConsent />);

    expect(banner()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accept cookies/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /decline non-essential cookies/i })
    ).toBeInTheDocument();
  });
});

describe('CookieConsent — accepting', () => {
  it('records consent in both localStorage and a cookie, and hides', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CookieConsent />);

    await user.click(screen.getByRole('button', { name: /accept cookies/i }));

    expect(window.localStorage.getItem('cookiesAccepted')).toBe('true');
    expect(document.cookie).toContain('cookiesAccepted=true');
    expect(banner()).not.toBeInTheDocument();
  });

  it('announces the decision so the analytics loader can react', async () => {
    const user = userEvent.setup({ delay: null });
    const onAccepted = vi.fn();
    window.addEventListener('cookies:accepted', onAccepted);

    render(<CookieConsent />);
    await user.click(screen.getByRole('button', { name: /accept cookies/i }));

    expect(onAccepted).toHaveBeenCalledTimes(1);
    window.removeEventListener('cookies:accepted', onAccepted);
  });

  it('stays hidden on a later visit', () => {
    window.localStorage.setItem('cookiesAccepted', 'true');

    render(<CookieConsent />);

    expect(banner()).not.toBeInTheDocument();
  });

  it('stays hidden when only the cookie survives, without localStorage', () => {
    document.cookie = 'cookiesAccepted=true; path=/';

    render(<CookieConsent />);

    expect(banner()).not.toBeInTheDocument();
  });
});

describe('CookieConsent — declining', () => {
  it('does not persist a "false" cookie, only a re-prompt timestamp', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CookieConsent />);

    await user.click(screen.getByRole('button', { name: /decline non-essential cookies/i }));

    expect(document.cookie).not.toContain('cookiesAccepted');
    expect(window.localStorage.getItem('cookiesAccepted')).toBeNull();
    expect(Number(window.localStorage.getItem('cookieConsentDeclineUntil'))).toBeGreaterThan(
      Date.now()
    );
    expect(banner()).not.toBeInTheDocument();
  });

  it('announces the decision', async () => {
    const user = userEvent.setup({ delay: null });
    const onDeclined = vi.fn();
    window.addEventListener('cookies:declined', onDeclined);

    render(<CookieConsent />);
    await user.click(screen.getByRole('button', { name: /decline non-essential cookies/i }));

    expect(onDeclined).toHaveBeenCalledTimes(1);
    window.removeEventListener('cookies:declined', onDeclined);
  });

  it('stays hidden while the re-prompt timer is still running', () => {
    window.localStorage.setItem('cookieConsentDeclineUntil', String(Date.now() + 60_000));

    render(<CookieConsent />);

    expect(banner()).not.toBeInTheDocument();
  });

  it('asks again once the timer has expired', () => {
    window.localStorage.setItem('cookieConsentDeclineUntil', String(Date.now() - 60_000));

    render(<CookieConsent />);

    expect(banner()).toBeInTheDocument();
  });

  it('treats Escape as declining when focus is already inside the banner', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CookieConsent />);

    screen.getByRole('button', { name: /decline non-essential cookies/i }).focus();
    await user.keyboard('{Escape}');

    expect(banner()).not.toBeInTheDocument();
    expect(Number(window.localStorage.getItem('cookieConsentDeclineUntil'))).toBeGreaterThan(
      Date.now()
    );
  });

  it('also accepts Escape when focus is elsewhere on the page', async () => {
    // **Behaviour deliberately changed in feature 016.** This test previously
    // asserted the opposite, characterizing a real defect: the `onKeyDown`
    // handler sat on a `role="region"` div with no `tabIndex`, so the region
    // could never hold focus and the event only arrived by bubbling from a
    // focused child. A visitor who had not tabbed into the banner could not
    // dismiss it at all. The listener now sits on the document while the banner
    // is visible, which fixes it without making the banner modal.
    const user = userEvent.setup({ delay: null });
    render(<CookieConsent />);

    document.body.focus();
    await user.keyboard('{Escape}');

    expect(banner()).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Feature 016: changing your mind
// ---------------------------------------------------------------------------

const reopen = () => {
  act(() => {
    window.dispatchEvent(new Event('cookies:reopen'));
  });
};

describe('CookieConsent — reopening on request', () => {
  it('comes back for a visitor who had accepted, and says so', () => {
    window.localStorage.setItem(CONSENT_KEY, 'true');
    render(<CookieConsent />);
    expect(banner()).not.toBeInTheDocument();

    reopen();

    expect(banner()).toBeInTheDocument();
    expect(screen.getByText(/you currently accept cookies/i)).toBeInTheDocument();
  });

  it('comes back for a visitor who had declined, and says so', () => {
    window.localStorage.setItem(DECLINE_UNTIL_KEY, String(Date.now() + 60_000));
    render(<CookieConsent />);
    expect(banner()).not.toBeInTheDocument();

    reopen();

    expect(banner()).toBeInTheDocument();
    expect(screen.getByText(/you currently decline cookies/i)).toBeInTheDocument();
  });

  it('ignores the silence timer — the visitor asked for it', () => {
    window.localStorage.setItem(DECLINE_UNTIL_KEY, String(Date.now() + 30 * 86_400_000));
    render(<CookieConsent />);

    reopen();

    expect(banner()).toBeInTheDocument();
  });

  it('states no decision for someone who has not made one', () => {
    render(<CookieConsent />);

    expect(screen.queryByText(/you currently/i)).not.toBeInTheDocument();
  });

  it('moves focus to the banner it was asked to show', () => {
    window.localStorage.setItem(CONSENT_KEY, 'true');
    render(<CookieConsent />);

    reopen();

    expect(banner()).toHaveFocus();
  });

  it('does not steal focus when it appears uninvited on a first visit', () => {
    // Appearing unbidden and grabbing focus from someone mid-read is hostile;
    // being summoned and not taking focus is merely unhelpful.
    render(<CookieConsent />);

    expect(banner()).toBeInTheDocument();
    expect(banner()).not.toHaveFocus();
  });
});

describe('CookieConsent — withdrawing', () => {
  it('offers Withdraw rather than Decline to someone who has consented', () => {
    window.localStorage.setItem(CONSENT_KEY, 'true');
    render(<CookieConsent />);
    reopen();

    expect(
      screen.getByRole('button', { name: /withdraw consent for cookies/i })
    ).toBeInTheDocument();
  });

  it('clears the consent and the Google identifiers', async () => {
    const user = userEvent.setup({ delay: null });
    window.localStorage.setItem(CONSENT_KEY, 'true');
    document.cookie = `${CONSENT_KEY}=true; path=/`;
    document.cookie = '_ga=GA1.1.987654321; path=/';
    render(<CookieConsent />);
    reopen();

    await user.click(screen.getByRole('button', { name: /withdraw consent for cookies/i }));

    expect(window.localStorage.getItem(CONSENT_KEY)).toBeNull();
    expect(document.cookie).not.toContain('_ga=');
  });

  it('stays quiet far longer after a withdrawal than after a first-visit decline', async () => {
    const user = userEvent.setup({ delay: null });
    window.localStorage.setItem(CONSENT_KEY, 'true');
    render(<CookieConsent />);
    reopen();

    await user.click(screen.getByRole('button', { name: /withdraw consent for cookies/i }));

    const until = Number(window.localStorage.getItem(DECLINE_UNTIL_KEY));
    const oneDay = 86_400_000;
    expect(until).toBeGreaterThan(Date.now() + 25 * oneDay);
  });

  it('keeps the shorter period for someone declining without prior consent', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CookieConsent />);

    await user.click(screen.getByRole('button', { name: /decline non-essential cookies/i }));

    const until = Number(window.localStorage.getItem(DECLINE_UNTIL_KEY));
    expect(until).toBeLessThan(Date.now() + 2 * 86_400_000);
  });

  it('lets a visitor who declined accept afterwards', async () => {
    const user = userEvent.setup({ delay: null });
    window.localStorage.setItem(DECLINE_UNTIL_KEY, String(Date.now() + 60_000));
    render(<CookieConsent />);
    reopen();

    await user.click(screen.getByRole('button', { name: /accept cookies/i }));

    expect(window.localStorage.getItem(CONSENT_KEY)).toBe('true');
    expect(window.localStorage.getItem(DECLINE_UNTIL_KEY)).toBeNull();
  });
});

describe('CookieConsent — what the copy promises', () => {
  it('names the measurement that keeps running either way', () => {
    render(<CookieConsent />);

    expect(screen.getByText(/vercel web analytics is cookie-free/i)).toBeInTheDocument();
    expect(screen.getByText(/google\s+analytics/i)).toBeInTheDocument();
  });

  it('reassures the visitor about their cart', () => {
    render(<CookieConsent />);

    expect(screen.getByText(/your cart stays on this device/i)).toBeInTheDocument();
  });

  it('words neither option as the recommended one', () => {
    // AC13 as amended by D7: the buttons keep their existing styling, so what is
    // asserted here is the wording — no "recommended", no "we suggest".
    render(<CookieConsent />);

    const accept = screen.getByRole('button', { name: /accept cookies/i });
    const declineBtn = screen.getByRole('button', { name: /decline non-essential cookies/i });

    expect(accept.textContent).toBe('Accept');
    expect(declineBtn.textContent).toBe('Decline');
    for (const el of [accept, declineBtn]) {
      expect(el.textContent).not.toMatch(/recommend|suggest|best|preferred/i);
    }
  });
});

/**
 * 057: the banner is a full-width bar with the top z-index, and it covered the
 * AI chat button and the floating search button — tapping them on a first
 * visit did nothing. It now publishes its height so those controls can sit
 * above it (they add `--cookie-banner-h` to their `bottom`).
 */
describe('CookieConsent — leaves room for the controls below it', () => {
  const height = () => document.documentElement.style.getPropertyValue('--cookie-banner-h');
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');

  beforeEach(() => {
    // jsdom has no layout and no ResizeObserver.
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 96,
    });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
  });
  afterEach(() => {
    if (original) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', original);
    vi.unstubAllGlobals();
  });

  it('publishes its height while it shows, and 0px once the visitor decides', async () => {
    render(<CookieConsent />);
    expect(banner()).toBeInTheDocument();
    expect(height()).toBe('96px');

    await userEvent.click(screen.getByRole('button', { name: /decline non-essential cookies/i }));
    expect(banner()).not.toBeInTheDocument();
    expect(height()).toBe('0px');
  });

  it('resets it when the banner unmounts', () => {
    const { unmount } = render(<CookieConsent />);
    expect(height()).toBe('96px');
    unmount();
    expect(height()).toBe('0px');
  });
});
