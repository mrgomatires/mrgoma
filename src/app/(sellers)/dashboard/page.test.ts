import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/(sellers)/dashboard/container/Dashboard', () => ({ default: () => null }));

const { metadata } = await import('./page');

describe('dashboard page metadata (059)', () => {
  it('names the dashboard in the browser tab', () => {
    // The root layout's template turns it into "Dashboard | MrGoma Tires".
    expect(metadata.title).toBe('Dashboard');
  });

  it('stays out of search results', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
