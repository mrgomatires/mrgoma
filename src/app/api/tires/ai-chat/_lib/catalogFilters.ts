/**
 * The storefront assistant's `apply_filters` input, written the way the catalog
 * reads its URL (052).
 *
 * The listing understands `patched=no|yes` and `kindSale=yes|no`; the tool used
 * to send `patched=true|false`, which the catalog ignores, so "no patches" did
 * not filter at all. And the used filters mean used tires (052, D3): tread,
 * life and patched narrow to used, and with New they are dropped — the same
 * rule the rail and `normalizeUsedFilters` apply, so the chat lands on the
 * listing exactly as the rail would.
 */
export function toCatalogFilters(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...input };

  // Booleans (old schema) or yes/no strings, to the catalog's yes/no.
  const yesNo = (value: unknown) =>
    value === true || value === 'yes' ? 'yes' : value === false || value === 'no' ? 'no' : undefined;

  if ('patched' in out) {
    const v = yesNo(out.patched);
    if (v) out.patched = v;
    else delete out.patched;
  }
  if ('runFlat' in out) {
    const v = yesNo(out.runFlat);
    delete out.runFlat;
    if (v) out.kindSale = v;
  }

  // Tread in whole 32nds, 1–32 — the rail's steps.
  for (const key of ['minTreadDepth', 'maxTreadDepth'] as const) {
    if (!(key in out)) continue;
    const n = Number(out[key]);
    if (Number.isFinite(n) && n >= 1 && n <= 32) {
      out[key] = key === 'minTreadDepth' ? Math.floor(n) : Math.ceil(n);
    } else delete out[key];
  }

  const usedOnly = [
    'minTreadDepth',
    'maxTreadDepth',
    'minRemainingLife',
    'maxRemainingLife',
    'patched',
  ] as const;
  const hasUsed = usedOnly.some(key => out[key] !== undefined);
  if (out.condition === 'new') {
    for (const key of usedOnly) delete out[key];
  } else if (hasUsed) {
    out.condition = 'used';
  }

  return out;
}
