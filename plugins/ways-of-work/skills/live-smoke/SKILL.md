---
name: live-smoke
description: >
  Verifies real, rendered behavior on this project's frontend (local/preview/staging/prod, unauthed
  or authed) via a real headless-Chromium Playwright browser — the DEFAULT way to check "does this
  render correctly / does this look right / is this actually live" for any coding agent, not just
  Claude Code. Use when asked to "smoke test", "verify the live/prod page", "check if X actually
  rendered", "run a browser smoke", "does this look right on preview", "verify an authed role's
  flow", or as a post-merge/pre-PR verification step. Wraps the project's
  <APP_DIR>/scripts/live-smoke.mjs — a real screenshot + JSON report, not just an HTTP status check.
  Reach for THIS before Claude-in-Chrome; see the fallback boundary below.
---

# live-smoke — the scripted default for verifying rendered behavior

> **Distribution note (dobby-foundation plugin):** this skill wraps `scripts/live-smoke.mjs` and a
> Playwright `browser` project, which ship in the *consuming project's* own tree, not inside this
> plugin. The template's e2e harness carries the Playwright `browser` project pattern; the script
> and the auth helpers are the project's. **If the referenced script/spec path doesn't exist in the
> consuming project, say so and stop rather than guessing an equivalent.**

> **This is the default browser-verification tool for every agent, not a Claude-specific
> capability.** Any coding-agent session in this repo can run the exact same `node
> scripts/live-smoke.mjs` command Claude Code does — no Chrome extension, no special access needed.
> Claude-in-Chrome is a narrower fallback (see below), not the default.

## Project config — TEMPLATE FILL-IN

Supply these per consuming project. This skill **refuses to guess them** — if one isn't filled in,
say which and stop.

| Value | What it is |
|---|---|
| `<APP_DIR>` | the app root the script and e2e suite live under (repo root in a single-app project) |
| `<AUTH_PROVIDER>` | the auth provider backing authed flows, and where its keys come from (e.g. `.env.local`) |
| `<ADMIN_PREDICATE>` | the single SSOT that decides whether a user is an admin — a module path plus the env list or metadata field it reads |
| `<TEST_IDENTITY_ENV>` | the env vars naming the per-role test identities (one per `--flow` this project supports) |
| `<ROLES>` | which `--flow` values exist here (this doc assumes `unauthed` plus one or more role flows) |
| `<PROD_DOMAIN>` | the production base URL `--env=prod` resolves to |

> The concrete values — which auth instance, which provisioned test accounts, which admin emails —
> are **operational facts and belong in the consuming project's own docs** (its `LEARNINGS.md` or
> AGENTS.md), not in this portable skill. Record them there and point at them here.

## What already exists (reuse, don't rebuild)
- **`<APP_DIR>/scripts/live-smoke.mjs`** — does all the actual work: resolves `--env`/`--flow` to a
  base URL + the right secrets, spawns the existing Playwright `browser` project, and prints where
  the JSON report + screenshot landed. Zero new browser-driving logic — it's a thin wrapper around
  infrastructure that already existed (`playwright.config.ts`'s `browser` project, and the e2e
  auth helper that performs `<AUTH_PROVIDER>` sign-in).
- **`<APP_DIR>/e2e/_live/ad-hoc.browser.spec.ts`** — the one generic spec `--path` mode runs. Never
  edit this to check a specific page — it's parametrized by env vars the script sets.
