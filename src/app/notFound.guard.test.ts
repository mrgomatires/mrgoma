import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * 060: the header must enter the app through one component only. The root 404
 * imported `Header` directly next to the layouts' `StickyHeader`; with two
 * entries, Turbopack shipped the header twice to every page (+12 KB gzip) once
 * the header shared a component with the pages. `perf-budget.mjs` catches the
 * duplicate after a build; this catches the cause before one.
 */
const NOT_FOUND = readFileSync('src/app/not-found.tsx', 'utf8');

describe('the root 404 uses the site header', () => {
  it('renders StickyHeader, like every layout', () => {
    expect(NOT_FOUND).toMatch(
      /import StickyHeader from '@\/app\/ui\/sections\/StickyHeader\/StickyHeader'/
    );
    expect(NOT_FOUND).toContain('<StickyHeader />');
  });

  it('never imports Header directly', () => {
    expect(NOT_FOUND).not.toMatch(/sections\/Header\/Header'/);
  });
});
