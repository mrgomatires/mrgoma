# Plan — Every deploy is built from scratch

> Feature: `062-turbopack-build-cache-off` · Based on: [spec.md](./spec.md) · Created: 2026-11-23

## Technical approach

One setting, one guard, one written check.

1. **Turn off Turbopack's build cache** in `next.config.mjs`:
   `experimental.turbopackFileSystemCacheForBuild: false`.
   - Next 16.3 turns it on by default. It keeps its work in `.next/cache/turbopack`,
     which is exactly the folder Vercel restores before each build.
   - Next reads the flag in `node_modules/next/dist/build/turbopack-build/impl.js`
     as `persistentCaching = config.experimental?.turbopackFileSystemCacheForBuild || false`.
     With `false`, the build neither reads nor writes that folder.
   - `turbopackFileSystemCacheForDev` is a separate flag with its own folder
     (`.next/dev/cache/turbopack`). It is not touched (FR2).
   - The Next docs name this switch for this case: "Set either option to `false` to
     opt out" (`node_modules/next/dist/docs/…/turbopackFileSystemCache.md`).
   - The setting lives in the repo, so it applies to production, preview and
     local builds alike (FR1). Nothing changes in Vercel's settings.
2. **A guard test** (`src/turbopackBuildCache.guard.test.ts`), the same kind as
   `src/htmlLimitedBots.guard.test.ts`. It imports `next.config.mjs` and reads
   Next's own files from `node_modules`. It fails when:
   - the flag is missing or not strictly `false` (AC5);
   - the dev flag has been turned off as a side effect (FR2);
   - the installed Next no longer knows the flag (AC6). The test checks that
     `config-schema.js` still declares `turbopackFileSystemCacheForBuild` and that
     `turbopack-build/impl.js` still reads it. A rename then fails the test rather
     than leaving a setting that does nothing.

   Every failure message names 062 and the 22 Nov incident.
3. **A "Post-deploy check" section** in `spec/tech-stack.md`, right after the
   Definition of Done (FR5). It covers:
   - how to find the published stylesheet from the browser;
   - one marker rule per UI feature in the release, with today's list;
   - opening each new screen for real;
   - that a "Restored build cache" line in Vercel's log is expected.
