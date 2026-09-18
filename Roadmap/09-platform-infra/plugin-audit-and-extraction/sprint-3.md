# Plugin audit + medusa extraction — Sprint 3: Tier-2 behind a config seam

**Status:** 🟦 In review

**Epic:** [Plugin audit + medusa extraction](README.md) · **Risk: LOW**

**Wave 3 of 3 — and the first thing to drop** if the appetite runs out. Sprints 1 and 2 carry the
epic; this one is upside.

**One story here is not optional if the others ship: 3.3.** Porting medusa's scripts into the template
while `golden-beans` keeps its own forks creates a **third** copy — the exact outcome this epic exists
to prevent.

## Stories

### Story 3.1 — `prod-smoke` and `smoke-triage-scope` behind a config seam
**As a** spawned project, **I want** the production watchdog and the autonomy-boundary check,
**so that** a routine can be trusted to act without a human in the loop.
**Acceptance:** both land in `template/scripts/` with their assertions in config, not in source.
`prod-smoke.mjs`'s header lesson is kept: the routine predated a committed file, carried its
assertions only in a cloud prompt in one person's account, and **cost twice** because no epic could
ever update it. Per **D4**, `smoke-triage-scope.mjs`'s thresholds are **required from config and fail
closed when absent** — a template-ised default here produces a routine that merges things it
shouldn't, which is the worst failure mode in this epic.
**Risk:** low

### Story 3.2 — `merge-report` + its hooks, `vercel-env`, `perf-probe`
**As a** spawned project, **I want** the remaining Tier-2 rails,
**so that** the lessons they encode don't have to be relearned.
**Acceptance:** `merge-report.mjs` plus `post-merge`/`post-checkout` land with their doctrine intact —
**backgrounded and always-true** (a prose report must never slow or fail a git operation), the
once-per-commit guard owned by the script's state file so a deliberately noisy hook cannot produce a
noisy channel, and the **accepted** gap stated plainly (a hook fires only on the machine that pulls,
so a squash-merge nobody pulled is never reported). `vercel-env.mjs` carries the gotcha that earned
it: the Vercel CLI **silently stores empty values** and `vercel env pull` redacts them, so the REST
API is the only reliable path. `perf-probe.mjs` keeps its `node:https` rationale — fetch and
Playwright transparently decompress, so byte counts must come from the raw transfer.
**Risk:** low

### Story 3.3 — Migrate `golden-beans` onto the ported scripts
**As the** maintainer, **I want** one implementation per rail across the workspace,
**so that** this epic reduces duplication instead of increasing it.
**Acceptance:** per **D5**, `golden-beans`' own forks — `standup-report.mjs`, `pod-report.mjs`,
`commit-report.mjs`, `report-main-daemon.mjs` — are either migrated onto the ported template scripts
or explicitly documented as deliberately divergent, **with a reason**, in golden-beans' own docs. A
grep shows no rail with three implementations. **This lands in the same wave as the ports it
consumes** — otherwise the third copy exists in the interim and someone builds on it.
**Risk:** low

## Sprint QA
- **api spec(s):** ported tests (`prod-smoke.test.mjs`, `smoke-triage-scope.test.mjs`,
  `merge-report.test.mjs`, `perf-probe.test.mjs`) pass in the template. A new test asserts
  `smoke-triage-scope` **refuses to authorize a merge when its config is absent** (fail-closed, D4).
- **browser smoke owed:** no.
- **deterministic gate:** `node --test 'scripts/*.test.mjs'` + `check-skill-scripts.mjs` +
  `check-plugin-leaks.mjs` green before merge.

## Sprint 3 — Smoke walkthrough (do these in order)
Env: local · a spawned project, plus `golden-beans`

1. Run `node scripts/prod-smoke.mjs` with the config filled.
   → It runs your project's assertions. They are readable in a committed file, not in a prompt.
2. Delete the config and run `node scripts/smoke-triage-scope.mjs` against any diff.
   → It **refuses to authorize** the merge rather than falling back to a default. *(Restore the config.)*
3. Pull a branch with new commits in a spawned project.
   → The merge report fires in the background. The `git pull` itself is not slowed and does not fail.
