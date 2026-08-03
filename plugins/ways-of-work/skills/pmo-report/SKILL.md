---
name: pmo-report
description: >
  Posts the weekly PMO operational report to a chat destination with headline scrum/DORA/doc-ops
  metrics and a story-deck link, or generates the on-demand monthly stakeholder packet plus metrics
  sheet. Use when the product owner asks to "send the PMO report", "run the PMO weekly", "generate the
  monthly PMO packet", or as the pmo-report routine's one step. Runs scripts/pmo-report.mjs, which
  reuses gh-rest, the PMO window log, log-branch persistence, the story-deck templates, and the
  message-format safety nets.
---

# pmo-report - weekly PMO delivery

> **Distribution note (dobby-foundation plugin):** this skill wraps `scripts/pmo-report.mjs` +
> `scripts/lib/{gh-rest,log-branch,telegram-format,pmo-delivery}.mjs`, which ship in the *consuming
> project's* `scripts/` dir, not inside this plugin — a project spawned from the `dobby-foundation`
> template gets them via `template/scripts/`. If a script or its config is missing, say so and stop
> rather than reimplementing or guessing it.

> This skill never merges, approves, blocks, or edits app code. Its normal writes are one chat
> message plus one append to the `claude/pmo-reports-log` branch after a successful non-dry run.

## Project config — TEMPLATE FILL-IN

Supply these per consuming project. This skill **refuses to guess them** — if one isn't filled in,
say which and stop.

| Value | What it is |
|---|---|
| `<REPOS>` | the repos the metrics are gathered from — **the same project-level list `standup-post` and `weekly-recap` use** |
| `<CHAT_DESTINATION>` | where the report lands — the chat id in `TELEGRAM_CHAT_ID` (or this skill's own `config.json`) |
| `<STORY_DECK>` | the story-deck generator the report links to, and the templates it fills |

## When to run me
The product owner asks for the PMO weekly report, the on-demand monthly packet, or the weekly
**pmo-report** routine (`scripts/routines/pmo-report.prompt.md`) invokes me as its one step.

## What already exists (reuse, don't rebuild)
- **`scripts/pmo-report.mjs`** - the mechanical part. Weekly delivery: `node scripts/pmo-report.mjs
  --weekly`. Safe local smoke: `node scripts/pmo-report.mjs --dry-run --weekly`. Monthly packet:
  `node scripts/pmo-report.mjs --monthly` (automatically emits both the packet doc and metrics sheet).
- **`scripts/lib/gh-rest.mjs`** - REST-only GitHub reads, routine-sandbox-safe.
- **`scripts/lib/log-branch.mjs`** - dedicated `claude/pmo-reports-log` persistence, no main-branch
  push needed.
- **`scripts/lib/telegram-format.mjs`** and **`scripts/lib/pmo-delivery.mjs`** - message length guard,
  headline formatter, chat-id loading, and sendMessage wrapper.
- **`scripts/pmo/templates/`** - the `<STORY_DECK>` templates; the script fills values only.

## Stage 1 - ensure config
`pmo-report.mjs` resolves `<CHAT_DESTINATION>` two ways, in order: `skills/pmo-report/config.json`'s
`chat_id` first, then `TELEGRAM_CHAT_ID`. In a routine session, the env var is the one that actually
works because `config.json` is gitignored and a routine's sandbox is a fresh checkout every run. For a
local/interactive run, copy `config.example.json` to `config.json` and put the chat id there.

Never ask for or write the bot token here. `TELEGRAM_BOT_TOKEN` is a secret and belongs in the shell or
routine environment.

## Stage 2 - run it
For the weekly routine path, run:

```bash
node scripts/pmo-report.mjs --weekly
```

For safe smoke without Telegram or log writes, run:

```bash
node scripts/pmo-report.mjs --dry-run --weekly
```

For the monthly packet path, run:

```bash
node scripts/pmo-report.mjs --monthly
```

Report back the headline metrics and the generated `<STORY_DECK>` links.

## Stage 3 - on failure
Surface stderr verbatim. Do not retry blindly; a missing chat env var, a missing chat id, GitHub auth, or
a story-deck URL/message-size issue is a config or implementation problem. Two failed attempts on the
same cause escalate to the product owner.

## Gotchas
- **A green routine run is not success by itself.** Success is the message landing with the story-deck
  link. If the script cannot attempt the post, use the routine's failure-ping path.
- **`--monthly` includes `--sheet` by design.** The acceptance is packet doc plus metrics sheet, so the
  product owner should not need a second flag.
- **The log write happens after delivery.** If the send fails, the window is not advanced, so the next
  run can retry the same reporting window.
- **The `<STORY_DECK>` URL may be hash-only state** (it is in the origin implementation). If so, don't
  add short-link persistence or a database to work around it.
