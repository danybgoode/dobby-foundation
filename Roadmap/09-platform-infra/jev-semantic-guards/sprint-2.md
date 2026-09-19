# Jev semantic guards — Sprint 2: Review guard on Jev (shadow, marker, backtest)

**Status:** ⬜ not started

> Touches `securityPaths` (`scripts/cross-review.mjs`, `scripts/lib/review-guard.mjs`) — the security lens runs on this PR.

## Stories

### Story 2.1 — `judgeReviewOutput()` in `review-guard.mjs`
**As the** review rail, **I want** an async judge that asks Jev `is_real_review` (Noul) and `severity` (Choice: blocking / should_fix / nit / clean) and decides by mode, **so that** a real prose review passes and a banner that merely looks structured fails.
**Acceptance:** `assertReviewOutput` is byte-unchanged and every existing review-guard spec passes; `mode:off` ⇒ regex result; `shadow` ⇒ regex decides, both logged; `jev` ⇒ Jev decides at `noul ≥ 0.85` (real) / `≤ 0.15` (not), regex decides in between or on could-not-look; the returned `reason` names the decider.
**Risk:** high

### Story 2.2 — Wire `cross-review.mjs` + the PR marker
**As the** product owner, **I want** each posted cross-review comment to carry a hidden `<!-- jev:{…} -->` marker, **so that** shadow verdicts from cloud routines survive and can be harvested with `gh api`.
**Acceptance:** the call site at `cross-review.mjs:429` becomes one `await judgeReviewOutput(...)`; marker holds `{mode, decider, noul, severity, model}` and never the reply text; a rejected run logs locally (it posts no comment); `--dry-run` prints the marker.
**Risk:** high

### Story 2.3 — Backtest (`scripts/jev-backtest.mjs`)
**As the** product owner, **I want** Jev replayed over historical cross-review comments across the three repos, **so that** there is evidence before live traffic accrues.
**Acceptance:** `node scripts/jev-backtest.mjs --repo <owner/name>...` harvests review comments, strips the header/marker, scores each, and writes a disagreement table (regex vs Jev) to `.jev/backtest-<date>.md`; notes that the corpus holds only replies the regex ACCEPTED (so it can find false passes, not false fails).
**Risk:** high

## Sprint QA
- **specs:** `node --test` beside each new module — Jev is injected (`fetch` stub), CI never calls the network
- **browser smoke owed:** no — no UI
- **deterministic gate:** `node --test template/scripts` + `node scripts/check-skill-scripts.mjs` + `node scripts/check-plugin-leaks.mjs` green before merge

## Sprint 2 — Smoke walkthrough (do these in order)
Env: a local checkout of the repo named in each step, with `TYPESAFE_API_KEY` in `.env.local`.

1. In a consumer checkout, set `rails.review.mode: shadow`, run `node scripts/cross-review.mjs <PR#> --dry-run`
   → the printed comment ends with a `<!-- jev:` marker; stderr says `decided by regex (shadow)`.
2. Run `tail -1 .jev/decisions.jsonl`
   → one line with `rail:"review"` and both verdicts.
3. Set `mode: jev`, re-run step 1
   → stderr says `decided by jev (0.9x)`.
4. Run `node scripts/jev-backtest.mjs --repo <owner/name>`
   → a `.jev/backtest-*.md` table with at least one row.

If any step fails, note the step number + what you saw — that's the bug report.
