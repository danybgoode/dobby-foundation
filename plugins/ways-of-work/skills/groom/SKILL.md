---
name: groom
description: >
  The front door for any new ask — feature, bug, spike, or chore. Use when the product owner
  has a raw idea in their head (or a seed in Roadmap/00-ideas/seeds) and wants to turn
  it into shippable, sliced work. Runs orientation → appetite → classification → "can we
  already do this?" → disambiguation → platform-first reframe → slicing, lands a Definition-
  of-Ready pitch in 00-ideas/seeds, and on approval scaffolds + commits the epic +
  sprint docs and emits the builder kickoff — epic-mode by default (one orchestrated run
  across the whole epic), per-sprint only as the named exception. Planning only —
  never writes code.
# Repo-local scripts this skill wraps. Paths are relative to the CONSUMING project's
# scripts/ dir — they deliberately do NOT ship inside this plugin (see the README Gotcha).
# scripts/check-skill-scripts.mjs verifies these; keep it in sync or CI fails.
requires_scripts:
  - cross-panel.mjs
  - build-order.mjs
---

# Groom — the planning front door (Cowork)

> **Role split this skill assumes:** *Cowork plans, Claude Code builds.* This skill is the
> Cowork half. It produces and edits **product docs under `Roadmap/`** and **nothing else** —
> no code, no `tasks/` engineering log (that's Claude Code's lane). The handoff is file-based:
> this skill writes (and commits) the epic + sprint docs; Claude Code reads them at session start.

> **Be a partner, not a stenographer.** Orient, suggest ideas, pull the product owner back when an ask is
> bigger/smaller than it looks, and propose the lighter path. Investment in the project beats
> order-taking. *(This is already how we work — stated here so it survives a fresh session.)*

## When to run me
The product owner says any of: "let's groom X", "I've got an idea", "new feature/bug/spike/chore", or points at
a file in `Roadmap/00-ideas/seeds/`. **One *deep* ask per run** — a portfolio pass that sequences and
lightly scopes the rest of the funnel rides along (Stage 9).

---

## Stage 0 — Orient (always, same ritual)
Read, in order, before doing anything:
1. `Roadmap/README.md` — the poster (every shipped feature, by domain). **Overlap check lives here.**
2. `Roadmap/WAYS-OF-WORKING.md` — cadence, Definition of Ready/Done, risk tiers, QA gate.
3. `Roadmap/LEARNINGS.md` — cross-cutting wisdom (esp. *"the platform-first reframe re-scopes the epic smaller"*).
4. The relevant **macro-section README** once the domain is known.
5. Team memory index, if the project keeps one (its `AGENTS.md` "Start here" names it).

State in one line what you loaded, then proceed.

## Stage 1 — Capture
Take the raw brain-dump as given (or read it from `seeds/`). Don't clean it up yet. Mirror it back in
one sentence: *"You want \<X\> so that \<Y\>. Right?"* — surface your understanding before refining it.

## Stage 1.5 — Appetite (fix the budget before the solution)
Before any solutioning, ask the Shape Up question inverted from estimation: **how much is this
problem worth?** Set `appetite: S | M | L` (WAYS-OF-WORKING → *Betting & appetite* — sessions +
an implied token band, never a time estimate). The appetite is a **creative constraint**: the
solution designed in later stages must fit it, and if it can't, the move is to narrow the problem
or cut scope — never to grow the appetite mid-shaping. An agent will eventually build anything if
allowed to tokenmaxx; the appetite is what makes the work stop, zoom out, and hammer scope
instead. Record it in the seed frontmatter.

## Stage 2 — Classify
Pick one. The class decides the downstream path:

| Class | Tell | Path |
|---|---|---|
| **Feature** | new buyer/seller/agent capability | scope doc → epic + sprint slicing |
| **Spike** | "how does X work / should it be A or B" | appetite-boxed investigation brief → **a written decision**, not code. No slicing until the decision lands. |
| **Bug** | promised behaviour missing/broken | **reproduce → root-cause → fix story + regression spec.** Single story unless it fans out into an epic. Hotfix variant (live money/auth/checkout breakage) → minimal fix, high-risk, the product owner merges. |
| **Chore** | tooling/infra/docs/deps, no user-facing change | **rationale → single story or small epic.** Usually low-risk; flag if it touches shared surface (`layout.tsx`, `middleware.ts`, deps) — those can break sibling PRs and must be announced. |

