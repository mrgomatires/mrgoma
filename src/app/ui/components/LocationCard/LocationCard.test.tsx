import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({ alt }: { alt?: string }) => <img alt={alt ?? ''} />,
}));

import { LocationCard } from './LocationCard';

describe('LocationCard (055)', () => {
  it('opens the store on Google Maps through a real link named by its text (WCAG 2.5.3)', () => {
    render(
      <LocationCard
        id="1"
        name="Cutler Bay"
        address="18200 S Dixie Hwy, Miami, FL 33157"
        locationStore="Serving Cutler Bay"
        phone="(305) 278-4632"
        backgroundImage="/x.jpg"
        link="https://maps.google.com/?cid=1"
      />
    );
    const link = screen.getByRole('link', {
      name: '18200 S Dixie Hwy, Miami, FL 33157 Serving Cutler Bay (opens Google Maps in a new tab)',
    });
    expect(link).toHaveAttribute('href', 'https://maps.google.com/?cid=1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByRole('button', { name: 'Open address link' })).toBeNull();
  });
});
