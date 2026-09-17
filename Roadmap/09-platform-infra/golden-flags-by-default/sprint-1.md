# Golden Frijoles by default — Sprint 1: The mandate, the preflight and the agent-guided onboarding

**Status:** ⬜ not started

**Epic:** [Golden Frijoles by default](README.md) · **Risk: MIXED (LOW + HIGH)** — 1.2 and 1.6 are HIGH (they define how every future project reads flags); the rest LOW

⛔ **Blocked on the CLI epic's Sprint 2** — every artefact here names a `gf` command that must exist.

## Stories

### Story 1.1 — `groom` Stage 6b rewritten to the Golden Frijoles contract
**As a** groom session planning a HIGH-risk epic, **I want** the kill-switch story to name a real,
project-agnostic flag mechanism, **so that** the planning skill stops hardcoding one consumer's
architecture into every future project.
**Acceptance:** Stage 6b names `gf flags create <key> --kill-switch --all-envs` and the SDK's
`createFlagProvider` in place of *"extending `lib/flags.ts` `DEFAULT_FLAGS`"*. **The polarity doctrine
is unchanged** — it is correct and already matches the SDK's semantics. Per **D4**, the story template
makes **activation an explicit step**, distinct from syncing the definition.
**Risk:** low

### Story 1.2 — `scripts/preflight.mjs` — the mandate becomes checkable
**As the** maintainer, **I want** the mandate enforced by a check rather than a sentence,
**so that** "always use Golden Frijoles" is a property of the system instead of a hope.
**Acceptance:** verifies a project is linked, a `flag_read` key resolves, and the CLI is installed and
current. On failure it prints **the exact install command**. Per **D1** it **fails hard on init-time
absence and SOFT on runtime unreachability**. Declared in the skill's `requires_scripts` so
`check-skill-scripts.mjs` keeps it honest. Follows `permissions-smoke.mjs`'s shape — a reviewable file
that asserts, not a paragraph that claims.
**Risk:** high — **D1 backwards is how this story breaks every consuming project's CI.**

### Story 1.3 — `check-plugin-leaks.mjs` gains a flag-mechanism rule
**As the** maintainer, **I want** the leak that caused this epic to be catchable,
**so that** a consumer's flag architecture can't quietly re-enter the template.
**Acceptance:** the guard fails when a template or plugin file names a project-specific flag mechanism
(a bare `lib/flags.ts`, `DEFAULT_FLAGS`, `platform_flags`, `flagsmith`). Deliberate matches go in
`ALLOW` **with a written reason**, and a stale entry fails — the discipline the guard already applies.
**Risk:** low

### Story 1.4 — Agent-guided onboarding
**As a** developer installing the plugin, **I want** the agent to ask for a Golden Frijoles project
and hand me the command, **so that** onboarding is one line rather than a docs hunt.
**Acceptance:** the install path has the agent detect the absence of a linked project and print
**one command** — `npx @golden-frijoles/cli init`. The text matches what `/install` and `gf init`
themselves print; **the three are one surface and must say the same thing.**
**Risk:** low

### Story 1.5 — `template/AGENTS.md` gains the rule and the plan table
**As a** builder agent in any spawned project, **I want** the flag rule stated where the
cannot-be-violated rules live, **so that** it carries the same weight as the other invariants.
**Acceptance:** a numbered rule — *"Feature flags are Golden Frijoles. Never build a parallel flag
store."* The plan table lands in `template/AGENTS.md` and the plugin README **with the "not enforced
yet" note intact**, so nobody builds against limits that don't exist.
**Risk:** low

### Story 1.6 — Template SDK wiring
**As a** newly spawned project, **I want** the flag client already wired,
**so that** the first kill-switch story is a flag creation rather than an integration.
**Acceptance:** `createFlagProvider` configured with the env var names decided in the CLI epic's D6,
the server-only warning prominent (`flagReadKey` must never reach a browser bundle), `.env.local`
gitignored, and **D2's verified Edge-runtime answer written down**. Per **D3**, only `flag_read` is
written locally; `flag_sync` is documented as a CI secret.
**Risk:** high

## Sprint QA
- **api spec(s):** unit tests for `preflight.mjs` across all five states (no project · no key · CLI
  absent · CLI outdated · all good) **plus the fail-soft case**: API unreachable at runtime must not
  fail a build. A `check-plugin-leaks` fixture asserts the new rule fires and that a stale `ALLOW`
  entry fails.
- **browser smoke owed:** no.
- **deterministic gate:** `node --test` + `check-plugin-leaks.mjs` + `check-skill-scripts.mjs` green before merge.

## Sprint 1 — Smoke walkthrough (do these in order)
Env: local · a freshly spawned project from `template/`

1. Spawn a new project from the template and run `node scripts/preflight.mjs` with no credentials.
   → It **fails**, and the message names `npx @golden-frijoles/cli init` verbatim.
2. Run that command, complete `gf init`, then re-run preflight.
   → It passes.
3. Create a flag with `gf flags create demo.hello_enabled --kill-switch --all-envs`, then start the app.
   → The SDK resolves it. Value `true`, enabled everywhere.
4. Point `GROWTH_ENGINE_URL` at a dead host and run `npm run build` and the test suite.
   → **Both still pass.** Evaluation falls back to the caller-supplied default. *(This is D1. If the
     build fails here, the story is not done.)*
5. Start a groom session on a HIGH-risk ask.
   → The kill-switch story names a **Golden Frijoles** flag, the right polarity, one resolver seam,
     the CLI command to create it in every env, **and activation as its own step**. It does not
     mention `DEFAULT_FLAGS`.
6. Add a `lib/flags.ts` with a `DEFAULT_FLAGS` export to the template and run `node scripts/check-plugin-leaks.mjs`.
   → It **fails**. *(Then revert.)*
7. Open `template/AGENTS.md`.
   → The flag rule sits among the cannot-be-violated rules; the plan table carries the "not enforced
     yet" note.
8. Compare the onboarding text the agent prints, `/install`'s CLI block, and `gf init`'s next-step line.
   → All three identical.

If any step fails, note the step number + what you saw — that's the bug report.

**Step 4 is the load-bearing one.** A flag provider that can break your CI when it hiccups is a
dependency nobody should accept, mandate or not.