**Lane (the economics path).** Alongside the class, name which lane this ask rides — it decides
whether the betting table sees it (WAYS-OF-WORKING → *Betting & appetite*):

| Lane | Tell | Path |
|---|---|---|
| **Shaped bet** | genuinely-new / strategic (usually Feature or Spike) | full pitch (problem · appetite · bill of materials · rabbit holes · no-gos) → the betting table at a wave boundary |
| **Fixed scope** | bug, chore, well-specified story | default `appetite: S`, straight to a builder — no betting table; the escalate-don't-guess trigger is its only breaker |
| **Reactive/ops** | incident, launch support, can't wait for a wave | no shaping; log it against the current wave's budget so the economics stay visible |

> **Bug path detail.** Before proposing a fix, write the **reproduction** (exact steps + where it
> diverges from the promise) and the **root cause** (read the model/route — many "bugs" are an
> unbuilt or half-built promise, not a regression). The fix is a normal user story with an
> acceptance check and a regression spec so it can't silently come back.

> **Cross-agent planning panel — available on demand, never an obligation.** A spike's "A vs B" call can
> take a different model family's read: `node scripts/cross-panel.mjs <brief> --lens both --agent codex`.
> It is single-pass, print-only and advisory; it never gates and never writes the doc. Run it via the
> `Panel:` verb when the fork is worth it — there is **no requirement to offer it** (removed 2026-09-16:
> an advisory nicety had become a required ritual on every spike and every architecture fork).

**Optional archetype tag.** Alongside the class, an ask can also carry a *mode* tag — orthogonal, from the
role-archetypes spike decision (the origin project's `spike-role-archetypes` seed; trial
basis). Omit it for the default (Builder); only tag when it isn't.

| Archetype | What it changes |
|---|---|
| **Prototyper** | Thin, explicitly-disposable slice; minimal/optional QA; skip full DoD; low-risk; state "may never ship" up front. |
| **Builder** | *Default* — production-grade, full DoD. No tag needed. |
| **Sweeper** | Acceptance = "less code / same behavior / no regressions"; prove the old path unreachable; add a guard against it returning; shared-surface touch → announce. |
| **Grower** | Acceptance ties to a success signal/metric, not just "works"; reuse-first even stronger. |
| **Maintainer** | Security/reliability/cost/perf on a mature system; expect high-risk (Stage 6b kill-switch thinking, Opus/escalate); ties to runbook/infra skills. |

It **composes with, doesn't replace** the class above — pairs into a 2-tuple, e.g. *Chore/Sweeper*. It's a
**planning prompt, not a gate**: no new required field, no CI check, no team-mix ratios. Soft note: a
macro-section's product maturity biases which archetype to expect (pre-PMF → Prototyper/Builder; mature →
Sweeper/Maintainer) — an expectation-setter, never a rule. Archetype may *suggest* a starting model, but the
Stage 6 / Model-tiers escalation triggers (money/auth/migration/shared-infra/ambiguity) stay the hard SSOT —
referenced here, not re-encoded.

## Stage 2.5 — Orientation: can we already do this? *(do this before disambiguating)*
**Many asks aren't new features or bugs — they're orientation.** Before planning a build, ask: can the
current setup already deliver this outcome, with **existing features + communication, or a light
enhancement**, instead of net-new work?

Three buckets — name which one this ask is:
1. **Already possible today** → no build. Show the product owner *how* (the existing feature + the messaging/positioning
   that exposes it). *E.g. a "new offering" ask may already be servable via an existing primitive +
   the right listing/copy — no new code.*
2. **Light enhancement** → small story or a copy/config change on top of an existing feature, not an epic.
3. **Genuinely new** → proceed to full disambiguation + slicing.

