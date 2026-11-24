# Spec — Every deploy is built from scratch

> Feature: `062-turbopack-build-cache-off` · Status: Clarified · Created: 2026-11-23
> Roadmap: Backlog — deploy reliability (supports every track) · Branch: `feat/062-turbopack-build-cache-off`

## Why — problem & value

On 2026-11-22 features 049–061 went to production in one deploy (commit
`69a02f5`). The site came up and looked right at a glance, but the
**comparison window was broken**: its layout, table and switch had no styles.
The owner caught it by comparing it with the local version.

What happened:

- Vercel keeps the previous build's work and hands it to the next build to make
  it faster. That deploy reported "Restored build cache from previous
  deployment" and compiled in 7.7 s.
- Since Next 16.3, the compiler (Turbopack) also keeps its own work in that
  saved folder by default.
- The result was a mixed build: the new JavaScript and the new utility styles,
  but the **hand-written stylesheet (`globals.css`) from the previous release
  (048)**. Every style rule written in that file since 048 was missing in
  production: compare window, compare table, switch, compare tray, quick size
  chips, the size-picker panel and the search-ready state.
- It was fixed by hand: the owner pressed "Redeploy" with the build cache
  turned off (`dpl_H4t1dPnxYmQhmjsBafG3J8TUQ8Pr`, stylesheet 124 KB with every
  rule).

Why it matters:

- **Nothing warned us.** The build passed, every check was green and the deploy
  was marked "Ready". The only signal was a person noticing the window looked
  wrong.
- **It can happen on any deploy** that changes `globals.css`, which most UI
  features do. The next one might hide a broken checkout step, not just a
  comparison window.
- **Mission fit:** a "trustworthy closing" and a "superior digital experience"
  mean nothing if what we test locally is not what ships. A few extra seconds
  of build time is a cheap price for that.

## User stories

- As the **owner**, I want every production deploy to contain exactly the code
  in the commit, so that what I approved locally is what customers see.
- As the **owner**, I want a normal deploy (push → Vercel) to be safe without
  remembering to untick "use build cache", so that the fix doesn't depend on
  someone's memory.
- As a **shopper**, I want every screen to look and work as designed, so that I
  trust the store with my purchase.
- As a **developer**, I want local development to stay as fast as it is today,
  so that the fix doesn't slow down everyday work.

## Scope

- **In:**
  - Stop the compiler from reusing its saved work from a previous build, for
    production and preview builds alike.
  - A guard that fails if someone turns the saved work back on by accident.
  - A post-deploy check, written as a section of `spec/tech-stack.md` next to
    the Definition of Done (no new script), that confirms the published
    stylesheet contains the rules of what was just shipped.
  - Measure the build time before and after, on Vercel.
  - Record the decision and the evidence in the feature's results.
- **Out:**
  - Local development (`next dev`): it keeps its own saved work, which lives in
    a different folder and was not involved.
  - Vercel's general build cache (installed packages, etc.): only the
    compiler's saved work is turned off.
  - Changing how styles are written or split (`globals.css` stays as is).
  - Upgrading Next.js.
  - Automated monitoring of production after each deploy (alerts, scheduled
    checks) or a post-deploy script.
  - Reporting the bug to Next.js/Vercel: nothing is published outside; the
    setting stays off and the comment says to re-check it when upgrading Next.

## Functional requirements

- **FR1:** A production or preview build (pull requests included) never reuses the compiler's saved
  work from an earlier build; every build compiles all styles and code from the
  commit.
- **FR2:** Local development keeps reusing its saved work exactly as today.
- **FR3:** A test fails if the setting that turns the saved build work off is
  removed or flipped back.
- **FR4:** The setting carries a short comment explaining the 22 Nov incident,
  pointing to this feature and saying to re-check it when Next is upgraded, so
  nobody "optimizes" it away.
- **FR5:** `spec/tech-stack.md` has a "Post-deploy check" section: after each
  production deploy, check that the published stylesheet contains one rule per
  UI feature in that release (for example `.compare-dialog` for the comparison
  window, `.quick-chips` for the quick size chips) and open each new screen for
  real, not just confirm its button exists.
- **FR6:** The change does not alter anything a shopper or seller sees.

## Acceptance criteria (testable)

- [ ] **AC1:** Given a production build has run once, when `globals.css` is
      changed (a harmless marker rule) and the build runs again keeping only
      `.next/cache` — the folder Vercel restores — then the built stylesheet
      contains the marker.
- [ ] **AC2:** The same two builds are tried with today's settings (saved build
      work on), and the results record whether the old stylesheet was reused.
      If it does not reproduce locally, that is recorded too and the feature
      closes on AC3 (owner's decision, 2026-11-23).
- [ ] **AC3:** Given this feature's deploy on Vercel, with Vercel's build cache
      restored as usual (the "Restored build cache" line may still appear), then
      the deployed commit contains the setting and the published stylesheet
      contains `.compare-dialog` and `.quick-chips`.
- [ ] **AC4:** Given `next dev` has run once, when it is restarted, then it
      still reuses its saved work (the second start compiles the first page
      faster than a start from an empty `.next`), as today.
- [ ] **AC5:** Given someone removes the setting or sets it back to on, when the
      tests run, then a test fails with a message that names this feature and
      the 22 Nov incident.
- [ ] **AC6:** Given a Next upgrade renames or drops the setting, when the
      tests run, then the same test fails instead of the setting silently doing
      nothing.
- [ ] **AC7:** The Vercel deploy time is recorded before (last cached deploy,
      `69a02f5`) and after; the full deploy stays **under 5 minutes**. If it
      goes over, work stops and the owner decides.
- [ ] **AC8:** The "Post-deploy check" section (FR5) is in `spec/tech-stack.md`
      and was followed once on this feature's own deploy, with the result in
      `results.md`.
- [ ] **AC9:** `tsc`, `lint`, `test`, `build`, `perf:budget` and `a11y` are
      green, and the shipped JavaScript and CSS of every page are unchanged in
      size (± build noise).

## Non-functional / constraints

- **Build time:** a slower build is accepted; a slower site is not. Page size,
  JavaScript and CSS shipped to shoppers must not change.
- **Cost:** Vercel bills build minutes; the extra time per deploy must be
  measured and reported.
- **No change to production settings in Vercel's dashboard** without the
  owner's approval; the fix lives in the repository so it travels with the
  code.

## Decisions (clarified 2026-11-23)

- **Build time:** any cost is accepted while the full Vercel deploy stays under
  ~5 minutes (AC7).
- **Evidence:** if the incident doesn't reproduce locally, Vercel's deploy plus
  the published stylesheet is enough to close (AC2, AC3).
- **Preview deploys:** also built from scratch — the owner reviews them, so they
  must show the real result (FR1). The setting lives in the repository, so it
  applies to every environment.
- **Post-deploy check:** a section in `spec/tech-stack.md`, no script (FR5).
- **Upstream:** not reported; the setting stays off and is re-checked when Next
  is upgraded (FR4).

## Open questions

None.

---

_The WHAT and WHY only. The HOW lives in [plan.md](./plan.md)._
