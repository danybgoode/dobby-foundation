# Groom reference — the kill-switch decision (Stage 6b)

Loaded on demand from `SKILL.md` Stage 6b. **This file is the ONE home of the kill-switch polarity rule** — the seed template, the epic DoD and any project flag tooling reference it rather than restating it (ways-of-work-lean-pass S3.4). Moved here verbatim (S3.2).

> **Operating default:** most projects here build with **no new flag unless the product owner asks for one** — see the consuming project's WAYS-OF-WORKING. When one IS asked for, this is how it is decided.

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
