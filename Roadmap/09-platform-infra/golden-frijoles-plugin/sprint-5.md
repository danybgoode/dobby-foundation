---
epic: golden-frijoles-plugin
sprint: 5
title: "Setup and adjust"
risk: high
phase: Shaping
stories_total: 5
stories:
  - id: S5.1
    title: "Five skippable setup questions"
    as_a: "a stranger"
    i_want: "to answer at most five questions, each with a default"
    so_that: "I'm configured in about two minutes"
    risk: low
    status: planned
  - id: S5.2
    title: "`gf setup` and `gf config`"
    as_a: "a terminal user"
    i_want: "`gf setup` and `gf config list|get|set`"
    so_that: "I can configure without asking an agent"
    risk: high
    status: planned
  - id: S5.3
    title: "Doctor names every module's state"
    as_a: "a user"
    i_want: "`gf doctor` to show each module as configured, not configured or could not look"
    so_that: "I know exactly what's missing and how to fix it"
    risk: low
    status: planned
  - id: S5.4
    title: "Jev egress is the user's explicit choice"
    as_a: "a stranger"
    i_want: "to be asked before my diffs are sent to a third party"
    so_that: "nothing leaves my machine by default"
    risk: high
    status: planned
  - id: S5.5
    title: "Stranger walkthrough #2: set up, then adjust"
    as_a: "a stranger"
    i_want: "to set up and later change one setting"
    so_that: "configuration is something I can live with, not a one-shot"
    risk: low
    status: planned
---
# One plugin, one install — Golden Frijoles ships as a public plugin whose skills run in anyone's repo — Sprint 5: Setup and adjust

**Status:** ⬜ not started · **Wave:** 2

The five-question setup in the agent, `gf setup` / `gf config` in the terminal through the **same core**, one doctor line per module, and Jev egress as a stranger's explicit choice.

## Stories

### Story 5.1 — Five skippable setup questions
**As** a stranger, **I want** to answer at most five questions, each with a default, **so that** I'm configured in about two minutes.
**Acceptance:** The umbrella skill's setup asks the audit §4.2 questions (mode · start point · board · account · proof depth). Every one can be skipped and has a default, and only Q1 (mode) is required. Answers are written through the kit's config core, and the next step is offered (the first skill for the chosen start point).
**QA:** a conversation-level check in the walkthrough; the core is unit-tested in S4
**Risk:** low

### Story 5.2 — `gf setup` and `gf config`
**As** a terminal user, **I want** `gf setup` and `gf config list|get|set`, **so that** I can configure without asking an agent.
**Acceptance:** In golden-beans `packages/cli`: `gf setup` (the same five questions, arrow-key choices, `--yes` for defaults) and `gf config` (`list/get/set`, `--json`). Both **import the kit's config core** (`@golden-frijoles/kit` as a dependency; the kit ships `.d.ts` for that module) (D10). Golden help-text files are added and CLI exit codes are reused.
**QA:** CLI golden tests + unit tests; `check-onboarding-parity --exec` covers the new commands
**Risk:** high

### Story 5.3 — Doctor names every module's state
**As** a user, **I want** `gf doctor` to show each module as configured, not configured or could not look, **so that** I know exactly what's missing and how to fix it.
**Acceptance:** One line per module (Plan, Build, Ship, Measure, Spend, Operate), read from the registry (S4.3), with the fix command beside anything not configured. Three states, never two (LEARNINGS).
**QA:** golden test for the doctor output in each state
**Risk:** low

### Story 5.4 — Jev egress is the user's explicit choice
**As** a stranger, **I want** to be asked before my diffs are sent to a third party, **so that** nothing leaves my machine by default.
**Acceptance:** The template's `jev.config.json` default becomes `egress: false` until answered. The question is asked at the first PR (S4.3 registry) in plain words ("send diffs to TypeSafe to judge review quality?"). **Existing consumers keep their committed `true`**, and the `jev-eval` CI job is unaffected.
**QA:** a unit test that a fresh config never calls Jev; a consumer with `egress: true` behaves as before
**Risk:** high

### Story 5.5 — Stranger walkthrough #2: set up, then adjust
**As** a stranger, **I want** to set up and later change one setting, **so that** configuration is something I can live with, not a one-shot.
**Acceptance:** On a clean machine: install via the prompt, run setup, then `gf config set review.scope every-pr`, and the next PR's routing reflects it. `gf doctor` shows the expected lines.
**QA:** **owed to Daniel**: running it
**Risk:** low

## Sprint QA
- **specs:** named per story above. This repo's gate is `node --test` + the CI checks in `.github/workflows/ci.yml`; golden-beans stories use its own gate (`tsc` + build + Playwright `api`).
- **owed to Daniel:** Story 5.5
- **deterministic gate:** every CI check green before merge; high-risk stories → Daniel merges

## Sprint 5 — Smoke walkthrough (do these in order)
Env: production (GitHub, npm and https://goldenfrijoles.com). Use the preview URL for golden-beans changes while pre-merge.

1. In a fresh empty repo with the plugin installed, tell Claude: "set up golden-frijoles"
   → At most five questions, each saying its default. Skipping all but the first still finishes.
2. `cat golden-frijoles.config.json`
   → One readable file with your answers. No secrets in it.
3. `npx @golden-frijoles/cli doctor`
   → One line per module: *configured*, *not configured* (with the command to fix it) or *could not look*.
4. `npx @golden-frijoles/cli config set review.scope every-pr`, then open a PR
   → The next review routing uses `every-pr`.
5. Open a PR in the fresh repo before answering the Jev question
   → You're asked whether to send diffs to TypeSafe. Until you say yes, nothing is sent.

If any step fails, note the step number + what you saw — that's the bug report.
