# Tasks — Every deploy is built from scratch

> Feature: `062-turbopack-build-cache-off` · Based on: [plan.md](./plan.md) · Created: 2026-11-23

Ordered, **very small, independently verifiable** tasks. Check each off as it is
completed. The tasks that need the owner (deploy, Vercel settings) are marked 👤.

### Baseline (today's settings, before any change)

- [x] **T1** — Record the baseline sizes. Do a clean build (`rm -rf .next`, then
      `npm run build`) and run `npm run perf:budget`.
      · files: `results.md`
      · check: `results.md` has the shared-floor, total and `shopperPageJs` figures,
      the CSS chunk sizes and the local build time with a cold cache.
- [x] **T2** — Reproduce the incident with the cache **on** (AC2):
      1. With the `.next/cache/turbopack` from T1 in place, add the marker
         `.__062-marker{color:red}` at the end of `src/app/globals.css`.
      2. Delete everything in `.next` except `cache`.
      3. Run `npm run build`.
      4. Run `grep -l __062-marker .next/static/chunks/*.css`.
      5. Revert the marker.

      · files: `src/app/globals.css` (temporary), `results.md`
      · check: `results.md` says *reproduced* (marker missing) or *not reproduced*
      (marker present), with the build time and whether the log mentions the
      restored cache. `git diff src/app/globals.css` is empty afterwards.

### Change

- [x] **T3** — Write the guard test first (red).
      · files: `src/turbopackBuildCache.guard.test.ts`
      · The test asserts that:
        - (a) `nextConfig.experimental.turbopackFileSystemCacheForBuild === false`;
        - (b) `turbopackFileSystemCacheForDev` is not `false`;
        - (c) `node_modules/next/dist/server/config-schema.js` declares
          `turbopackFileSystemCacheForBuild`;
        - (d) `node_modules/next/dist/build/turbopack-build/impl.js` reads
          `turbopackFileSystemCacheForBuild`.
      · Every failure message names 062 and the 22 Nov 2026 incident.
      · check: `npx vitest run src/turbopackBuildCache.guard.test.ts` fails only on
      (a) before T4.
- [x] **T4** — Turn the Turbopack build cache off. Add
      `experimental: { turbopackFileSystemCacheForBuild: false }` to
      `next.config.mjs`, next to the `inlineCss` note.
      · files: `next.config.mjs`
      · The comment covers:
        - deploy of `69a02f5`, where `globals.css` came from 048;
        - the manual fix (`dpl_H4t1…`);
        - why the flag is off;
        - re-check it when upgrading Next;
        - a link to `spec/features/062-…`.
      · check: the T3 guard is green, and `npm run build` prints the experiment
      in its "Experiments" list without errors.
- [x] **T5** — Prove the guard bites (AC5). Set the flag to `true` locally, then
      delete the line, and run the guard both times. Restore the line.
      · files: `next.config.mjs` (temporary)
      · check: the guard fails both times with the 062 message, and
      `git diff next.config.mjs` shows only T4's change.

### Evidence with the cache off

- [x] **T6** — Repeat the T2 sequence with the flag **off** (AC1). Run one clean
      build, add the marker, keep only `.next/cache`, build, grep, then revert.
      · files: `src/app/globals.css` (temporary), `results.md`
      · check: the marker is found in a CSS chunk; after the clean build **and**
      the second build, `.next/cache/turbopack` does not exist (nothing written,
      so nothing to read); the build time is recorded; and
      `git diff src/app/globals.css` is empty.
- [x] **T7** — Check that `next dev` keeps its cache (AC4).
      1. Run `rm -rf .next`, start `npm run dev`, open `/`, and record the
         first-page compile time.
      2. Stop the server, but only the process that is listening:
         `lsof -ti tcp:3000 -sTCP:LISTEN`.
      3. Start it again, open `/`, and record the time.

      · files: `results.md`
      · check: `.next/dev/cache/turbopack` exists, and the second compile is
      faster than the first. Both times are in `results.md`.
