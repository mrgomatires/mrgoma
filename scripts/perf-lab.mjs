// Performance lab (feature 055): `npm run perf:lab`, after `npm run build`.
//
// Lighthouse (performance only) on the key pages of the local production
// build, N runs per page and form factor, reporting medians of LCP, TBT, CLS,
// FCP and TTFB plus what explains them: the LCP element, the scripts behind the
// longest tasks and the elements that shift. Lab data on one machine — compare
// runs made back to back, never against field data.
//
// Usage:
//   node scripts/perf-lab.mjs                       # 5 runs, all pages, both form factors
//   node scripts/perf-lab.mjs --runs 3 --page home  # quick check between changes
//   node scripts/perf-lab.mjs --out spec/features/055-…/baseline.json

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { freePort, pickPages, startServer, withLighthouse } from './lab.mjs';

/** Median of numbers (ignores nulls). Pure. */
export function median(values) {
  const v = values.filter(x => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/** The numbers and the explanations one Lighthouse report holds. Pure. */
export function summarise(lhr) {
  const a = lhr.audits;
  const num = id => a[id]?.numericValue ?? null;
  // Lighthouse 13 names the LCP element inside its insights; older versions in
  // `largest-contentful-paint-element`.
  const discovery = a['lcp-discovery-insight']?.details?.items ?? [];
  const lcpNode =
    discovery.find(i => i.type === 'node') ??
    (a['lcp-breakdown-insight']?.details?.items ?? []).find(i => i.type === 'node') ??
    a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node;
  const checklist = discovery.find(i => i.type === 'checklist')?.items ?? {};
  const lcpChecks = Object.fromEntries(Object.entries(checklist).map(([k, v]) => [k, v.value]));
  const longTasks = (a['long-tasks']?.details?.items ?? []).slice(0, 5).map(t => ({
    url: String(t.url ?? '').replace(/^https?:\/\/[^/]+/, ''),
    ms: Math.round(t.duration),
  }));
  const shifts = (a['layout-shifts']?.details?.items ?? []).slice(0, 5).map(s => ({
    node: s.node?.snippet?.slice(0, 120) ?? '',
    score: Number((s.score ?? 0).toFixed(4)),
  }));
  return {
    lcp: num('largest-contentful-paint'),
    tbt: num('total-blocking-time'),
    cls: num('cumulative-layout-shift'),
    fcp: num('first-contentful-paint'),
    ttfb: num('server-response-time'),
    score: Math.round((lhr.categories.performance?.score ?? 0) * 100),
    lcpElement: lcpNode?.snippet?.slice(0, 160) ?? null,
    lcpChecks,
    longTasks,
    shifts,
  };
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

const KEY_PAGES = ['home', 'tires', 'tire', 'store', 'checkout'];

async function main() {
  const runs = Number(arg('runs', '5'));
  const only = arg('page', null);
  const out = arg('out', null);
  const forms = (arg('form', 'mobile,desktop') || '').split(',');

  const server = await startServer(await freePort());
  const report = { date: new Date().toISOString(), runs, pages: {} };
  try {
    const all = pickPages(await (await fetch(server.origin + '/sitemap.xml')).text());
    const pages = Object.fromEntries(
      Object.entries(all).filter(([k]) => (only ? k === only : KEY_PAGES.includes(k)))
    );
    // One warm-up per page: the first request after a start pays cold caches.
    for (const path of Object.values(pages)) await fetch(server.origin + path).catch(() => {});
    await withLighthouse(async run => {
      for (const [key, path] of Object.entries(pages)) {
        for (const formFactor of forms) {
          const samples = [];
          for (let i = 0; i < runs; i++) {
            samples.push(
              summarise(
                await run(server.origin + path, { formFactor, categories: ['performance'] })
              )
            );
          }
          const m = k => median(samples.map(s => s[k]));
          const last = samples[samples.length - 1];
          const row = {
            path,
            lcp: m('lcp'),
            tbt: m('tbt'),
            cls: m('cls'),
            fcp: m('fcp'),
            ttfb: m('ttfb'),
            score: m('score'),
            lcpElement: last.lcpElement,
            lcpChecks: last.lcpChecks,
            longTasks: last.longTasks,
            shifts: last.shifts,
          };
          (report.pages[key] ??= {})[formFactor] = row;
          console.log(
            `${key.padEnd(8)} ${formFactor.padEnd(7)} P${String(row.score).padStart(3)}  LCP ${(row.lcp / 1000).toFixed(2)}s  TBT ${Math.round(row.tbt)}ms  CLS ${row.cls.toFixed(3)}  FCP ${(row.fcp / 1000).toFixed(2)}s  TTFB ${Math.round(row.ttfb)}ms`
          );
        }
      }
    });
  } finally {
    server.stop();
  }
  if (out) {
    writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
    console.log(`\nWritten to ${out}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => {
    console.error(e);
    process.exit(1);
  });
}
