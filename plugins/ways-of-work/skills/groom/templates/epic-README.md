---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: {{SLUG}}
---

# Epic: {{TITLE}}

> **Area:** {{MACRO}} · **Risk:** {{RISK}} · **Class:** {{TYPE}} · **Scope seed:** [`00-ideas/seeds/{{SLUG}}.md`](../../00-ideas/seeds/{{SLUG}}.md)
<!-- Class (above) is the Stage-2 classification: Feature, Spike, Bug, or Chore — see SKILL.md's
     Stage 2 table; sourced from scaffold-epic.mjs's --type flag (a fixed 4-value enum, not free
     text — a longer description belongs in ## Why, not here).
     Optional: if this epic was ALSO tagged with an archetype at grooming (see spike-role-archetypes.md),
     append " · **Archetype:** <Prototyper|Builder|Sweeper|Grower|Maintainer>" after Class. Omit entirely
     for the Builder default — untagged is fine.
     Scope-seed link: always points at seeds/ (the forward path per 00-ideas/README.md — `2. readyforscope/`
     is documented legacy). If this epic was scaffolded from a readyforscope doc with no seeds/ entry,
     link there instead and migrate to seeds/ when convenient — don't fabricate a seeds/ file that doesn't
     exist. -->

## Why
<!-- One paragraph: the outcome this epic delivers and for whom. Plain product language, no tech. -->

## Medusa-first note
<!-- Does Medusa already model this? Which primitive backs it? (AGENTS rule #1) -->

## What already exists (reuse, don't rebuild)
<!-- Concrete files / routes / primitives the Medusa-first reframe surfaced. -->
-

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
{{SPRINT_LIST}}

## Deploy order
<!-- Backend-first? Frontend degrade gracefully? Preview vs prod. -->

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch (only if one was planned at grooming — Stage 6b):** the flag slice shipped + the flag
      exists in Flagsmith / Edge Config with the stated polarity. *Verify-only — not a new gate; whether a
      high-risk epic needs one is decided at grooming, not here.*
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
