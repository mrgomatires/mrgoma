import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TransformedTire } from '@/app/interfaces/tires';

const track = vi.hoisted(() => vi.fn());
vi.mock('@/app/utils/analytics', () => ({ trackEvent: track }));

import { CompareProvider, useCompare } from './CompareContext';

const tire = (id: string) =>
  ({
    id,
    name: `(${id}) | B | M | 235/45/18`,
    size: '235/45/18',
    brand: 'B',
    brandId: 1,
    price: '100',
    condition: 'Used',
    color: 'Black',
    href: '#',
    imageSrc: '/x.webp',
    imageAlt: 'x',
    features: [],
  }) as TransformedTire;

const setup = () =>
  renderHook(() => useCompare()!, {
    wrapper: ({ children }) => <CompareProvider>{children}</CompareProvider>,
  });

beforeEach(() => {
  window.sessionStorage.clear();
  track.mockReset();
});

describe('CompareContext (051)', () => {
  it('adds, removes and reports with the count after (AC8)', async () => {
    const { result } = setup();
    act(() => void result.current.toggle(tire('1')));
    act(() => void result.current.toggle(tire('2')));
    expect(result.current.items.map(i => i.tire.id)).toEqual(['1', '2']);
    expect(track).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'compare_add', params: { tire_id: '2', count: 2 } })
    );
    act(() => void result.current.toggle(tire('1')));
    expect(result.current.has('1')).toBe(false);
    expect(track).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'compare_remove', params: { tire_id: '1', count: 1 } })
    );
  });

  it('refuses a fourth with a notice and keeps the three (AC2)', () => {
    const { result } = setup();
    for (const id of ['1', '2', '3']) act(() => void result.current.toggle(tire(id)));
    let outcome = '';
    act(() => {
      outcome = result.current.toggle(tire('4'));
    });
    expect(outcome).toBe('full');
    expect(result.current.items).toHaveLength(3);
    expect(result.current.notice).toMatch(/up to 3 tires/);
    expect(track).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'compare_limit' }));
  });

  it('keeps the picks for the visit: a remount reads them back (AC11)', async () => {
    const first = setup();
    act(() => void first.result.current.toggle(tire('7')));
    await waitFor(() => expect(window.sessionStorage.getItem('mg-compare')).toContain('"7"'));
    first.unmount();

    const second = setup();
    await waitFor(() => expect(second.result.current.items.map(i => i.tire.id)).toEqual(['7']));
  });

  it('survives unreadable storage', async () => {
    window.sessionStorage.setItem('mg-compare', '{not json');
    const { result } = setup();
    await waitFor(() => expect(result.current.items).toEqual([]));
  });

  it('closes the comparison when fewer than two remain', () => {
    const { result } = setup();
    act(() => void result.current.toggle(tire('1')));
    act(() => void result.current.toggle(tire('2')));
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.remove('1'));
    expect(result.current.isOpen).toBe(false);
  });
});
