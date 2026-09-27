---
tags: [development, work-planning, token-efficiency, review-quality]
---

# MARC token-efficiency work plan

**Created:** 2026-09-27
**Status:** E1–E3 and E5 retained. E4 removed at the owner's request after the fresh comparison showed higher overall token usage and elapsed time. Original independent gates and simple-route rules restored. Historical measurements below remain unchanged; no trusted activation or merge.
**Outcome:** Reduce the token cost of completing a PR assessment while preserving evidence quality, independent review and guarded actions.

Work through one item at a time. Record its measured result and remaining limitations below before choosing the next item. Start with E1–E3; introduce basic measurement from E5 early so their effects can be compared. E4 changes assurance policy and should be evaluated separately.

## Results at a glance

> **Current result:** E1–E3 and E5 retained · E4 removed · **233/233 CI-equivalent tests passed locally** · **No overall assessment-efficiency gain demonstrated**

All results below were recorded on 2026-09-27. These summarize completed runs; no new benchmark was run for this summary.

| Assessment comparison | Model calls | Input including cache | Uncached input | Output including reasoning | Elapsed time | Interpretation |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| PR16: before → E1–E3 | 137 → 116 (−15.33%) | 10,646,082 → 10,660,540 (+0.14%) | 595,010 → 542,524 (−8.82%) | 33,709 → 38,148 (+13.17%) | Different Captain windows; no clean timing comparison | No overall token reduction. Captain retained implementation history; review coverage also changed. |
| PR16: fresh E1–E3 baseline → E4/E5 | 146 → 162 (+10.96%) | 10,974,616 → 13,699,223 (+24.83%) | 704,152 → 642,839 (−8.71%) | 43,468 → 51,464 (+18.40%) | 15m 18.139s → 17m 38.806s (+15.32%) | Fresh Captains and reviewers, same source/model/settings; slower and more tokens overall. E4 subsequently removed. |
| Current E1–E3/E5 after removing E4 | Not rerun | Not rerun | Not rerun | Not rerun | Not rerun | Local validation passed; do not treat either earlier benchmark as a new measurement of the final combination. |

Input includes cached input; do not add cache again. Retries are unknown. The assessment totals exclude implementation and benchmark administration; they are not money or allowance percentages. See the detailed comparison sections below for cached counts, role attribution, immutable identities and exclusions.