Always present bucket 1/2 options *first* when they exist, with the trade-off ("you could ship this as
positioning today, or build the dedicated flow later"). Pulling the product owner toward the lighter path when it
exists is the job.

## Stage 3 — Disambiguate (structured Q&A)
Use the question bank below. **Ask in batches**, only the questions actually open. Resolve ambiguity
*before* planning. Make the implicit explicit so the slices are right the first time.

> **Research current reality when it matters.** If the ask leans on anything that changes or is recent —
> a protocol/standard, a payment-provider capability, a framework/library behaviour, a
> hosting-platform or auth-provider limit, or a competitor's pattern — **web-search to confirm
> the present-day facts** rather than relying on training memory. Cite what you found in the scope doc. Don't
> plan on a stale assumption.

Core bank (adapt):
- **Role & job:** which of the project's roles is this for? What job are they hiring it to do?
- **Outcome & signal:** what's true after this ships that isn't now? How will *the product owner* test it?
- **Scope boundary:** what's explicitly *in* v1 and *out*? (Write the "out" list — it prevents creep.)
- **Granularity heuristic:** at which level does the thing attach (per-account vs per-entity vs
  per-item)? Always ask it for anything configurable — the wrong level is an expensive re-shape.
- **Data model:** does the project's system of record already model this? If not, is it truly
  outside that system, or are we missing a primitive? (The project's AGENTS.md data-ownership
  rules decide.)
- **Agent surface:** how does an AI agent do this through the project's agent interface (MCP or
  equivalent), per its AGENTS rules?
- **Language & channels:** new copy follows the project's language policy (see its AGENTS.md)?
  Behaves on all the project's channels/surfaces?
- **Overlap:** does the poster already claim this? Reuse or extend, don't rebuild.

## Stage 4 — Platform-first reframe (the step that shrinks the epic)
Before slicing, **read the backend model + route first.** Per LEARNINGS this repeatedly re-scopes work
smaller (a "new feature" is often a 1-field backend change or zero new tables). Produce the
epic's **"What already exists (reuse, don't rebuild)"** list — concrete files/routes/primitives. This
is also where the bill of materials starts: system design is largely deciding which parts that
already work to keep leaning on — reuse 3 primitives before adding 10 (tissue → bone). Apply the
project's AGENTS **cannot-be-violated rules** (each consuming project names its own: which system
owns which data, the agent surface, auth, language policy). If the ask violates a rule, flag it now.

> The reuse list also names which UX rails cover this surface — CI guards (the design-token guard,
> swept-path lints), the audits lens (`00-ideas/audits/results-refresh-2026-06/`), and any
> design-language debt — using the seed template's "UX heuristics & rails check" block.

