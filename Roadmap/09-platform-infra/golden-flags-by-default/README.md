---
status: scaffolded   # AUTHORITATIVE epic status (SSOT) — scaffolded | in-progress | shipped | archived. Set shipped at epic close.
slug: golden-flags-by-default
build_order: 5
---

# Epic: Golden Frijoles by default — a spawned project already carries the flag provider

> **Area:** 09-platform-infra · **Risk:** high · **Class:** Feature · **Scope seed:** [`00-ideas/seeds/golden-flags-by-default.md`](../../00-ideas/seeds/golden-flags-by-default.md)
> **Appetite:** M (one wave — architect session + builder fan-out + one review round) · **Bet:** [`bets/wave-2026-09-16.md`](../../bets/wave-2026-09-16.md)

> ⛔ **Blocked on** [`golden-beans` → `golden-frijoles-cli`](https://github.com/danybgoode/golden-beans/tree/main/Roadmap/02-commercial/golden-frijoles-cli)
> **reaching Sprint 2.** Everything here prints or checks a `gf` command. **Gate the merge on the
> CLI's Sprint 2, not its Sprint 1** — a mandate that prints a command which doesn't exist is worse
> than no mandate.

> **Renamed.** This was `flag-provider-mandate`, which bundled two different jobs: making the
> distributable template carry Golden (this epic), and finishing Miyagi's own cutover (now
> [`medusa-bonsai` → `golden-flags-single-source`](https://github.com/danybgoode/miyagi-product-management/tree/main/Roadmap/09-platform-infra/flag-provider-mandate)).
> A product you distribute should not carry one consumer's migration.

## Why

Anyone — you, or anyone you distribute this plugin to — spawns a project from `dobby-foundation` and
should get Golden Frijoles already wired, with the agent asking for an account and handing over the
one command that creates it. Today they get the opposite: `groom` Stage 6b tells every consuming
project to extend **`lib/flags.ts` `DEFAULT_FLAGS`** — which is *one consumer's in-house Supabase
table*, hardcoded into the supposedly project-agnostic planning skill. `check-plugin-leaks.mjs`
doesn't catch it because the filename is generic. **The template leaks a consumer's flag architecture
into every future project.**

Every `risk: high` epic in this operating system must answer the kill-switch question, and the answer
names a flag mechanism. Today that mechanism is whatever the project happened to build.

After this ships, a spawned project cannot reach a merged kill-switch story without a real Golden
Frijoles project, and the path to having one is a single command the agent prints.

## The plan model — decided 2026-09-16

Copy Flagsmith's shape. Proven flags business model, and it maps onto what Golden Frijoles already
meters (`lib/quota.ts`, `lib/quota-window.ts`, `lib/rate-limit.ts`).

| Tier | Price | Evaluations / mo | Projects | Seats | Flags · Envs · Segments |
|---|---|---|---|---|---|
| **Free** | $0 | 50,000 | 1 | 1 | **Unlimited** |
| **Start-Up** | $45/mo | 1,000,000 | Unlimited | 3 | Unlimited |
| **Scale-Up** | $300/mo | 5,000,000+ | Unlimited | 5 (+15 @ $50) | Unlimited |

**Unlimited flags and environments on the free tier is what makes this enforceable** — a project
creates every kill-switch it needs without paying. The metered axis is evaluations, and the SDK's
background-snapshot design consumes them at refresh rate, not per request.

> ⚠️ **NOT ENFORCED, DELIBERATELY.** Every account gets everything, unlimited. This table is the
> *written definition* the template references. **Metering and enforcement is a separate, later
> `golden-beans` epic** — building it now would be billing for a user base of one. So the template
> and the CLI must build **no plan awareness, no quota display, no upgrade prompts, no limit errors.**

## Platform-first note

Almost nothing here is new. The SDK, the control plane and the credential model all ship. What is new
is **one preflight check**, a rewritten `groom` Stage 6b, one `check-plugin-leaks` rule, and the
onboarding prompt.

**Data ownership:** flags belong to Golden Frijoles. No parallel flag store, in the template or in any
project spawned from it.

## What already exists (reuse, don't rebuild)

- `@golden-frijoles/sdk` — `createFlagProvider` (OpenFeature-shaped, background snapshot, synchronous
  resolution against a caller-supplied safe default), `createFlagDefinitionSyncClient`,
  `parseFlagSnapshot`, `explainFlagEvaluation`, and the `MAX_FLAG_*` limit constants.
- `golden-beans/apps/web/lib/credential-inventory.ts` — the three-key model (`ingest` / `flag_read` /
  `flag_sync`), already tested.
- `scripts/check-plugin-leaks.mjs` — the guard to extend, with its ALLOW-with-a-written-reason discipline.
- `plugins/ways-of-work/skills/groom/SKILL.md` Stage 6b — the **polarity doctrine is correct and
  already matches the SDK's semantics.** Only the mechanism changes.
- `golden-beans/apps/web/app/install/page.tsx` — the onboarding copy to stay consistent with.
- `template/scripts/permissions-smoke.mjs` — the shape `preflight.mjs` copies: a reviewable file that
  asserts rather than a paragraph that claims.

## Architecture decisions to lock before any builder starts

- **D1 — fail LOUD at init, fail SOFT at runtime.** The preflight fails hard when a project has no
  Golden credentials. A *transient* outage must never break a build, a test run or a deploy — the
  provider resolves synchronously against a caller-supplied default. **Getting this backwards breaks
  every consuming project's CI**, and it is the single most important line in the epic.
- **D2 — Edge-runtime constraints of `createFlagProvider`, verified against the actual package.**
  Stage 6b already warns SDKs are often not Edge-compatible. Write the verified answer into the
  template, or the first middleware-gated feature rediscovers it the hard way.
- **D3 — credential placement.** `gf init` writes **only** `flag_read` to `.env.local`. `flag_sync` is
  an operator/deploy credential and belongs in CI secrets. Never both in one place.
- **D4 — definitions are catalog-as-code, activations are not.** A spawned project syncs its flag
  *definitions* from source control; *activating* a flag is a deliberate human act in Golden.
  **Miyagi's live state is the cautionary tale: definitions synced, activations never created, so 39
  of 42 flags read "Never turned on here" while the runtime served compile defaults through the
  fallback chain.** The template must make the activation step explicit in the kill-switch story, not
  assume sync implies on.

## Scope — stories

| Sprint | Story | Risk |
|---|---|---|
| 1 | 1.1 `groom` Stage 6b rewritten to the Golden Frijoles contract | low |
| 1 | 1.2 `scripts/preflight.mjs` — the mandate becomes checkable | high |
| 1 | 1.3 `check-plugin-leaks.mjs` gains a flag-mechanism rule | low |
| 1 | 1.4 Agent-guided onboarding in the plugin's install path | low |
| 1 | 1.5 `template/AGENTS.md` gains the cannot-be-violated rule + the plan table | low |
| 1 | 1.6 Template SDK wiring | high |

## Deploy order

No runtime deploy — the plugin and template are the product. Merging to `main` publishes both.
**Nothing merges until the CLI's Sprint 2 has shipped**, because 1.2 and 1.4 print `gf` commands.

## Definition of Done (epic)
- [ ] All stories merged to `main` + smoke-tested (gaps stated)
- [ ] `sprint-1.md` has its smoke walkthrough
- [ ] This README marked ✅; sprint status ticked with commit refs
- [ ] `RETROSPECTIVE.md` written
- [ ] Poster (`Roadmap/README.md`) updated
- [ ] Durable learnings promoted to `Roadmap/LEARNINGS.md` (dedupe — sharpen, don't append)
- [ ] **Kill-switch: carve-out.** Config, docs and one check script; git is the rollback.
- [ ] **Proven on a real spawn:** a project spawned from `template/` with no credentials fails
      preflight with the exact install command, and passes after `gf init`.
- [ ] **A Golden outage does not break a build or a test run** — proven by a test, not asserted.
- [ ] Branch deleted; frontmatter `status: shipped` (run `node scripts/build-order.mjs`)
