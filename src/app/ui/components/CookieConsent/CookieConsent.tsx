'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import {
  DECLINE_DAYS,
  WITHDRAW_DAYS,
  grantConsent,
  hasConsent,
  isSilenced,
  revokeConsent,
} from '@/app/utils/consent';

/**
 * CookieConsent — the site's only consent control.
 *
 * - Shows on a first visit until the visitor decides.
 * - Accept: recorded for a year, and the banner does not return.
 * - Decline: no persistent "false" is stored; the banner simply stays quiet for
 *   a while. How long depends on what the visitor is saying no *to* —
 *   `DECLINE_DAYS` for a first-visit "not now", `WITHDRAW_DAYS` for someone
 *   deliberately reversing an earlier yes, because asking that person again
 *   tomorrow would be nagging.
 * - Reopens on a `cookies:reopen` event, which the footer control dispatches.
 *   That is what makes withdrawal as easy as consenting: the same banner, the
 *   same two buttons, no extra page.
 *
 * All reading and writing of consent goes through `consent.ts`, never inline —
 * two copies of that rule is how they start to disagree.
 *
 * It is deliberately **not** a `<dialog>`. A modal would trap focus and block
 * the page for a notice that must not obstruct anything; a non-modal region is
 * the right shape, at the cost of handling Escape ourselves (see below).
 */

type Decision = 'accepted' | 'declined' | 'undecided';

const readDecision = (): Decision => {
  if (hasConsent()) return 'accepted';
  return isSilenced() ? 'declined' : 'undecided';
};

export const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false); // for entrance animation
  const [decision, setDecision] = useState<Decision>('undecided');
  const regionRef = useRef<HTMLDivElement>(null);
  // Focus is only moved when the visitor *asked* for the banner. On a first
  // visit it appears unbidden, and stealing focus from someone who was reading
  // would be hostile.
  const focusOnOpen = useRef(false);

  useEffect(() => {
    try {
      const current = readDecision();
      setDecision(current);
      setVisible(current === 'undecided');
      if (current === 'undecided') setTimeout(() => setMounted(true), 0);
    } catch {
      // If anything about storage is unreadable, ask.
      setVisible(true);
      setTimeout(() => setMounted(true), 0);
    }
  }, []);

  /** Bring the banner back on request, whatever was decided before. */
  useEffect(() => {
    const onReopen = () => {
      setDecision(readDecision());
      focusOnOpen.current = true;
      setVisible(true);
      setTimeout(() => setMounted(true), 0);
    };
    window.addEventListener('cookies:reopen', onReopen);
    return () => window.removeEventListener('cookies:reopen', onReopen);
  }, []);

  useEffect(() => {
    if (visible && focusOnOpen.current) {
      focusOnOpen.current = false;
      regionRef.current?.focus();
    }
  }, [visible]);

  const accept = useCallback(() => {
    grantConsent();
    setDecision('accepted');
    setVisible(false);
  }, []);

  const decline = useCallback(() => {
    // Withdrawing an existing consent earns a longer silence than declining for
    // the first time. The distinction is derived, not stored: whoever currently
    // has consent is reversing it.
    revokeConsent(hasConsent() ? WITHDRAW_DAYS : DECLINE_DAYS);
    setDecision('declined');
    setVisible(false);
  }, []);

  /**
   * Escape, handled on the document rather than on the region.
   *
   * The handler used to sit on this `role="region"` div, which has no tabIndex
   * and so can never hold focus — the event only ever arrived by bubbling from a
   * focused child. A visitor who had not tabbed into the banner could not
   * dismiss it at all. Listening at the document level while visible fixes that
   * without making the banner modal.
   */
  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') decline();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible, decline]);

  /**
   * Publish the banner's height as `--cookie-banner-h` on `<html>` while it
   * shows (057), as the compare tray does with `--compare-tray-h`. The banner
   * is a full-width bar at the bottom with the top z-index, so it sat over the
   * AI chat button and the floating search button: a first-time visitor
   * tapped them and nothing happened. Those controls add the larger of the two
   * heights to their `bottom`; the banner itself does not move.
   */
  useEffect(() => {
    const root = document.documentElement;
    const el = regionRef.current;
    if (!visible || !el) {
      root.style.setProperty('--cookie-banner-h', '0px');
      return;
    }
    const set = () => root.style.setProperty('--cookie-banner-h', `${el.offsetHeight}px`);
    set();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(set);
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      root.style.setProperty('--cookie-banner-h', '0px');
    };
  }, [visible]);

  if (!visible) return null;

  const accepted = decision === 'accepted';

  return (
    <div
      ref={regionRef}
      role="region"
      aria-label="Cookie consent"
      // Programmatically focusable only: the banner is a target for focus when
      // reopened on request, but must never join the tab order ahead of the page.
      tabIndex={-1}
      className={`fixed inset-x-0 bottom-0 z-[9999] transition-transform duration-300 ease-out motion-reduce:transition-none focus-visible:outline-none ${mounted ? 'translate-y-0' : 'translate-y-full'}`}
    >
      <div className="mx-auto max-w-7xl px-3 py-2 sm:px-6 sm:py-3 lg:px-8">
        <div className="rounded-lg bg-black/95 text-white shadow-xl ring-1 ring-white/10 backdrop-blur supports-[backdrop-filter]:bg-black/75">
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#9dfb40]/15 text-[#9dfb40]"
              >
                {/* Cookie icon */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2a1 1 0 0 1 1 1 2 2 0 0 0 2 2 1 1 0 1 1 0 2 2 2 0 0 0 2 2 1 1 0 1 1 0 2 2 2 0 0 0 2 2 8 8 0 1 1-8-11zM9 10a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-1 5a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm5 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm2-6a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
                </svg>
              </span>
              <div id="cookie-consent-desc" className="text-sm leading-6 text-gray-200">
                {decision !== 'undecided' && (
                  <p className="font-semibold text-white">
                    {accepted ? 'You currently accept cookies.' : 'You currently decline cookies.'}
                  </p>
                )}
                <p>
                  We use cookies to improve your experience. Accepting also enables Google
                  Analytics; declining does not.
                </p>
                <p className="text-gray-300">
                  Vercel Web Analytics is cookie-free and runs either way. Your cart stays on this
                  device and is not affected.{' '}
                  <Link
                    href="/legal-policies#privacy"
                    className="underline text-[#7bb8ff] hover:text-[#a5cfff]"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={decline}
                className="inline-flex items-center justify-center rounded-md border border-white/20 bg-transparent px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/40"
                aria-label={
                  accepted ? 'Withdraw consent for cookies' : 'Decline non-essential cookies'
                }
              >
                {accepted ? 'Withdraw' : 'Decline'}
              </button>
              <button
                type="button"
                onClick={accept}
                className="inline-flex items-center justify-center rounded-md bg-[#9dfb40] px-4 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-[#85d936] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#9dfb40]"
                aria-label="Accept cookies"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
