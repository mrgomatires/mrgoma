import type { KeyboardEvent } from 'react';

import { describe, expect, it, vi } from 'vitest';

import { handleKeyPress } from './handleKeyPress';

const press = (k: string, mods: { ctrlKey?: boolean; metaKey?: boolean } = {}) => {
  const preventDefault = vi.fn();
  const e = { key: k, preventDefault, ...mods } as unknown as KeyboardEvent<HTMLInputElement>;
  return { e, preventDefault };
};

describe('handleKeyPress', () => {
  it('allows digits, slash and Backspace', () => {
    for (const k of ['0', '9', '/', 'Backspace']) {
      const { e, preventDefault } = press(k);
      handleKeyPress(e);
      expect(preventDefault).not.toHaveBeenCalled();
    }
  });

  it('blocks any other key', () => {
    for (const k of ['a', '-', ' ']) {
      const { e, preventDefault } = press(k);
      handleKeyPress(e);
      expect(preventDefault).toHaveBeenCalled();
    }
  });

  it('lets keyboard navigation and submission through (050: Tab was a trap)', () => {
    for (const k of ['Enter', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End']) {
      const { e, preventDefault } = press(k);
      handleKeyPress(e);
      expect(preventDefault).not.toHaveBeenCalled();
    }
  });

  it('lets shortcuts through (paste, select all)', () => {
    for (const mods of [{ ctrlKey: true }, { metaKey: true }]) {
      const { e, preventDefault } = press('v', mods);
      handleKeyPress(e);
      expect(preventDefault).not.toHaveBeenCalled();
    }
  });
});
