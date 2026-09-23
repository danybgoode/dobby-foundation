---
epic: golden-frijoles-plugin
sprint: 3
title: "The front door"
risk: high
phase: Shaping
stories_total: 5
stories:
  - id: S3.1
    title: "The golden-frijoles umbrella skill"
    as_a: "a stranger's agent"
    i_want: "one `golden-frijoles` skill that knows where to start"
    so_that: "I don't need to know ten skill names before I'm useful"
    risk: low
    status: planned
  - id: S3.2
    title: "Adopt any repo: `gf-kit init`"
    as_a: "a stranger with an existing repo"
    i_want: "`gf-kit init` to add the Roadmap skeleton"
    so_that: "groom has somewhere to write on day one"
    risk: low
    status: planned
  - id: S3.3
    title: "The install prompt as one module on three surfaces"
    as_a: "a visitor or a new signup"
    i_want: "the install prompt in a copy box on the landing's closing CTA, `/install` and my onboarding page"
    so_that: "I can paste it into my agent from wherever I am"
    risk: low
    status: planned
  - id: S3.4
    title: "The prompt is checked by running it"
    as_a: "Daniel"
    i_want: "every surface's install prompt to agree and to execute"
    so_that: "no surface advertises a command that doesn't exist"
    risk: low
    status: planned
  - id: S3.5
    title: "The two stranger walkthroughs"
    as_a: "a stranger"
    i_want: "to paste one prompt into an empty repo and plan my first idea"
    so_that: "the landing's promise is true"
    risk: low
    status: planned
---
# One plugin, one install — Golden Frijoles ships as a public plugin whose skills run in anyone's repo — Sprint 3: The front door

**Status:** ⬜ not started · **Wave:** 1

One name to start from, a way to adopt any repo, and the install prompt, from one module and checked by running it, on the landing's closing CTA, `/install` and signed-in onboarding. It ends with the two stranger walkthroughs.

## Stories

### Story 3.1 — The golden-frijoles umbrella skill
**As** a stranger's agent, **I want** one `golden-frijoles` skill that knows where to start, **so that** I don't need to know ten skill names before I'm useful.
**Acceptance:** `plugins/golden-frijoles/skills/golden-frijoles/SKILL.md`: detects state (Roadmap present? `gf` linked? kit reachable? which channel?), routes by job (plan → groom; build → live-smoke; operate → reports; ship → `gf`), **says what the `npx skills` channel lacks** (no build-view hook, no `pr-reviewer` agent), and offers setup (S3.2 in wave 1, the interview in wave 2). It's listed by `npx skills add golden-frijoles/skills --list`.
**QA:** `claude plugin validate`; the `--list` check in S3.4
**Risk:** low

### Story 3.2 — Adopt any repo: `gf-kit init`
**As** a stranger with an existing repo, **I want** `gf-kit init` to add the Roadmap skeleton, **so that** groom has somewhere to write on day one.
**Acceptance:** Writes `Roadmap/` (README, WAYS-OF-WORKING, LEARNINGS, `00-ideas/` with seeds/audits) from the template. **Never overwrites** an existing file (it says which it skipped). Idempotent. Adds nothing else to the repo.
**QA:** unit test on a temp repo: fresh, partially present, and fully present
**Risk:** low

### Story 3.3 — The install prompt as one module on three surfaces
**As** a visitor or a new signup, **I want** the install prompt in a copy box on the landing's closing CTA, `/install` and my onboarding page, **so that** I can paste it into my agent from wherever I am.
**Acceptance:** golden-beans `apps/web/lib/install-prompt.ts` holds the prompt (audit §3.1 text, using `golden-frijoles/skills` and `golden-frijoles@golden-frijoles`). Rendered through `CopyPromptCard` in the **closing CTA** (the hero keeps its workshop prompt), on `/install` and on `/app/onboarding/[projectSlug]`. The design-system state contract for those routes is **updated, not bypassed**.
**QA:** api spec that each route serves the exact string; **browser smoke** on `/` and `/install`; the signed-in onboarding smoke **owed to Daniel**
**Risk:** low

### Story 3.4 — The prompt is checked by running it
**As** Daniel, **I want** every surface's install prompt to agree and to execute, **so that** no surface advertises a command that doesn't exist.
**Acceptance:** `check-onboarding-parity.mjs` asserts the identical string in the plugin README, the umbrella SKILL.md and a transcription of golden-beans' module (with the source file named, as `golden-onboarding.mjs` does). `--exec`: runs `npx skills add golden-frijoles/skills --list` and asserts `golden-frijoles` is listed; runs `claude plugin marketplace add golden-frijoles/skills` + `claude plugin install golden-frijoles@golden-frijoles` in a **scrubbed `HOME` / `XDG_CONFIG_HOME` / `CLAUDE_CONFIG_DIR`**, asserting the isolation with a negative control (D8). It skips loudly when a binary is missing and never fails for that.
**QA:** parity fixtures that fire on a one-word drift; the exec mode in CI
**Risk:** low

### Story 3.5 — The two stranger walkthroughs
**As** a stranger, **I want** to paste one prompt into an empty repo and plan my first idea, **so that** the landing's promise is true.
**Acceptance:** Written as this sprint's walkthrough and run on a machine that has never seen these repos: (a) Claude Code, (b) Codex via `npx skills`. Pass = a seed lands in `Roadmap/00-ideas/seeds/` and **there is no `scripts/` folder in the repo**. In (b) the umbrella skill says hooks and agents aren't available.
**QA:** **owed to Daniel**: running both walkthroughs
**Risk:** low

## Sprint QA
- **specs:** named per story above. This repo's gate is `node --test` + the CI checks in `.github/workflows/ci.yml`; golden-beans stories use its own gate (`tsc` + build + Playwright `api`).
- **owed to Daniel:** Story 3.3, Story 3.5
- **deterministic gate:** every CI check green before merge; high-risk stories → Daniel merges

## Sprint 3 — Smoke walkthrough (do these in order)
Env: production (GitHub, npm and https://goldenfrijoles.com). Use the preview URL for golden-beans changes while pre-merge.

1. Open https://goldenfrijoles.com and scroll to the closing section
   → A box with the install prompt and a **Copy** button. The hero still offers the workshop prompt.
2. Open https://goldenfrijoles.com/install
   → The same prompt, character for character, with a Copy button.
3. Sign in and open https://goldenfrijoles.com/app/onboarding/<your-project-slug> (owed to Daniel: signed-in)
   → The same prompt appears on the onboarding page.
4. **Stranger walkthrough A (Claude Code).** On a clean machine or user account: `mkdir demo && cd demo && git init && claude`, paste the copied prompt
   → Claude installs the plugin, loads `golden-frijoles`, and offers to set up.
5. Say: "set it up, then groom this idea: a dark mode toggle"
   → `Roadmap/` appears and a seed lands in `Roadmap/00-ideas/seeds/`. `ls` shows **no `scripts/` folder**.
6. **Stranger walkthrough B (Codex).** Same empty folder, open Codex, paste the prompt, choose Codex when `npx skills` asks
   → The skills install. The umbrella skill says the build view and review agent are Claude Code-only, and grooming the same idea lands a seed.

If any step fails, note the step number + what you saw — that's the bug report.
