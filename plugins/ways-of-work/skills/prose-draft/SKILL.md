---
name: prose-draft
description: >
  First-draft internal close-out prose (retrospectives, product-poster entries, sprint-wrap
  summaries) by delegating to a cheap different-family model via the cross-agent rail. Use at
  sprint/epic close, or when the product owner asks to "draft the retro", "draft the poster entry", "write
  the sprint wrap". Runs scripts/prose-draft.mjs, which gathers the epic's own docs + git log,
  applies the house-voice prompt, and prints an advisory draft to stdout. The draft is NEVER
  committed as-is — the coordinating agent edits it for factual accuracy first (drafts invent
  plausible-sounding gaps; the output banner says so). PR bodies are NOT in scope: the agent
  that built a PR writes its body (it already holds the context).
---

# prose-draft — delegated first drafts for file-derived close-out prose

> **Distribution note (dobby-foundation plugin):** this skill wraps `scripts/prose-draft.mjs`
> (+ `prose-draft.prompt.md`, the house-voice SSOT), which ships in the *consuming project's*
> `scripts/` dir via `template/scripts/`. If the script is missing, say so and stop rather than
> reimplementing its logic inline.

## The contract (why this is safe to delegate)

- **File-derived inputs only.** The tool reads the epic directory's `*.md` + `git log --oneline`
  for that path. Artifacts whose real source is the builder's in-head context (PR bodies,
  incident narratives mid-flight) stay with the agent that holds that context.
- **Advisory stdout, never a repo write.** Output opens with an
  `EDIT BEFORE COMMITTING` banner. The coordinating agent is the editor of record.
- **The editor's factual pass is non-optional.** Known limit, observed on the first live
  dogfood: with thin sources the model invents plausible "owed" items and learnings. Verify
  every date, ref, and gap claim against the sources before committing a word.

## Usage

```bash
node scripts/prose-draft.mjs --kind retro       --epic Roadmap/<area>/<epic-dir>
node scripts/prose-draft.mjs --kind poster      --epic Roadmap/<area>/<epic-dir>
node scripts/prose-draft.mjs --kind sprint-wrap --sprint Roadmap/<area>/<epic>/sprint-N.md
```

Model pair: `PROSE_MODEL` (default `Gemini 3.5 Flash (High)`) → `PROSE_FALLBACK_MODEL`
(default `GPT-OSS 120B (Medium)`, separate quota pool), riding the same version-pinned,
empty-output-is-failure agy plumbing as cross-review. If the agy pin check dies, run
`node scripts/agy-doctor.mjs --fix` (pre-authorized) and commit the bump.

## Gotchas

- **The draft WILL fabricate specifics when sources are thin** — a retro drafted before the
  sprint docs carry commit refs produces confident placeholders and invented owed-items. Draft
  AFTER the sprint docs are ticked, and diff every factual claim against the sources.
- agy takes the whole prompt in argv — an epic dir with very large docs can exceed the 256 KB
  cap; the tool dies with a clear message rather than truncating. Trim or draft by hand.
- Epic-path **commit subjects** ride along with the docs into the model payload (that's the
  `git log` section). Nothing else does — no env, no diffs — but don't point it at a directory
  whose commit messages you wouldn't paste into a third-party model.
- `--kind sprint-wrap` output is a THIN POINTER by design (SESSION-KICKOFFS §7) — if the draft
  re-summarizes the sprint, cut it down; don't commit a re-summary.
