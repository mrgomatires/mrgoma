'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { TransformedTire } from '@/app/interfaces/tires';
import { trackEvent } from '@/app/utils/analytics';
import { addItem, type CompareItem, MAX_COMPARE, removeItem, snapshot } from '@/app/utils/compare';
import type { GaList } from '@/app/utils/ecommerce';

/**
 * The tires picked for comparison (feature 051).
 *
 * Up to three, kept **for the visit** in `sessionStorage` (D5): across pages and
 * reloads, gone with the tab — so nobody returns days later to a comparison of
 * tires that have since sold. Read after mount, so the server's HTML and the
 * first client render agree (every checkbox starts unchecked).
 */

const KEY = 'mg-compare';

type CompareState = {
  items: CompareItem[];
  has: (id: string) => boolean;
  /** Add or remove; `'full'` when a fourth was refused (nothing is dropped). */
  toggle: (tire: TransformedTire, list?: GaList) => 'added' | 'removed' | 'full';
  remove: (id: string) => void;
  clear: () => void;
  /** "You can compare up to 3 tires…", shown by the tray until the next change. */
  notice: string | null;
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const CompareContext = createContext<CompareState | null>(null);

function readStored(): CompareItem[] {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? (parsed as CompareItem[]).filter(i => i?.tire?.id).slice(0, MAX_COMPARE)
      : [];
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setItems(readStored());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      if (items.length) window.sessionStorage.setItem(KEY, JSON.stringify(items));
      else window.sessionStorage.removeItem(KEY);
    } catch {
      // Private mode or storage full: the comparison still works for this page.
    }
  }, [items, loaded]);

  const has = useCallback((id: string) => items.some(i => i.tire.id === String(id)), [items]);

  const toggle = useCallback<CompareState['toggle']>(
    (tire, list) => {
      const id = String(tire.id);
      if (items.some(i => i.tire.id === id)) {
        const next = removeItem(items, id);
        setItems(next);
        setNotice(null);
        trackEvent({
          action: 'compare_remove',
          category: 'compare',
          params: { tire_id: id, count: next.length },
        });
        return 'removed';
      }
      const { items: next, result } = addItem(items, snapshot(tire, list));
      if (result === 'full') {
        setNotice(`You can compare up to ${MAX_COMPARE} tires — remove one first.`);
        trackEvent({
          action: 'compare_limit',
          category: 'compare',
          params: { count: MAX_COMPARE },
        });
        return 'full';
      }
      setItems(next);
      setNotice(null);
      trackEvent({
        action: 'compare_add',
        category: 'compare',
        params: { tire_id: id, count: next.length },
      });
      return 'added';
    },
    [items]
  );

  const remove = useCallback(
    (id: string) => {
      const next = removeItem(items, id);
      setItems(next);
      setNotice(null);
      trackEvent({
        action: 'compare_remove',
        category: 'compare',
        params: { tire_id: id, count: next.length },
      });
      if (next.length < 2) setIsOpen(false);
    },
    [items]
  );

  const clear = useCallback(() => {
    setItems([]);
    setNotice(null);
    setIsOpen(false);
  }, []);

  const value = useMemo<CompareState>(
    () => ({
      items,
      has,
      toggle,
      remove,
      clear,
      notice,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [items, has, toggle, remove, clear, notice, isOpen]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

/** Outside the provider (tests, isolated renders) the feature is simply off. */
export function useCompare(): CompareState | null {
  return useContext(CompareContext);
}
