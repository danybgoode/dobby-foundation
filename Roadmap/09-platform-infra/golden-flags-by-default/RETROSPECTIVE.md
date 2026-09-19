# Golden Frijoles by default — Retrospective

_Closed: 2026-09-19_

## What shipped

One sprint, six stories, one PR (#24), built in one orchestrated session.

| Story | What landed | Ref |
|---|---|---|
| 1.2 | `template/scripts/preflight.mjs` + `lib/golden-onboarding.mjs` — the mandate as a check, 23 tests | `0e5a170` |
| 1.1 | `groom` Stage 6b rewritten to `gf flags create`, with **activation as a fifth named thing** | `316e822` |
| 1.3 | `check-plugin-leaks` flag-mechanism rule + the guard's first 11 tests | `53d89ae` |
| 1.6 | `apps/example-app/flags.mjs` seam, `references/flags-runtime.md`, 13 tests, an api spec | `729735f` |
| 1.5 | `AGENTS.md` rule 1 + the plan table with its NOT-ENFORCED note | `4d3aeb3` |
| 1.4 | Four onboarding surfaces welded by `check-onboarding-parity.mjs`; CI wiring | `2ee3b72` |
| 1.6 | Two defects the smoke walkthrough found | `6295bb3` |

A project spawned from `template/` now boots with the flag provider wired, fails one command loudly
if it has no Golden Frijoles project, and cannot quietly grow a second flag store.

## What went well

- **Verifying D2 by execution instead of by reading changed the answer.** The plan asked for "the
  Edge-runtime constraints of `createFlagProvider`, verified against the actual package". Running the
  published `dist/` inside a `node:vm` context with only Edge globals produced an answer with *two
  halves* — the API surface is Edge-safe, the lifecycle is not — where reading the source would have
  produced only the first. Only ever hearing the first half is exactly how a middleware seam gets
  planned that cannot work. The doc ships its own reproduction, so it can be re-checked rather than
  quietly going stale when the SDK majors.
- **The parity guard fired on its first run.** `check-onboarding-parity.mjs` immediately caught a
  credential name that `flags-runtime.md` described in prose but never spelled. A guard that goes
  green on its first run has told you nothing; this one earned its place before it was committed.
- **The smoke walkthrough found the only real defect.** Step 4 — Golden pointed at a dead host —
  produced a health payload reading `ready: true` beside `state: 'NOT_READY'`. Nothing in the unit
  tests could have seen it, because the stub was always ready. Running the thing found it.
- **Three incidental leaks were rewritten rather than allowlisted.** Adding the new rule surfaced
  two `session-resume` comments naming an origin-project table and a triage fixture using
  `lib/flags.ts` as an arbitrary path. Each was real residue; an ALLOW entry would have preserved it
  with a plausible-sounding reason.
- **The line budget held.** `groom/SKILL.md` was already at its 220-line ceiling. The two new
  `requires_scripts` lines were paid for by compressing two prose passages — not by raising the
  ceiling, which is the move that quietly ends a budget.

## What we learned

- **A guard with no test is a guard nobody has seen fire.** `check-plugin-leaks.mjs` ran green over
  this epic's leak every single day for months. "CI was green" is the one observation that cannot
  distinguish a working guard from a pattern that matches nothing. Every guard wants fixtures that
  assert it fires, *and* fixtures that assert it does not fire on the thing it is meant to permit.
- **A mechanism does not have to be named after a project to be that project's.** The
  origin-project rule swept for `miyagi|medusa|despacho` and could never have caught
  `lib/flags.ts` `DEFAULT_FLAGS`. Generic filenames are how one consumer's architecture ships to
  everyone.
- **When a dependency can fail, decide loudly which failures are configuration and which are
  weather — and refuse to add the flag that blurs them.** Absent config and a 401 are true until a
  person acts; an unreachable host is not. There is deliberately no `--strict` on the preflight: it
  would have been pasted into a CI file within the week, and the fail-soft promise would be gone
  with nobody having decided to give it up.
- **"The package is not installed" is the most complete outage there is, and it makes a great
  test fixture.** Importing the SDK dynamically means the seam's whole fail-soft contract can be
  tested in a checkout with no `node_modules` — no network, no credentials, no mocking of a
  transport.
- **Definitions and activations are different verbs, and a dashboard cannot tell you which you
  did.** 39 of 42 flags reading "never turned on here" while the runtime served compile defaults is
  the shape this failure takes. The fix was not a paragraph; it was putting
  `gf flags ls --env production` into the story template as its own step.

## Gaps / follow-ups

- **Owed to the product owner: one live `gf login` + `gf init`.** Completing `gf init` needs a CLI
  token minted from the Golden console by a signed-in human — a production credential this build did
  not take unasked. Step 1 of the walkthrough (fails with the exact command) ran for real; `gf init`
  ran for real and refused correctly with `Not signed in`; the PASS path was proven against a local
  stub of the real snapshot route. Flag serving is enabled on production (a bogus key returns 401,
  not 404), so the live run should differ only in minting a real key. Detail: `sprint-1.md` step 2.
- **The cross-repo half of "one surface" is transcribed, not imported.** `/install` and `gf init`
  live in `golden-beans`; a template cannot import a product's web app to read a string. The
  canonical module names its source for each value, and `preflight.mjs` exercises the real
  deployment with the real variable names — so a rename in the CLI shows up as a failing preflight
  rather than a stale sentence. Compared by hand at close: all four values identical.
- **`MIN_CLI_VERSION` is a hand-maintained floor** (`0.1.0` — the version that shipped the write
  path). Nothing automatically raises it when the CLI ships a verb the story template starts naming.
  Worth a thought the next time a `gf` verb is added to a doc here.
- **`preflight.mjs` is not in the template's CI gate**, deliberately — `.env.local` is gitignored, so
  a checkout has no credential. It falls back to the process environment for projects that want it
  in CI from secrets, but nobody has run it that way yet.
