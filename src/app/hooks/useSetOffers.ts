'use client';

import { useEffect, useState } from 'react';

import type { CardSetOffer } from '@/app/utils/tireSets';

export type SetOffers = Record<string, CardSetOffer>;

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
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/tires/sets?ids=${key}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((body: { offers?: SetOffers }) => {
        if (!controller.signal.aborted) setState({ key, offers: body.offers ?? {} });
      })
      .catch(() => {
        // An extra: no line rather than an error.
      });
    return () => controller.abort();
  }, [key]);

  // Offers for the ids on screen only — never a previous page's.
  return state.key === key ? state.offers : {};
}
