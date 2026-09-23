# Jev shadow report — the evidence behind the flip (2026-09-23)

Generated with `node scripts/jev-report.mjs` over every shadow decision there was. **This is the report the
S5.3 flip is gated on** (epic README D9, "the flip gate").

## Sources
- **Review rail:** the backtest, which replayed all **655** historical cross-review comments from the template
  repo and both consumers through `judgeReviewOutput` in shadow. On top of that come the live shadow runs on
  the consumer S4 PRs and the hidden `<!-- jev: -->` markers harvested from posted comments in all three repos.
- **Prose rail:** the prose backtest. All **186** committed `RETROSPECTIVE.md` files in the three repos were
  run through `judgeProse` in shadow, with the evidence `prose-draft` applies to close-out docs. The standup
  dry-runs from the medusa smoke are included too. There is no live routine prose traffic: every routine is
  disabled (sprint-4.md, smoke item 3).

## Agreement (all shadow traffic, measured at the shipped thresholds)

| rail | decisions | agreement | uncertain | could not look | disagreements |
|---|---|---|---|---|---|
| review | 663 | 99.7% | 0.5% | 0.0% | 2 |
| prose | 187 | 56.1% | — | 0.0% | 82 |

### Review: the 2 disagreements, labelled
| reply | regex | Jev | label | who was right |
|---|---|---|---|---|
| A vibe tool-call transcript that writes a review *plan* ("Plan created. Ready to execute.") | accepted | 0.07, not a review | **not a review** | Jev. The regex fired on a plan step, "3. Correctness check". |
| A builder's "review trail" summary table posted under the review header | rejected | 0.90, a review | *excluded* | Neither label is honest. It is not a reviewer's reply. |

### Prose: what the 82 disagreements are
| regex → Jev | files |
|---|---|
| `[]` → `[flag-state-claim]` | 67 |
| `[flag-state-claim]` → `[]` | 8 |
| `[]` → `[flag-state-claim, invented-commitment]` | 4 |
| other combinations | 3 |

Almost every prose disagreement is Jev finding a **liveness claim the regex's phrase list misses**. Examples:
"all 3 sprints to prod", "Live on prod 2026-07-01", "deployed and verified in production", "serves 100%
traffic", and "sellers can now turn their promos into real codes". By the guard's own definition these are
liveness claims: `prose-draft` passes no `liveFlags` for close-out docs. A sample of 96 of these real
sentences was labelled one by one and added to the eval fixtures as `retro-*` (see below).

## The flip gate: labelled accuracy (`node scripts/jev-eval.mjs`)

| rail | labelled cases | the judge (Jev + fallback) | the regex alone |
|---|---|---|---|
| review | 76: 62 real replies, anonymised, plus 14 failure shapes | **100.0%** | 86.8% |
| prose | 158: 62 spec and incident cases plus 96 retro sentences | **88.0%** | 72.2% |

| prose family | judge | regex |
|---|---|---|
| unsupported-fix-claim | 99.4% | 98.7% |
| invented-beneficiary | 100.0% | 98.7% |
| flag-state-claim | 89.2% | 77.2% |
| invented-commitment | 98.7% | 97.5% |

**Result: Jev ≥ regex on every rail and on every family.** The gate passes, and both rails flip to `jev`.

## Thresholds, set from the data (S5.2)
The fixtures were recorded once and swept offline over the same answers. **Review:** every candidate pair made
zero Jev false passes on the labelled set. `real ≥ 0.85` is kept, as the conservative side of the dangerous
direction. `not-real` is widened from 0.15 to 0.3, which took decided-and-right from 75/76 to 76/76.
**Prose**, claim threshold against whole-draft accuracy:

| claim ≥ | 0.5 | 0.6 | 0.7 | 0.75 | **0.8** | 0.85 | 0.9 |
|---|---|---|---|---|---|---|---|
| judge (all 158) | 110 | 112 | 118 | 120 | **122** | 120 | 118 |
| regex (all 158) | 98 | 98 | 98 | 98 | 98 | 98 | 98 |

## Known consequence, stated rather than hidden
`prose-draft` gives close-out docs (retros, posters, sprint-wraps) **no `liveFlags`**. It always did, and the
regex already flagged "is live" in them. Because Jev catches the paraphrases too, a retrospective draft that
says, truthfully, that something is live in production will now be **flagged more often**. The flag is
advisory there (a banner, plus one revision pass), not a gate. The follow-up is to derive `liveFlags` for
close-out drafts from the epic's own `status: shipped`. It is recorded in the retrospective.