> **Panel, on demand.** This is where the expensive *architecture forks* surface — a data-ownership call,
> a new primitive, an AGENTS-rule tension, an expensive-to-reverse migration shape. Any of those is worth
> a different family's read if you want one (`node scripts/cross-panel.mjs <doc> --lens both --agent
> codex|antigravity|vibe|claude`, or the `Panel:` verb). Advisory, single-pass, never a gate, and never
> an obligation to surface — the product owner's scope-doc approval (Stage 7) stays the only gate.

## Stage 4.5 — Bill of materials (the shaping ritual, shaped-bet lane)
For a shaped bet, draft the solution as a **What / Why table — as few words as possible**, before
any slicing. This is the fat-marker sketch in table form: rough enough that the product owner can
edit it, solved enough that the parts hang together. Hand the Why column to the product owner to
edit — a Why neither of you can defend is a part you cut, and the editing is what makes both of
you think. Then stress-test it: name the **rabbit holes** (patch tricky decisions now, vet the
technical unknowns) and the **no-gos** (deliberate exclusions so the appetite holds). All three
land in the pitch (the scope-seed template carries the sections). Fixed-scope lane skips this — go
straight to the story.

## Stage 5 — Slice (skateboard → car)
Define the **thinnest end-to-end slice that actually works and ships** — the skateboard — then each
increment toward the car. Every slice is an independently testable, shippable **user story**:
> **As a** \<role\>, **I want** \<capability\>, **so that** \<outcome\>. **Acceptance:** \<plain checks the product owner can run\>.

Group stories into **sprints**. For each story **name the QA/smoke stage** (WAYS-OF-WORKING requires it):
which api spec gets added, and whether a browser smoke is owed (and to whom). Prefer pure-logic specs on
an extracted `lib/` seam (free coverage).

## Stage 6 — Risk-tier every story
Tag each **low** (docs/copy, non-commerce UI, additive agent tools behind auth, tests) or **high**
(payments / checkout / fulfillment / auth / DB migrations / shared infra / money). High → the product owner merges.
When unsure, high.

### Stage 6b — Kill-switch decision for `risk: high` (recommend, don't auto-inject)
A high-risk epic should ship behind a kill-switch — but that's **decided here at grooming**, sliced as
real work, **not** discovered as a checkbox at epic close. For any `risk: high` epic, answer one
question and **write the answer in the scope seed** (the answer is mandatory; the flag itself is not):

> *Is there a runtime seam a kill-switch can gate?*

- **Yes →** *recommend* a kill-switch **story** (the product owner evaluates it at the scope-doc gate — never
  auto-injected). Name four things:
  1. **Flag** — `<domain>.<feature>_enabled`, extending `lib/flags.ts` `DEFAULT_FLAGS` (the taxonomy
     lives in code, not in docs). Same shape as shipped `checkout.stripe_enabled` / `domain.paywall_enabled`.
  2. **Polarity** (pick the fail-open default to match intent):
     - **Kill-switch** (ship live, instantly killable) → default **`true`**, **create it ENABLED in
       every env** (switch *armed*; disabling is the deliberate kill).
     - **Enablement / dark-launch** (merge dark, activate deliberately — esp. money infra that must be
       **seeded first**) → default **`false`**, **create it DISABLED in every env**, flip on when ready.
     - A flag is **invisible until created in the flag provider** — the story must say "create it in every env."
  3. **Seam** — the single source of truth to gate (one resolver function) so UI + agent surface
     + the money path are covered by one `isEnabled('…')` check.
  4. **Mechanism** — the project's own flag rails (its AGENTS.md / WAYS-OF-WORKING names them; e.g.
     a server-side flag provider vs an Edge-compatible config for middleware seams — SDKs are often
     **not** Edge-compatible). If one mechanism is the heavier lift, name it here so the product
     owner can weigh server-side-gate vs carve-out.
- **No →** write the **one-line carve-out reason** (e.g. *DB migration — can't sit behind a runtime flag;
  reversible expand/contract instead*; *gate is the auth provider*; *no new runtime seam*).

The epic Definition of Done then only **verifies** the planned slice shipped + the flag exists — it does
**not** introduce the policy as a new build-time gate. This composes with the merge rule unchanged: the
kill-switch story rides the same `HIGH ⇒ the product owner merges`. See the ADR
`Roadmap/00-ideas/seeds/kill-switch-at-grooming.md`.

## Locate the generators — do this once, before Stage 7

`scaffold-epic.mjs`, `emit-epic-kickoff.mjs`, `emit-kickoff.mjs` and `templates/` **ship with this
skill** — the Claude Code plugin and the Cowork `.skill` archive both carry them (`node
scripts/pack-skills.mjs --skill groom` packs 12 files). What differs between hosts is *where* the
skill directory lands: under the plugin as `skills/groom/` for Claude Code, and as the skill's own
root for Cowork. So resolve the directory rather than hardcoding either shape — a path that is
correct on one host and silently wrong on the other is how Stage 7 ends up hand-written.

```bash
GROOM=""
for c in "${CLAUDE_PLUGIN_ROOT:-}/skills/groom" \
         "$HOME/mnt/.claude/skills/groom" \
         "$HOME/.claude/skills/groom" \
         "./skills/groom"; do
  [ -f "$c/scaffold-epic.mjs" ] && { GROOM="$c"; break; }
done
[ -n "$GROOM" ] || GROOM=$(find ~ /sessions -maxdepth 8 -type d -name groom \
  -exec test -f '{}/scaffold-epic.mjs' \; -print 2>/dev/null | head -1)
