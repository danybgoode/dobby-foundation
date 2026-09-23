---
epic: golden-frijoles-plugin
sprint: 1
title: "Identity, license, releases"
risk: high
phase: Shaping
stories_total: 5
stories:
  - id: S1.1
    title: "License the public repo"
    as_a: "a stranger who found the repo"
    i_want: "an Apache-2.0 license and a NOTICE"
    so_that: "I'm allowed to use what I install"
    risk: low
    status: planned
  - id: S1.2
    title: "Create the org and transfer the repo (owed to Daniel)"
    as_a: "Daniel"
    i_want: "the `golden-frijoles` org to own the repo as `golden-frijoles/skills`"
    so_that: "the install line names the product, not a person"
    risk: high
    status: planned
  - id: S1.3
    title: "Rename the marketplace and plugin to golden-frijoles"
    as_a: "a Claude Code user"
    i_want: "`claude plugin install golden-frijoles@golden-frijoles`"
    so_that: "the install line is the product's name"
    risk: high
    status: planned
  - id: S1.4
    title: "Switch both consumers in the same sprint"
    as_a: "Daniel"
    i_want: "golden-beans and medusa-bonsai to load `golden-frijoles@golden-frijoles`"
    so_that: "no session in either repo loses its skills on the day the rename lands"
    risk: high
    status: planned
  - id: S1.5
    title: "Tagged releases a user can pin"
    as_a: "a stranger"
    i_want: "versioned releases with a changelog"
    so_that: "I can pin a release and roll back from a bad one"
    risk: low
    status: planned
---
# One plugin, one install — Golden Frijoles ships as a public plugin whose skills run in anyone's repo — Sprint 1: Identity, license, releases

**Status:** ⬜ not started · **Wave:** 1

The skateboard: the plugin anyone can already install gets the product's name, a license that permits using it, and releases people can pin and roll back to.

## Stories

### Story 1.1 — License the public repo
**As** a stranger who found the repo, **I want** an Apache-2.0 license and a NOTICE, **so that** I'm allowed to use what I install.
**Acceptance:** `LICENSE` (Apache-2.0) and `NOTICE` at the repo root. NOTICE states that "Golden Frijoles" is a trademark and is not licensed. GitHub's sidebar shows **Apache-2.0**. `kit/package.json` (S2) carries `"license": "Apache-2.0"`.
**QA:** none beyond CI
**Risk:** low

### Story 1.2 — Create the org and transfer the repo (owed to Daniel)
**As** Daniel, **I want** the `golden-frijoles` org to own the repo as `golden-frijoles/skills`, **so that** the install line names the product, not a person.
**Acceptance:** Daniel creates the `golden-frijoles` GitHub org (the name had no user or org on 2026-09-23) and transfers + renames `danybgoode/dobby-foundation` → `golden-frijoles/skills`. Check: `git ls-remote https://github.com/danybgoode/dobby-foundation HEAD` returns the same SHA as `git ls-remote https://github.com/golden-frijoles/skills HEAD`. The builder updates `origin` in every local checkout it touches.
**QA:** owed to Daniel. The builder writes the exact steps into this sprint's walkthrough
**Risk:** high

### Story 1.3 — Rename the marketplace and plugin to golden-frijoles
**As** a Claude Code user, **I want** `claude plugin install golden-frijoles@golden-frijoles`, **so that** the install line is the product's name.
**Acceptance:** `.claude-plugin/marketplace.json` `name: golden-frijoles`; `plugins/ways-of-work/` → `plugins/golden-frijoles/`; `plugin.json` `name: golden-frijoles`. `render-skill-adverts.mjs` regenerates every advert. `check-plugin-leaks.mjs` rules and fixtures are **rewritten, not allowlisted** for the old names (provenance prose excepted, each with a reason). `claude plugin validate plugins/golden-frijoles` is green, and so is the CI path filter / every workflow path that named `ways-of-work`.
**QA:** leak-guard fixtures (fires on `ways-of-work@dobby-foundation` in shipped files, not on the provenance lines); `claude plugin validate`
**Risk:** high

### Story 1.4 — Switch both consumers in the same sprint
**As** Daniel, **I want** golden-beans and medusa-bonsai to load `golden-frijoles@golden-frijoles`, **so that** no session in either repo loses its skills on the day the rename lands.
**Acceptance:** One PR per consumer: `.claude/settings.json` `extraKnownMarketplaces.golden-frijoles` → `golden-frijoles/skills`, `enabledPlugins` `golden-frijoles@golden-frijoles: true`, the old entries removed, and every doc that tells someone to install `ways-of-work` updated. They merge **the same day as S1.3**. Check: a fresh Claude Code session in each repo lists `golden-frijoles:groom`.
**QA:** golden-beans session check by the builder; **medusa-bonsai session check owed to Daniel** (private repo)
**Risk:** high

### Story 1.5 — Tagged releases a user can pin
**As** a stranger, **I want** versioned releases with a changelog, **so that** I can pin a release and roll back from a bad one.
**Acceptance:** `plugin.json` gets `"version": "0.1.0"`; `CHANGELOG.md` (Keep a Changelog shape); tag `v0.1.0`. `scripts/check-release.mjs` in CI fails when `plugins/` changed and the `version` didn't (on PRs to `main`), and when the tag, `plugin.json` and the newest CHANGELOG heading disagree. `RELEASING.md` has the three-line release procedure.
**QA:** `check-release.test.mjs`: fires on a plugin change without a bump, and doesn't fire on a docs-only change
**Risk:** low

## Sprint QA
- **specs:** named per story above. This repo's gate is `node --test` + the CI checks in `.github/workflows/ci.yml`; golden-beans stories use its own gate (`tsc` + build + Playwright `api`).
- **owed to Daniel:** Story 1.2, Story 1.4
- **deterministic gate:** every CI check green before merge; high-risk stories → Daniel merges

## Sprint 1 — Smoke walkthrough (do these in order)
Env: production (GitHub, npm and https://goldenfrijoles.com). Use the preview URL for golden-beans changes while pre-merge.

1. Open https://github.com/golden-frijoles/skills
   → The repo loads, and the sidebar says **Apache-2.0**.
2. Open https://github.com/danybgoode/dobby-foundation
   → GitHub redirects you to golden-frijoles/skills.
3. In a terminal in `~/dobby/golden-beans`, start `claude` and type `/plugin`
   → The installed list shows **golden-frijoles** (not ways-of-work), with groom and the other skills under it.
4. Same in `~/dobby/medusa-bonsai` (owed to Daniel: private repo)
   → Same result: `golden-frijoles:groom` is available.
5. Open https://github.com/golden-frijoles/skills/releases
   → A **v0.1.0** release/tag exists, and CHANGELOG.md has a 0.1.0 entry.

If any step fails, note the step number + what you saw — that's the bug report.
