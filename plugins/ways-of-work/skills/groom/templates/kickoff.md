Read AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
Then read Roadmap/{{MACRO}}/{{SLUG}}/README.md and Roadmap/{{MACRO}}/{{SLUG}}/sprint-{{N}}.md.

You're building Sprint {{N}} of "{{EPIC_TITLE}}". Enter plan mode, confirm the plan as user stories with me,
then branch feat/{{SLUG}} off latest main and build one story at a time per WAYS-OF-WORKING. If you're one of
several builders running in parallel, work in your own isolated `git worktree`, not the shared root checkout.
Reuse before rebuild (see "What already exists"). Escalate rather than guess: stop and ask / hand back to
Opus on payments / checkout / fulfillment / auth / DB migrations / shared infra / money, plan ambiguity, a
decision the plan doesn't cover, or 2+ failed attempts at the same problem — default to escalate when unsure
(WAYS-OF-WORKING → Model tiers). Commit per story with path-limited adds
(`git add <your files>` + `git commit -- <those paths>`, never `git add -A` — a shared worktree races the
index). Follow this project's own copy/localization conventions (see AGENTS.md). Add one api spec per testable story; name the
QA/smoke stage and state any browser smoke owed to me. When the deterministic gate (tsc + build + Playwright
api) is green, open a draft PR declaring the risk tier, then flip it ready-for-review — and write the SPRINT
SMOKE WALKTHROUGH (below) into sprint-{{N}}.md before you call the sprint done.
Review is three layers (WAYS-OF-WORKING → Review & merge): CI always; the cross-agent pass
(`node scripts/cross-review.mjs <PR#>`) is MANDATORY on every PR — every finding fixed, or answered on the PR
with why it isn't a bug, before merge; the fresh `pr-reviewer` subagent is mandatory on HIGH tier and optional
on LOW (if you skip it on a LOW PR, say so in the PR body with the reason). You never merge your own PR.

Sprint {{N}} of "{{EPIC_TITLE}}" — "{{SPRINT_TITLE}}" — stories:
{{STORY_LIST}}