- [x] **T8** — Check the size of what ships (AC9, FR6). Do a clean build, run
      `npm run perf:budget`, and compare with T1.
      · files: `results.md`
      · check: the JS and CSS figures are equal to T1 (± build noise), and the
      CSS file still contains `.compare-dialog` and `.quick-chips`.

### Docs

- [x] **T9** — Add the `### Post-deploy check` section to `spec/tech-stack.md`,
      right after the Definition of Done (FR5). It covers:
      - how to find the published stylesheet from the browser, since curl gets a
        429 from the firewall;
      - one marker rule per UI feature in the release, with today's list
        (`.compare-dialog`, `.compare-table`, `.quick-chips`,
        `.size-picker-panel`);
      - opening each new screen for real;
      - that "Restored build cache" in Vercel's log is expected;
      - that since 062 production builds start cold.

      Also add one line to the Performance-budget paragraph.
      · files: `spec/tech-stack.md`
      · check: the section reads as a step-by-step list a person can follow
      without this feature's context.
- [x] **T10** — Update the roadmap:
      - add 062 to the Backlog as deploy reliability;
      - mark 060 and 061 ✅ under P1.7;
      - move 048 to ✅ if it is still 🟡.

      · files: `spec/roadmap.md`
      · check: `git diff spec/roadmap.md` shows only those lines.
- [x] **T11** — Write `results.md`:
      - the T1–T8 evidence;
      - the Vercel baseline: `dpl_4eVs…` 67 s cached, `dpl_H4t1…` 80 s with no
        cache, both measured `buildingAt` → `ready`;
      - the owner's step: first 062 deploy with "Use existing Build Cache"
        unticked.

      · files: `spec/features/062-turbopack-build-cache-off/results.md`
      · check: every AC has a line with its evidence or "pending deploy"
      (AC3, AC7, AC8).

### Definition of Done

- [x] **T-DoD** — Run `npx tsc --noEmit`, `npm run lint`, `npm test`,
      `npm run build`, `npm run perf:budget` and `npm run a11y`.
      · check: all green, and nothing changed except `next.config.mjs`, the new
      guard, `spec/tech-stack.md`, `spec/roadmap.md` and the 062 folder. There
      is no UI change, so the manual check is T7, T8 and opening the comparator
      on `npm run start`. Stage the files, but don't commit until the owner
      approves.

### After merge (👤 owner deploys)

- [ ] **T12** — 👤 The owner deploys 062 to production. On this first deploy,
      untick "Use existing Build Cache" (plan § Data & flow).
      · check: the deployment is READY and its commit contains the flag.
- [ ] **T13** — Run the post-deploy check on that deploy (AC3, AC8). From the
      browser, confirm the published CSS contains `.compare-dialog` and
      `.quick-chips`, and open the comparator and the size picker. Browse only:
      no cart, no forms; if the compare tray is used, clean it afterwards.
      · files: `results.md`
      · check: the outcome is recorded.
- [ ] **T14** — Measure the deploy time from Vercel (AC7). Read
      `buildingAt` → `ready` for the 062 deploy, and for the next ordinary
      deploy that keeps Vercel's cache.
      · files: `results.md`
      · check: both durations are recorded and each is < 5 min. The second one
      shows the steady-state cost.

## Traceability

| Task  | Acceptance criteria / requirements |
| ----- | ---------------------------------- |
| T1    | AC9 (baseline)                     |
| T2    | AC2                                |
| T3    | AC5, AC6, FR2, FR3                 |
| T4    | FR1, FR4                           |
| T5    | AC5                                |
| T6    | AC1, FR1                           |
| T7    | AC4, FR2                           |
| T8    | AC9, FR6                           |
| T9    | FR5, AC8                           |
| T10   | — (roadmap upkeep)                 |
| T11   | AC1–AC9 (evidence)                 |
| T-DoD | AC9                                |
| T12   | AC3                                |
| T13   | AC3, AC8                           |
| T14   | AC7                                |
