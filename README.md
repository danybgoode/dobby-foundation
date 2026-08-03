# dobby-foundation

Portable ways-of-work for the `~/dobby/` sibling-repo workspace (`medusa-bonsai`, `golden-beans`, and
future isolated projects). Two layers, built in strict order:

1. **A Claude Code plugin marketplace** (`.claude-plugin/marketplace.json` + `plugins/ways-of-work/`)
   — the *living* skills: groom, doc-hygiene, standup-post, weekly-recap, babysit-pr,
   build-order-sync, vercel-prune, live-smoke, pmo-report. Installed once per project, updated from
   this one place — a groom improvement lands here and reaches every consuming project, no fork drift.
2. **A project template** (`template/`, story 1.3) — the *copy-once* skeleton a new project spawns
   from: generalized `Roadmap/` (WAYS-OF-WORKING, LEARNINGS, `00-ideas` funnel), an `AGENTS.md`
   skeleton with a per-project rules slot, CI workflows, `scripts/`, and the Playwright `api` harness
   shape.

## Consume the marketplace

```
/plugin marketplace add danybgoode/dobby-foundation
/plugin install ways-of-work@dobby-foundation
```

Or checked into a project's `.claude/settings.json` (team-shared, zero manual step per session):

```json
{
  "extraKnownMarketplaces": {
    "dobby-foundation": { "source": { "source": "github", "repo": "danybgoode/dobby-foundation" } }
  },
  "enabledPlugins": { "ways-of-work@dobby-foundation": true }
}
```

## Origin

Extracted from `medusa-bonsai` (`danybgoode/miyagi-product-management`) as the S0 workstream of the
`dobby-foundation — portable ways-of-work` epic
(`Roadmap/09-platform-infra/dobby-foundation/`), so a second project (and any future one) can build
inside the same operating system without forking it. The full rationale lives in that repo's scope
seed under `Roadmap/00-ideas/seeds/`, found by slug — seeds carry their lifecycle in frontmatter
(`status:`), so there are no stage folders to look in.

## Gotcha

Each skill in `plugins/ways-of-work/skills/` wraps a repo-local script (`scripts/<name>.mjs`) that
does **not** ship inside the plugin — plugins are copied to a cache dir on install, so a skill can't
reach `../scripts/` outside its own directory. The script lives in the *consuming project's*
`scripts/` dir instead (medusa-bonsai has them today; a project spawned from `dobby-foundation/template/`
gets them via `template/scripts/`). Each skill's `SKILL.md` carries a "Distribution note" stating this
and its specific script dependency — if the script is missing in a given project, the skill says so
and stops rather than reimplementing its logic inline.
