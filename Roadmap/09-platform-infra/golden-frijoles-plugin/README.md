---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
phase: Shaping       # the executive ladder — Shaping | Locking architecture | Building | Verifying | In review | Shipped.
                     # WRITTEN at each cadence event, never inferred. Shipped = merged AND deployed.
slug: golden-frijoles-plugin
title: "One plugin, one install — Golden Frijoles ships as a public plugin whose skills run in anyone's repo"
area: 09-platform-infra
risk: high
type: feature
sprints_total: 5
stories_total: 23   # the sum of every sprint's stories_total — keep it in step when a story is added
build_order: 8       # integer position in the ONE global build sequence
---

# Epic: One plugin, one install — Golden Frijoles ships as a public plugin whose skills run in anyone's repo

> **Area:** 09-platform-infra · **Risk:** high · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/golden-frijoles-plugin.md`](../../00-ideas/seeds/golden-frijoles-plugin.md)
> **Appetite:** L, two waves (S1–S3 = wave 1 "install", S4–S5 = wave 2 "configure"), **re-bet at the boundary**.
> **Origin:** Seed 1 + Seed 4 of golden-beans `Roadmap/00-ideas/audits/golden-frijoles-unification-2026-09-23.md` (audit decisions D1–D8, approved 2026-09-23).
> **Repos touched:** this repo (to become `golden-frijoles/skills`), golden-beans (S1.4, S2.5, S3.3, S5.2), medusa-bonsai (S1.4 only).

## Why

The landing is about to hand strangers a prompt that installs Golden Frijoles into their own agent. Today that prompt would
install ten skills that stop, because every skill runs scripts a stranger's repo doesn't have. It also installs under a name
that isn't the product's, from a public repo with no license, and with no releases to pin. After this epic, a stranger pastes
one prompt into an empty repo, in Claude Code or any agent `npx skills` supports, and plans their first idea. After wave 2 they
answer at most five questions to configure it and can change anything later with `gf config`.

## Platform-first note

Most of the rails exist. The public marketplace works today (`npx skills add danybgoode/dobby-foundation --list` lists all ten
skills). The skill list is generated, the script contract and its closure walk are checked in CI, the leak guard has fixtures,
the onboarding text is already one parity-checked surface with an isolated `--exec`, and `.skill` archives are reproducible.
**What's new is a package boundary:** the scripts leave the consuming repo for `@golden-frijoles/kit`. That's why the first
architecture decision is about roots, not about packaging.

## What already exists (reuse, don't rebuild)

- `.claude-plugin/marketplace.json`, `plugins/ways-of-work/` (to be renamed), `claude plugin validate` in CI
- `scripts/render-skill-adverts.mjs` (+ `--check`), which also stamps the kit version (S2.4)
- `scripts/check-skill-scripts.mjs`: the `requires_scripts` closure walk, retargeted at the built kit (S2.2)
- `scripts/check-plugin-leaks.mjs` + fixtures, extended for the rename (S1.3)
- `scripts/check-onboarding-parity.mjs` + `template/scripts/lib/golden-onboarding.mjs`: parity with an isolated `--exec` (S3.4)
- `scripts/pack-skills.mjs`: `.skill` archives for Cowork and the Claude app (unchanged, rebuilt at release)
- `template/Roadmap/`: the skeleton `gf-kit init` writes (S3.2)
- golden-beans: `lib/cli-install.ts` and `lib/landing-prompts.ts` (the one-module pattern), `CopyPromptCard`, `/install`, `/app/onboarding/[projectSlug]`, `packages/cli` (`doctor`, `init`, exit codes, golden help tests)
- LEARNINGS rules this epic leans on: *presence is not execution*, *construct the harmless state and assert it*, *could not look is its own exit code*, *run the consumer's OLD tests against the NEW code*, *rewrite, don't allowlist*

## Architecture decisions: lock these against live code before any builder starts

*(Numbered for this epic. Not the same as the audit's D1–D8.)*

- **D1: The kit is built, not committed.** `template/scripts/` stays the single source. `scripts/build-kit.mjs` copies the union of every skill's declared closure into `kit/dist/` (gitignored), so no second copy of a script is ever committed.
- **D2: Two roots.** `projectRoot()` walks up from `cwd` to the nearest dir holding `Roadmap/` or `.git` (`--root` / `GF_PROJECT_ROOT` override). `kitRoot()` is the package's own dir. Project files go through the first and bundled assets through the second. **The same code runs in copied mode and installed mode.**
- **D3: Local wins.** A skill runs `scripts/<x>.mjs` if the project has it, and otherwise `npx -y @golden-frijoles/kit@<pinned> <x>`. Forks are a feature, and this is how strangers and customized consumers share one plugin.
- **D4: One version, in lockstep.** `plugin.json` `version` = `kit/package.json` `version` = the git tag. The stamped kit version in every SKILL.md is generated, and CI fails if it points at a version that isn't published or being released by the same tag.
- **D5: Releases come from a tag, via OIDC trusted publishing,** with `--provenance` and no stored token. If npm needs the package to exist first, the one manual `0.1.0` publish is recorded as owed to Daniel.
- **D6: Names.** Marketplace `golden-frijoles`; plugin dir `plugins/golden-frijoles/`; umbrella skill `golden-frijoles`; bin `gf-kit`; repo `golden-frijoles/skills`. **No alias** for `ways-of-work@dobby-foundation`.
- **D7: The repo root stays zero-install.** No root `package.json`. The kit has its own under `kit/`, with zero dependencies.
- **D8: Executing checks run in a constructed harmless state.** Temp `HOME` / `XDG_CONFIG_HOME` / `CLAUDE_CONFIG_DIR`, asserted by a negative control. A missing binary skips loudly and never fails.
- **D9 (wave 2): Config precedence.** The new file wins per key, legacy files fill gaps, and a duplicate is reported. A malformed file is a *configuration* failure and an absent one is a fallback. After S4.2 no rail parses a config file itself.
- **D10 (wave 2): One config core.** The CLI (`gf setup` / `gf config`) imports the kit's config module. The kit ships `.d.ts` for it, and the CLI never re-implements precedence.

**Rabbit holes the lock must close** (from the pitch): the 14 `__dirname` sites plus asset reads (D2), rename vs consumer keys (S1.3 + S1.4 same day), whether trusted publishing needs an existing package (D5), npx offline behaviour (S2.4), runtime deps the kit can't carry (`@playwright/test`, second-family CLIs: check and print the install line), the `version` field's update semantics (S1.5), and leak-guard residue (rewrite, don't allowlist).

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 · Identity, license, releases | S1.1 License the public repo | low |
| 1 · Identity, license, releases | S1.2 Create the org and transfer the repo (owed to Daniel) | high |
| 1 · Identity, license, releases | S1.3 Rename the marketplace and plugin to golden-frijoles | high |
| 1 · Identity, license, releases | S1.4 Switch both consumers in the same sprint | high |
| 1 · Identity, license, releases | S1.5 Tagged releases a user can pin | low |
| 2 · The kit | S2.1 Two roots: the project and the kit | high |
| 2 · The kit | S2.2 Build the kit from the skills' closure | high |
| 2 · The kit | S2.3 Tag publishes the kit with provenance | high |
| 2 · The kit | S2.4 Skills run the kit unless the project has its own copy | high |
| 2 · The kit | S2.5 golden-beans runs on the kit (the dogfood) | high |
| 3 · The front door | S3.1 The golden-frijoles umbrella skill | low |
| 3 · The front door | S3.2 Adopt any repo: `gf-kit init` | low |
| 3 · The front door | S3.3 The install prompt as one module on three surfaces | low |
| 3 · The front door | S3.4 The prompt is checked by running it | low |
| 3 · The front door | S3.5 The two stranger walkthroughs | low |
| 4 · One config file | S4.1 One config file and one loader | high |
| 4 · One config file | S4.2 Every rail reads through the loader | high |
| 4 · One config file | S4.3 Ask once, just in time | low |
| 5 · Setup and adjust | S5.1 Five skippable setup questions | low |
| 5 · Setup and adjust | S5.2 `gf setup` and `gf config` | high |
| 5 · Setup and adjust | S5.3 Doctor names every module's state | low |
| 5 · Setup and adjust | S5.4 Jev egress is the user's explicit choice | high |
| 5 · Setup and adjust | S5.5 Stranger walkthrough #2: set up, then adjust | low |

**No-gos:** Think skills (Seed 5), board sinks, FinOps and Verify are out. There's no alias for the old plugin id. medusa-bonsai
doesn't adopt the kit (only its settings change). CI-guard scripts stay copy-once. The kit sends no telemetry. The engine is
unchanged beyond the install-prompt module/pages and the CLI's `setup` / `config` / `doctor`.

## Deploy order

1. **S1.1** license → **S1.2** org + transfer (Daniel) → **S1.3 + S1.4 merge the same day** (the rename and both consumers) → **S1.5** tag `v0.1.0`.
2. **S2.1 → S2.2 → S2.3** (the first kit publish; a manual publish is owed if D5 requires it) → **S2.4** (skills may only pin a version that's published) → **S2.5** golden-beans.
3. **S3.1–S3.4** in any order, then **S3.5** walkthroughs → release `v0.2.0` → **wave boundary: re-bet wave 2.**
4. **S4.1 → S4.2 → S4.3**, then **S5.1–S5.4**, then **S5.5** → release.

Rollback at every step comes from the release rails: pin the previous plugin `version` / kit version, deprecate a bad npm
version, `git revert` the landing card. The repo transfer is reversible.

## Kill-switch (Stage 6b)

**Carve-out: no runtime seam.** This is distribution, not a code path in a running app. Rollback is the pinned previous release
(D4), and the build-view kill-switch (`hooks.json`) is untouched. The landing card is copy, removed by `git revert`.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated; `node scripts/owed-ledger.mjs` counts what's still owed)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] The kit is published with provenance, the plugin is tagged, and the CHANGELOG is current
- [ ] Both stranger walkthroughs passed (S3.5, S5.5), run by Daniel on a clean machine
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated, including the new name, license and install line
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] Kill-switch: carve-out recorded above (none planned)
- [ ] Feature branches deleted; **this README's frontmatter `status: shipped`** (then run `node scripts/build-order.mjs`)
