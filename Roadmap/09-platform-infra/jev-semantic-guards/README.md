---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: jev-semantic-guards
build_order: 7
title: "Jev semantic guards — review-guard and prose-guard decide with Jev, not regex"
area: 09-platform-infra
risk: high
type: feature
phase: Shaping
sprints_total: 5
stories_total: 15
---

# Epic: Jev semantic guards — review-guard and prose-guard decide with Jev, not regex

> **Area:** 09-platform-infra · **Risk:** high · **Class:** Feature · **Archetype:** Grower · **Scope seed:** [`00-ideas/seeds/jev-semantic-guards.md`](../../00-ideas/seeds/jev-semantic-guards.md)
> **Appetite:** L (two waves, re-bet at the boundary — S1–S4 wave 1, S5 wave 2) · **Bet:** [`bets/wave-2026-09-19.md`](../../bets/wave-2026-09-19.md)

## Why

Two guards that decide things on every PR and every report — "did the external reviewer actually
review?" and "does this standup invent a fix, a beneficiary, a live capability or a deadline?" — make
**language** judgements with regexes. They fail in both directions (2026-09-19: a real prose review
rejected, a timed-out one accepted). This epic makes **Jev** (TypeSafe's typed-judgement model) the
decider for those semantic questions across the template, `medusa-bonsai` and `golden-beans`, with the
regexes kept only as the fallback when Jev cannot be reached. A short, CI-expiring shadow period
measures the swap; promotion to production is part of this epic, not a later bet (product owner,
2026-09-19).

## Platform-first note

No new store, no new dependency. The guards stay pure functions (`assertReviewOutput`, `checkProse`)
and become the fallback; new async `judge*` functions sit beside them and call Jev through one zero-dep
`fetch` client. The switch is a committed config line, not the flag provider — these run in scripts and
routines, not app runtime, and `golden-flags-by-default` has not shipped.

## What already exists (reuse, don't rebuild)
- `template/scripts/lib/review-guard.mjs` — `assertReviewOutput` (fallback), `reviewMarker` (pattern for the jev marker)
- `template/scripts/cross-review.mjs:429` — the one review-guard call site; failure status + "never destroy a paid reply" untouched
- `template/scripts/lib/prose-guard.mjs` — `checkProse`, `sentences()`, `findingsToRevisionNote`
- `template/scripts/lib/prose-writer.mjs` (`guard` already injectable via `deps`), `standup.mjs:555`, `weekly-recap.mjs:472`
- `scripts/check-skill-scripts.mjs` — enforces the new `lib/jev.mjs` import closure once declared
- `template/.gitignore` — already ignores `.env.local`; widen to `.env*.local` + `.jev/`
- The 2026-09-19 probe (audit §1): API contract proven, 0.37–0.48 s, 324–583 input tokens/call

## Scope — stories
| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 Jev client · 1.2 config + kill-switch · 1.3 decision log · 1.4 eval harness + shadow expiry | low |
| 2 | 2.1 `judgeReviewOutput` · 2.2 wire cross-review + PR marker · 2.3 backtest | high |
| 3 | 3.1 `judgeProse` · 3.2 wire the three prose callers | low |
| 4 | 4.1 medusa-bonsai · 4.2 golden-beans · 4.3 routine key + shadow on | high |
| 5 | 5.1 agreement report + labels · 5.2 thresholds · 5.3 flip to `jev` everywhere, regex fallback-only | high |

## Deploy order

Template first (S1–S3), consumers after (S4) — each consumer ships with `mode: shadow` and degrades to
today's behaviour with no key. Wave 2 (S5) flips `mode: jev` in the template and both consumers in one
coordinated PR set. There is no app deploy; "shipped" = merged to `main` in each repo with the config set.

## Definition of Done (epic)
- [ ] All sprints merged to `main` + smoke-tested (gaps stated — `node scripts/owed-ledger.mjs` counts what is still owed)
- [ ] Each `sprint-N.md` has its smoke walkthrough (real URLs)
- [ ] This README marked ✅; every sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Product poster (`Roadmap/README.md`) updated
- [ ] Team memory + `MEMORY.md` index updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch (Stage 6b):** `jev.config.json → rails.<review|prose>.mode` exists in all three repos,
      `off` in the template; setting it to `off` restores today's regex-only behaviour (proven by test).
- [ ] **Promotion done, not deferred:** `mode: jev` live for both rails in all three repos; no rail left
      in `shadow` (the `shadowExpires` CI check would fail otherwise); the agreement report is linked here.
- [ ] Feature branch deleted; **this README's frontmatter `status: shipped`** (the SSOT — the board & Notion derive from it; run `node scripts/build-order.mjs`)
