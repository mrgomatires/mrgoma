import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  counts: [
    { size: '315/30/22', units: 270 },
    { size: '235/45/18', units: 12 },
    { size: '225/45/18', units: 1 },
    { size: '245/70/19.5', units: 2 },
    { size: '35/12.50/20', units: 3 },
  ],
}));

vi.mock('@/repositories/cachedCatalog', () => ({ getCachedSizeCounts: async () => h.counts }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/app/utils/analytics', () => ({ trackEvent: vi.fn() }));

import SizeIndexPage, { metadata, revalidate } from './page';

const renderIt = async () => render(await SizeIndexPage());

describe('/tires/size (050)', () => {
  it('is static, regenerated every five minutes, with its own canonical', () => {
    expect(revalidate).toBe(300);
    expect(metadata.alternates?.canonical).toMatch(/\/tires\/size$/);
  });

  it('has one H1, a breadcrumb, popular sizes and every size by rim (AC1, AC6)', async () => {
    const { container } = await renderIt();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByText('Sizes')).toHaveAttribute('aria-current', 'page');

    const popular = screen.getByRole('region', { name: 'Popular sizes' });
    expect(within(popular).getAllByRole('link')[0]).toHaveAttribute(
      'href',
      '/tires/size/315-30-22'
    );

    const rims = [...container.querySelectorAll('h3')].map(h3 => h3.textContent);
    expect(rims).toEqual([
      '18" rim · 2 sizes',
      '19.5" rim · 1 size',
      '20" rim · 1 size',
      '22" rim · 1 size',
    ]);
  });

  it('links every size with its count, as ordinary links (AC6, AC7d)', async () => {
    await renderIt();
    const all = screen.getByRole('region', { name: 'All sizes' });
    const links = within(all).getAllByRole('link');
    expect(links).toHaveLength(5);
    const one = links.find(a => a.textContent?.startsWith('225/45/18'))!;
    expect(one).toHaveAttribute('href', '/tires/size/225-45-18');
    expect(one).toHaveTextContent('225/45/18 · 1 tire');
    expect(one).toHaveAttribute('data-track', 'size_index_select');
    expect(one).toHaveAttribute('data-track-source', 'list');
    expect(links.find(a => a.textContent?.startsWith('35/12.50/20'))).toHaveAttribute(
      'href',
      '/tires/size/35-12-50-20'
    );
  });

  it('describes the list for search engines (AC6)', async () => {
    const { container } = await renderIt();
    const ld = [...container.querySelectorAll('script[type="application/ld+json"]')]
      .map(s => s.textContent ?? '')
      .join('');
    expect(ld).toContain('"ItemList"');
    expect(ld).toContain('"numberOfItems":5');
    expect(ld).toContain('/tires/size/245-70-19-5');
    expect(ld).toContain('"BreadcrumbList"');
  });
});
