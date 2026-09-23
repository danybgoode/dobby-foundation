---
epic: golden-frijoles-plugin
sprint: 4
title: "One config file"
risk: high
phase: Shaping
stories_total: 3
stories:
  - id: S4.1
    title: "One config file and one loader"
    as_a: "a user"
    i_want: "one `golden-frijoles.config.json`"
    so_that: "I can read my whole setup in one place"
    risk: high
    status: planned
  - id: S4.2
    title: "Every rail reads through the loader"
    as_a: "a rail"
    i_want: "to read my settings through one seam"
    so_that: "there's one place config is interpreted"
    risk: high
    status: planned
  - id: S4.3
    title: "Ask once, just in time"
    as_a: "a skill"
    i_want: "to ask for an unset setting the first time I need it, then save it"
    so_that: "the user is never interviewed about things they don't use"
    risk: low
    status: planned
---
# One plugin, one install — Golden Frijoles ships as a public plugin whose skills run in anyone's repo — Sprint 4: One config file

**Status:** ⬜ not started · **Wave:** 2

**Wave 2, re-bet at the boundary.** One `golden-frijoles.config.json` a person can read, one loader every rail reads through, and a just-in-time registry so nothing is asked before it's needed. The seven legacy files keep working.

## Stories

### Story 4.1 — One config file and one loader
**As** a user, **I want** one `golden-frijoles.config.json`, **so that** I can read my whole setup in one place.
**Acceptance:** A schema (sections `project`, `board`, `verify`, `roadmap`, `ways`, `review`, `jev`, `smoke`, `reporting`, `deploy`, `ship`, `spend`) and `lib/config.mjs` in the kit. The **legacy files are a fallback**: `jev.config.json`, `reporting.config.json`, `live-smoke.config.json`, `smoke-triage.config.json`, `perf-probe.config.json`, `scripts/review-config.json`, `Roadmap/fill-ins.yml`. Precedence (D9): **the new file wins per key**, legacy files fill gaps, and a key defined in both is reported. `gf-kit config migrate` folds legacy into the new file and leaves the old files untouched. Secrets never go in it; only env var *names* do.
**QA:** unit tests on every precedence case, including a malformed file = *configuration* failure (fails) vs an absent file (falls back)
**Risk:** high

### Story 4.2 — Every rail reads through the loader
**As** a rail, **I want** to read my settings through one seam, **so that** there's one place config is interpreted.
**Acceptance:** Review routing, Jev, reporting, live-smoke, smoke-triage, perf-probe and the WAYS-OF-WORKING renderer read through `lib/config.mjs`, with no direct `JSON.parse(readFileSync(...config.json))` left (a guard greps for it). **A repo with only legacy files behaves byte-identically**: golden-beans' existing tests for those rails run green against the new code before merge.
**QA:** the grep guard (fires + doesn't fire fixtures); golden-beans' old tests against the new code
**Risk:** high

### Story 4.3 — Ask once, just in time
**As** a skill, **I want** to ask for an unset setting the first time I need it, then save it, **so that** the user is never interviewed about things they don't use.
**Acceptance:** A registry: each setting declares `{ key, askWhen, default, section, secret? }`. A skill that hits an unset key asks one question, writes the answer through the loader, and says *"change this later with `gf config set <key>`"*. The registry is the audit §4.3 table in code, and doctor (S5.3) reads it too.
**QA:** unit test: an unset key asks once; a set key never asks
**Risk:** low

## Sprint QA
- **specs:** named per story above. This repo's gate is `node --test` + the CI checks in `.github/workflows/ci.yml`; golden-beans stories use its own gate (`tsc` + build + Playwright `api`).
- **owed to Daniel:** nothing
- **deterministic gate:** every CI check green before merge; high-risk stories → Daniel merges

## Sprint 4 — Smoke walkthrough (do these in order)
Env: production (GitHub, npm and https://goldenfrijoles.com). Use the preview URL for golden-beans changes while pre-merge.

1. In an empty test repo: `npx -y @golden-frijoles/kit@<version> config migrate`
   → It prints "nothing to migrate" and writes no file.
2. In `~/dobby/golden-beans`: `npx -y @golden-frijoles/kit@<version> config migrate --dry-run`
   → It prints the `golden-frijoles.config.json` it *would* write, built from golden-beans' existing files, and writes nothing.
3. In golden-beans, open any PR and let the review routing run
   → It routes exactly as before (same reviewers, same security lens). Legacy config still works.

If any step fails, note the step number + what you saw — that's the bug report.
