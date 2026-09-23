# Learnings — operating notes for every build

**Read this at the start of every session.** It's the distilled, cross-cutting wisdom from past
epics' retrospectives — the things that would have saved the last agent time. The full story of any
item lives in its epic's `RETROSPECTIVE.md`; this file keeps only the *transferable* rule.

**How this file stays useful (Definition of Done, epic):** at epic close, promote any durable,
generalizable learning from your `RETROSPECTIVE.md` into the right section below — a one-liner + a
*why* + the date/source. **Dedupe** (sharpen the existing line, don't append a near-duplicate). If a
rule here is now wrong, fix or delete it. Keep it short — a long digest is an unread digest.

**Origin of these entries:** spawned 2026-09-16 from this repo's own `template/Roadmap/LEARNINGS.md`
— the generalized tooling/process gotchas carried out of `medusa-bonsai`. The foundation's own entries
accumulate below them, same one-liner + why + date shape.

---

## Multi-agent & async deploy coordination
*If several agents work in parallel on their own branches, against repos that deploy independently.*

- **`main` moves under you.** Before opening a PR — and again if it sits open — **merge latest `main`
  into your branch**. Tell-tale: CI fails on a spec/check for something you never touched → a sibling
  agent landed something on `main` and your preview (if you have one) predates it. **A re-run alone
  won't fix it** — the mismatch is structural; only `git merge origin/main` + push clears it. Confirm
  with `git log HEAD..origin/main`.
  **Corollary — the stale-vs-fresh mismatch can hit your own NEW code too, not just an untouched
  check, when a sibling PR changes a shared file's CONVENTIONS (a lint rule, not a feature).** The
  diagnostic tell: check whether a FAILING assertion is about a rule/convention that changed, not just
  a feature/data mismatch.
- **Announce cross-cutting or direct-to-`main` changes**, and prefer a PR even for "engine" features.
  Anything touching shared surface — a root layout/middleware file, global styles, `package.json`/deps,
  a new sibling worktree — can break every other open PR.
- **Don't yank a shared branch out from under another agent.** If the repo's working tree is on
  someone else's branch, do your change in an isolated `git worktree` instead of switching it.
  **Corollary — checking CI status and merging a PR need no local checkout at all.** `gh pr checks <N>`
  and `gh pr merge <N>` operate against the pushed remote branch via the GitHub API; they don't care
  what's checked out locally.
- **Before building a story, grep whether a sibling PR already fixed the identical root cause.** Two
  epics approved the same day can target the same bug from different scope docs. Check
  `git log --oneline -- <the file the story's root-cause names>` + `gh pr list` during research, not
  assumed.
- **Risk tier decides who merges**: low-risk → the reviewer/agent may merge on green CI; anything
  touching money / auth / DB / shared infra → the product owner merges. When unsure, treat as high.
  **Corollary — an explicit "merge on green" authorization changes who decides to pause and check in,
  not whether the review layers themselves still run.** "Merge on green" is permission to proceed
  through the established gate without re-asking at each step, not permission to skip the gate.
  **Corollary — a "merge on green" given for one PR does not carry forward to a LATER PR in the same
  session/epic, even a similarly-scoped one**, and a builder's own plan can promise a review step the
  standing authorization never touched. Re-check whether a standing "merge on green" was given for
  *this* PR/story, not just somewhere earlier in the conversation.
- **When your branch is BEHIND `main`, the two-dot `git diff main..HEAD` lies — read the three-dot.**
  Two-dot compares tips directly, so it folds in the *inverse* of every commit `main` gained since you
  branched (a sibling epic's new files show up as "deletions" in your diff — alarming and wrong).
  Review with **three-dot `git diff main...HEAD`** (merge-base→HEAD = only your changes), and **merge
  `origin/main` into the branch before merging the PR** so the merged tree is what actually ships.
- **A squash-merged sprint branch is a dead end — start the next sprint on a FRESH branch off `main`.**
  A squash-merged PR's individual commits aren't on `main` (only the one squash commit is), so
  continuing that branch for the next sprint re-introduces a messy duplicate diff and can't
  fast-forward. Branch clean off `origin/main` for each new sprint.
- **To verify "is the prior sprint serving?", reason off `origin/main` — never the working tree — and
  read PR *state*, not branch commits.** Local app checkouts routinely sit on *other* agents'
  branches, so on-disk files lie about `main`, and a squash-merged sprint's individual commits
  genuinely aren't on `main`. Confirm with `gh pr view <#> --json state,mergeCommit` or `git fetch`
  then `git grep <x> origin/main` — an `ls`/working-tree read is not evidence about `main`.
- **Concurrent planning commits in a shared worktree collide the git index.** Fix: (1) **path-limited
  commits** — `git add <your files>` + `git commit -- <those paths>`, never `git add -A`; (2) for
  parallel planning, give each session its own worktree, or appoint a single **scribe** for shared
  files (like `BUILD-ORDER.md`).
- **A subagent/fork that dies mid-task from a shared session rate-limit still returns a `result` — that
  text is its last tool-call narration, not a trustworthy completion claim.** After any subagent/fork
  batch — especially one large enough to plausibly share a rate-limit, or any showing a failed status —
  re-derive actual file state directly (grep the real repo) and run the language's type-checker/build
  before treating the batch as complete.

## Tooling gotchas
- **A script with a co-located pure-logic test file MUST guard its `main()` call with an `isMain`
  check.** Importing a script that calls `main()` unconditionally at module scope re-executes the
  whole script for real (shell-outs, notifications, git pushes, all of it) the moment a test file
  loads it for its pure helpers: `const isMain = process.argv[1] && …; if (isMain) main()`.
- **Run the repo binaries directly when `npm`/`npx` chokes.** A sibling worktree that reuses the same
  `package.json` name as the main checkout breaks npm **workspace resolution** at the monorepo root.
  Use the binary path directly (`node /…/node_modules/typescript/bin/tsc --noEmit`,
  `/…/node_modules/.bin/{next,playwright}`). New worktrees should use a unique package name or be
  excluded from the root `workspaces` glob.
- **A worktree needing its own `npm install` forces worktree-local binaries for everything, including
  test runners.** A fresh `git worktree` resolves most tooling fine via walk-up to the root
  `node_modules`, but if any dependency needs a local install (e.g. a CSS framework's PostCSS plugin
  resolution), that install adds a worktree-local copy of your test framework too — switch to the
  **worktree-local** binary path, or you'll hit "two different versions" / "No tests found" errors.
- **`gh pr merge --delete-branch` fails when a worktree holds `main`.** The merge still succeeds on
  GitHub; only the local branch-delete errors. Verify with `gh pr view <n> --json state`.
- **A server-side `process.env.X ?? \`https://${req.headers.get('host')}\`` fallback is a real
  production landmine, distinct from client-bundle build-time-inlining bugs.** The trap is the
  Host-header fallback when the env var is unset: a bare container run without an explicit runtime env
  var can get a literal `0.0.0.0:PORT` or similar garbage as the `Host` header, and the fallback
  happily builds a broken URL from it — dangerous on any redirect-URL-building code path (OAuth
  callbacks, payment-provider return URLs). Fix: one shared `resolveOrigin()`-style helper that
  rejects obviously-wrong hosts and **throws instead of silently building a broken URL** — a loud
  failure beats a dead redirect.
- **A unit-tested pure helper can't live in the same file as code that imports a framework/runtime-only
  module** (e.g. a Next.js `next/cache` import, or an auth SDK's server-only entrypoint). A generic
  test runner that can't load that module throws an opaque, unrelated-looking error the moment it
  imports the file at all — even if the pure function itself never touches the framework-only code.
  Keep the pure logic in its own zero-import file; let the framework-touching wrapper import *it*.
- **Swapping a framework-generated artifact for a hand-rolled route breaks specs on exact format.**
  Converting a typed/generated file (robots.txt, sitemap, OG image, metadata) to a hand-rolled
  equivalent can silently change output details (header casing, field order) that an existing spec
  asserted on. When you replace anything a framework generates, diff the *exact bytes* the old one
  emitted and grep the suite for any spec asserting that surface.
- **CI sometimes just doesn't schedule a workflow for a PR.** Seen occasionally on `opened`; close/
  reopen doesn't always fix it — an empty-commit push (a real `synchronize` event) does. Don't merge
  on an absent gate: re-trigger, and lean on the local gate + a green preview as the real signal.
- **`node --test <dir>` (bare directory) can silently fail to discover tests depending on your Node
  version** — it may try to load the directory as a module instead of globbing it. Use an explicit
  glob: `node --test 'scripts/lib/*.test.mjs'`.
- **A "resolve the PR from the current branch" tool must read PR `state`** — a list/view call can
  return MERGED/CLOSED PRs too, especially for a reused branch name whose PR already merged. Treat
  `state !== 'OPEN'` as "no open PR for this branch" and pair it with a stale-HEAD guard
  (`git rev-parse HEAD` vs the PR's `headRefOid` → warn + require an explicit override) so the first
  run always reviews the current diff.
- **A hosted CLI-authenticated integration (Vercel-style env-var management, similar platforms) can
  silently store or report EMPTY values** through a convenience CLI command even when the underlying
  API call "succeeds." Verify by value **length** where you can't read the value directly (a scoped
  read token may be needed), not just by exit code.
- **A "sensitive"/write-only secret is confirmable by presence/type but not by value** — you can check
  it exists and which environment it targets, but not its actual content, from a CLI or API. Read the
  provider's dashboard, or have the app surface the cause on use (missing key → a specific, classifiable
  error) instead of guessing.
- **Driving a young foreign CLI: run `<cli> --help` first, pin the version, and design for degrade —
  never build against a documented flag from memory.** A less-mature CLI can have surprising interface
  shapes (no JSON output mode, arguments only via argv not stdin, or vice versa) that don't match a
  more mainstream CLI's conventions. Smoke-test by running it against something real and reading the
  actual output before scripting around it.
  **A young foreign CLI can silently break its own contract on a MINOR version bump** — a print mode
  that used to always emit something can start exiting 0 with empty output on a real failure. Treat
  **empty output as failure** (not success), and make any version-pin check **fail loud** so a
  contract break gets caught, not silently absorbed.
  **A CLI authed by an interactive/OAuth login is NOT free to run in CI** — confirm a portable
  non-interactive credential path AND its cost before automating it in a runner; some CLIs have no
  headless auth at all, which may mean an advisory/local-only tool stays local-only rather than
  becoming a CI job.
- **`process.exit()` truncates piped stdout — flush synchronously, or you ship a tool that works to a
  file but crashes in a pipe.** A script that does `console.log(json); process.exit(0)` can produce
  valid output when redirected to a file (sync writes) but truncated output down a pipe, because the
  async stdout write hasn't drained when exit fires. Use a synchronous write before `process.exit`, or
  exit in the write callback. Test a tool the way it's actually invoked (pipe, not just file redirect).
- **Git background auto-maintenance can race a burst of rapid commits and leave stale `*.lock`
  files**, producing intermittent "cannot lock ref" errors. Clear locks recursively
  (`find .git -name '*.lock'`) and run a rapid-commit batch with `git -c gc.auto=0 commit …` so
  auto-maintenance can't re-trigger mid-sequence.
- **A delta-only reporting tool must special-case a missing/wiped baseline as a bounded no-op, never as
  "everything happened."** Diffing current state against an empty/`null` previous snapshot makes every
  historical item look "new" — guard for a missing baseline with ONE bounded summary (counts only)
  instead of enumerating full history, and keep a message-length safety net regardless of the guard.
- **A script with both scheduled state-tracking delivery and on-demand artifact generation must keep
  the artifact mode stateless.** Reusing a stateful window/log rail for an on-demand report mode risks
  silently advancing state a scheduled run depends on — keep on-demand modes explicitly
  non-state-mutating and lock that with a test.

- **Every spec that builds a git fixture must clear `GIT_DIR` and friends.** git exports them into hooks,
  from a linked worktree they point at the real repo, and they override `cwd`. So a fixture's `git init` /
  `config` / `commit` rewrites the real repository: `core.bare=true`, identity `t <t@t>`, junk commits on
  `main`. It happened three times (2026-09-09, -16, -23), each time sealed in one file only.
  `template/scripts/git-fixtures-sealed.test.mjs` now fails the class. *(2026-09-23)*
- **Never put markdown in a double-quoted shell string.** The backticks in `node -e "…`codex login`…"` are
  command substitution: they started an OAuth flow and logged a CLI out. Put data scripts in files
  (heredoc with a quoted delimiter). *(2026-09-23)*

## Permissions & guardrails (ways-of-work-lean-pass, 2026-09-16)
- **A deny rule is text matching, and a per-rule patch cannot close a rule CLASS.** A leading assignment
  whose value contains an expansion (`PATH=/x:$PATH vercel deploy --prod`) was observed LIVE to escape a bare
  rule. Patching the four rules someone had probed left `vercel --yes --prod`, `rm -fr`, `supabase db reset`,
  `git push origin +main`, `git -C <path> push --force` and `npx supabase --debug db push` matching nothing —
  found one at a time across four review rounds. Generate the spellings from a list the contract checks
  (`CRITICAL_COMMANDS` → bare + `*=*` + `env *`), so a bare-only rule fails CI instead of waiting for a reader.
- **The same escape applies to `ask`, where it is WORSE.** An escaped deny is a gap; an escaped ask is a
  silent downgrade from "a human decides" to "the classifier decides". Carry ask rules in all three spellings
  too, and treat a deny that swallows an ask as a finding — a refusal cannot be approved once.
- **`*=*` matches an `=` ANYWHERE, not an assignment prefix.** `Bash(*=* vercel*)` hard-refused
  `grep -rn --include=*.json vercel .` — ordinary reading. Keep prefixed rules per dangerous SUBCOMMAND and
  pin the safe negations in a `MUST_NOT_DENY` list; a guard that rejects correct output gets bypassed.
- **`Write(<path>)` permission rules are INERT** — Claude Code checks only `Edit(<path>)` for file tools, and
  a nested `claude -p` refuses to start while one is present. `Edit` covers Write, Edit and NotebookEdit.
- **An ALLOW skips the classifier, so it must be read as "runs with no second look".** `Bash(node scripts/*)`
  pre-approved a script that writes production secrets through a REST call, while the `ask` rules guarded only
  the CLI path nobody used — one door guarded out of several. Deny the dangerous invocations by name.
- **Project-level `defaultMode: "auto"` is ignored AND masks the user default.** Auto mode is a user setting;
  a config guard should fail on the wrong-scope setting, not only on the missing one.
- **Claude Code refuses a `PATH=`-prefixed command itself** — "prepending a directory to PATH before
  invoking git is a binary-hijacking pattern", even with that command explicitly allowed. Probe the
  prefixed rule forms with a plain assignment (`FOO=1 …`), which runs; a probe the platform will not run
  can never have a baseline, so it can never prove a rule.
- **A behavioural test needs a baseline the system will actually produce.** `permissions-smoke --live` asks
  a throwaway session to run each probe with NO rules, so that a later refusal proves the rule. Told the
  probes were harmless shims, and with the commands explicitly allowed, a session still **refuses**
  `rm -rf`, a force push or a deploy on its own judgement — so those probes can have no baseline, and the
  replay can only speak for the benign ones (the staging family). Three more faults surfaced on its first
  real run: a shim file named `PATH=/x:$PATH`, a temp workspace Claude Code treated as UNTRUSTED (so it
  ignored the rules under test, keyed by the resolved `/private/var/…` path), and ~300 probes overflowing a
  session that has no `--max-turns` to raise. A test that has never gone green has not tested anything yet.
- **Say where the line is.** The deny list matches command text, so it is not a sandbox: wrappers (`nice`,
  `timeout`, `sudo`) and `/bin/rm` are out of scope by design. Write that boundary into the file, or the next
  reviewer re-finds it as a bug.

## Shared rails across repos (plugin-audit-and-extraction, 2026-09-18)
- **"Byte-identical" is a claim until a byte-compare runs.** Compare every template script against every
  consumer (`cmp` in a loop) before claiming one implementation per rail, and put every surviving
  difference in the consumer's own docs with a reason. The epic's walkthrough claimed it and was wrong on
  eight rails. The review finding that prompted the compare was itself a live bug: a callee's newly
  required flag that a caller never passed.
- **Replacing a file with the shared copy? Run the consumer's OLD tests against the NEW code.** The shared
  copy can be weaker than the local one it replaces. A consumer's stricter prose guard was silently undone
  that way, and the tests that pinned it were deleted as "superseded". `git show origin/main:<test>` into a
  temp file, run it, and read every failure.
- **A review that skips "copies" cannot see a regression against the file the copy replaced.** Review the
  consumer's adoption against the consumer's previous version too, not only against the template.
- **"Could not look" is its own exit code, never the failure one.** A watchdog's missing, unloadable or
  empty assertion file exited 1 through an unhandled rejection, which a routine reads as "production is
  broken". Load inputs in a function that returns `{ok, error}`, and `.catch` `main()` into the
  could-not-look state. The same three-answer rule decides a *check's* severity: **configuration**
  (absent, rejected — true until a person acts) fails; **weather** (unreachable, timed out, a 404 from
  a switched-off surface) warns and exits 0; collapsing them is how a check starts failing builds for
  someone else's outage.

## Guards, and depending on someone else's service (golden-flags-by-default, 2026-09-19)
- **A guard that makes N files agree says nothing about whether they are RIGHT.** A parity check
  welded one command into five surfaces, and the command did not exist — `gf flags ls` takes no
  `--env`, so it exited 1 before reaching auth, and the output it told readers to look for was
  another tool's vocabulary. Every surface agreed, perfectly, about something untrue, and the build
  was one `--help` away from catching it. **Presence is not execution: if a doc tells someone to run
  a command, the check runs it.** A `--exec` mode that accepts "the parser took it, then asked for a
  credential" and rejects "unknown flag" is cheap, and it skips rather than failing when the tool is
  not installed.
- **Making a check EXECUTE makes it capable of whatever it checks — pay for that deliberately.**
  Replacing a grep with a real invocation is usually right, and the first version of one such check
  ran two write verbs (create-and-activate-in-production, kill-in-production) while inheriting the
  ambient credential: a documentation parity check, one `gf login` away from mutating a live
  catalog. The answer is not care. **Construct the harmless state** (a scrubbed env — blank token,
  `XDG_CONFIG_HOME` *and* `HOME` at an empty temp dir) **and then ASSERT it** — require the
  "refused for want of a credential" outcome, so a future failure of the isolation is loud instead
  of a silent pass. Prove it with a negative control that shows the credential IS found without the
  scrub.
- **A guard with no test is a guard nobody has seen fire.** `check-plugin-leaks.mjs` ran green over a
  real leak every day for months: "CI was green" cannot distinguish a working guard from a pattern that
  matches nothing. Give every guard fixtures that assert it **fires**, *and* fixtures that assert it does
  **not** fire on the thing it must permit.
- **A mechanism does not have to be named after a project to be that project's.** A portability sweep for
  project names could never catch `lib/flags.ts` / `DEFAULT_FLAGS`. Generic filenames are how one
  consumer's architecture ships to everyone — and when a new rule surfaces incidental matches, **rewrite
  them rather than allowlisting them**; an ALLOW entry preserves residue behind a plausible reason.
- **Verify a dependency's runtime claim by EXECUTING it, not by reading it.** Running a published package
  inside a `node:vm` context carrying only the target runtime's globals answered "is this Edge-safe" in
  two halves — the API surface is, the *lifecycle* is not — where reading the source would have given only
  the first, which is precisely the half that gets a seam planned that cannot work. Ship the reproduction
  beside the claim so it can be re-checked instead of going quietly stale.
- **Refuse the flag that blurs a fail-soft promise.** A `--strict` that turns "the provider is unreachable"
  into a failure will be in someone's CI file within the week, and the promise is then gone with nobody
  having decided to give it up. Not adding it is the enforcement.
- **A "harmless default" handed to someone else's API is not harmless — read what the callee does
  with the field.** Defaulting an unset `environment` to `'development'` looked like courtesy; in the
  SDK that field is a hard ASSERTION, and a snapshot that disagrees is rejected. A valid production
  credential then served compile-time defaults permanently and silently, indistinguishable from an
  outage. **When a value is unknown, omit it and let the source of truth establish it** — and say
  out loud that nobody asserted it.
- **"The package is not installed" is the most complete outage there is — import dynamically and test in
  it.** A seam whose SDK is loaded with `await import()` has its entire fallback contract exercised in a
  checkout with no `node_modules`: no network, no credentials, no transport to mock.
- **Creating a thing and activating it are different verbs, and no dashboard tells you which you did.**
  Definitions synced but never activated reads as "the flags exist" while the runtime serves compile
  defaults. The fix is not a paragraph — it is the verification command, in the story template, as its
  own step.

## Deriving state from docs (build-visualization-claude-mods, 2026-09-19)
*If a tool answers "what is being built right now" — a status line, a board, a report.*

- **A resolver that names the work in flight attracts exactly one class of bug: the plausible wrong
  answer.** Every one of the nine review findings on `build-state.mjs` was one — a stacked `-s4` branch
  inheriting the previous sprint's commits, a shared session journal holding another epic's entries,
  `feat/aws-s3` parsed as sprint 3 of `aws`, a stale `origin/main` putting main's commits inside
  `base..HEAD`. **Scope every input explicitly (this epic, this sprint) and return `unknown`**; an
  unknown is a correct answer, a confident wrong one destroys the tool's only asset. *(2026-09-19)*
- **Mutation-check the TEST, not only the code.** A fix for the stale-base bug passed its brand-new test
  while still being wrong — both merge-bases shared a commit timestamp, so the date comparison never
  fired. Flipping the code and watching the test *fail* is what exposed it; ancestry replaced the clock.
  A test that passes for the wrong reason is worse than no test. *(2026-09-19)*
- **Make the machine-readable field a NEW key rather than overloading a live one.** The executive ladder
  went into `phase:`, not `status:`: the epic `status:` is the board's SSOT and an unknown value hard-
  fails the extractor, and on a sprint file a frontmatter `status:` would have been captured by the
  extractor's own `^Status:` regex — silently re-deriving every sprint on the board. *(2026-09-19)*
- **A mechanical migration must not be gated on unrelated pre-existing findings.** A doc checker that
  blocks on *every* finding in a touched file turns "add frontmatter to 539 legacy docs" into "sweep 251
  unrelated findings, or bypass the hook". Gate on what the commit **introduces** (compare against
  `HEAD`), which is the same "green on today's known state, red on anything new" rule those checkers are
  always written with. *(2026-09-19)*
- **Backfill and rail-sync belong in ONE PR per consumer.** Landing the checker first makes every later
  doc commit fail its pre-commit hook until the backfill arrives. *(2026-09-19)*

## Probing an undocumented, pre-release API (build-visualization-claude-mods, 2026-09-19)

- **The loop is: a validator for the shape, a real session plus the debug log for the runtime.**
  `claude plugin validate` gives the manifest schema and lists a module's hooks and `$` calls, but it
  accepts calls that do not exist; only a live run (`claude -p --plugin-dir <dir> --debug`, then
  `~/.claude/debug/latest`) tells you the truth. Four probe rounds taught: `{"modules": ["./index.ts"]}`,
  `register(on)`, hooks are `($, e, next)` and must call **`next(e)`**, `$` may only ever appear as
  `$.noun.event(...)` at a call site, and a module may import only its own relative files. *(2026-09-19)*
- **Pin the CLI version in the check that validates against it.** The first unpinned CI install failed on
  a schema the probed version does not have (`hooks: Invalid input: expected record`). Same discipline as
  the cross-review families' pinned CLIs — bump deliberately, after re-probing. *(2026-09-19)*

## A model as a guard's judge (jev-semantic-guards, 2026-09-23)
- **Measure the question before trusting the model. The first wording is a guess.** Every first question
  underperformed the regex it was replacing, or barely beat it: a real review scored 0.73, and liveness
  scored 48/62. Keep a labelled fixture set **with recorded answers**. Then wording and thresholds become an
  offline sweep over identical answers instead of an argument, and CI replays the recordings, so a model
  bump or threshold change goes red instead of silently changing verdicts. *(2026-09-23)*
- **Three states, never two: "could not look" is its own outcome.** No key, a 429, a timeout or a malformed
  answer (`"1"`, `true`, `null`) must fall back to the deterministic rule and **say so in the reason**. A
  coerced `Number(true)` became a model-decided PASS until review caught it. Only a probability in [0,1]
  counts as a verdict. *(2026-09-23)*
- **A shadow period can run on history, if the history is decision-shaped.** Replaying 655 posted reviews
  and 186 retrospectives through the same judge in shadow did in minutes what a calendar shadow does in
  weeks. Name the corpus bias (posted = accepted) and label the other direction on purpose. *(2026-09-23)*
- **After a flip, the audit trail must keep the old decider's verdict.** Once the model decides, "posted"
  no longer means "the old rule accepted it". A marker without the regex's own verdict makes the monitoring
  report blind to the model's false passes, the one thing it exists to watch. *(2026-09-23)*
- **Evidence tooling fails closed too.** An empty log, a `{}` line, a marker with no mode, or a forged
  comment from a stranger on a public repo must never count as evidence. Filter by author provenance and
  exit non-zero on nothing. *(2026-09-23)*

## Working efficiently
- **Running a whole multi-sprint epic in one session is the main context-cost driver.** The durable
  state (the plan file, sprint docs, team memory) makes re-entry cheap by design — compact at each
  sprint/PR boundary, and for big epics consider a fresh session per sprint.
