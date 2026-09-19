# Jev semantic guards — Sprint 4: Rollout to both consumers

**Status:** ⬜ not started

> Cross-repo. The review rail is forked in three repos (seed `review-rail-one-implementation`) — this sprint hand-patches each fork's single call site; it does not unify them.

## Stories

### Story 4.1 — Adopt in medusa-bonsai
**As the** product owner, **I want** the Jev files and the patched call sites in medusa-bonsai with `mode: shadow`, **so that** it produces live shadow traffic.
**Acceptance:** the consumer's OLD review-guard and prose-guard tests (from `origin/main`) run green against the new files; every copied file `cmp`-identical to the template; the one-line `cross-review.mjs` patch recorded in its `scripts/README.md` fork notes; `shadowExpires` set.
**Risk:** high

### Story 4.2 — Adopt in golden-beans
**As the** product owner, **I want** the same in golden-beans, **so that** both consumers feed the log.
**Acceptance:** same checks as 4.1 in golden-beans.
**Risk:** high

### Story 4.3 — Routine key + shadow on
**As the** product owner, **I want** routines that post reviews or reports to have the key, **so that** cloud runs are measured too.
**Acceptance:** which routines need `TYPESAFE_API_KEY` is listed in each consumer's routines README; provisioning the secret is **owed to the product owner** (account step); a routine without it logs `could-not-look` and behaves as today.
**Risk:** high

## Sprint QA
- **specs:** `node --test` beside each new module — Jev is injected (`fetch` stub), CI never calls the network
- **browser smoke owed:** no — no UI
- **deterministic gate:** `node --test template/scripts` + `node scripts/check-skill-scripts.mjs` + `node scripts/check-plugin-leaks.mjs` green before merge

## Sprint 4 — Smoke walkthrough (do these in order)
Env: a local checkout of the repo named in each step, with `TYPESAFE_API_KEY` in `.env.local`.

1. In medusa-bonsai, open the next PR and run the routed cross-review
   → the posted comment carries a `<!-- jev:` marker.
2. In golden-beans, run its standup in dry-run
   → `.jev/decisions.jsonl` gains `rail:"prose"` lines.
3. (owed to the product owner) add `TYPESAFE_API_KEY` to each routine listed in the routines README, then wait for the next nightly
   → the routine's PR comment carries a marker.

If any step fails, note the step number + what you saw — that's the bug report.
