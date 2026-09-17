Read AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
Then read Roadmap/{{MACRO}}/{{SLUG}}/README.md and Roadmap/{{MACRO}}/{{SLUG}}/sprint-{{N}}.md.

You're building Sprint {{N}} of "{{EPIC_TITLE}}". Enter plan mode, confirm the plan as user stories with me,
then branch feat/{{SLUG}} off latest main and build one story at a time per WAYS-OF-WORKING. If you're one of
several builders running in parallel, work in your own isolated `git worktree`, not the shared root checkout.
Reuse before rebuild (see "What already exists"). Escalate rather than guess: stop and hand back on any trigger in
the ONE list, WAYS-OF-WORKING → *Escalate, don't guess* — default to escalate when unsure. Commit per story with path-limited adds
(`git add <your files>` + `git commit -- <those paths>`, never `git add -A` — a shared worktree races the
index). Follow this project's own copy/localization conventions (see AGENTS.md). Add one api spec per testable story; name the
QA/smoke stage and state any browser smoke owed to me. When the deterministic gate (tsc + build + Playwright
api) is green, open a draft PR declaring the risk tier, then flip it ready-for-review — and write the SPRINT
SMOKE WALKTHROUGH (below) into sprint-{{N}}.md before you call the sprint done.
Review (WAYS-OF-WORKING → Review & merge): CI always, plus TWO cross-family passes on every PR — run
`node scripts/review-route.mjs --builder <who-wrote-it> --tier <low|high> <PR#>` and use the reviewers it
picks; a family never reviews its own diff, so don't pick `--agent` by hand. Do NOT spawn your own reviewer
subagents on a LOW-tier PR — the two external passes plus the deterministic gate are the whole layer there.
On HIGH tier the fresh reviewer subagent is still mandatory on top of them. If a family is quota-capped,
a capped family simply falls to the next in the preference order; if only one can run it runs both
prompts and you say so in the PR body.

Sprint {{N}} of "{{EPIC_TITLE}}" — "{{SPRINT_TITLE}}" — stories:
{{STORY_LIST}}