| Validation / replay | Recorded result | What it establishes |
| --- | --- | --- |
| E1–E3 focused Node 24 checks | 105 passed; final checkpoint/artifact adjustment reran 9 relevant checks successfully | Controller, packet, discovery, review, CI-recovery and report/stage mechanics; catalogue and syntax checks also passed. |
| E4/E5 experimental checks | 96 passed | Proposed gate and measurement mechanics, not model-quality equivalence. E4 was later removed. |
| E4 removal / E5 retained | **92 passed, 0 failed** | Restored independent gates and simple route, retained measurement, report compatibility and catalogue links. |
| PR17 initial hosted CI (`871cb77`) | Ubuntu: 230 passed, 2 failed, 1 platform skip | [Failed job](https://github.com/wallism/marc/actions/runs/36294552694/job/108550868029): two older language-discovery tests still assumed cross-language identifier matches were dependency edges. Earlier focused checks missed this file. |
| PR17 language-discovery fixture fix | 30 focused tests passed | Cross-language lexical leads remain inspectable, comment/string noise stays excluded, and genuine native-language test callers stop dependency expansion. Runtime rules unchanged. |
| PR17 full CI-equivalent local check after fixture fix | **233 passed, 0 failed, 0 skipped** | Node 24 on Windows; the complete quality and self-review suite passed with JUnit evidence generated. Hosted confirmation is tracked separately in PR17 checks. |
| E5 measurement CLI | Output exactly matched the baseline API calculation | Same deduplicated host records produced the same counts. |
| Source-only PR15 impact replay | 53 → 20 files; 3 → 1 selected specialists | Narrower selection retained JavaScript. This was not a PR15 model-cost rerun. |
| Source-only PR16 impact replay | 62 → 46 files; 3 specialists retained; discovery hold resolved | Discovery completed within unchanged limits; required specialist coverage remained. |

The older PR15 baseline measured only its Captain: 68 calls, 10,650,198 inclusive input, 132,182 uncached input and 14,547 output. Reviewer totals were unavailable, so it is not comparable to the complete Captain-plus-reviewer rows above.

Both fresh PR16 runs retained the legacy-report compatibility finding and governance-approval hold. The combined reviewer additionally flagged partial intent alignment. The broader known-defect/clean model corpus and alternative model settings remain unrun; passing local tests does not establish model defect-detection rates. Existing PR16 CI was reused, and the PR was not repaired or merged during these comparisons.

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

- [x] Implement and locally validate; live fresh-Captain cost comparison remains unproven.

**Observed:** The Captain retained the implementation conversation and large instruction/tool outputs while making many orchestration calls, including short waits and repeated inspections.

**Work:** Provide deterministic controller operations for CI collection, artifact validation, gate assembly and ledger updates. Return compact status changes with paths to detailed evidence. Batch independent reads and use bounded waits that return on meaningful changes. Define a fresh, bounded Captain handoff containing current authority, immutable identities and resumable state; do not inherit the entire implementation conversation.

**Acceptance:** Compare Captain calls and input/output categories against this baseline. Demonstrate interrupted-run resumption, pending/failed CI handling and source/base/policy drift detection. Preserve exclusive locks, cumulative budgets, independent reviewer sessions, approval boundaries and final live checks. Never reuse a cached live-state observation as merge authority.

**Starting points:** [Captain](../../skills/marc-crew-captain/SKILL.md), [controller](../../src/quality/marc.cjs), [harness contract](../../skills/marc-crew-captain/references/harnesses.md).

### E2 — Select specialists from meaningful impact evidence

- [x] Implement and validate focused impact cases and source-only PR #15/#16 replays.

**Observed:** Captured references matched JavaScript `command` to C# evaluation fixtures, `identity` to the C# startup hook, and `run` to workflow YAML. C# and GitHub Actions reviewers ultimately found no relevant behavior change. Discovery seeded searches from declarations throughout changed production files, including unchanged functions.

**Work:** Prioritize declarations affected by diff hunks, including body-only changes, and trace meaningful caller/import/resource relationships. Distinguish incidental identifier matches from evidence sufficient to recruit another technology specialist. Retain lexical leads for inspection where useful.

**Acceptance:** Replay PR #15 selection without relying on its reviewer conclusions as input. Add focused cases proving genuine cross-language, workflow, shared-contract and indirect impacts remain visible, including removed callers and unchanged-signature edits. Do not solve over-selection by raising discovery limits, excluding all fixtures, silently dropping uncertainty or editing captured selection. Two fewer sessions here is a hypothesis to validate, not a guaranteed saving.

**Starting points:** [impact discovery](../../src/quality/impact.cjs), [crew selection](../../src/quality/crew.cjs), [impact guidance](../impact-discovery.md).

### E3 — Split reviewer contracts and prepare compact evidence packets

- [x] Implement and validate packet mechanics and the PR #16 assessment pair; broad model quality controls remain unrun.

**Observed:** The shared evidence contract was approximately 3,286 words and included dependency, publication, recovery and approval procedures that many reviewers did not need. The Captain entry point was approximately 4,314 words.

**Work:** Extract a concise common reviewer contract covering identity, independence, findings and output. Load dependency, browser and other specialized guidance only when applicable. Supply a machine-generated packet with frozen identities, complete diff, relevant source pointers, CI facts and the assigned gate schema. Keep publication and coordination procedures with the Captain.

**Acceptance:** Measure instructions and evidence loaded per reviewer. Preserve access to the complete source and allow reviewers to expand scope with evidence. Packets must contain neutral facts, not another reviewer's conclusions. Verify missing/stale evidence and unavailable expertise still hold. Validate skill links and compare known-defect and clean-control outcomes.

**Starting points:** [evidence contract](../../skills/marc-crew-captain/references/evidence.md), [language impact](../../skills/marc-crew-captain/references/language-impact.md), [skill evaluation plan](20260915-skill-evals-csharp-work.md).

### E4 — Evaluate overlapping gates and simple-route precision

- [x] Evaluated and removed at the owner's request. Separate correctness/intent review and original simple-route rules are restored. No E4 activation is planned.

**Observed:** Correctness already evaluates intended behavior; a separate intent reviewer repeats part of that investigation. PR #15 used full review because its persisted rendering marker fell under the current persistence/serialization routing rule.

**Work:** Evaluate whether one independent correctness reviewer can supply both correctness and structured intent results. Consider a comprehensive independent review plus relevant expertise for demonstrably simple changes, with escalation on risk. Clarify the boundary between low-risk report presentation and changes to persisted evidence or approval behavior.

**Acceptance:** Compare missed defects, false alarms, correct holds and intent mismatches on representative cases. Preserve independence from the implementation agent and the human-approval rule for intent repairs. Update gate identity/session validation and policy deliberately if approved; never relabel one review as multiple independent sessions. Small diffs alone must not qualify for lighter review.

**Starting points:** [simplicity rules](../../skills/marc-crew-simplicity/SKILL.md), [intent contract](../../skills/marc-crew-captain/references/intent.md), [gate evaluation](../../src/quality/marc.cjs).

### E5 — Measure cost by phase, then evaluate model settings

- [x] Add available per-phase and per-session measurement, explicit missing telemetry and comparative latency.
- [x] Complete a fresh-Captain, fixed-source/settings comparison.
- [ ] Evaluate alternative settings only when separately requested, with representative quality controls.

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

## Measured PR #16 result — 2026-09-27

**No overall token reduction was demonstrated.** The combined observed assessment windows used nearly identical inclusive input (+0.14%), less uncached input (-8.82%) and more output (+13.17%). Independent reviewer consumption increased. Do not describe the smaller instruction files or fewer Captain calls as a demonstrated total token saving.

Both assessments used [PR #16](https://github.com/wallism/marc/pull/16), source `b905d99276b43501ad0611937f2ffc9d2d4ddb60`, base `74921a12d167dc26b6043cce5eafd32b8c66b5cd`, eight fresh independent Astra/Medium reviewers, and successful [source CI run 36283816229](https://github.com/wallism/marc/actions/runs/36283816229), attempt 1. Ubuntu had 222 testcases (one platform skip); Windows had 222; sanitized secrets findings were empty. No hosted job was dispatched or repeated.

Baseline tool: `74921a12d167dc26b6043cce5eafd32b8c66b5cd`; baseline policy: `bc33aaf6cedade5228a3f4530ee74c13edb5ace15f05fdae503d14abf40a6b88`.

Experimental after tool: `192c6e72513f048a0dab740aa18a71db384a0e2a`; after policy: `7717a4459a9041cb537ed78920f9ec4ece5b23445852e445cd3c26efba5946eb`. These are deliberately different tool/policy identities, with fresh reviewer results for the second capture. This is local experimental evidence, not activation of candidate-owned governance or merge authority. Raw transcripts, captures, gate JSON, host receipts and comparison data remain in external state.

### Combined observed assessment windows

| Metric | Before | After | Change |
| --- | --- | --- | --- |
| Model calls | 137 | 116 | -15.33% |
| Input, including cache | 10,646,082 | 10,660,540 | +0.14% |
| Cached input (subset) | 10,051,072 | 10,118,016 | +0.67% |
| Uncached input | 595,010 | 542,524 | -8.82% |
| Output, including reasoning | 33,709 | 38,148 | +13.17% |

Cached input is a subset of input; never add it again. Uncached input is inclusive input minus cached input. These figures are not unique context length, money or allowance percentages. Implementation and final result-writing costs are excluded from both assessment windows; this is not a claim that the development work paid for itself.

### Independent reviewers

| Metric | Before | After | Change |
| --- | --- | --- | --- |
| Model calls | 88 | 91 | +3.41% |
| Input, including cache | 5,856,597 | 6,289,463 | +7.39% |
| Cached input (subset) | 5,379,584 | 5,769,728 | +7.25% |
| Uncached input | 477,013 | 519,735 | +8.96% |
| Output, including reasoning | 23,715 | 25,957 | +9.45% |

| Gate | Before outcome | After outcome | Calls before / after | Input before / after | Cached before / after | Output before / after |
| --- | --- | --- | --- | --- | --- | --- |
| code-quality | pass | pass | 13 / 11 | 913,666 / 777,829 | 847,872 / 708,480 | 3,091 / 3,521 |
| correctness | pass | pass | 15 / 12 | 1,098,742 / 852,252 | 1,030,272 / 785,408 | 3,581 / 2,994 |
| csharp | blocked | pass | 11 / 11 | 631,473 / 720,293 | 586,880 / 665,216 | 2,820 / 2,998 |
| github-actions | blocked | pass | 11 / 11 | 693,783 / 709,097 | 642,944 / 654,336 | 3,321 / 3,310 |
| intent | pass | pass | 8 / 11 | 491,803 / 682,003 | 442,880 / 625,536 | 1,803 / 2,926 |
| javascript | blocked | pass | 9 / 12 | 630,959 / 889,205 | 568,960 / 814,592 | 2,817 / 3,463 |
| security | human-required | human-required | 10 / 11 | 650,228 / 809,139 | 580,736 / 736,384 | 3,305 / 3,367 |
| test-integrity | blocked | pass | 11 / 12 | 745,943 / 849,645 | 679,040 / 779,776 | 2,977 / 3,378 |

No reviewer demonstrated a concrete code defect in either run. Security retained a material governance approval finding. The baseline's incomplete discovery also held test integrity and the three specialists; these gates completed after improved discovery. Both assessments remain held for explicit sensitive-path approval. PR #16 was not repaired, published to or merged. Four hold-to-pass changes mean this is not an identical-workload quality comparison. Deeper completed reviews, residual lexical leads and ordinary model variability are possible explanations for higher reviewer cost, not proven causes.

### Captain diagnostic phases

| Metric | Before | After | Change |
| --- | --- | --- | --- |
| Model calls | 49 | 25 | -48.98% |
| Input, including cache | 4,789,485 | 4,371,077 | -8.74% |
| Cached input (subset) | 4,671,488 | 4,348,288 | -6.92% |
| Uncached input | 117,997 | 22,789 | -80.69% |
| Output, including reasoning | 9,994 | 12,191 | +21.98% |

The Captain remained in this implementation chat; it did not receive a fresh bounded context. The baseline includes initial inspection/setup and ends at `2026-09-27T01:14:23.294Z`. The after window starts with packet preparation at `2026-09-27T01:33:47.075Z`, includes its initial path-normalization retry, and ends at `2026-09-27T01:43:41.115Z`. Differing history, preparation and cache state prevent a clean causal E1 estimate. The smaller number of observed calls does not establish how much a fresh Captain would save. Pending CI and interruption behavior were tested deterministically, not encountered as live benchmark conditions.

### Instruction and evidence sizes

The common contract changed from 3285 to 535 whitespace-delimited words; the Captain entry point changed from 4313 to 1530. Detailed action procedures remain required in their linked references. Conditional dependency and browser guidance remains available. No required gate was removed or combined.

| Gate | Before entry/contract/project bytes | After entry/contract/project bytes | After packet bytes |
| --- | --- | --- | --- |
| security | 34,098 | 10,772 | 5,147 |
| correctness | 31,831 | 10,140 | 5,156 |
| code-quality | 31,724 | 10,033 | 5,159 |
| test-integrity | 32,099 | 10,408 | 5,165 |
| intent | 35,573 | 13,882 | 5,390 |
| crew:csharp | 33,445 | 11,754 | 5,356 |
| crew:github-actions | 31,896 | 10,205 | 5,380 |
| crew:javascript | 31,658 | 9,967 | 5,368 |

Across eight reviewers, the minimum entry/contract/project set decreased from 262,324 to 87,161 bytes (66.8%). These are **provided instruction sizes**, not a claim about every file actually read or a tokenizer estimate. Referenced specialist/language guidance and expanded source reads vary; actual processed tokens are reported above. Each after packet points to the same complete 56,433-byte diff and a 50,252-byte neutral scope document, plus the exact CI artifacts and unrestricted frozen source access. Packets contain no other reviewer's conclusions.

### Impact replay and validation

- PR #15 source-only replay: selected specialists decreased from JavaScript, C# and GitHub Actions to JavaScript; total inventory decreased from 53 to 20 files. Two fewer sessions is now a demonstrated selection result, **not measured PR #15 model-token savings**. Reviewer conclusions were not used as selection inputs.
- PR #16: total inventory decreased from 62 to 46 files; discovery completed within the original limits. Shared instruction changes still select all three configured specialists and all eight reviewer sessions. The 105 retained lexical leads are available for investigation, not hidden or treated as semantic dependencies.
- 105 focused Node 24 tests passed across orchestration, packets, impact, crew, gate evaluation, CI recovery, reports and stages. The final checkpoint/artifact-path adjustment reran its nine relevant tests successfully. Catalogue links and syntax checks passed.
- Controls cover interrupted resumption, exclusive ownership, source/base/policy/selection/intent drift, pending/failed/missing CI, malformed/missing evidence, duplicate/stale sessions, preservation of a known blocking result, clean results, missing expertise, old callers, body-only edits, interface contracts, import aliases and cross-language/workflow invocation.
- The known-defect/clean controls above are deterministic mechanism tests. This request's live model comparison was PR #16 only. The separate C# model-evaluation corpus was not run; missed-defect rates and broader prompt quality remain unproven. Retries are not separately labelled by the host and are not inferred. Usage counters were available for all 16 reviewers and both measured Captain intervals, deduplicated by response ID.
- The new operational command supports JUnit and sanitized scan JSON; other artifact formats retain explicit manual-workflow holds. The production trusted-target check was not bypassed to activate the local tool. Final publication/merge still needs clean current trusted code, new applicable evidence, operator approval and live checks.

**Conclusion:** retain the narrower impact selection, smaller contracts and deterministic controller mechanics as locally validated changes, but do not advertise an overall token-efficiency win from this PR pair. A separately authorized fresh-Captain and representative quality benchmark would be needed to establish that.

## E4/E5 implementation — 2026-09-27

**Historical experiment:** E4 was subsequently removed; only E5 remains from this implementation.

Implemented the explicit `intentReview: "correctness-v1"` policy proposal: one full-route correctness reviewer supplies nested static intent evidence, with one identity and execution receipt. Other full gates and specialists remain independent. Simple-route intent remains separate; `simpleRoute.reviewSchema: 1` requires comprehensive correctness/security/quality/test evidence. Report-presentation routing requires source-backed proof that persistence, approval and runtime contracts are unchanged. Intent-only refresh invalidates the entire combined session; intent repairs still require human approval.

Added exact-thread/turn phase and session usage aggregation, response deduplication, observed model/settings, separate elapsed and summed session time, approval-continuation support and explicit missing counters/retries. See [contracts and manifest](../assessment-measurement.md). No alternative model/effort, hosted CI or broad model evaluation was dispatched. The proposed `.marc` policy is not trusted self-activation.

Local controls: 96 distinct focused Node 24 tests across gate/intent evaluation, configuration, packets, orchestration, usage, report history, stages and catalogue links passed. Controls include clean alignment, mismatches/partial or uncertain intent, preserved blocking results, stale identity, repeated sessions, missing evidence, changed persisted/approval contracts, duplicate/missing telemetry and approval continuations. These establish gate mechanics, not a model missed-defect rate. Fresh PR16 assessment measurements are recorded below.

## Fresh-Captain E4/E5 comparison — 2026-09-27

**Decision after measurement:** The owner chose to keep E5 and remove E4. The figures and observations below describe the historical experiment, not the current review policy.

**No overall efficiency improvement was demonstrated.** Seven reviewers replaced eight, but the measured Captain-plus-reviewer calls, inclusive input, output and elapsed time increased. Uncached input decreased. Retain E4 as an explicit policy proposal; this result does not justify general activation on efficiency grounds. E5 provides better accounting, not an automatic cost reduction.

Both Captains started in their own `fork_turns: none` agents. Every reviewer also used a fresh non-inheriting agent. Neither Captain received an implementation transcript or an earlier assessment report; reviewer packets contained neutral facts only. All 17 sessions (two Captains, 15 reviewers) have host-confirmed `gpt-6-astra` / `medium`, with at most two reviewers active concurrently. The source, base, intent and exact-source CI were identical. No alternative model, effort setting or additional hosted CI was used.

- Source: `b905d99276b43501ad0611937f2ffc9d2d4ddb60`; base: `74921a12d167dc26b6043cce5eafd32b8c66b5cd`.
- Intent: `7cd5b27e06c89bbd8dff44f5ef3746c5e6bea6dcfd08cdca5fc15d5ea92237b5`.
- Baseline bundle: `8f67ae591dadf7f85a2fceba204960662c4135d3`, with source/skill bytes equivalent to `192c6e72513f048a0dab740aa18a71db384a0e2a`, whose neutral packet selection identity was retained. Policy: `7717a4459a9041cb537ed78920f9ec4ece5b23445852e445cd3c26efba5946eb`.
- E4/E5 bundle: `ed66e24cbedb3fc3bccc0ba45f3f387fd1ec0729`. Policy: `658e9936d820e1f4b880a560f099e5c471999d36a4d13b2b5d399d0a8f35767b`.
- Reused successful CI: run `36283816229`, attempt 1; 222 cases in each platform artifact, no failures, one Ubuntu skip; sanitized secrets scan passed.

### Captain plus reviewers

| Metric | Fresh E1–E3 baseline | Fresh E4/E5 | Change |
| --- | ---: | ---: | ---: |
| Independent reviewers | 8 | 7 | -12.50% |
| Model calls | 146 | 162 | +10.96% |
| Input, including cache | 10,974,616 | 13,699,223 | +24.83% |
| Cached input (subset) | 10,270,464 | 13,056,384 | +27.13% |
| Uncached input | 704,152 | 642,839 | -8.71% |
| Output, including reasoning | 43,468 | 51,464 | +18.40% |
| Elapsed assessment time | 15m 18.139s | 17m 38.806s | +15.32% |

Elapsed time covers each Captain's host `task_started` through `task_complete`, including its preparation, waits, decision and final reporting. Baseline interval: `02:51:26.406Z–03:06:44.545Z`; after interval: `03:07:17.136Z–03:24:55.942Z`. Reviewer completion and usage are included. These are assessment-session totals, not total development expenditure: implementation, prebuilt neutral-fact preparation and root benchmark administration (including one neutral policy-provenance reply) are excluded. No repair, approval continuation, publication, merge or deployment occurred; future continuation costs are unmeasured.

### Role attribution

| Role / metric | Baseline | E4/E5 | Change |
| --- | ---: | ---: | ---: |
| Captain calls | 51 | 55 | +7.84% |
| Captain input including cache | 4,016,381 | 5,473,052 | +36.27% |
| Captain cached input | 3,931,136 | 5,369,728 | +36.59% |
| Captain uncached input | 85,245 | 103,324 | +21.21% |
| Captain output | 12,617 | 13,695 | +8.54% |
| Reviewer calls | 95 | 107 | +12.63% |
| Reviewer input including cache | 6,958,235 | 8,226,171 | +18.22% |
| Reviewer cached input | 6,339,328 | 7,686,656 | +21.25% |
| Reviewer uncached input | 618,907 | 539,515 | -12.83% |
| Reviewer output | 30,851 | 37,769 | +22.42% |

Combining correctness and intent alone changed 23 calls / 1,660,992 inclusive input / 7,111 output into 22 calls / 1,939,776 input / 7,421 output. Removing a session did not remove the underlying investigation. The combined reviewer also reached a stricter intent conclusion. More carried context within a combined session and extra verification are plausible contributors, not isolated causal estimates.

### Review outcomes and limits

| Review | Baseline | E4/E5 |
| --- | --- | --- |
| Correctness | Repair: legacy report compatibility | Same repair finding |
| Intent | Separate reviewer: aligned/pass | Combined reviewer: partially aligned/human-required |
| Security | Human-required governance approval | Same hold |
| JavaScript | Pass | Independently found same legacy compatibility issue |
| Code quality, test integrity, C#, GitHub Actions | Pass | Pass |

Both processes held PR16 for the legacy SHA-named report path at candidate `src/quality/marc.cjs:549` and sensitive governance approval. The new timestamp precheck precedes exact report verification even though legacy SHA-named reports without `reportCreatedAt` remain supported by `reportPaths` and the report-verification fixture. This is source-backed review evidence, not an executed candidate reproduction. The after correctness reviewer also classified the issue as incomplete intent alignment and proposed a human-approved repair. No repair was performed because the source was frozen for comparison.

The two processes retained the same compatibility concern, but their intent and specialist conclusions differed. One PR cannot establish missed-defect or false-alarm rates. The representative model-quality corpus remains unrun; deterministic gate controls do not substitute for it. The simple report-presentation route was not exercised by this full-route PR, so its model cost/quality impact remains unmeasured.

After-run test-integrity work included investigating a policy-hash mismatch from a faulty PowerShell reconstruction. The reviewer independently reproduced the exact original digest using Node's standard library; the input identity hold was resolved, not waived. Its investigation remains in the measured totals. The security reviewer disclosed seeing one neighboring session-metadata line while finding its own UUID; no neighboring messages or review conclusions were read. No earlier report was fed into either fresh Captain or any reviewer.

All token categories were exposed for all 17 measured sessions. Retries were not exposed and remain unknown, never zero by inference. Response IDs were deduplicated; cumulative host counters were ignored. The measurement CLI reproduced the baseline API totals exactly. Summed reviewer session time rose from 1,449.500s to 1,599.529s; overlapping session times must not be added to elapsed wall time. Raw transcripts, gate results, manifests, usage and comparison JSON remain outside the repository in the `20260927-e4e5-fresh-baseline`, `20260927-e4e5-fresh-after` and neutral input run directories.

This pair removes inherited implementation/report history as a confounder. It still includes ordinary model variability, different review conclusions and additional verification. It provides no basis to claim that E4 reduced overall assessment cost or time. The implementation remains opt-in and reviewable; no consumer or trusted-master policy was activated.

## Owner decision — retain E5, remove E4

Restored the pre-E4 policy, controller gate validation, separate intent assessment and intent-only refresh, reviewer packets, original simple-route rules and corresponding skill instructions. Removed E4-specific tests and active policy documentation. Kept E1–E3, E5 usage aggregation/CLI/tests, fresh-Captain measurement guidance and both comparison records. Existing external experimental results remain historical evidence; they do not approve a new assessment.

Validation: all 92 focused Node 24 tests passed across restored gates, intent, configuration, packets, orchestration, usage, report history, stages and catalogue links. The policy and runtime review modules match pre-E4 commit `8f67ae5`; only E5 usage code/tests differ in the runtime tree. No additional model assessment or hosted CI was requested or dispatched for this removal.
