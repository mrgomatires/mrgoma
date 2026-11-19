import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { BRAND_LOGO_IDS } from '@/app/utils/brandLogos';

import BrandImage from './BrandImage';

describe('BrandImage (055)', () => {
  it('shows the logo of a brand that has a file', () => {
    const [id] = BRAND_LOGO_IDS;
    render(<BrandImage product={{ brand: 'MICHELIN', brandId: id }} />);
    expect(screen.getByRole('img', { name: 'Michelin' })).toHaveAttribute(
      'src',
      `/assets/images/TireBrand/${id}-logo.webp`
    );
  });

  it('shows the name, and requests no file, for a brand without one', () => {
    const missing = 999_999;
    expect(BRAND_LOGO_IDS.has(missing)).toBe(false);
    render(<BrandImage product={{ brand: 'DOHVAN', brandId: missing }} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Dohvan')).toBeInTheDocument();
  });
});
