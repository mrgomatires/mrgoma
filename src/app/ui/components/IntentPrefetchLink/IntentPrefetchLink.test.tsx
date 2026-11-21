import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Expose what IntentPrefetchLink hands to next/link: `prefetch` is the point.
vi.mock('next/link', () => ({
  default: ({
    prefetch,
    href,
    children,
    ...rest
  }: {
    prefetch?: boolean | null;
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} data-prefetch={String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}));

const { default: IntentPrefetchLink } = await import('./IntentPrefetchLink');

describe('IntentPrefetchLink (059)', () => {
  it('is a real link that pre-loads nothing until the shopper shows intent', () => {
    render(
      <IntentPrefetchLink href="/tires/new" className="pill">
        New
      </IntentPrefetchLink>
    );
    const link = screen.getByRole('link', { name: 'New' });
    expect(link).toHaveAttribute('href', '/tires/new');
    expect(link).toHaveClass('pill');
    expect(link).toHaveAttribute('data-prefetch', 'false');
  });

  it('pre-loads (Next default) once the pointer enters', () => {
    render(<IntentPrefetchLink href="/tires/size">Shop by size</IntentPrefetchLink>);
    const link = screen.getByRole('link');
    fireEvent.mouseEnter(link);
    expect(link).toHaveAttribute('data-prefetch', 'null');
  });

  it('pre-loads once a finger touches it (phones have no hover)', () => {
    render(<IntentPrefetchLink href="/tires/size/225-45-18">225/45R18</IntentPrefetchLink>);
    const link = screen.getByRole('link');
    fireEvent.touchStart(link);
    expect(link).toHaveAttribute('data-prefetch', 'null');
  });

  it("keeps the caller's handlers", () => {
    const onClick = vi.fn();
    const onMouseEnter = vi.fn();
    const onTouchStart = vi.fn();
    render(
      <IntentPrefetchLink
        href="/tires/used"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onTouchStart={onTouchStart}
      >
        Used
      </IntentPrefetchLink>
    );
    const link = screen.getByRole('link');
    fireEvent.mouseEnter(link);
    fireEvent.touchStart(link);
    fireEvent.click(link);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onTouchStart).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
