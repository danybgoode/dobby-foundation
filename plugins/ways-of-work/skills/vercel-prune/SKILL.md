---
name: vercel-prune
description: >
  Reports stale Vercel PREVIEW deployments for a named frontend project — dry-run only, never deletes
  anything on its own. Use when the product owner asks to "check stale previews", "run vercel prune",
  "how many dead previews are there", "clean up Vercel previews", or as the nightly ops routine's
  second step. Wraps scripts/vercel-prune-previews.mjs with the open-PR-protected branch list
  computed fresh each run. --apply is a SEPARATE, human-confirmed action this skill never takes on
  its own — see Stage 3.
# Repo-local scripts this skill wraps. Paths are relative to the CONSUMING project's
# scripts/ dir — they deliberately do NOT ship inside this plugin (see the README Gotcha).
# scripts/check-skill-scripts.mjs verifies these; keep it in sync or CI fails.
requires_scripts:
  - vercel-prune-previews.mjs
---

# vercel-prune — nightly stale-preview report (dry-run by default, apply is human-gated)

> **Distribution note (dobby-foundation plugin):** this skill wraps
> `scripts/vercel-prune-previews.mjs`, which ships in the *consuming project's* `scripts/` dir, not
> inside this plugin — a project spawned from the `dobby-foundation` template gets it via
> `template/scripts/`. If the script is missing, say so and stop rather than reimplementing its
> logic inline.

> **This skill's scheduled/default action is ALWAYS a dry-run report.** `--apply` is a distinct,
> explicitly-requested action (Stage 3) that only runs when the product owner asks for it in the
> SAME conversation — never automatically, never from the nightly routine.

## Project config — TEMPLATE FILL-IN

Supply these per consuming project. This skill **refuses to guess them** — if one isn't filled in,
say which and stop.

| Value | What it is |
|---|---|
| `<VERCEL_PROJECT>` | the Vercel project whose previews this run targets. **Always pass it explicitly as `--project <VERCEL_PROJECT>`** — the underlying script carries a baked-in default from whichever project it was written for, and inheriting someone else's default silently prunes the wrong account. |
| `<PR_REPO>` | the GitHub repo whose open PRs protect a branch from pruning — the repo that actually deploys to `<VERCEL_PROJECT>` |

> One Vercel project per invocation. A project with several deployed frontends runs this once per
> frontend, each with its own `<VERCEL_PROJECT>`/`<PR_REPO>` pair — never one run assumed to cover all.

## When to run me
The product owner asks about stale Vercel previews, or the nightly **ops-nightly** routine invokes me
as its second step (dry-run report only).

## What already exists (reuse, don't rebuild)
- **`scripts/vercel-prune-previews.mjs`** — does all the actual work: pages Vercel deployments, filters
  to `target !== 'production'` (production is never touched, regardless of flags), computes age,
  respects `--keep-branch`. Dry-run by default; `--apply` is opt-in. Zero new automation needed here —
  this skill is just the two-command recipe below plus the apply-gating discipline.
- **`gh pr list`** — the source of truth for "which branches have an open PR right now" (the live
  review target that must never be pruned).

## Stage 1 — compute the keep-branch list
`gh pr list --repo <PR_REPO> --state open --json headRefName --jq '.[].headRefName'` → join the
results into a comma-separated list (empty is fine — means no open PRs).

## Stage 2 — the scheduled/default action: dry-run report (always this, never more)
`node scripts/vercel-prune-previews.mjs --project <VERCEL_PROJECT> --age 7 --keep-branch <list from
Stage 1>`

Report back: total previews scanned, count/branches flagged for removal, and confirm the open-PR
branches from Stage 1 are excluded from that list. **This step never passes `--apply`.**

## Stage 3 — apply (ONLY when the product owner explicitly asks, in this exact conversation, to actually delete)
1. Re-run Stage 1 (branch list may have changed) + Stage 2 to restate exactly what would be deleted.
2. Get one more explicit go-ahead from the product owner on that exact list.
3. Re-run with `--apply` added: `node scripts/vercel-prune-previews.mjs --project <VERCEL_PROJECT>
   --age 7 --keep-branch <list> --apply`.
4. Report the actual delete count/failures.

**Never invoke Stage 3 from the nightly routine or without a fresh, explicit ask in-conversation** —
"the nightly routine ran vercel-prune" is never sufficient authorization for `--apply`.

---

## Gotchas
- **Production deployments are never touched, by the underlying script itself** — `target ===
  'production'` is filtered out unconditionally, independent of any flag this skill passes. That's the
  real safety net; this skill's dry-run-then-human-confirm discipline is the second layer, not the
  only one.
- **An open-PR preview is the live review target — always compute `--keep-branch` fresh (Stage 1)
  before either a report or an apply.** A branch that merged since the last run should no longer be
  protected; a branch that just opened a PR must be. Don't reuse a stale keep-list from an earlier
  session.
- **The underlying script's own bare default is `--age 0`**, which flags literally every
  non-production preview, including one from a PR opened yesterday. This skill always passes `--age 7`
  to match the meaningful "stale" bar `standup.mjs` already established — don't drop that flag.
- **`--apply` deletes are irreversible and hit real Vercel infra** — this is the epic's one
  destructive-op story. Even after the first live apply is confirmed, treat every subsequent `--apply`
  as its own explicit ask, not a standing permission — the routine structurally never runs Stage 3, so
  there's no "it's already automated, skip the check" shortcut to reach for.
- **The underlying script's `--project` default is inherited, not neutral.** It was written for one
  specific Vercel project and still defaults to it, so an invocation that omits `--project` may scan
  and flag previews in an account that has nothing to do with this project. **Always pass
  `--project <VERCEL_PROJECT>` explicitly** — do not rely on the default being right, and do not
  "fix" it by editing the script from this skill. Each additional Vercel project is its own explicit
  invocation, not an extra flag on this one.
