# Jev semantic guards — Sprint 1: Client, config, decision log and eval harness

**Status:** ⬜ not started

## Stories

### Story 1.1 — Jev client (`template/scripts/lib/jev.mjs`)
**As a** rail author, **I want** one zero-dep function that asks Jev typed questions and returns `{ok, answers, usage}` or `{ok:false, state:"could-not-look", error}`, **so that** no rail ever mistakes "Jev was unreachable" for a verdict.
**Acceptance:** no key / 401 / 422 / 429 / 529 / timeout / >32k state each return `could-not-look` (spec per case, injected `fetch`); 429/529 retry with exponential backoff (max 2); model comes from config and defaults to the pinned `jev-1.13.0`; key read from env, falling back to `.env.local`.
**Risk:** low

### Story 1.2 — Config + kill-switch (`jev.config.json`)
**As the** product owner, **I want** one committed file with per-rail `mode: off | shadow | jev`, thresholds, `model`, `shadowExpires` and `egress`, **so that** turning Jev off, on or into shadow is a one-line reviewed diff.
**Acceptance:** the template ships `jev.config.example.json` with both rails `off`; a malformed config fails loud (never silently `off`); `egress:false` or a missing key behaves exactly as `off`; values are TEMPLATE FILL-INs, no consumer names.
**Risk:** low

### Story 1.3 — Decision log (`.jev/decisions.jsonl`)
**As the** product owner, **I want** every guard decision recorded with who decided, **so that** a corpus of real disagreements exists — today rejected replies and drafts only reach stderr.
**Acceptance:** one JSONL line per decision: `{rail, mode, decider, regex, jev, confidence, textHash, text (truncated 4k), sha?, ts}`; `.jev/` and `.env*.local` added to `template/.gitignore`; a write failure warns and never changes the decision.
**Risk:** low

### Story 1.4 — Eval harness + shadow expiry (`scripts/jev-eval.mjs`)
**As a** builder bumping the model or thresholds, **I want** a labelled fixture set replayed against recorded responses, **so that** a bump is proven before it lands and shadow cannot rot.
**Acceptance:** `jev-eval.fixtures.json` holds ≥30 labelled cases per rail incl. both 2026-09-19 review cases; `node scripts/jev-eval.mjs` passes offline in CI; `--live` re-scores against the API and rewrites the recordings; CI fails when any rail is `shadow` past its `shadowExpires` date (default: 21 days after it was set).
**Risk:** low

## Sprint QA
- **specs:** `node --test` beside each new module — Jev is injected (`fetch` stub), CI never calls the network
- **browser smoke owed:** no — no UI
- **deterministic gate:** `node --test template/scripts` + `node scripts/check-skill-scripts.mjs` + `node scripts/check-plugin-leaks.mjs` green before merge

## Sprint 1 — Smoke walkthrough (do these in order)
Env: a local checkout of the repo named in each step, with `TYPESAFE_API_KEY` in `.env.local`.

1. Run `node --test template/scripts/lib/jev.test.mjs`
   → all specs pass without network access.
2. Run `node scripts/jev-eval.mjs`
   → "offline: N/N fixtures match recordings".
3. Run `node scripts/jev-eval.mjs --live`
   → per-rail accuracy printed; the two 2026-09-19 review cases score correctly.
4. Set a rail to `shadow` with `shadowExpires` yesterday, run `node scripts/jev-eval.mjs`
   → exits non-zero naming the expired rail.

If any step fails, note the step number + what you saw — that's the bug report.