4. Pull again with nothing new.
   → Nothing is posted. The once-per-commit guard held despite the hook firing.
5. Run `node scripts/vercel-env.mjs` to set and then verify a non-secret var.
   → The value is read back correctly via the REST API — not reported as empty.
6. Run `node scripts/perf-probe.mjs` against a live URL.
   → Byte counts reflect the raw transfer, not a decompressed body.
7. In `golden-beans`, run `git grep -ln "standup\|pod-report\|commit-report" scripts/`.
   → Either the forks are gone, or each survivor carries a written divergence reason.
8. Grep the workspace for any rail with three implementations.
   → None.

If any step fails, note the step number + what you saw — that's the bug report.

**Step 2 is the one that matters.** An autonomy-boundary check that silently defaults is a routine
merging code nobody authorized.

## Sprint 3 — Smoke walkthrough results (2026-09-18)

Run by the building agent in a freshly spawned project and in both consuming projects, on live data. None
skipped. Two are partial, and each says why.

1. **prod-smoke runs the project's committed checks.** With no `prod-smoke.checks.mjs` it exits **2**
   ("no assertions to run"), never 0. Against a live example-app server it gives `PASSED 2/2`. With the
   identity marker swapped for one that isn't on the page, it gives
   `❌ home page (/) — body is missing the marker`. In the origin, `prod-smoke` against production gave
   8/8 pass either way (old script vs the template engine plus its checks module). **Found running it:**
   a top-level `await main()` deadlocked against the checks module importing the engine (exit 13). Fixed
   and explained in the source.
2. **No policy → the merge gate refuses.** `UNDECIDABLE — …/smoke-triage.config.json not found — the merge
   gate has no policy, so it cannot allow anything`, exit **2**, before any GitHub call (pinned by a
   test). With the example policy, a real PR touching app code gives `BLOCK`, exit 1. In the origin, the
   gate BLOCKs `miyagisanchezcommerce#422` with the same 2 blockers either way.
3. **Pull with new commits → the merge report fires in the background.** `git pull` returned in
   **0.24s**. The report drafted afterwards: devin refused an untrusted directory → agy fallback → the guard
   revised a draft, then printed it because no chat is configured. **Changed on the way:** with no chat
   configured the rail now stops *before* drafting. The template ships unconfigured, and `post-checkout`
   fires on every branch switch.
4. **Pull again with nothing new → nothing posted.** Two checkouts produced zero drafts. **Partial:** the
   once-per-commit guard *with a configured chat* was not exercised end to end, because that means posting
   test messages into a live channel. It is pinned by `commitsToReport`'s tests, and the origin runs this
   exact rail live.
5. **vercel-env reads back via the REST API.** **Partial:** `verify NEXT_PUBLIC_SITE_URL` against the
   origin's real Vercel project returned the entry and its targets, and honestly reported the length as
   unavailable, because the entry is Vercel's *sensitive* type. `set` was not run against a live
   production project.
6. **perf-probe byte counts are the raw transfer.** Against a live public site, `home | present | 15491 B`
   (compressed HTML on the wire). **Found running it:** a no-flags CLI run wiped the config's `baseUrl`.
   Fixed and pinned.
7. **golden-beans' forks.** Each survivor carries a written reason in golden-beans' `scripts/README.md`:
   `standup-report`, the commit-report / report-new-commits / report-main-daemon merge rail (golden-beans
   is its *origin*), `pod-report` (a product artifact) and `cross-agent-cli` (the review rail's own fork).
   **The prose rail migrated:** golden-beans runs the template's prose writer and guard (459/459 of its
   tests unchanged).
8. **No rail with three implementations.** For every rail this epic touched, the workspace now has one
   implementation (template = origin = golden-beans' copy) plus, at most, one *documented* divergent
   sibling. `check-skill-scripts --repo-root` gives **10/10 ok** for golden-beans (was 9 needing
   attention) and for the origin.

**Same wave:** danybgoode/miyagi-product-management (origin, equivalence verified per rail) and
danybgoode/golden-beans (prose migration, skill scripts, 41 doc-format findings fixed as real drift).
