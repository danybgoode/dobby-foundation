---
epic: golden-frijoles-plugin
sprint: 2
title: "The kit"
risk: high
phase: Shaping
stories_total: 5
stories:
  - id: S2.1
    title: "Two roots: the project and the kit"
    as_a: "a script running from node_modules"
    i_want: "to find the user's project and my own templates separately"
    so_that: "I work the same whether I was copied into `scripts/` or installed as a package"
    risk: high
    status: planned
  - id: S2.2
    title: "Build the kit from the skills' closure"
    as_a: "a maintainer"
    i_want: "`@golden-frijoles/kit` generated from `requires_scripts`"
    so_that: "there's one list of what the skills need and no second copy of any script"
    risk: high
    status: planned
  - id: S2.3
    title: "Tag publishes the kit with provenance"
    as_a: "Daniel"
    i_want: "a pushed `v*` tag to publish the kit from CI"
    so_that: "a release needs no npm token on any machine"
    risk: high
    status: planned
  - id: S2.4
    title: "Skills run the kit unless the project has its own copy"
    as_a: "a skill"
    i_want: "to run a local `scripts/<x>.mjs` when the project has one, and the pinned kit otherwise"
    so_that: "strangers are served and deliberate forks keep working"
    risk: high
    status: planned
  - id: S2.5
    title: "golden-beans runs on the kit (the dogfood)"
    as_a: "Daniel"
    i_want: "golden-beans to run its skills through the kit"
    so_that: "the release is proven in a real repo before a stranger meets it"
    risk: high
    status: planned
---
# One plugin, one install — Golden Frijoles ships as a public plugin whose skills run in anyone's repo — Sprint 2: The kit

**Status:** ⬜ not started · **Wave:** 1

Scripts reach any repo. `@golden-frijoles/kit` is built from the skills' declared closure, learns to tell the project apart from itself, and is published by a tag. golden-beans proves it by deleting its copies.

## Stories

### Story 2.1 — Two roots: the project and the kit
**As** a script running from node_modules, **I want** to find the user's project and my own templates separately, **so that** I work the same whether I was copied into `scripts/` or installed as a package.
**Acceptance:** `template/scripts/lib/project-root.mjs` exports `projectRoot()` (walk up from `process.cwd()` to the nearest dir with `Roadmap/` or `.git`; `--root` / `GF_PROJECT_ROOT` override) and `kitRoot()` (this package's own dir). All 14 `join(__dirname, '..')`-style sites are converted: project paths via `projectRoot()`, asset paths (`pmo/templates`, `prose/*.task.md`, `standup/templates`, `pmo/benchmarks.json`) via `kitRoot()`. Copied mode keeps working unchanged.
**QA:** unit tests for both roots; **a tarball spec**: `npm pack` the kit, install it in a temp repo, run `gf-kit build-order` from a subdirectory, and assert it wrote *that* repo's `BUILD-ORDER.md`
**Risk:** high

### Story 2.2 — Build the kit from the skills' closure
**As** a maintainer, **I want** `@golden-frijoles/kit` generated from `requires_scripts`, **so that** there's one list of what the skills need and no second copy of any script.
**Acceptance:** `kit/package.json` (zero deps, `bin: { "gf-kit": "bin.mjs" }`, `license: Apache-2.0`, `files` = the built closure). `scripts/build-kit.mjs` copies the **union of every skill's declared closure** from `template/scripts/` into `kit/dist/` (gitignored). `gf-kit <name>` dispatches to `<name>.mjs`, and `gf-kit --list` prints what's inside. `check-skill-scripts.mjs` asserts the built kit contains every declared file. The repo root still has **no package.json** (D7).
**QA:** `check-skill-scripts` + a `build-kit.test.mjs` that fails when a declared file is missing from the build
**Risk:** high

### Story 2.3 — Tag publishes the kit with provenance
**As** Daniel, **I want** a pushed `v*` tag to publish the kit from CI, **so that** a release needs no npm token on any machine.
**Acceptance:** `.github/workflows/release.yml`: on `v*`, verify tag = `plugin.json` version = `kit/package.json` version (D4), build the kit, `npm publish --provenance --access public` via **trusted publishing (OIDC)**. If npm requires the package to exist before a trusted publisher can be attached, the **first `0.1.0` publish is owed to Daniel by hand** (recorded here once the lock confirms it). The npm page shows provenance.
**QA:** a dry-run job on PRs (`npm publish --dry-run`) so the workflow can't rot between releases
**Risk:** high

### Story 2.4 — Skills run the kit unless the project has its own copy
**As** a skill, **I want** to run a local `scripts/<x>.mjs` when the project has one, and the pinned kit otherwise, **so that** strangers are served and deliberate forks keep working.
**Acceptance:** Every SKILL.md's run instruction becomes the two-step rule (D3), with the kit version **stamped by `render-skill-adverts.mjs`** (never hand-typed) and CI failing if the stamped version isn't published or being released in the same tag. Offline or unreachable npm → the skill reports **could not look**, names the local-override escape hatch, and does not claim the project is broken.
**QA:** `render-skill-adverts --check` covers the stamp; a spec runs a skill's command with a fake local script present (local wins) and absent (kit runs)
**Risk:** high

### Story 2.5 — golden-beans runs on the kit (the dogfood)
**As** Daniel, **I want** golden-beans to run its skills through the kit, **so that** the release is proven in a real repo before a stranger meets it.
**Acceptance:** In golden-beans: a `cmp` loop of every kit file against its local copy goes in the PR body. **Byte-identical copies are deleted**; every surviving difference is listed with its reason (a deliberate fork stays, and local wins). `build-order-sync` and `standup` run through the kit, and their output matches the pre-change run. golden-beans' OLD tests for the deleted scripts run against the kit build before deletion (LEARNINGS: *Replacing a file with the shared copy? Run the consumer's OLD tests against the NEW code*).
**QA:** golden-beans CI green; the before/after output diff in the PR
**Risk:** high

## Sprint QA
- **specs:** named per story above. This repo's gate is `node --test` + the CI checks in `.github/workflows/ci.yml`; golden-beans stories use its own gate (`tsc` + build + Playwright `api`).
- **owed to Daniel:** Story 2.3
- **deterministic gate:** every CI check green before merge; high-risk stories → Daniel merges

## Sprint 2 — Smoke walkthrough (do these in order)
Env: production (GitHub, npm and https://goldenfrijoles.com). Use the preview URL for golden-beans changes while pre-merge.

1. Open https://www.npmjs.com/package/@golden-frijoles/kit
   → Version 0.1.x is listed with a **Provenance** badge linking to the release workflow run.
2. In an empty folder: `git init demo && cd demo && mkdir Roadmap && npx -y @golden-frijoles/kit@<version> --list`
   → It prints the scripts the kit carries. Nothing is written to `demo/`.
3. In `~/dobby/golden-beans`: `ls scripts/ | wc -l`, then compare with the same command on `main` before this sprint
   → Fewer files. The PR body lists exactly which were deleted and which forks stayed, with reasons.
4. In `~/dobby/golden-beans`, ask Claude Code to "sync the build order"
   → It runs the kit (the transcript shows `gf-kit build-order-sync`) and reports no drift or opens its PR as before.

If any step fails, note the step number + what you saw — that's the bug report.
