# Results — Every deploy is built from scratch

> Feature: `062-turbopack-build-cache-off` · Measured: 2026-11-23 · Next 16.3.0 ·
> local machine (macOS, 14 build workers)

## The incident (2026-11-22)

| Deploy | Source | `buildingAt` → `ready` | Stylesheet |
| ------ | ------ | ---------------------- | ---------- |
| `dpl_4eVsqat1ewNtsXU3w1w8y4NDgNwU` | git push of `69a02f5`, Vercel build cache restored | **67 s** | `globals.css` from 048 — comparison window unstyled |
| `dpl_H4t1dPnxYmQhmjsBafG3J8TUQ8Pr` | owner's Redeploy **without** build cache | **80 s** | correct (124 KB, every rule) |

Durations come from the Vercel API (`buildingAt` and `ready` of each
deployment). A build with no cache at all cost 13 s more, far below the 5 min
limit (AC7).

## Local reproduction

The same sequence was used each time:

1. Run a build.
2. Append `.__062-marker{color:red}` to `src/app/globals.css`.
3. Delete everything in `.next` except `cache` (what Vercel restores).
4. Build again.
5. Look for the marker in `.next/static/chunks/*.css`.
6. Revert the marker. `git diff src/app/globals.css` is empty afterwards.

| Run | Turbopack build cache | `.next/cache/turbopack` | Compile | Whole `npm run build` | Marker in CSS |
| --- | --------------------- | ----------------------- | ------- | --------------------- | ------------- |
| T1 clean build | on (today) | written, 150 MB | 3.6 s | 23.9 s | — |
| T2 rebuild after the change | on (today) | reused | 0.9 s | 18.4 s | **yes** — `0q6gr_monm3n1.css` |
| T6 clean build | **off** | **not created** | 2.8 s | 22.6 s | — |
| T6 rebuild after the change | **off** | **not created** | 2.7 s | 20.9 s | **yes** — `0q6gr_monm3n1.css` |

- **AC2: not reproduced locally.** With the cache on, a single change to
  `globals.css` did reach the CSS. The Vercel failure needs something local
  doesn't have, such as a fresh clone, a cache from another release (048 → 061
  spanned 13 merges) or Vercel's restore. As the owner decided (2026-11-23), the
  feature closes on the deploy evidence (AC3). The fix stands regardless: with
  the option off, Turbopack has no build cache to reuse.
- **AC1 met.** With the option off, the second build compiled the change, and
  `.next/cache` held only `fetch-cache`. Nothing was written, so nothing can be
  restored next time.
- **Cost of the change, locally:**
  - A rebuild goes from 0.9 s to 2.7 s of compile, about 2.5 s on the whole
    build.
  - A clean build is the same (3.6 s vs 2.8 s compile, which is noise).
- **Build output:** it now lists `- Experiments (use with caution): ⨯
  turbopackFileSystemCacheForBuild`. That is cosmetic: the ⨯ means "turned off".

## `next dev` keeps its cache (AC4)

Request: `GET /tires`, first hit after the server is ready. The first start was
from an empty `.next`; the second was a restart that kept `.next`.

| Start | `.next/dev/cache/turbopack` | Next.js time (compile) | Total |
| ----- | --------------------------- | ---------------------- | ----- |
| First (empty `.next`) | created, 91 MB | 1458 ms | 3.7 s |
| Second (restart) | reused | **149 ms** | 2.8 s |

The dev option is untouched, and the guard checks that it is not turned off.

## What ships is unchanged (AC9, FR6)

`npm run perf:budget` after a clean build:

| | Before (T1, cache on) | After (T8, cache off) |
| --- | --- | --- |
| sharedFirstLoadJs | 165.9 KB | 165.9 KB |
| totalClientJs | 696.5 KB | 696.5 KB |
| shopperPageJs | 215.1 KB | 215.1 KB |
| CSS chunks | `2jtcg82k7-jlp.css` 127 015 B · `32vb43e1k7_dl.css` 2 111 B | identical names and sizes |

`.compare-dialog` and `.quick-chips` are both in `2jtcg82k7-jlp.css`. Same file
names means byte-identical content, so browsers keep their cached copies too.

## Guard (AC5, AC6)

`src/turbopackBuildCache.guard.test.ts` checks four things:

- the build option is `false`;
- the dev option is not `false`;
- Next's `config-schema.js` still validates the option;
- Next's `turbopack-build/impl.js` still reads it into `persistentCaching`.

How it was tested:

- **Written first (T3):** it failed only on the first check before
  `next.config.mjs` was changed.
- **Flipped (T5):** set to `true`, then deleted. Both failed with "062: Turbopack
  build cache must stay off — on 22 Nov 2026 a cached Vercel build shipped a
  stale globals.css". Restored afterwards.

## Pending the deploy (👤 owner)

- [ ] **T12:** deploy 062 to production. On this first deploy, untick **"Use
      existing Build Cache"**. That saves a Vercel cache without the stale
      `.next/cache/turbopack` (~150–600 MB). Next would ignore that folder
      anyway, but it is still restored and uploaded on every deploy.
- [ ] **T13 (AC3, AC8):** run the post-deploy check (`spec/tech-stack.md` →
      *Post-deploy check*):
      - the commit contains the option;
      - the published CSS has `.compare-dialog` and `.quick-chips`;
      - the comparison window and the size picker have been opened.
- [ ] **T14 (AC7):** record `buildingAt` → `ready` for the 062 deploy and for the
      next ordinary deploy. Both must be < 5 min. Expected: ≤ ~80 s.

## Acceptance criteria

| AC | Status | Evidence |
| -- | ------ | -------- |
| AC1 | ✅ | T6: marker compiled; no Turbopack cache written |
| AC2 | ✅ recorded | T2: **not reproduced locally**; closing on AC3 (owner's decision) |
| AC3 | ⏳ pending deploy | T13 |
| AC4 | ✅ | dev restart 1458 → 149 ms |
| AC5 | ✅ | guard fails with the setting flipped or deleted |
| AC6 | ✅ | guard checks Next's schema and build code for the option |
| AC7 | ⏳ pending deploy | baseline 67 s / 80 s; T14 |
| AC8 | ⏳ pending deploy | section written in `tech-stack.md`; to be run in T13 |
| AC9 | ✅ | JS and CSS identical; DoD below |