[ -n "$GROOM" ] && echo "groom generators: $GROOM" || echo "groom: GENERATORS NOT FOUND"
```

**If it prints `GENERATORS NOT FOUND`, stop and say so.** Do not hand-write an epic, a sprint file
or a kickoff that a generator produces — hand-composing is how the architecture-lock pass gets
summarised away and the review policy silently reverts. A missing generator is a reportable fact,
not a prompt to improvise. (If it is missing in Cowork, the install carried only `SKILL.md` — the
fix is to re-install from the `.skill` archive, not to work around it here.)

## Stage 7 — Scaffold + commit the docs (on the product owner's approval)
1. Write the **pitch** to `Roadmap/00-ideas/seeds/<slug>.md` — the Definition-of-Ready
   artifact (problem · appetite · bill of materials · rabbit holes · no-gos, plus UX heuristics ·
   acceptance criteria · the reuse list · open risks · any research citations · the Stage-2.5
   bucket). It **must start with the seed frontmatter block**
   (`title · slug · status · area · type · priority · appetite · underwritten_by · risk · epic ·
   build_order · updated` — see `Roadmap/00-ideas/README.md`); set `status: ready` here.
   `underwritten_by` stays `null` until the betting table funds it at a wave boundary. **This is the gate: nothing scaffolds until the product owner approves it.**
2. On approval, **run the scaffolder** instead of hand-rendering structure:
   ```
   node "$GROOM/scaffold-epic.mjs" --slug <epic-slug> --area <NN> \
     --macro <NN-macro> --title "<Epic title>" --risk <low|high> \
     --type <feature|spike|bug|chore> --sprints "S1 title;S2 title;S3 title"
   ```
   `--type` should match the Stage 2 classification decided earlier (default `feature` if omitted — don't
   leave it at the default for a Chore/Bug/Spike epic). It creates `Roadmap/<NN-macro>/<epic-slug>/README.md`
   + `sprint-1..N.md` + a `RETROSPECTIVE.md` stub from the skill's own `templates/`, and prints the exact
   path-scoped commit command. Fill the generated files with the real stories / reuse list / QA stages —
   the script makes the skeleton, you make the content.
3. **Update the seed:** set its frontmatter `epic: "<NN-macro>/<epic-slug>"` (and `status: scaffolded` for
   tidiness). **Once `epic:` is set the seed is funnel-only** — the **epic README frontmatter `status:`** (the
   scaffolder writes it `scaffolded`) is now the authoritative status, advanced to `shipped` at epic close.
   **Never move the seed between folders** — frontmatter carries lifecycle (this is what stopped 00-ideas drifting).
4. **Commit it.** `Roadmap/` is tracked in git — commit the scaffold so a fresh worktree/agent inherits the
   product context. **Commit only your own paths** — never `git add Roadmap/` or `git add -A` (a shared
   planning worktree races the index → "another git process is running" / index lock). Use the command the
   scaffolder prints, e.g.:
   `git add <the files you scaffolded> <the seed> && git commit -- <those paths> -m "plan(<epic-slug>): scaffold epic + sprints"`.
   For parallel planning, run in your own `git worktree`, or let one **scribe** own shared files like
   `BUILD-ORDER.md`. Docs are low-risk tier.

## Stage 8 — Emit the builder kickoff

> **Epic mode is the DEFAULT.** A whole epic in one orchestrated session is the normal unit of work;
> the sprint documents are integration, review and rollback boundaries *inside* that run, not separate
> engagements. Per-sprint kickoffs are the **named exception**, not the baseline — reach for them only
> when the epic is one sprint, or when a sprint's outcome genuinely changes the next sprint's scope (so
> the next kickoff honestly can't be written yet). Say which mode you're emitting, and why, if it's the
> exception. (The repository's own `Roadmap/WAYS-OF-WORKING.md` → *Epic-mode builds* is authoritative
> for the SOP; this skill emits the prompt, it doesn't re-specify the process.)

### 8a — Epic mode (default)
**Run the generator, don't hand-write it** — a hand-composed epic prompt is exactly where the
architecture-lock pass gets summarised away and the review policy reverts to whatever the composing
agent happened to remember:

```
node "$GROOM/emit-epic-kickoff.mjs" --epic <epic-slug>
```

It searches `Roadmap/*/<epic-slug>/` for the epic dir, reads the epic README (frontmatter, H1 title,
risk tier) and **every** `sprint-N.md` (numerically ordered — the stacked-branch order depends on it),
and prints one whole-epic orchestrator prompt to stdout. Paste it as-is. What it carries, and why each
part is non-negotiable:

| The prompt says | Because |
|---|---|
| **Lock `D1…Dn` against live code + live data before any builder starts** | The highest-leverage act in the run. A builder that re-derives a decision drifts from it; a paraphrased contract drifts permissive. |
| **Disprove scope during the lock** | Scaffolded acceptance criteria routinely describe a guard, table or flag the live system doesn't have. Correct the doc, out loud. |
| **Stack the branches** `feat/<slug>` → `-s2` → `-s3` | Sprints in one epic share hot files by construction. Siblings off one base pay a per-merge conflict tax — stack or pay. |
| **Two external review passes per PR, routed** | See 8c. The orchestrator does **not** spawn its own reviewers by default. |
| **Merges pre-authorized on green** | Removes the round-trip at each sprint boundary, not the gate or the review layers. |
| **Done means shipped** | A merged PR that hasn't deployed, a migration written but not applied, a flag that exists only in code — none of those are done. |

### 8b — Per-sprint mode (the exception)
```
node "$GROOM/emit-kickoff.mjs" --epic <epic-slug> --sprint <N>
```
Reads the epic README + that one `sprint-<N>.md` and substitutes the sprint-specific delta into
`templates/kickoff.md`.

**The documented shape below is the SSOT that generator reproduces — it's the fallback if the
script is unavailable, not the primary path:**

```
Read AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
Then read Roadmap/<NN-macro>/<epic-slug>/README.md and Roadmap/<NN-macro>/<epic-slug>/sprint-<N>.md.

You're building Sprint <N> of "<epic title>". Enter plan mode, confirm the plan as user stories with me,
then branch feat/<epic-slug> off latest main and build one story at a time per WAYS-OF-WORKING. If you're one
of several builders running in parallel, work in your own isolated `git worktree`, not the shared root
checkout.
Reuse before rebuild (see "What already exists"). Escalate rather than guess: stop and ask / hand back to
Opus on payments / checkout / fulfillment / auth / DB migrations / shared infra / money, plan ambiguity, a
decision the plan doesn't cover, or 2+ failed attempts at the same problem — default to escalate when unsure
(WAYS-OF-WORKING → Model tiers). Commit per story with path-limited adds
(`git add <your files>` + `git commit -- <those paths>`, never `git add -A` — a shared worktree races the
index). Follow this project's own copy/localization conventions (see AGENTS.md). Add one api spec per testable story; name the
QA/smoke stage and state any browser smoke owed to me. When the deterministic gate (tsc + build + Playwright
api) is green, open a draft PR declaring the risk tier — and write the SPRINT SMOKE WALKTHROUGH (below) into
sprint-<N>.md before you call the sprint done.
```

The invariant preamble (line 1 of the prompt — the orientation reads + skim memory) is the same every
session; it stays in the prompt so a *fresh* builder session re-orients with zero prior context. Keep
the sprint-specific delta (this epic, this sprint, its reuse list, its risk) as the part that actually varies.

### 8c — The review policy both kickoffs carry
Name it in the prompt; don't leave the builder to remember it. **Two cross-family passes per PR**,
chosen by the router — never picked by hand:

```
node scripts/review-route.mjs --builder <who-wrote-it> --tier <low|high> <PR#>
```

Four rules, and the second and fourth are the recent changes:
1. **A family never reviews its own diff.** With several families building, the default reviewer flag on
   a same-family diff is a same-family pass wearing a cross-family label — a silent downgrade.
2. **Two external passes, not one, and the orchestrator does NOT spawn its own reviewer subagents on a
   LOW-tier PR.** Running the external passes *and* parallel subagent reviewers on every build was paying
   twice for one read.
3. **On HIGH tier the fresh reviewer subagent is still mandatory**, on top of the two external passes.
   Money / auth / migrations / shared infra is where context independence catches what every external
   family misses; family independence and context independence are different properties.
4. **A capped family is a REFUND ASK, not a licence to substitute.** External quota is refundable in
   minutes; orchestrator subagent tokens come out of the build budget. Stop, ask, and proceed with
   subagents only after the stated window — recording the downgrade in the PR body, because a missing
   layer that reads like a clean one is worse than no layer.

**Orchestrating more than one builder at once?** Before spawning a second parallel kickoff, read
WAYS-OF-WORKING → *Wakeup-resilient orchestration* — the three survival rules in one line: isolated
worktrees per builder, worker death is a normal case (diff the tree, resume the same agent id from its
transcript with a state recap, never re-spawn cold), and verify by re-deriving actual repo state, never
by trusting a worker's own completion report.

**Model tiers — route by hill position:** uphill work (unknowns being figured out — the groom/plan,
any spike, anything not yet "solved" in the pitch) runs on the **strongest planning tier** and is
never delegated; downhill work (known execution against an approved plan) runs on the **builder
tier**. The kickoff already opens in plan mode, so judgment still happens up front, and the kickoff
prompt above carries the escalate-don't-guess triggers so a builder hands back rather than guessing —
a scope that stops moving is a raised hand, not a reason for more tokens. (Planning here in Cowork;
building in Claude Code. Full trigger list + rationale: WAYS-OF-WORKING → Model tiers — one SSOT,
don't fork a second copy here.)

For a **spike**, emit instead a short investigation prompt that ends in a written decision in the scope
doc — no branch, no build.

### Stage 8b — The sprint-end smoke walkthrough (fool-proof, real URLs)
Every sprint closes with a **step-by-step manual walkthrough the product owner can follow blind**, written into
`sprint-N.md`. Once deployed, it uses **real production URLs** (preview URLs while pre-merge). Format —
numbered, one action + one expected result per step, no jargon:

```
## Sprint <N> — Smoke walkthrough (do these in order)
Env: production · https://<prod-domain>   (or the preview URL while testing pre-merge)

1. Go to https://<prod-domain>/<path-to-the-new-thing>
   → You see the new "<thing>" section.
2. Click "<button>".
   → A <result> appears within ~2s.
3. Open https://<the-other-surface>.<prod-domain> in a private window.
   → The <feature> renders as promised on that surface too.
4. (money path, if any) Drive the real flow with the provider's test credentials.
   → The confirmation the user would see arrives; the owning screen shows <field>.

If any step fails, note the step number + what you saw — that's the bug report.
```

Rules: real clickable URLs (not "the settings page"); the exact button/label; the observable result; and
call out which steps are the **money/auth path** (those are the ones an automated browser smoke can't fully
cover, so they're owed to the product owner by name).

---

## Stage 9 — Close the loop: backlog cadence + next-session handoff

**The backlog keeps growing.** The product owner routinely drops a *batch* of prioritized asks at once.

> **Cadence updated (2026-08-08) — what batches, and what doesn't.** This stage used to read "we do
> **not** groom a batch in one session," which contradicted the consuming project's own
> WAYS-OF-WORKING (updated 2026-07-14): *with a strong planning model, the default is a **single-session
> groom** — one deep Definition-of-Ready groom for the front-of-queue epic plus a portfolio pass that
> seeds/resequences the rest of the funnel.* The skill was the stale half. Reconciled here.
>
> The discipline that does **not** change is **one *deep* ask per run** (Stage 0). What batches is the
> funnel bookkeeping — sequencing, appetite, lane, and a light scope pass on items that aren't at the
> front yet. Deep-groom later items when they *reach* the front.
>
> **The compaction call belongs to the agent, not the calendar.** A single-session groom that has
> produced several scaffolded epics is exactly the shape LEARNINGS warns about under *Working
> efficiently*. Say out loud when the session should compact or hand to a fresh one — the durable
> state (seeds, epic docs, the bets file) makes re-entry cheap by design, which is what makes calling
> it early free.

The cadence:

1. **Agree a consolidated build order first** (a separate evaluation pass — consolidate overlaps, sequence
   by dependency/leverage), and **persist it in the seed frontmatter** (`build_order` = the integer
   sequence; `priority` = the wave it's slated for) — that's the SSOT the board sorts by.
   `BUILD-ORDER.md` is **generated** from it (`node scripts/build-order.mjs`); never hand-edit the board.
2. **One deep groom per run, plus a portfolio pass over the rest.** Deep-groom the front-of-queue item
   to full Definition of Ready; for the others, set sequence, appetite, lane and enough scope to be
   bettable — then stop. A seed that is deep-groomed months before it is built is a seed that will be
   re-groomed anyway.
3. **Let a seed's own words reclassify it.** A raw seed that says "a spike is the honest first move"
   or "worth a discovery pass before it is bet" is telling you it is not a build epic. Scaffolding it
   as one is inventing scope the seed itself flagged as unvalidated — reclassify to `type: spike` and
   shape an investigation brief instead.
4. **Scaffolded ≠ bet.** An epic may be scaffolded with `underwritten_by: null` — docs ready, bet not
   yet placed — so the next betting table is a three-line decision rather than a fresh groom. The
   board shows it under *scaffolded, not started*, which is the truthful bucket. Only `status: queued`
   hard-requires an `appetite:`.
5. **At the end of every groom run, do BOTH:**
   - Emit the **Claude Code build/investigation handoff** for each item groomed to scaffold (Stage 8).
   - **Regenerate the board** (`node scripts/build-order.mjs`) so the groomed items move bucket from the
     frontmatter change — never hand-tick it — and emit a **next-session Cowork handoff prompt** for the
     **next ⬜ item** in the order. The handoff prompt references the docs that
     already exist (`BUILD-ORDER.md` as a generated read-only view, the relevant `seeds/` seed, the orientation
     files) so the next session re-enters with zero re-derivation. Template:

   ```
   We're working the agreed build order in Roadmap/00-ideas/BUILD-ORDER.md.
   The last groomed item was <#X · name> — <status>.

   Groom the next ⬜ item: <#Y · name>.
   Read first, in order: Roadmap/00-ideas/BUILD-ORDER.md, then Stage 0 orientation
   (README.md, WAYS-OF-WORKING.md, LEARNINGS.md), then the scope seed
   Roadmap/00-ideas/seeds/<seed>.md and any primitives it names.
   Then run /groom on <#Y> — one ask, the normal stages — and stop at the scope-doc gate for my sign-off.
   ```

If no `BUILD-ORDER.md` exists yet (a one-off ask, not a batch), skip this stage — just close normally.

---

## Guardrails
- **Planning only.** Never edit code or `tasks/`. Only `Roadmap/` docs.
- **Reference end-states are inspiration, never signed-off scope.** (Their own guard against doc-drift.)
- **Orientation before building.** Always check Stage 2.5 — the lightest path that hits the outcome wins.
- **Every plan names a QA stage and ships a smoke walkthrough.**
- **Research present-day facts** when the ask leans on anything recent or changing.
- **One *deep* ask per run.** Resist scope-merging two ideas. Several items may be *sequenced* and
  lightly scoped in one run; only one gets the full Definition-of-Ready treatment.
- **Batch backlogs → sequence the batch, deep-groom the front.** When the product owner drops many
  asks, agree + persist the build order (`build_order` integers in seed/epic frontmatter, board
  regenerated), deep-groom the front-of-queue item, portfolio-pass the rest, and **call the
  compaction point yourself** when the session has produced enough durable state to re-enter cheaply
  (Stage 9).

## Definition of Ready this skill must hit before scaffolding
- "As a / I want / so that" clear; acceptance testable by the product owner.
- **Appetite recorded** (Stage 1.5) and the lane named (shaped bet / fixed scope / reactive).
- **For a shaped bet: the pitch is complete** — bill of materials (What/Why, product-owner-edited),
  rabbit holes, no-gos (Stage 4.5).
- Stage-2.5 bucket named (already-possible / light / new).
- v1 in/out boundary written; research cited where relevant.
- Reuse list produced (platform-first reframe done).
- Each story risk-tiered; QA stage named; smoke-walkthrough owner identified.
- **For a `risk: high` epic: the kill-switch decision is recorded** (Stage 6b) — either a recommended
  flag story (flag · polarity · seam · mechanism) or a one-line carve-out reason.
- the product owner approved the scope doc.
