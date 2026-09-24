# Golden Frijoles skills (`golden-frijoles/skills`, formerly dobby-foundation): Roadmap & Feature Poster

> **Mission:** one portable operating system — a Claude Code plugin marketplace and a copy-once project
> template — so every sibling project plans, builds, reviews and ships the same way without forking it.

This folder is the **product source of truth** for the foundation itself. Until 2026-09-16 the
foundation's work was planned inside one of its consumers (`medusa-bonsai`'s
`Roadmap/09-platform-infra/dobby-foundation/`, shipped 2026-07-20) — the anti-fork-drift repo planned
inside a fork. It was spawned from this repo's own `template/Roadmap/`, which dogfoods the template.

---

## How this roadmap is organized

```
Roadmap/
├── README.md                ← you are here · the poster
├── WAYS-OF-WORKING.md       ← how we plan, build, review, ship
├── LEARNINGS.md             ← the cross-cutting retro digest
├── SESSION-KICKOFFS.md      ← prompt cheat sheet for starting a session
├── 00-ideas/                ← seeds, audits, the generated BUILD-ORDER.md
├── bets/                    ← one file per wave
└── 09-platform-infra/       ← every epic here: the foundation IS platform work
```

**Levels:** `Roadmap → Macro-section → Epic → Sprint → User Story`.

---

## The macro-sections

| # | Macro-section | Covers |
|---|---|---|
| 09 | Platform & Infra | The plugin (`plugins/golden-frijoles`), the kit (`kit/` → `@golden-frijoles/kit`), the spawn template (`template/`), this repo's own CI and tooling. |

---

## Feature map

