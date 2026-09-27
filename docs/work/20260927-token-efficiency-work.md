---
tags: [development, work-planning, token-efficiency, review-quality]
---

# MARC token-efficiency work plan

**Created:** 2026-09-27  
**Status:** E1–E3 implemented locally; frozen PR #16 before/after assessment measurement in progress. No trusted activation or merge.  
**Outcome:** Reduce the token cost of completing a PR assessment while preserving evidence quality, independent review and guarded actions.

Work through one item at a time. Record its measured result and remaining limitations below before choosing the next item. Start with E1–E3; introduce basic measurement from E5 early so their effects can be compared. E4 changes assurance policy and should be evaluated separately.

## Baseline: PR #15

[PR #15](https://github.com/wallism/marc/pull/15) added repair-commit links. Its [approved assessment](https://github.com/wallism/marc/blob/42340d486c49a2375e145e1e96b35ce2b82b4fcc/.quality/reports/pr-15/20260927-0013-15.md) records the reviewed source `3dff18d39d712b58f8d16ca19fa9688ca156c991` and trusted base `d06da4279c61cb159ab5aa06bd0f70df3f5f4095`.

| Observation | Value |
| --- | ---: |
| Changed files, including documentation and tests | 4 |
| Counted production additions plus deletions | 11 |
| Referenced unchanged files in captured impact | 49 |
| Independent reviewers | 8 |
| Repair cycles | 0 |
| Captain model calls across review and approval continuation | 68 |
| Captain input tokens | 10,650,198 |
| Included cached input tokens | 10,518,016 |
| Uncached input tokens | 132,182 |
| Captain output tokens | 14,547 |

The user observed approximately 6% of their weekly allowance consumed, using Astra at Medium. That percentage is user-reported; it is not a measured conversion from the token totals above.

Captain counts were summed from local `token_usage_record` entries for thread `01a0e016-d967-7aa1-a4dd-538e8238b90c`, turns `01a0e029-c2c2-7dc2-ace9-6c9d6802f2aa` and `01a0e034-a8b0-7030-aa53-be14bb27d2c2`. The interval starts with “run MARC for PR 15” and ends before the efficiency discussion. It excludes earlier implementation work and does not provide a complete reviewer total. Reviewer usage was absent from the published evidence. Keep raw transcripts and operational records outside this repository.

Cached input is a subset of input, and repeated processing of history is counted across calls. These figures are not unique context size, a final bill or a weekly-allowance calculation. See [OpenAI usage accounting](https://developers.openai.com/api/docs/guides/agents-api/observability#model-usage-and-cost).

## Action register

### E1 — Reduce Captain round trips and carried context

- [ ] Implement and validate.

**Observed:** The Captain retained the implementation conversation and large instruction/tool outputs while making many orchestration calls, including short waits and repeated inspections.

**Work:** Provide deterministic controller operations for CI collection, artifact validation, gate assembly and ledger updates. Return compact status changes with paths to detailed evidence. Batch independent reads and use bounded waits that return on meaningful changes. Define a fresh, bounded Captain handoff containing current authority, immutable identities and resumable state; do not inherit the entire implementation conversation.

**Acceptance:** Compare Captain calls and input/output categories against this baseline. Demonstrate interrupted-run resumption, pending/failed CI handling and source/base/policy drift detection. Preserve exclusive locks, cumulative budgets, independent reviewer sessions, approval boundaries and final live checks. Never reuse a cached live-state observation as merge authority.

**Starting points:** [Captain](../../skills/marc-crew-captain/SKILL.md), [controller](../../src/quality/marc.cjs), [harness contract](../../skills/marc-crew-captain/references/harnesses.md).

### E2 — Select specialists from meaningful impact evidence

- [ ] Implement and validate.

**Observed:** Captured references matched JavaScript `command` to C# evaluation fixtures, `identity` to the C# startup hook, and `run` to workflow YAML. C# and GitHub Actions reviewers ultimately found no relevant behavior change. Discovery seeded searches from declarations throughout changed production files, including unchanged functions.

**Work:** Prioritize declarations affected by diff hunks, including body-only changes, and trace meaningful caller/import/resource relationships. Distinguish incidental identifier matches from evidence sufficient to recruit another technology specialist. Retain lexical leads for inspection where useful.

**Acceptance:** Replay PR #15 selection without relying on its reviewer conclusions as input. Add focused cases proving genuine cross-language, workflow, shared-contract and indirect impacts remain visible, including removed callers and unchanged-signature edits. Do not solve over-selection by raising discovery limits, excluding all fixtures, silently dropping uncertainty or editing captured selection. Two fewer sessions here is a hypothesis to validate, not a guaranteed saving.

**Starting points:** [impact discovery](../../src/quality/impact.cjs), [crew selection](../../src/quality/crew.cjs), [impact guidance](../impact-discovery.md).

### E3 — Split reviewer contracts and prepare compact evidence packets

- [ ] Implement and validate.

**Observed:** The shared evidence contract was approximately 3,286 words and included dependency, publication, recovery and approval procedures that many reviewers did not need. The Captain entry point was approximately 4,314 words.

**Work:** Extract a concise common reviewer contract covering identity, independence, findings and output. Load dependency, browser and other specialized guidance only when applicable. Supply a machine-generated packet with frozen identities, complete diff, relevant source pointers, CI facts and the assigned gate schema. Keep publication and coordination procedures with the Captain.

**Acceptance:** Measure instructions and evidence loaded per reviewer. Preserve access to the complete source and allow reviewers to expand scope with evidence. Packets must contain neutral facts, not another reviewer's conclusions. Verify missing/stale evidence and unavailable expertise still hold. Validate skill links and compare known-defect and clean-control outcomes.

**Starting points:** [evidence contract](../../skills/marc-crew-captain/references/evidence.md), [language impact](../../skills/marc-crew-captain/references/language-impact.md), [skill evaluation plan](20260915-skill-evals-csharp-work.md).

### E4 — Evaluate overlapping gates and simple-route precision

- [ ] Design and evaluate separately before changing policy.

**Observed:** Correctness already evaluates intended behavior; a separate intent reviewer repeats part of that investigation. PR #15 used full review because its persisted rendering marker fell under the current persistence/serialization routing rule.

**Work:** Evaluate whether one independent correctness reviewer can supply both correctness and structured intent results. Consider a comprehensive independent review plus relevant expertise for demonstrably simple changes, with escalation on risk. Clarify the boundary between low-risk report presentation and changes to persisted evidence or approval behavior.

**Acceptance:** Compare missed defects, false alarms, correct holds and intent mismatches on representative cases. Preserve independence from the implementation agent and the human-approval rule for intent repairs. Update gate identity/session validation and policy deliberately if approved; never relabel one review as multiple independent sessions. Small diffs alone must not qualify for lighter review.

**Starting points:** [simplicity rules](../../skills/marc-crew-simplicity/SKILL.md), [intent contract](../../skills/marc-crew-captain/references/intent.md), [gate evaluation](../../src/quality/marc.cjs).

### E5 — Measure cost by phase, then evaluate model settings

- [ ] Add available per-phase and per-session measurement.
- [ ] Establish a comparable baseline and evaluate alternative settings when requested.

**Work:** Report Captain and reviewer calls, input, cached input, output, retries and missing telemetry separately. Attribute local host usage records to the correct session and turn, with deduplication and explicit field semantics. Compare complete assessment cost, including orchestration and approval continuation. Evaluate lower reasoning or alternative models only after removing avoidable work.

**Acceptance:** Never infer missing counts, double-count cached input or claim token totals equal allowance percentages. Compare fixed known-defect and clean-control cases using recorded model/settings and immutable inputs. Track defects missed, false alarms, correct holds, tokens and latency together. Use risk-based escalation; reduced tokens alone do not justify a quality regression. Do not execute model benchmarks or hosted CI without a separate request.

**Starting points:** [execution and usage records](../../src/quality/agent-settings.cjs), [harness accounting](../../skills/marc-crew-captain/references/harnesses.md), [evaluation work](20260915-skill-evals-csharp-work.md).

## Delivery and measurement rules

Keep each change focused and reviewable. E1–E3 should retain existing review gates; E4 is an explicit assurance-policy proposal. Update the affected component/member improvement register and root register when material process changes are actually implemented. This planning document does not activate changes in MARC or consumers.

Record the source/base/tool/policy identities, model settings, input/cached/output counts, missing telemetry, reviewer and Captain calls, findings quality, CI reuse and completion outcome for comparisons. Distinguish measured improvements from expectations; do not promise a percentage reduction before a comparable run.

## Progress log

| Date | Item | Change / evidence | Outcome / next action |
| --- | --- | --- | --- |
| 2026-09-27 | Baseline | PR #15 assessment and local Captain usage records inspected. | Recommendations recorded; begin E1 with basic E5 measurement. No runtime changes or benchmark runs. |
| 2026-09-27 | PR #16 before | Frozen source `b905d99276b43501ad0611937f2ffc9d2d4ddb60`, base/tool `74921a12d167dc26b6043cce5eafd32b8c66b5cd`, policy `bc33aaf6cedade5228a3f4530ee74c13edb5ace15f05fdae503d14abf40a6b88`; reused successful source CI `36283816229`, attempt 1. Eight fresh Astra/Medium reviewers. | 88 reviewer calls; 5,856,597 inclusive input, 5,379,584 cached input, 477,013 uncached input, 23,715 output. Held for human approval and discovery depth. No concrete code defect found. |
| 2026-09-27 | E1 | Added deterministic session collection/assembly, artifact validation, bounded status waits, identity/ownership checks, resumable external checkpoints and deduplicated usage accounting. | Focused interruption, drift, pending/failed CI and independent-result preservation tests passed. No action authority added; live activation remains separate. |
| 2026-09-27 | E2 | Seed changed declarations from both diff sides; filter native-language/local-binding/member collisions; trace named imports and explicit workflow/process paths; retain cross-language lexical leads. | Genuine interface, removed-caller, alias, resource and cross-language cases pass with unchanged discovery limits. PR #15/#16 replays use source only, not reviewer conclusions. |
| 2026-09-27 | E3 | Added common reviewer contract and neutral, checksummed packets with complete diff/source access; moved conditional dependency and Captain procedures to references. | Combined focused validation: 105 passed. Catalogue links and syntax pass. The rerun will measure consumption; instruction size alone is not a token saving claim. |
