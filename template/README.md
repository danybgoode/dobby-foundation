# dobby-foundation project template

The copy-once skeleton for a new `~/dobby/` sibling project: a generalized `Roadmap/` (ways-of-work,
learnings, session kickoffs, the idea funnel), an `AGENTS.md` skeleton with a per-project rules slot,
CI workflow shapes, portable `scripts/`, and a Playwright `api`/`browser` e2e harness shape. Pairs with
the `ways-of-work` plugin (`../.claude-plugin/marketplace.json`) — the template is copy-once, the
plugin is pull-based/versioned; see the repo root README for the distinction.

## Spawn a new project from this template

1. **Create the new repo:**
   ```
   gh repo create <owner>/<new-project> --private
   git clone https://github.com/<owner>/<new-project>.git ~/dobby/<new-project>
   ```
2. **Copy this template's contents** into the new repo root (everything under `template/`, not the
   `template/` directory itself):
   ```
   cp -R template/. ~/dobby/<new-project>/
   ```
3. **Fill in every `TEMPLATE FILL-IN` marker** — grep for them: `grep -rl "TEMPLATE FILL-IN"
   ~/dobby/<new-project>/`. At minimum: `AGENTS.md`'s rules section, `Roadmap/README.md`'s mission +
   macro-sections, `Roadmap/WAYS-OF-WORKING.md`'s deploy-rail/tooling notes, and
   `.github/workflows/ci.yml.example` → rename to `ci.yml` once real app code exists.
4. **Wire the marketplace** — `.claude/settings.json` already points at this repo's `ways-of-work`
   plugin; verify the marketplace name/repo match if this template was forked/renamed.
5. **Commit + push**, then verify: `node scripts/build-order.mjs --check` (should report the board
   up to date on an empty funnel), and confirm the `build-order-guard` + `scripts-guard` GitHub
   Actions workflows go green on the initial commit.
6. **Groom your first idea** in a fresh Claude Code session — the `groom` skill should trigger from
   the marketplace-installed plugin.

## What's deliberately NOT here

- No real app code — `apps/example-app/` is the e2e harness *shape*, not a real app.
- No process content specific to the origin project's stack or brand names — verified with a grep for
  the origin project's product/stack/vendor identifiers at build time (dobby-foundation Sprint 1,
  Story 1.3; see that sprint's doc for the exact check).
- No infra-specific CI guards (the origin project's `infra-guard.yml`, `notion-sync.yml`) — those are
  specific integrations, not universal patterns. Add your own if/when you need the equivalent.
