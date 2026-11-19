import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * `tech-stack.md`: user actions are instrumented **declaratively** with
 * `data-track`, and one delegated listener routes every one of them to both
 * sinks. There is no per-platform wiring to remember — only the attribute, which
 * is exactly the kind of thing that gets left off a new control and noticed a
 * quarter later when someone asks whether anyone uses the filters.
 */

const CONTROLS: [file: string, expected: string[]][] = [
  ['src/app/ui/sections/FilterRail/FacetGroup.tsx', ['filter_apply']],
  ['src/app/ui/sections/FilterRail/SearchableFacet.tsx', ['filter_apply']],
  ['src/app/ui/sections/FilterRail/RangeFacet.tsx', ['filter_apply']],
  ['src/app/ui/sections/FilterRail/AppliedFilters.tsx', ['filter_remove']],
  ['src/app/ui/sections/UsedQuickChips/UsedQuickChips.tsx', ['filter_apply']],
  // Clear all lives in the rail's header — it was in both, and the page
  // showed the same control twice.
  ['src/app/ui/sections/FilterRail/FilterRail.tsx', ['filter_clear_all']],
  ['src/app/ui/sections/FilterRail/FilterRailMobile.tsx', ['filter_panel_toggle']],
  ['src/app/ui/components/ViewToggle/ViewToggle.tsx', ['results_view']],
  ['src/app/ui/components/NotResultsFound/NoResultsFound.tsx', ['filter_loosen']],
];

describe('every new control reports what happened', () => {
  it.each(CONTROLS)('%s', (file, expected) => {
    const source = readFileSync(file, 'utf8');
    for (const event of expected) {
      expect(source).toContain(`data-track="${event}"`);
    }
    expect(source).toContain('data-track-category="tires_filter"');
  });

  /**
   * Values are sent verbatim to two third parties. A brand or a rim size is a
   * fact about the catalogue; nothing here may carry anything about a person.
   */
  it('and never labels an event with anything personal', () => {
    for (const [file] of CONTROLS) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/data-track-label=\{[^}]*(email|phone|name|address|customer)/i);
    }
  });
});

/**
 * **Every filter reports under its own group.**
 *
 * `SearchableFacet` was generalised out of the brand facet and its label kept
 * the word it was born with: every width, profile and rim click reported as
 * `Brand:205`, `Brand:55`, `Brand:16`. Nothing failed — the filter worked, the
 * count was right, and the analytics quietly recorded tire sizes as brand names.
 * It was found by an outside audit of production, not by this suite, which is
 * why the assertion below exists.
 *
 * The label is the group *key*, not the title: titles change with the copy —
 * "Rim size" today, "Wheel size" tomorrow — and a renamed title silently splits
 * one metric into two.
 */
describe('a filter reports the group it belongs to', () => {
  const RAIL = 'src/app/ui/sections/FilterRail/';

  it.each([['FacetGroup.tsx'], ['SearchableFacet.tsx'], ['RangeFacet.tsx']])(
    '%s labels from the group key, never a hardcoded name',
    file => {
      const source = readFileSync(RAIL + file, 'utf8');
      expect(source).toContain('data-track-label={`${trackGroup}:');
      // The exact shape of the bug: a group name written into the template.
      expect(source).not.toMatch(
        /data-track-label=\{`(Brand|Condition|Price|Width|Profile|Rim)[^$]/
      );
    }
  );

  it('and the rail hands each group its own key', () => {
    const source = readFileSync(RAIL + 'FilterRail.tsx', 'utf8');
    // Passed as the loop variable, so it cannot be one group's name for all.
    expect(source.match(/trackGroup=\{group\}/g) ?? []).toHaveLength(4);
    expect(source).not.toMatch(/trackGroup="[a-z]/i);
  });
});

describe('filters report their values (046, FR7)', () => {
  it.each([
    'src/app/ui/sections/FilterRail/FacetGroup.tsx',
    'src/app/ui/sections/FilterRail/SearchableFacet.tsx',
    'src/app/ui/sections/FilterRail/RangeFacet.tsx',
  ])('%s carries filter_group and filter_value, and keeps its label', file => {
    const source = readFileSync(file, 'utf8');
    expect(source).toContain('data-track-filter-group=');
    expect(source).toContain('data-track-filter-value=');
    expect(source).toContain('data-track-label=');
  });

  it('apply_home_filters carries brand and condition, and keeps its count', () => {
    const source = readFileSync(
      'src/app/ui/components/HomeMoreFilters/HomeMoreFilters.tsx',
      'utf8'
    );
    expect(source).toContain('data-track-tire-brand=');
    expect(source).toContain('data-track-tire-condition=');
    expect(source).toContain('data-track-value=');
  });
});
