Read apps/miyagisanchez/AGENTS.md, Roadmap/WAYS-OF-WORKING.md and Roadmap/LEARNINGS.md. Skim team memory.
Then read Roadmap/{{MACRO}}/{{SLUG}}/README.md and Roadmap/{{MACRO}}/{{SLUG}}/sprint-{{N}}.md.

You're building Sprint {{N}} of "{{EPIC_TITLE}}". Enter plan mode, confirm the plan as user stories with me,
then branch feat/{{SLUG}} off latest main and build one story at a time per WAYS-OF-WORKING.
Reuse before rebuild (see "What already exists"). Escalate rather than guess: stop and ask / hand back to
Opus on payments / checkout / fulfillment / auth / DB migrations / shared infra / money, plan ambiguity, a
decision the plan doesn't cover, or 2+ failed attempts at the same problem — default to escalate when unsure
(WAYS-OF-WORKING → Model tiers). Commit per story with path-limited adds
(`git add <your files>` + `git commit -- <those paths>`, never `git add -A` — a shared worktree races the
index). App copy is es-MX by default (es/en only on the bilingual allow-list — AGENTS rule #5). Add one api spec per testable story; name the
QA/smoke stage and state any browser smoke owed to me. When the deterministic gate (tsc + build + Playwright
api) is green, open a draft PR declaring the risk tier — and write the SPRINT SMOKE WALKTHROUGH (below) into
sprint-{{N}}.md before you call the sprint done.

Sprint {{N}} of "{{EPIC_TITLE}}" — stories:
{{STORY_LIST}}
