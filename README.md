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

### Cowork needs a separate install — `.claude/settings.json` does NOT reach it

Everything above is **Claude Code's** mechanism. Cowork loads its own installed-skill set from the
desktop app and never reads a repo's `.claude/settings.json`, so a project can have this plugin
enabled for months and Cowork will still not see it.

That matters most for exactly one skill. `groom` is titled *"the planning front door (Cowork)"* and
states the role split **"Cowork plans, Claude Code builds"** — the one skill written for Cowork was
the one Cowork could not load. Discovered 2026-08-06, after many sessions in which the Claude Code
half worked fine and hid it.

Cowork installs a skill from a `.skill` file — a zip of a skill directory containing `SKILL.md`,
which renders in chat with a **Save skill** button. Build them:

```
node scripts/pack-skills.mjs                 # every skill -> dist/
node scripts/pack-skills.mjs --skill groom   # just the one you need
```

Then attach the `.skill` file in a Cowork session and click **Save skill**. Archives are
byte-for-byte reproducible, so rebuilding without a source change is a no-op rather than noise.

## Origin

Extracted from `medusa-bonsai` (`danybgoode/miyagi-product-management`) as the S0 workstream of the
`dobby-foundation — portable ways-of-work` epic
(`Roadmap/09-platform-infra/dobby-foundation/`), so a second project (and any future one) can build
inside the same operating system without forking it. The full rationale lives in that repo's scope
seed under `Roadmap/00-ideas/seeds/`, found by slug — seeds carry their lifecycle in frontmatter
(`status:`), so there are no stage folders to look in.

## Guard — keep it portable

```
node scripts/check-plugin-leaks.mjs
```

Everything under `plugins/`, `template/`, `.claude-plugin/` and this README ships to consuming
projects, so it must not name the project this was extracted from — its app paths, repo list, auth
provider, chat destination, or any person. The guard sweeps for that residue and fails CI on a new
match. A skill should state the **shape** it needs as a named `TEMPLATE FILL-IN` and let the
consuming project supply the value; the concrete values belong in *that* project's own docs.

Deliberate matches (provenance prose, the `author` fields) live in the script's `ALLOW` list, each
with a written reason. A stale `ALLOW` entry fails too — the allowlist has to keep describing the
repo as it actually is. CI also runs the groom generator's tests and renders a throwaway epic to
prove the scaffolder templates still substitute.

## Guard — the skill/script contract

```
node scripts/check-skill-scripts.mjs                        # audits template/ (the CI gate)
node scripts/check-skill-scripts.mjs --repo-root <project>  # audits a consuming project
```

Each skill in `plugins/ways-of-work/skills/` wraps a repo-local script (`scripts/<name>.mjs`) that
does **not** ship inside the plugin — plugins are copied to a cache dir on install, so a skill can't
reach `../scripts/` outside its own directory. The script lives in the *consuming project's*
`scripts/` dir instead (a project spawned from `template/` gets them via `template/scripts/`). If
the script is missing, the skill says so and **stops** rather than reimplementing its logic inline.

Every skill declares that dependency in its `SKILL.md` frontmatter:

```yaml
requires_scripts:
  - standup.mjs
  - lib/log-branch.mjs
```

**Why this replaced the prose "Distribution note":** the contract used to live only in sentences,
and prose is not checkable. Nothing noticed that **eight of the ten skills had no script anywhere** —
not in a consuming project, and not in `template/` either. Every project spawned from this repo got
eight skills that could never run, and a whole portability bet swept sixteen files without catching
it. One registry the checker walks means a new skill inherits the check instead of needing someone
to remember it.

The eight are recorded in the script's `KNOWN_ABSENT` ledger with a reason and report as `debt`, so
CI is **green on today's known state and red on anything new** — a permanently-red check is worse
than no check. What fails: a newly missing script, a skill that declares nothing at all, and a
ledger entry whose debt was quietly paid. **They are dark, not working** — porting them is
outstanding work, not a documentation problem to reword away.