### 09 · Platform & Infra
- ✅ **Plugin marketplace**: `golden-frijoles@golden-frijoles` from `golden-frijoles/skills` (Apache-2.0), installed via `.claude/settings.json` or `claude plugin install`; Cowork `.skill` archives built reproducibly by `scripts/pack-skills.mjs`.
- 🚧 **One plugin, one install**: wave 1 ✅ (2026-09-23). The plugin ships under the product's name with tagged, pinnable releases (a version bump merged to `main` publishes and tags). The skills' scripts reach any repo as **`@golden-frijoles/kit`** on npm, built from the skills' declared closure and published from CI with verified provenance. Every skill runs a project's own copy when it has one, otherwise the pinned kit. The **`golden-frijoles` umbrella skill**, `gf-kit init`, and one install prompt checked by *running* it (Claude Code and `npx skills`) complete it. Wave 2 (one config file, setup and adjust) is re-bet at the boundary. [`golden-frijoles-plugin`](09-platform-infra/golden-frijoles-plugin/README.md)
- ✅ **Spawn template** — `Roadmap/`, `AGENTS.md`, CI guards, git hooks and scripts a new project copies once.
- ✅ **Portability guards** — `check-plugin-leaks.mjs` (origin-project residue) and `check-skill-scripts.mjs` (every skill's scripts exist).
- ✅ **Plugin audit + extraction** — every advertised skill runs (`KNOWN_ABSENT` empty; `check-skill-scripts` walks import closures, also against consumers), the advertised list is generated, and the origin's stranded rails are in the template behind committed config seams: the reporting family, routines, the hook budget, session notes, doc-format, owed-ledger, a prod-smoke engine, a fail-closed merge gate, merge-report, vercel-env and perf-probe. One implementation per rail it touched, across all three repos (each consumer's documented forks, notably the review rail, excepted). [`plugin-audit-and-extraction`](09-platform-infra/plugin-audit-and-extraction/README.md)
- ✅ **Golden Frijoles by default** — a spawned project carries the flag provider already wired: one seam (`apps/*/flags.mjs`, fallback per call, SDK imported dynamically so it loads with no `node_modules`), `scripts/preflight.mjs` as the mandate-as-a-check (fails loudly on absent config, **warns** on an unreachable deployment), `AGENTS.md` rule 1 *"never build a parallel flag store"*, the leak guard's flag-mechanism rule, and `groom` Stage 6b planning against `gf flags create` with **activation as its own step**. The Edge answer is verified by executing the published SDK, not by reading its docs. [`golden-flags-by-default`](09-platform-infra/golden-flags-by-default/README.md)
- ✅ **The build view** — a machine-readable frontmatter contract on every epic doc (`lib/roadmap-contract.mjs`), enforced by `doc-format.mjs` and born from the `groom` scaffolder; `roadmap-backfill.mjs` brought the whole corpus onto it and recorded what it could not resolve; `build-state.mjs` is the one resolver for "what is being built right now"; and `plugins/golden-frijoles/hooks/` renders it in the CLI as a Claude Mod (opt-in, deleting `hooks.json` is the kill-switch). [`build-visualization-claude-mods`](09-platform-infra/build-visualization-claude-mods/README.md)
- ✅ **Jev semantic guards** — the review guard ("did the reviewer actually review?", which gates a PR's `cross-review/<lens>` status) and the prose guard's four semantic families (invented fix, beneficiary, liveness, deadline) are decided by Jev (TypeSafe, pinned `jev-1.13.0`) in all three repos, with the regexes as the offline fallback. One zero-dependency client (`lib/jev.mjs`) and a committed per-rail kill-switch (`jev.config.json`). Every decision is logged, and every posted review carries a `<!-- jev: -->` marker. `jev-eval.mjs` replays 240 labelled fixtures offline in CI, and `jev-report.mjs` watches agreement. Measured: review 98.7% vs the regex's 87.0%, prose 86.5% vs 71.2%. [`jev-semantic-guards`](09-platform-infra/jev-semantic-guards/README.md)
- ✅ **Ways-of-work lean pass** — committed permissions with a cited deny/ask ledger (three spellings, deny **and** ask), one external general pass + one lean security lens + one fresh reviewer, a generated `WAYS-OF-WORKING`, and `epic-dod --check` for the mechanical half of the epic DoD. [`ways-of-work-lean-pass`](09-platform-infra/ways-of-work-lean-pass/README.md)

---

## Recent highlights

- **2026-09-23**: Golden Frijoles ships as a public plugin, wave 1. The repo is `golden-frijoles/skills` under
  Apache-2.0. Releases `v0.1.0`–`v0.3.0` were cut by CI, and `@golden-frijoles/kit@0.3.0` is on npm with verified
  SLSA provenance. Pasting the install prompt into Claude Code or any `npx skills` agent now installs every
  skill in a repo that has never seen this one, proven by running it in an isolated home. golden-beans runs
  three of its skills from the published kit. The one it keeps local (`build-order-sync`) was kept because a
  before/after diff showed the kit would rewrite its board.

- **2026-09-19** — the build view shipped. Epic docs now carry a **machine-readable frontmatter
  contract** (epic, sprint and per-story fields plus a six-rung `phase:` ladder), enforced by
  `doc-format.mjs` and backfilled across **188 epics / 1,454 stories** in three repos with every
  unresolved doc reported. `build-state.mjs` answers "what is being built right now" in ~60ms, and a
  Claude Mod renders it in the CLI on `turn.start`. Nothing scrapes a heading any more.
- **2026-09-19** — Golden Frijoles by default shipped. Feature flags in every spawned project are one
  provider, checked rather than described: a fresh spawn fails `scripts/preflight.mjs` with the exact
  install command and passes once a project is linked, while a Golden outage is a **warning**, never a
  failed build — proven by running 794 tests, every template check and a live server against a dead
  host. The leak that caused the epic (`lib/flags.ts` `DEFAULT_FLAGS` in the planning skill) is now a
  guard rule with its own fixtures.
- **2026-09-18** — plugin audit + extraction shipped. No skill ships dark, the skill list is generated
  rather than hand-kept in four places, and the template, the origin project and golden-beans run the same
  bytes for every rail this epic touched. The review rail is still forked, and has a seed.
- **2026-09-16** — the foundation gets its own `Roadmap/`, spawned from its own template.

## License

Apache-2.0 (`LICENSE`). "Golden Frijoles" is a trademark and is not licensed (`NOTICE`).
