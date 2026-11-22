'use client';

import { useEffect, useState } from 'react';

import type { CardSetOffer } from '@/app/utils/tireSets';

export type SetOffers = Record<string, CardSetOffer>;

/**
 * Answers already received, by card set, for this tab (061). Switching
 * list → table → list on `/tires` remounts the cards with the same ids; without
 * this they asked the server again for an answer we already had. Small and
 * bounded (oldest dropped first); a reload starts afresh. The server's own
 * answer is cacheable for a minute, so a few minutes here is no staler than
 * the CDN.
 */
const answered = new Map<string, { offers: SetOffers; at: number }>();
const MAX_ANSWERS = 30;
const ANSWER_TTL_MS = 5 * 60_000;

function remembered(key: string): SetOffers | null {
  const hit = answered.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ANSWER_TTL_MS) {
    answered.delete(key);
    return null;
  }
  return hit.offers;
}

function remember(key: string, offers: SetOffers): void {
  answered.delete(key);
  answered.set(key, { offers, at: Date.now() });
  while (answered.size > MAX_ANSWERS) answered.delete(answered.keys().next().value!);
}

/** Test hook: forget every answer. */
export function clearSetOffersCache(): void {
  answered.clear();
}

/**
 * The set each card in a listing can offer (feature 054), asked for **after
 * the cards are on screen** (D6): the listing is never slower for it, and when
 * the request fails or is slow the cards simply show no set line.
 *
 * Keyed on the sorted ids, so `/tires` paging on the client (the cards change
 * without the list remounting) asks again, and an answer for a page already
 * left is dropped.
 */
export function useSetOffers(ids: readonly (string | number)[]): SetOffers {
  const key = [...new Set(ids.map(String))].sort((a, b) => Number(a) - Number(b)).join(',');
  const [state, setState] = useState<{ key: string; offers: SetOffers }>({ key: '', offers: {} });

  useEffect(() => {
    if (!key || remembered(key)) return;
    const controller = new AbortController();
    fetch(`/api/tires/sets?ids=${key}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((body: { offers?: SetOffers }) => {
        if (controller.signal.aborted) return;
        remember(key, body.offers ?? {});
        setState({ key, offers: body.offers ?? {} });
      })
      .catch(() => {
        // An extra: no line rather than an error.
      });
    return () => controller.abort();
  }, [key]);

  // Offers for the ids on screen only — never a previous page's.
  if (state.key === key) return state.offers;
  return remembered(key) ?? {};
}