- **`<APP_DIR>/e2e/*.browser.spec.ts`** — the permanent regression suite. A shipped story's
  browser-testable acceptance criterion belongs here (`groom`'s own "one spec per browser/API-testable
  story" rule), run via `--spec` once written.

## Two modes — pick the right one

**Ad-hoc (`--path`)** — active-development "does this look right" checks. Nothing permanent is
left behind.
```
cd <APP_DIR>
node scripts/live-smoke.mjs --env=prod  --flow=unauthed --path=/<public-page>
node scripts/live-smoke.mjs --env=local --flow=<role>   --path=/<authed-page>
```

**Named spec (`--spec`)** — a shipped story's permanent regression coverage. Write the
`*.browser.spec.ts` first (following the suite's existing smoke spec pattern), commit it, then run:
```
node scripts/live-smoke.mjs --env=local --spec="<the spec's test name>"
```

## Stage 1 — pick env + flow
- `--env`: `local` (assumes the dev or standalone server is already running — this script starts
  nothing itself) · `preview` (needs `--preview-url=` plus whatever bypass secret the hosting
  platform's deployment protection requires) · `staging` · `prod` (default).
- `--flow`: `unauthed` (default, works everywhere) · any of `<ROLES>` (works on **local only** in the
  common case — see the environment matrix in Gotchas; the script refuses the unsupported
  combinations itself and tells you why, so you won't discover this the hard way).

## Stage 2 — run it
`node scripts/live-smoke.mjs <args>` from `<APP_DIR>`. Exit code 0 = pass.

## Stage 3 — read the result back, don't trust the exit code alone
The script prints the report/screenshot paths. **Always `Read` the screenshot** (multimodal) even
on a pass — a 200 with an unexpectedly broken layout, an empty state where content was expected, or
a page rendering in the wrong language are all things `res.ok()` can't catch but a look at the
actual pixels can. Check `report.json`'s `consoleErrors` array too — a clean page can still be
throwing client-side errors that don't affect the HTTP status.

## Fallback boundary — when NOT to use this

**Fall back to Claude-in-Chrome** (Claude Code only — other agents don't have this option, see
below) for: **any authed flow against production**, where the platform constraint below makes this
script permanently unable to help; a check that specifically needs the product owner's own real
logged-in identity and data (their real orders, their real account); a visual/UX judgment call that
genuinely benefits from live interactive poking beyond a screenshot.

**Stop and ask the product owner** (don't silently fall back) when a credential this tool needs
isn't provisioned yet — the environment matrix below says which `<TEST_IDENTITY_ENV>` fixture
unlocks which combination.

**For agents without Claude-in-Chrome:** this script is still the full default — it needs no
Claude-specific tooling. For *exploratory* browser driving beyond what a `--path` smoke covers
(poking around, trying several things interactively), register the
[Playwright MCP server](https://github.com/microsoft/playwright-mcp) (`npx @playwright/mcp@latest`)
— Node-native, no LLM key, works for any MCP-capable agent. Authed-prod stays unavailable to every
agent regardless of tooling and is owed to the product owner by name, same as any other
money/auth-path smoke.

---

## Gotchas

- **Fill in the honest environment × auth matrix for `<AUTH_PROVIDER>` before trusting any authed
  run — no tool choice routes around a platform constraint.** The shape this usually takes, and
  which is worth verifying rather than assuming:
  - **Local:** unauthed ✅, authed ✅ — usually the only fully-working authed combination, because a
    dev auth instance typically allows `localhost` origins.
  - **Preview:** unauthed ✅ (with the platform's deployment-protection bypass secret); authed often
    ❌ — the bypass can genuinely work while the auth SDK still never hydrates on an ephemeral
    preview origin, because the **dev instance's allowed-origins list** doesn't include that host.
    That is an auth-provider console decision (add the preview host or a stable alias), not a
    hosting-platform bug, and needs a human to make it.
  - **Staging:** same origin constraint as preview unless the host was explicitly allow-listed.
  - **Prod:** unauthed ✅, authed usually ❌ **permanently** — providers commonly reject their own
    testing-token bypass for production secret keys *by design*. A well-built script refuses this
    combination outright rather than failing obscurely.

  *(This matrix is the generic shape of a constraint confirmed live on a Clerk-based project,
  2026-07-12. Verify each cell for your own provider and record the result in this project's own
  docs — don't inherit these ✅/❌ marks on faith.)*
- **Instance-match, for any authed `--flow`:** the app's `<AUTH_PROVIDER>` keys, the
  `<TEST_IDENTITY_ENV>` test users, and the target environment must all point at the **same** auth
  instance, or sign-in hangs with no useful error. Source keys from the project's env file, never
  guess from a provider dashboard's display name — a provider's app *name* and its actual instance
  are routinely different things.
- **An admin-ish `--flow` needs a test user that is actually an admin** — a generic test identity
  usually isn't one. `<ADMIN_PREDICATE>` is the SSOT for what makes a user an admin; set the matching
  `<TEST_IDENTITY_ENV>` var explicitly, or the script may silently fall back to a lower-privilege
  identity and "pass" a check it never really ran.
- **A production server can silently serve a STALE build.** If `--env=local` smokes show content
  that doesn't match a just-built change, don't trust the framework's production-start command —
  serve the built output directly instead. (Next.js: with `output: 'standalone'` set, `next start`
  prints an "unsupported" warning but still boots and serves old content, with no further error;
  run `node .next/standalone/<APP_DIR>/server.js`, copying `public/` and `.next/static/` into the
  standalone output first — they aren't included automatically — and sourcing the env file into the
  process, since standalone doesn't auto-load it.)
- **A dev bundler's CSS scanner can hard-crash on a literal string in a test fixture or a code
  comment**, nowhere near any real usage. If `--env=local` against a dev server 500s on a
  nonsensical CSS-parse error, `grep` that literal across the whole repo (comments and test fixtures
  included) before assuming a real bug; falling back to the production server (above) also
  sidesteps this entirely.
- **Never print or log a secret value** — the script reads the env file and shell env directly into
  the Playwright child process; it never echoes a key/token to stdout. Follow the same discipline in
  any follow-up command (e.g. don't `cat` the env file to "double check" a value that's already
  being read programmatically).
- **A deployment-protection bypass secret can often be fetched live from the hosting platform's own
  API** using the API token/project id already in the project's env file — CI-provider secrets are
  permanently write-only (no API can read one back once set, by design; don't waste time trying),
  but the hosting platform's project-settings API commonly exposes its own bypass object. Fetch it
  into a shell variable and use it in the SAME command (shell state doesn't persist between tool
  calls) — never let it reach stdout or a transcript, not even via a debug print. Confirm it's
  present by printing its **length**, never its value.
- **A `--path` ad-hoc run overwrites the previous one's `report.json`/`screenshot.png`** (fixed
  filenames under `test-results/live-smoke/`) — if you need to compare two pages side by side, read
  each result before running the next, or pass `LIVE_SMOKE_OUT=<custom-dir>` in the shell env to
  separate them.
