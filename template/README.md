# dobby-foundation project template

The copy-once skeleton for a new `~/dobby/` sibling project: a generalized `Roadmap/` (ways-of-work,
learnings, session kickoffs, the idea funnel), an `AGENTS.md` skeleton with a per-project rules slot,
CI workflow shapes, portable `scripts/`, and a Playwright `api`/`browser` e2e harness shape. Pairs with
the `ways-of-work` plugin (`../.claude-plugin/marketplace.json`) — the template is copy-once, the
plugin is pull-based/versioned; see the repo root README for the distinction.

## Spawn a new project from this template

1. **Create the new repo — decide `--private` vs `--public` deliberately, not by habit:**
   ```
   gh repo create <owner>/<new-project> --private
   git clone https://github.com/<owner>/<new-project>.git ~/dobby/<new-project>
   ```
   **GitHub Actions minutes are only METERED for `--private` repos** — they draw from one shared
   monthly pool across your *entire* GitHub account, not per-repo. `--public` repos get unlimited
   free Actions minutes. If you have several private projects already, a new one defaults to
   `--private` here but is competing for the same shared quota as all the others — this template's
   guards are already built local-first + PR-only specifically to keep that cost low regardless
   (see step 5 and `.githooks/`), but it's still worth the 5-second visibility check
   (`gh repo view <owner>/<new-project> --json isPrivate`) if minutes ever run tight, rather than
   discovering it from a "90% of your quota used" email like the origin project did.
2. **Copy this template's contents** into the new repo root (everything under `template/`, not the
   `template/` directory itself):
   ```
   cp -R template/. ~/dobby/<new-project>/
   ```
3. **Fill in every `TEMPLATE FILL-IN` marker** — grep for them: `grep -rl "TEMPLATE FILL-IN"
   ~/dobby/<new-project>/`. At minimum: `AGENTS.md`'s rules section, `Roadmap/README.md`'s mission +
   macro-sections, **`Roadmap/fill-ins.yml`** (your deploy rail, tooling, language policy and any
   project-only sections — then `node scripts/render-ways-of-working.mjs`; `WAYS-OF-WORKING.md` itself is
   generated and never hand-edited), `scripts/review-config.json`'s `securityPaths`, and
   `.github/workflows/ci.yml.example` → rename to `ci.yml` once real app code exists (at that point
   also rename `.githooks/pre-push.example` → `pre-push` and fill in its own TEMPLATE FILL-IN, so
   local pre-push feedback mirrors `ci.yml`'s real checks).
4. **Wire the marketplace and the permissions** — `.claude/settings.json` already points at this
   repo's `ways-of-work` plugin and carries the committed `permissions` block: an `allow` list of verb
   classes, a `deny` list (CLI deploys, `supabase db push|reset`, force pushes, `rm -rf`, whole-tree
   staging, hand-edits of generated boards) and an `ask` list (secret/env writes). Every deny/ask rule
   is cited in `.claude/permissions-ledger.json`; `node scripts/permissions-smoke.mjs` checks the pair.
   Add project-specific rules to BOTH files. **Auto mode is a user setting** — put
   `"permissions": {"defaultMode": "auto"}` in `~/.claude/settings.json`; the same line in a project
   settings file is ignored *and* masks the user default, so the smoke fails on it. Keep
   `.claude/settings.local.json` for genuinely machine-specific entries only — a one-off approval that
   is really a verb class belongs in the committed list.
5. **Wire local-first hooks** — once `package.json` exists (from your app's own bootstrap, e.g.
   `create-next-app`), add `"prepare": "git config core.hooksPath .githooks"` to its `"scripts"`
   block. This auto-activates `.githooks/pre-commit` (blocking — build-order + scripts/ node:test,
   the local-free equivalent of `guards.yml`) and, once you've filled it in, `pre-push` (advisory —
   never blocks) on every `npm install`/`npm ci`, with no manual per-clone step. Until `package.json`
   exists, activate manually once with `git config core.hooksPath .githooks` if you want the hook
   live immediately.
6. **Commit + push**, then verify: `node scripts/build-order.mjs --check` (should report the board
   up to date on an empty funnel), and confirm the `guards` GitHub Actions workflow goes green on
   the initial commit (or is simply skipped — it's `pull_request`-only, so a direct push to `main`
   won't trigger it; that's expected, `.githooks/pre-commit` covers that path locally instead).
7. **Groom your first idea** in a fresh Claude Code session — the `groom` skill should trigger from
   the marketplace-installed plugin.

## What's deliberately NOT here

- No real app code — `apps/example-app/` is the e2e harness *shape*, not a real app.
- No process content specific to the origin project's stack or brand names — verified with a grep for
  the origin project's product/stack/vendor identifiers at build time (dobby-foundation Sprint 1,
  Story 1.3; see that sprint's doc for the exact check).
- No infra-specific CI guards (the origin project's `infra-guard.yml`, `notion-sync.yml`) — those are
  specific integrations, not universal patterns. Add your own if/when you need the equivalent.
