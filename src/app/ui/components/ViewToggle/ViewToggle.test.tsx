import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ViewToggle from './ViewToggle';

describe('ViewToggle', () => {
  it('marks the current view', () => {
    render(<ViewToggle current="table" search="?view=table" basePath="/tires" />);
    expect(screen.getByRole('link', { name: 'Table' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: 'List' })).not.toHaveAttribute('aria-current');
  });

  it('keeps every filter when switching', () => {
    render(<ViewToggle current="list" search="?brands=PIRELLI&d=20" basePath="/tires" />);
    const href = screen.getByRole('link', { name: 'Table' }).getAttribute('href')!;
    expect(href).toContain('brands=PIRELLI');
    expect(href).toContain('d=20');
    expect(href).toContain('view=table');
  });

  it('leaves the default view out of the URL rather than spelling it out', () => {
    // `?view=list` is the default; writing it would give the same page two URLs,
    // which is the duplicate-URL problem `022` spent a feature removing.
    render(<ViewToggle current="table" search="?view=table&d=20" basePath="/tires" />);
    expect(screen.getByRole('link', { name: 'List' })).toHaveAttribute('href', '/tires?d=20');
  });

  it('is a group of links, not a set of buttons', () => {
    const { container } = render(<ViewToggle current="list" search="" basePath="/tires" />);
    expect(screen.getByRole('group', { name: 'Result view' })).toBeInTheDocument();
    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(container.querySelectorAll('[aria-pressed]')).toHaveLength(0);
  });
});

describe('ViewToggle without the server (061)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('keeps the page: same results, another layout', () => {
    render(<ViewToggle current="list" search="?brands=PIRELLI&page=2" basePath="/tires" />);
    const href = screen.getByRole('link', { name: 'Table' }).getAttribute('href')!;
    expect(href).toContain('page=2');
    expect(href).toContain('view=table');
  });

  it('a plain click updates the URL in the browser only — no navigation', () => {
    const push = vi.spyOn(window.history, 'pushState');
    render(<ViewToggle current="list" search="?page=2" basePath="/tires" />);
    const click = fireEvent.click(screen.getByRole('link', { name: 'Table' }));
    expect(click).toBe(false); // default prevented: no request for the page
    expect(push).toHaveBeenCalledWith(null, '', '/tires?page=2&view=table');
  });

  it('scrolls to the results as the navigation did', () => {
    const main = document.createElement('main');
    main.scrollIntoView = vi.fn();
    document.body.appendChild(main);
    render(<ViewToggle current="list" search="" basePath="/tires" />);
    fireEvent.click(screen.getByRole('link', { name: 'Table' }));
    expect(main.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    main.remove();
  });

  it('a cmd-click still opens the link (a new tab, server-rendered)', () => {
    const push = vi.spyOn(window.history, 'pushState');
    render(<ViewToggle current="list" search="" basePath="/tires" />);
    fireEvent.click(screen.getByRole('link', { name: 'Table' }), { metaKey: true });
    expect(push).not.toHaveBeenCalled();
  });

  it('is marked so ResultsNavigation leaves it alone', () => {
    render(<ViewToggle current="list" search="" basePath="/tires" />);
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('data-results-nav', 'skip');
    }
  });
});
