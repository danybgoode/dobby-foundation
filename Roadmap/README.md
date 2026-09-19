# dobby-foundation — Roadmap & Feature Poster

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
| 09 | Platform & Infra | The plugin (`plugins/ways-of-work`), the spawn template (`template/`), this repo's own CI and tooling. |

---

## Feature map

### 09 · Platform & Infra
- ✅ **Plugin marketplace** — `ways-of-work` skills installed via `.claude/settings.json`; Cowork `.skill` archives built reproducibly by `scripts/pack-skills.mjs`.
- ✅ **Spawn template** — `Roadmap/`, `AGENTS.md`, CI guards, git hooks and scripts a new project copies once.
- ✅ **Portability guards** — `check-plugin-leaks.mjs` (origin-project residue) and `check-skill-scripts.mjs` (every skill's scripts exist).
- ✅ **Plugin audit + extraction** — every advertised skill runs (`KNOWN_ABSENT` empty; `check-skill-scripts` walks import closures, also against consumers), the advertised list is generated, and the origin's stranded rails are in the template behind committed config seams: the reporting family, routines, the hook budget, session notes, doc-format, owed-ledger, a prod-smoke engine, a fail-closed merge gate, merge-report, vercel-env and perf-probe. One implementation per rail it touched, across all three repos (each consumer's documented forks, notably the review rail, excepted). [`plugin-audit-and-extraction`](09-platform-infra/plugin-audit-and-extraction/README.md)
- ✅ **Ways-of-work lean pass** — committed permissions with a cited deny/ask ledger (three spellings, deny **and** ask), one external general pass + one lean security lens + one fresh reviewer, a generated `WAYS-OF-WORKING`, and `epic-dod --check` for the mechanical half of the epic DoD. [`ways-of-work-lean-pass`](09-platform-infra/ways-of-work-lean-pass/README.md)

---

## Recent highlights

- **2026-09-18** — plugin audit + extraction shipped. No skill ships dark, the skill list is generated
  rather than hand-kept in four places, and the template, the origin project and golden-beans run the same
  bytes for every rail this epic touched. The review rail is still forked, and has a seed.
- **2026-09-16** — the foundation gets its own `Roadmap/`, spawned from its own template.

## License

Private/internal tooling for the `~/dobby/` sibling projects.
