# Ways-of-work lean pass — remove the training wheels, close the adoption gap — Retrospective

_Closed: <date>_

## What shipped
<!-- The capability now live, by sprint, with commit/PR refs. -->

## What went well

## What we learned
<!-- Promote the durable, generalizable items to Roadmap/LEARNINGS.md (one-liner + why + date). Dedupe. -->

## Gaps / follow-ups
<!-- Smoke gaps owed to the product owner, deferred slices, known limitations. -->
- **Pre-existing template generator defects, found by the external review of dobby-foundation#10 and
  deliberately left out of scope** (the files are byte-identical copies, unchanged by this epic):
  `roadmap-to-notion.mjs` accepts `status: queued` on an epic and renders it as Scaffolded;
  `build-order.mjs` writes epic links as `../../<macro>/…` from `Roadmap/00-ideas/`, which resolves
  outside `Roadmap/` (medusa-bonsai's board has the same broken links); `--sync` never writes a seed's
  `appetite` / `underwritten_by` to Notion.
- **Incident during S1 (fixed in the same PR):** medusa-bonsai's `scripts/pre-push-hook.test.mjs` was not
  sealed against `GIT_DIR`, so a push from a linked worktree ran its fixture `git init` / `git config
  user.*` against the real repository — `core.bare` flipped to `true` and the repo identity became
  `t <t@t>`. golden-beans' `ratchet fixture` identity and dobby-foundation's `test@x` are older instances
  of the same class. `core.bare` was restored; the three repo-level identities are owed to the product
  owner (the classifier refuses an agent editing git identity).
