// Accessibility gate (feature 055): `npm run a11y`, after `npm run build`.
//
// Starts the production build locally and runs Lighthouse (accessibility only)
// on the key pages, mobile and desktop. Fails on any failing accessibility
// audit — contrast, target size, label in name, duplicate ids, heading order
// and the rest — unless an allow-list entry names that audit and page with a
// written reason. The allow-list is printed on every run so an exemption can
// never hide quietly. A local pre-deploy gate like `perf:budget`, not CI.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { freePort, pickPages, startServer, withLighthouse } from './lab.mjs';

/** Exemptions: `{ audit, page, reason }`; `page` is a key of `pickPages` or `*`. */
export const ALLOWLIST_PATH = new URL('./a11y-allowlist.json', import.meta.url);

/** The audits that failed in one Lighthouse report (score < 1, binary/numeric, applicable). */
export function failingAudits(lhr) {
  const refs = lhr.categories.accessibility?.auditRefs ?? [];
  return refs
    .map(ref => lhr.audits[ref.id])
    .filter(a => a && a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'manual')
    .map(a => ({
      id: a.id,
      title: a.title,
      items: (a.details?.items ?? [])
        .slice(0, 3)
        .map(i => i.node?.snippet?.slice(0, 120) ?? '')
        .filter(Boolean),
    }));
}

/** Failures left after the allow-list for one page. Pure. */
export function unexcused(failures, pageKey, allowlist) {
  return failures.filter(
    f => !allowlist.some(e => e.audit === f.id && (e.page === pageKey || e.page === '*'))
  );
}

async function main() {
  const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
  for (const e of allowlist) {
    if (!e.audit || !e.page || !e.reason)
      throw new Error(`Allow-list entry needs audit, page and reason: ${JSON.stringify(e)}`);
  }
  if (allowlist.length) {
    console.log('Allow-listed (each with its reason):');
    for (const e of allowlist) console.log(`  - ${e.audit} on ${e.page}: ${e.reason}`);
  }

  const server = await startServer(await freePort());
  let failed = 0;
  try {
    const pages = pickPages(await (await fetch(server.origin + '/sitemap.xml')).text());
    await withLighthouse(async run => {
      for (const [key, path] of Object.entries(pages)) {
        for (const formFactor of ['mobile', 'desktop']) {
          const lhr = await run(server.origin + path, {
            formFactor,
            categories: ['accessibility'],
          });
          const score = Math.round((lhr.categories.accessibility.score ?? 0) * 100);
          const left = unexcused(failingAudits(lhr), key, allowlist);
          const mark = left.length ? '✗' : '✓';
          console.log(
            `${mark} ${key.padEnd(8)} ${formFactor.padEnd(7)} ${String(score).padStart(3)}  ${path}`
          );
          for (const f of left) {
            failed++;
            console.log(`    ✗ ${f.id} — ${f.title}`);
            for (const s of f.items) console.log(`        ${s}`);
          }
        }
      }
    });
  } finally {
    server.stop();
  }
  if (failed) {
    console.error(
      `\n✗ ${failed} accessibility failure(s). Fix them, or allow-list one with a reason.`
    );
    process.exit(1);
  }
  console.log('\n✓ Accessibility gate passed.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => {
    console.error(e);
    process.exit(1);
  });
}