4. **Evidence**, recorded in `results.md`:
   - **Local reproduction (AC1/AC2):** build, add a marker rule to `globals.css`,
     delete `.next` except `.next/cache`, build again, and grep the CSS chunks for
     the marker. Do this once with the cache on (today's setting) and once with it
     off. Revert the marker afterwards.
   - **Vercel time (AC7):** compare the deploy duration before and after.
   - **Published CSS (AC3):** check the stylesheet this feature's deploy serves.

## Feature checklist

- **modern-web-guidance / responsive:** N/A — no interface changes.
- **Security:** no env vars, secrets or Vercel settings touched; the guard reads
  only local files. Production checks are browse-only.
- **SEO / GA4:** N/A — no page, metadata or event changes (AC9 proves the pages
  ship identical).

## Reuse first

- **Guard pattern:** `src/htmlLimitedBots.guard.test.ts` imports `next.config.mjs`
  and reads a Next file from `node_modules`, so it already fails on a Next upgrade
  that changes a default. The new guard copies that shape.
- **Commented config:** `next.config.mjs` already explains its non-obvious settings
  with dated, feature-numbered comments (for example the `inlineCss` note from 056).
  The new flag gets the same kind of comment (FR4).
- **Docs placement:** `spec/tech-stack.md` already holds the DoD, the perf budget
  and the dashboard-on-a-production-build note. The post-deploy check sits next
  to them.
- **Builds and gates:** `npm run build`, `npm run perf:budget` and `npm run a11y`
  are unchanged. They prove AC9.
- **Vercel:** the deploy lookups for AC7 use the MCP with the known IDs: team
  `team_ASmPq5S27VGh7Y7jny70bjw3`, project `prj_kUnlh7QTPAgU7y9YntyUO3JMfsi1`.

## Files to add / change

- `next.config.mjs` — add `experimental: { turbopackFileSystemCacheForBuild: false }`
  with a comment covering:
  - what happened on 22 Nov: deploy of `69a02f5`, `globals.css` from 048;
  - why it is off;
  - "re-check when upgrading Next";
  - a pointer to `spec/features/062-…`.
- `src/turbopackBuildCache.guard.test.ts` — new guard (AC5, AC6, FR2).
- `spec/tech-stack.md` — new `### Post-deploy check` section after the DoD (FR5).
  The **Performance budget** paragraph gets one line saying production builds start
  cold since 062.
- `spec/features/062-turbopack-build-cache-off/results.md` — the evidence:
  - the local reproduction, on and off;
  - build times, local and Vercel;
  - the post-deploy check run on this deploy;
  - CSS and JS sizes before and after.
- `spec/roadmap.md`:
  - add 062 to the Backlog as a deploy-reliability item;
  - mark 060 and 061 ✅, which is pending from memory;
  - move 048 to ✅ if it is still 🟡.

No app code changes. Nothing a shopper or seller sees changes (FR6).

## Data & flow

- There are no API, database, route or client-state changes.
- **Build flow:**
  - Before: Vercel restores `.next/cache` → Turbopack reuses
    `.next/cache/turbopack` → JS is rebuilt, `globals.css` is not (the incident).
  - After: Vercel restores `.next/cache`, including any stale `turbopack/` folder
    → Turbopack ignores it → everything is compiled from the commit.
  - Vercel's other caches (`node_modules`, `.next/cache/images`, `fetch-cache`)
    are still used.
- **Stale folder:** the old `.next/cache/turbopack` (~600 MB locally) is still
  restored, but Next never reads or rewrites it.
  - Recommendation for the owner: make the **first deploy of 062 with "Use existing
    Build Cache" unticked**. Vercel then saves a cache without that folder, and
    later deploys don't spend time restoring it.
  - This is an owner action in Vercel, not a code change (spec: no dashboard
    changes without approval).

## Acceptance criteria → implementation

| AC  | How it's met | How it's verified/tested |
| --- | ------------ | ------------------------ |
| AC1 | The flag is off, so the second build compiles `globals.css` from the commit | Local: build → add marker `.__062-marker{}` to `globals.css` → `rm -rf` everything in `.next` except `cache` → build → `grep -l __062-marker .next/static/chunks/*.css` finds it. Marker reverted afterwards |
| AC2 | — (evidence) | Same sequence with the flag removed (today's setting); record whether the marker is missing (reproduced) or present (not reproduced). Either result goes in `results.md` |
| AC3 | The flag ships in the deployed commit | After the owner deploys: the deployment's commit contains the flag. From the browser, the published CSS contains `.compare-dialog` and `.quick-chips` (post-deploy check) |
| AC4 | Dev flag untouched | Run `next dev` twice; the second start's first page compiles faster than a start with `.next` removed, and `.next/dev/cache/turbopack` exists. Times recorded |
| AC5 | Guard test | `src/turbopackBuildCache.guard.test.ts`: `experimental.turbopackFileSystemCacheForBuild` is `false`. Checked once by flipping it to `true` locally: the test fails with the 062 message |
| AC6 | Guard test | The same file asserts that Next's `config-schema.js` and `turbopack-build/impl.js` still contain `turbopackFileSystemCacheForBuild` |
| AC7 | — (measure) | Baseline from Vercel (`buildingAt` → `ready`): cached deploy `dpl_4eVs…` **67 s**; full no-cache redeploy `dpl_H4t1…` **80 s**. After: 062's deploy duration from the same API. Must be < 5 min |
| AC8 | New tech-stack section | It exists; followed on 062's deploy and the outcome is in `results.md` |
| AC9 | No app code touched | `tsc`, `lint`, `test`, `build`, `perf:budget`, `a11y` green. `perf:budget` totals compared before and after (± noise) |

## Tradeoffs / alternatives

- **Chosen: turn the Turbopack build cache off in the repo.**
  - Small, versioned, and applies to every environment. Its guard runs in the DoD.
  - Cost: about +13 s per deploy (80 s vs 67 s measured), probably less, because
    Vercel's other caches stay on.
- **Rejected: untick "Use existing Build Cache" on every deploy.**
  - That was the manual fix. It depends on memory and git pushes don't offer the
    checkbox.
  - It also drops the useful caches (`node_modules`, images).
- **Rejected: a Vercel env var such as `VERCEL_FORCE_NO_BUILD_CACHE=1`.**
  - It also drops every cache, and it would be a dashboard change that lives
    outside git.
- **Rejected: delete `.next/cache/turbopack` in a `prebuild` script.**
  - The same effect with more moving parts, and Next would still spend time
    writing a cache that is thrown away. The docs recommend the flag.
- **Rejected: upgrade Next to see if it's fixed.** Out of scope, there is no known
  fixed version, and it is riskier.
- **Rejected: a post-deploy script.** The owner chose a written section only.

## Risks

- **The local reproduction fails (AC2).** The bug might depend on Vercel's
  environment (paths, timestamps of restored files). The owner already decided:
  record it and close on AC3.
- **Build time on Vercel grows more than measured.** The 80 s baseline is far
  below the 5 min limit. If it went over, work stops and the owner decides (AC7).
- **Experimental flag warning.** Next lists experimental options in the build
  output ("Experiments (use with caution)"). This is cosmetic and is noted in
  `results.md`.
- **Next renames or removes the flag.** The AC6 guard fails on the upgrade PR.
- **Local builds get slower too**, because `npm run build` also starts cold. This
  is accepted: local builds then show what Vercel builds.
- **Local reproduction takes time and needs the DB**: the build does data fetches,
  as in the 009 notes. Use the normal local `.env`. No writes.

## Out of scope

- Monitoring or alerts after a deploy, and a post-deploy script (spec).
- Reporting upstream to Next.js/Vercel (owner decision). The comment says to
  re-check on upgrade.
- Changing Vercel project settings. The "first deploy without build cache" is a
  recommendation for the owner.
- Splitting `globals.css` or moving its rules to Tailwind.

---

_The concrete steps live in [tasks.md](./tasks.md)._
