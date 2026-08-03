# {{TITLE}} — Sprint {{N}}: {{SPRINT_TITLE}}

**Status:** ⬜ not started

## Stories
<!-- One block per story. Thinnest shippable slice first.
     Keep the heading shape `### Story {{N}}.M — <title>` (this is what the status board counts).
     When a story ships, append ✅ + its commit ref to the heading, e.g.
       ### Story {{N}}.1 — <title> ✅ `abc1234`
     Note: the epic README frontmatter `status:` is the AUTHORITATIVE epic status; this ✅ marker only
     feeds the cosmetic per-sprint progress count, so a format slip can't mis-state shipped/not-shipped. -->

### Story {{N}}.1 — <title>
**As a** <role>, **I want** <capability>, **so that** <outcome>.
**Acceptance:** <plain-language checks the product owner can run>
**Risk:** {{RISK}}

## Sprint QA
- **api spec(s):** <which testable story → which `e2e/*.spec.ts`>
- **browser smoke owed:** <no · or: yes, to the product owner — name the money/auth step>
- **deterministic gate:** `tsc --noEmit` + `npm run build` + Playwright `api` green before merge

## Sprint {{N}} — Smoke walkthrough (do these in order)
Env: production · https://<your-domain>   (or the preview URL while testing pre-merge)

1. Go to https://<your-domain>/<page-or-path>
   → <observable expected result>
2. In <the relevant authed area>, go to https://<your-domain>/<authed-path>
   → <observable expected result>
3. (money path — owed to <product owner> by name) <the money-path steps for your project> using a
   test-mode payment credential.
   → <observable expected result>

<!-- Delete whichever pre-filled steps don't apply to this sprint; add more using the same shape
     (real clickable URL + one observable result). Flag any money/auth/checkout step by name —
     those are owed to your project's product owner (an automated browser smoke can't fully cover
     them). -->

If any step fails, note the step number + what you saw — that's the bug report.
