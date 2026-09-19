# Jev semantic guards — Sprint 3: Prose guard on Jev (semantic families)

**Status:** ⬜ not started

## Stories

### Story 3.1 — `judgeProse()` in `prose-guard.mjs`
**As the** reporting rail, **I want** the four semantic families — unsupported fix claim, invented beneficiary, flag-state claim, invented commitment — judged by one batched Jev call (one Noul per sentence per family, evidence pack as `state`), **so that** honest negations stop tripping the guard and paraphrased inventions stop slipping past it.
**Acceptance:** mechanical rules (length, banned phrases, tool names, unfinished) stay in code and always run; `checkProse` byte-unchanged and every existing prose-guard spec passes; `jev` mode emits the same finding codes and revision notes, quoting the offending sentence; claim threshold `noul ≥ 0.5`, regex per-family fallback on could-not-look; invented-commitment still has no evidence flag that disables it.
**Risk:** low

### Story 3.2 — Wire the prose callers
**As the** product owner, **I want** prose-writer, standup and weekly-recap to use the judge, **so that** every report and retro draft is guarded the same way.
**Acceptance:** `prose-writer.mjs` default `guard` becomes the async judge (the retry loop awaits it); `standup.mjs:555` and `weekly-recap.mjs:472` await it; each decision logged with `rail:"prose"`; a draft that the regex rejected and Jev accepts in `shadow` still takes the revision pass (regex decides in shadow).
**Risk:** low

## Sprint QA
- **specs:** `node --test` beside each new module — Jev is injected (`fetch` stub), CI never calls the network
- **browser smoke owed:** no — no UI
- **deterministic gate:** `node --test template/scripts` + `node scripts/check-skill-scripts.mjs` + `node scripts/check-plugin-leaks.mjs` green before merge

## Sprint 3 — Smoke walkthrough (do these in order)
Env: a local checkout of the repo named in each step, with `TYPESAFE_API_KEY` in `.env.local`.

1. Run `node scripts/jev-eval.mjs --live --rail prose`
   → per-family accuracy printed, incl. the "rather than anything a shopper would see" negation case scored as allowed.
2. With `rails.prose.mode: shadow`, run `node scripts/standup.mjs --dry-run`
   → the draft prints; `.jev/decisions.jsonl` gains `rail:"prose"` lines.
3. Set `mode: jev`, re-run step 2
   → stderr names `jev` as the decider for each semantic family.

If any step fails, note the step number + what you saw — that's the bug report.
