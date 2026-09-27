---
tags: [development, work-planning, token-efficiency, review-quality]
---

# MARC token-efficiency work plan

**Created:** 2026-09-27
**Status:** E1–E3 and E5 retained; E4 removed and the original independent gates and simple-route rules restored. E6–E9 merged to master and measured in a fresh PR16 assessment. Input, output and elapsed time decreased, but the unchanged source's earlier compatibility finding was not re-identified: review-quality parity remains unresolved. Historical measurements remain unchanged. PR16 remains held and was not repaired, published to or merged.
**Outcome:** Reduce the token cost of completing a PR assessment while preserving evidence quality, independent review and guarded actions.

Work through one item at a time. Record its measured result and remaining limitations below before choosing the next item. Start with E1–E3; introduce basic measurement from E5 early so their effects can be compared. E4 changes assurance policy and should be evaluated separately.

## Results at a glance

> **Current result:** E6–E9 fresh assessment: **input −17.43%, output −28.55%, elapsed −12.71%** versus the fresh E1–E3 baseline · **Missed a source-confirmed defect: not quality-preserving** · E6–E9 implementation validation: **238/238 local tests passed**

All results below were recorded on 2026-09-27. The latest row records the fresh assessment after E6–E9 reached master; earlier rows retain their historical measurements.

| Assessment comparison | Model calls | Input including cache | Uncached input | Output including reasoning | Elapsed time | Interpretation |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| PR16: before → E1–E3 | 137 → 116 (−15.33%) | 10,646,082 → 10,660,540 (+0.14%) | 595,010 → 542,524 (−8.82%) | 33,709 → 38,148 (+13.17%) | Different Captain windows; no clean timing comparison | No overall token reduction. Captain retained implementation history; review coverage also changed. |
| PR16: fresh E1–E3 baseline → E4/E5 | 146 → 162 (+10.96%) | 10,974,616 → 13,699,223 (+24.83%) | 704,152 → 642,839 (−8.71%) | 43,468 → 51,464 (+18.40%) | 15m 18.139s → 17m 38.806s (+15.32%) | Fresh Captains and reviewers, same source/model/settings; slower and more tokens overall. E4 subsequently removed. |
| E1–E3/E5 after removing E4, before E6–E9 | Not rerun | Not rerun | Not rerun | Not rerun | Not rerun | Local validation passed; neither earlier benchmark measured this combination. |
| PR16: fresh E1–E3 baseline → merged E6–E9 | 146 → 129 (−11.64%) | 10,974,616 → 9,061,367 (−17.43%) | 704,152 → 553,079 (−21.45%) | 43,468 → 31,057 (−28.55%) | 15m 18.139s → 13m 21.448s (−12.71%) | Lower observed cost/time with eight reviewers retained, but the run missed the legacy-report compatibility defect, since independently confirmed valid. Not a quality-preserving saving. |

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

Both fresh E4/E5-comparison runs retained the legacy-report compatibility finding and governance-approval hold. The combined reviewer additionally flagged partial intent alignment. The later E6–E9 run retained the governance hold but did not re-identify the compatibility finding. The broader known-defect/clean model corpus and alternative model settings remain unrun; passing local tests does not establish model defect-detection rates. Existing PR16 CI was reused, and the PR was not repaired or merged during these comparisons.

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

- [x] Implement and locally validate; fresh comparisons are recorded below, but an isolated E1 saving remains unproven.

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

### Cost model behind E6–E9

The fresh E1–E3 baseline spent 43,468 output tokens but 10,974,616 inclusive input: 94% cached. Nearly all cost is the whole context being resent on every call, approximately *calls × mean context*. The Captain averaged ~79k input per call over 51 calls; reviewers averaged ~73k over ~12 calls each. E3 removed ~3k tokens of instructions per reviewer, but every reviewer still opened a ~56KB diff and a ~50KB indented `scope.json` through separate reads, and then resent them on each later call. E6–E9 target call count, carried evidence size, cross-session cache reuse and the metric itself. None changes a gate, route, session requirement or authority.

### E6 — One-read reviewer briefs

- [x] Implement, locally validate and measure a fresh PR16 assessment: reviewer calls decreased from 95 to 78; quality parity remains unresolved.

**Observed:** A reviewer spent several calls before reviewing: packet, checksum verification, common contract, gate skill, project guidance, diff and scope, each a separate read that also grew the context for every later call.

**Work:** The controller renders one Markdown brief per gate that inlines the common contract, gate skill, project guidance, applicable conditional contracts, identities, CI facts, compact scope and the frozen text diff (within a byte budget), followed by the output schema and path. The controller verifies packet and brief checksums before dispatch; reviewers confirm identities without recomputing checksums. Ask reviewers to batch independent reads, and leave result validation to controller assembly.

**Acceptance:** One read gives a reviewer everything needed to start. Brief bytes are checksummed and verified with the packet; a changed brief fails verification. The complete binary-capable diff and full source remain available; files not inlined are named explicitly. No other reviewer conclusions appear. Existing packets without briefs remain verifiable.

**Starting points:** [packets](../../src/quality/review-packets.cjs), [common contract](../../skills/marc-crew-captain/references/reviewer.md), [assessment handoff](../../skills/marc-crew-captain/references/assessment-session.md).

### E7 — Compact, gate-relevant evidence

- [x] Implement and locally validate.

**Observed:** `scope.json` is pretty-printed JSON repeating every reference and lexical lead with field names. The complete diff is binary-capable, so binary files add encoded payloads that no reviewer reads. Specialists received no guidance on which files concern their technology.

**Work:** Render scope as one line per changed file (with line counts), reference, lexical lead, hold and project change; keep the complete JSON as audit evidence by pointer. Inline a text diff (binary files summarised by Git) in a fixed order: production, then tests, then documentation, within a byte budget, listing any file not inlined. Give each specialist a filtered list of changed files, references and leads touching its covered technologies or applicability paths, as starting pointers, not a scope ceiling.

**Acceptance:** Nothing is dropped from the evidence: every omitted item is pointed to. Specialist filters never narrow what a reviewer may inspect. Core gates still receive the complete compact scope.

**Starting points:** [packets](../../src/quality/review-packets.cjs), [crew selection](../../src/quality/crew.cjs).

### E8 — Cache-stable briefs and fewer Captain round trips

- [x] Implement brief layout, dispatch summary and procedure split; live cross-session cache reuse depends on the host and remains unmeasured.

**Observed:** Each reviewer read shared evidence in its own order, so no session could reuse another's cached prefix; reviewer uncached input averaged ~77k. The Captain loaded all action procedures (~22KB) on every run, polled reviewers individually and ran at most two reviewers concurrently.

**Work:** Every brief starts with a byte-identical shared prefix (identity, contracts, CI facts, compact scope, diff) and ends with the gate-specific part, and the handoff records the prefix digest. Where a host starts fresh sessions from an initial prompt, supplying the brief bytes lets its prompt cache serve later reviewers' prefix. The handoff lists every gate's brief, output and agent-selection role so the Captain need not open packets. The Captain dispatches all gates in one turn up to available slots, waits once for all of them rather than polling, and does not load briefs, diffs or scope. Move repair, recovery, publication and merge procedures into a separate reference loaded only when those actions are reached.

**Acceptance:** Tests prove identical prefixes across gates and that prefix digests change with evidence. All required gates and fresh sessions remain; capacity limits still mean waiting for slots. Action procedures are unchanged in substance and still mandatory before any guarded action.

**Starting points:** [Captain](../../skills/marc-crew-captain/SKILL.md), [action procedures](../../skills/marc-crew-captain/references/controller-operations.md), [harness contract](../../skills/marc-crew-captain/references/harnesses.md).

### E9 — Weighted cost and context metrics

- [x] Implement and locally validate.

**Observed:** Comparisons used inclusive input, which weights a cached token like a fresh one. E4's −9% uncached input but +25% inclusive input could not be judged, and the calls × context decomposition was not reported.

**Work:** Report mean input per call for each session, role, phase and total. When the manifest declares relative weights for uncached input, cached input and output, with their source, report weighted input-equivalent tokens and compare them. Without declared weights, report weighted totals as missing, not estimated.

**Acceptance:** Weights are never defaulted or converted into money or allowance. Missing counts make weighted and mean values null. `compareUsage` reports both metrics alongside existing categories.

**Starting points:** [usage](../../src/quality/usage.cjs), [measurement contract](../assessment-measurement.md).

### Not planned: assurance-policy options

Re-reviewing only gates affected by a repair, and lower reasoning or alternative models for specialists, would change assurance policy. They remain owner decisions requiring the representative quality corpus, like E4, and are not part of E6–E9.

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
| 2026-09-27 | E6–E9 | One checksummed brief per gate with inline contracts, compact scope and budgeted text diff; specialist focus lists; byte-identical shared prefix with recorded digest; handoff dispatch list; guarded actions split out of intake/review procedures; mean-context and declared-weight usage metrics. | Focused tests pass (see validation below). Next: a separately authorized fresh-Captain comparison against the E1–E3 baseline, reporting calls, mean context and weighted tokens per role. |
| 2026-09-27 | E6–E9 follow-up | Confirmed the missed legacy-report defect from source; analysed Captain and correctness transcripts; added the previously-accepted-states correctness check, a correctness defect/clean eval pair and brief size hints. | Recorded below. Next: supported frozen replay, benchmark settings without a two-slot cap, then an authorized repeated rerun. |

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

## E6–E9 implementation — 2026-09-27

Implemented E6–E9 without changing any gate, route, required session, budget or authority. See [assessment sessions](../assessment-sessions.md) and [assessment measurement](../assessment-measurement.md).

### Offline PR16 brief replay

A source-only replay built packets for [PR #16](https://github.com/wallism/marc/pull/16) (source `b905d99276b43501ad0611937f2ffc9d2d4ddb60`, base `74921a12d167dc26b6043cce5eafd32b8c66b5cd`) with this branch's controller and MARC's own crew configuration, using a synthetic policy/intent identity and no CI artifacts. It selected the same eight gates as the measured runs. No model, reviewer or hosted CI ran; these are **byte sizes of provided evidence**, not token measurements.

| Measure | Before (E3 packet set) | After (E6–E8 brief) |
| --- | ---: | ---: |
| Files a reviewer opens to start | ~6 (packet, contract, skill, guidance, diff, scope) | 1 |
| Bytes provided per gate (range) | 120,347–124,363 | 87,109–91,098 |
| Scope bytes | 50,228 (indented JSON) | ~17,150 (one line per entry, nothing dropped) |
| Diff bytes | 56,433 (binary-capable) | ~56,740 (text, inlined in full) |
| Byte-identical shared prefix | none | 84,417 |

The complete scope JSON and binary-capable diff remain available by checksummed pointer. The diff is now most of each brief and is evidence every reviewer must read. At implementation time, fewer reviewer calls, smaller contexts and cross-session cache reuse were unmeasured hypotheses. The fresh assessment below measures calls and context; cross-session prefix-cache reuse remains unproven.

### Validation

- Focused packet tests cover one-read briefs with inlined contracts, absolute reference links and demoted headings; byte-identical shared prefixes and changed digests; brief tampering and pre-E6 packet verification; over-budget ordering with every file not inlined named; and specialist focus without narrowing scope.
- Usage tests cover mean context by session, role, phase and total; declared-weight totals; null weighted totals with missing counts; rejection of malformed weights; and weight mismatches in comparisons.
- CI-equivalent local run on Node 24 (Windows): `src/quality/*.test.cjs` plus `.marc/self-review.test.cjs`, **238 passed, 0 failed, 0 skipped**. Syntax check and catalogue link validation passed; the C# eval corpus contract check passed.
- Guarded-action procedures moved to [guarded actions](../../skills/marc-crew-captain/references/guarded-actions.md) verbatim; intake and review steps link to them.

**Follow-up:** the owner-authorized fresh-Captain comparison is recorded below. Cross-session prefix caching and broader review-quality equivalence remain unproven.

## Fresh assessment with merged E6–E9 — 2026-09-27

**Observed cost and time decreased; review-quality parity is unresolved.** The fresh Captain and all eight independent reviewers used host-confirmed `gpt-6-astra` / `medium`, fresh non-inheriting sessions and at most two concurrent reviewers, matching the fresh E1–E3 baseline. No gate was removed or combined. The reviewer call count fell; the Captain still made 51 calls. These are measured results for one assessment, not an isolated causal estimate for any individual improvement.

The controller and skills came from clean, current master `e109cb6a726ed454aba779c661e8e993326e10ee`, which includes merged PR18. The candidate source/base and intent were frozen to preserve the earlier workload:

- Source: `b905d99276b43501ad0611937f2ffc9d2d4ddb60`; base: `74921a12d167dc26b6043cce5eafd32b8c66b5cd`.
- Intent: `7cd5b27e06c89bbd8dff44f5ef3746c5e6bea6dcfd08cdca5fc15d5ea92237b5`.
- Current policy digest: `948fbd9a863e3625e684c4e1325f4ae943718b080e2ce718da7150192a854203`; selection: `a16ba165175e86719a7c278d5ffc53d5b69857a480b715d9bccb6a51904e3be4`.
- Exact-source CI [run 36283816229, attempt 1](https://github.com/wallism/marc/actions/runs/36283816229) was revalidated successful. Both JUnit artifacts contained 222 cases with no failures/errors; Ubuntu had one Windows-specific skip. Sanitized secret scanning passed. No CI was dispatched.

This was a frozen assessment through the current tool's experimental packet and assembly APIs. The live controller separately rejected the historical capture with `Target branch changed; recapture and review`; that check was not bypassed. Live source and intent were unchanged, but live master was `e109cb6a`. The only open PR was [PR16](https://github.com/wallism/marc/pull/16), held for current-base recapture and explicit governance approval. The frozen result supplies no merge authority against today's base.

### Captain plus reviewers

| Metric | Fresh E1–E3 baseline | Merged E6–E9 | Change |
| --- | ---: | ---: | ---: |
| Independent reviewers | 8 | 8 | 0.00% |
| Model calls | 146 | 129 | −11.64% |
| Mean context per call | 75,169 | 70,243 | −6.55% |
| Input, including cache | 10,974,616 | 9,061,367 | −17.43% |
| Cached input (subset) | 10,270,464 | 8,508,288 | −17.16% |
| Uncached input | 704,152 | 553,079 | −21.45% |
| Output, including reasoning | 43,468 | 31,057 | −28.55% |
| Elapsed assessment time | 15m 18.139s | 13m 21.448s | −12.71% |
| Weighted tokens | Unavailable | Unavailable | No verified host price/allowance ratios declared |

The after interval is `06:26:38.650Z–06:40:00.098Z`, from the Captain's host `task_started` through `task_complete`, including preparation, CI/artifact verification, review waits, assembly and final reporting. Baseline boundaries remain `02:51:26.406Z–03:06:44.545Z`. Root benchmark administration, documentation and the earlier neutral capture are excluded. No repair, approval continuation, publication, merge or deployment occurred; future continuation cost remains unmeasured.

### Role attribution

| Role / metric | Baseline | E6–E9 | Change |
| --- | ---: | ---: | ---: |
| Captain calls | 51 | 51 | 0.00% |
| Captain mean context | 78,753 | 72,256 | −8.25% |
| Captain inclusive input | 4,016,381 | 3,685,057 | −8.25% |
| Captain cached input | 3,931,136 | 3,611,392 | −8.13% |
| Captain uncached input | 85,245 | 73,665 | −13.58% |
| Captain output | 12,617 | 8,691 | −31.12% |
| Reviewer calls | 95 | 78 | −17.89% |
| Reviewer mean context | 73,245 | 68,927 | −5.90% |
| Reviewer inclusive input | 6,958,235 | 5,376,310 | −22.73% |
| Reviewer cached input | 6,339,328 | 4,896,896 | −22.75% |
| Reviewer uncached input | 618,907 | 479,414 | −22.54% |
| Reviewer output | 30,851 | 22,366 | −27.50% |

### Independent outcomes and session measurements

| Gate | Baseline verdict → E6–E9 verdict | Calls | Mean context | Uncached input | Cached input | Output |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Security | Human-required → human-required | 10 | 70,749 | 62,109 | 645,376 | 3,923 |
| Correctness | Repair → pass | 10 | 72,222 | 67,113 | 655,104 | 2,985 |
| Code quality | Pass → pass | 10 | 69,158 | 59,772 | 631,808 | 3,126 |
| Test integrity | Pass → pass | 11 | 71,430 | 67,395 | 718,336 | 2,708 |
| Intent | Pass → pass | 9 | 62,906 | 52,490 | 513,664 | 1,870 |
| C# | Pass → pass | 9 | 63,995 | 48,341 | 527,616 | 2,240 |
| GitHub Actions | Pass → pass | 9 | 67,669 | 58,111 | 550,912 | 2,776 |
| JavaScript | Pass → pass | 10 | 71,816 | 64,083 | 654,080 | 2,738 |

The frozen report is **Held**: sensitive paths need an explicit operator decision, and the security review's governance finding remains preserved. Seven gates passed; no new implementation defect was reported. All eight reviewers inherited the Captain's confirmed Astra/Medium settings. Actual session IDs, turn IDs, execution receipts, complete findings and settings are retained in external evidence.

**Quality qualification:** the fresh baseline's legacy SHA-named report compatibility finding at candidate `src/quality/marc.cjs:549` was not re-identified by this run. The earlier E4/E5 correctness and JavaScript reviewers had both raised it. Source and base are unchanged, so a new pass is not evidence that the issue was repaired or the earlier finding disproved. The original finding was source-backed rather than an executed candidate reproduction; this run does not adjudicate it. This discrepancy must remain visible when judging savings. One PR cannot establish missed-defect or false-alarm rates, and the representative defect/clean corpus remains unrun.

### Evidence and limitations

- The current tool generated and verified all eight briefs before dispatch. Their byte-identical shared prefix was 85,872 bytes, digest `7c96ff33b4f264290038b4883e5847ea01414254629a2009dc9b3f4812014a60`. All source and omitted-evidence pointers remained available. The host starts reviewers with a brief-path prompt and then a read, so this run does not demonstrate cross-session initial-prompt prefix-cache reuse.
- The Captain had no prior reviewer conclusions or implementation transcript; reviewers received only their assigned brief and essential constraints. Ordinary model variability and the different review conclusions remain confounders. Preparation also differed: the Captain built the new briefs and downloaded the existing CI artifacts once because the permitted old artifact directory lacked an immutable download receipt. Those costs are included, not subtracted.
- All nine sessions exposed token counts and model/settings. Records were attributed to exact thread/turn IDs and deduplicated by response ID. The current usage CLI exactly reproduced the API result. The baseline was recomputed from its archived transcripts with the current measurement code and exactly matched its historical counts; only transcript locations changed.
- Retries remain unknown. Weighted totals remain null, including per-role/session totals, because verified host ratios were unavailable. Inclusive input already contains cached input; counts are not money or weekly-allowance percentages. Mean context is rounded to whole tokens. Summed reviewer time decreased from 1,449.500s to 1,109.229s; overlapping reviewer times are not elapsed wall time.
- Raw reports, receipts, packets, CI artifacts and finalized usage manifests stay outside the repository under the shared state run `20260927-e6e9-fresh-after`; remeasured baseline and comparison artifacts are under `20260927-e6e9-measurement`. The Captain's own lock was released and trusted master stayed clean during execution. This documentation was then edited on `codex/pr16-e6-e9-measurement`. The report remains unpublished.

**Next:** see the adjudication and follow-up below.

## Adjudication and follow-up — 2026-09-27

### The compatibility finding is valid

Read-only source inspection of candidate `b905d99` against base `74921a1`, without executing candidate code:

- **Base:** when the live head had moved past the reviewed source, operator approval required the head to still be the reviewed source *except for `merge`* (`action !== 'merge'`); merge verifies the published report pair itself through `verifyMergeCi`.
- **Candidate `src/quality/marc.cjs:549`:** the exemption is removed; if the head has moved, it throws unless `e.reportCreatedAt` is set, otherwise it verifies the report commit.
- **Still-supported state:** `reportPaths` (lines 47–55) accepts evidence without `reportCreatedAt` and names legacy reports by source SHA; `reports.test.cjs:149–157` verifies such legacy reports.
- **Consequence:** `record-approval` throws "Operator approval source is no longer current" for a published legacy SHA-named report, and `merge --operator-approval` now requires the recorded entry that only `record-approval` writes (line 633). A PR with a published legacy report held for sensitive-path approval can no longer merge with approval, where the base merged it. Restoring only the merge exemption would not fix it; the guard must go so `verifyReportCommit` decides (it reproduces legacy bytes and fails closed on other head movement). No candidate test covers this path, so the green CI does not contradict the finding. *(Corrected during the Claude Code run below; the first adjudication understated the scope.)*

The fresh E1–E3 baseline correctness reviewer and both E4 correctness and JavaScript reviewers raised it; all eight E6–E9 reviewers missed it. The E6–E9 result is therefore **a cost reduction with a missed defect, not a quality-preserving saving**. One PR still cannot establish detection rates.

### Why the reviewer missed it

The correctness reviewer's transcript shows it read `marc.cjs:540–657`, including line 549, and cited it as evidence for a pass. Its reasoning never mentioned legacy reports or `reportCreatedAt`. The miss was attention to previously accepted states, not missing files. Separately, it read the ~88KB brief in four calls (a 14,000-token tool output cap, then pages at lines 290, 580 and 868), so E6's one-read goal did not hold in practice.

### Why the Captain still made 51 calls

| Calls | Activity | Assessment work or benchmark artifact |
| ---: | --- | --- |
| 11 | Progress messages to the benchmark's root agent | Benchmark administration |
| ~13 | Reading MARC source and writing `setup.cjs`/`assemble.cjs`/`finalize.cjs`, because the live controller rejected the historical capture (`Target branch changed`) | Benchmark artifact: frozen replay has no supported command |
| 8 + 11 | One `spawn_agent` per call and `wait_agent` between them, forced by the two-reviewer concurrency cap | Benchmark setting |
| ~8 | Instruction reads, result reads, polling and the final report | Assessment work |

Only about eight calls were ordinary orchestration. E8's dispatch guidance could not apply under a two-slot cap, and the frozen-replay path forced the Captain to build its own tooling. Captain cost in these benchmarks mostly measures benchmark setup, not the production workflow.

### Changes made

- **Correctness skill:** when a change adds a guard or precondition or removes an exemption or fallback, list the states the old code accepted, including still-supported legacy fields, and confirm each is handled or deliberately retired.
- **Correctness eval corpus:** `evals/marc-crew-correctness` adds a seeded-defect case (`legacy-report-approval-merge`, expected `repair`) and a clean counterpart with the guard removed (`legacy-report-approval-preserved`, expected `pass`), reduced to the two owning controller files. Both are at case version 2: version 1 of the clean case exempted only `merge`, which still stranded legacy PRs at `record-approval`. The validator now accepts core-gate corpora without specialist selections and non-C# sources; C# rules are unchanged.
- **Brief size hint:** each brief's shared prefix states the largest brief size in KiB and asks for one complete read with a raised tool output limit; prefixes remain byte-identical. The PR16 replay reports "at most 90 KiB" for briefs of 87,488–91,477 bytes. The common reviewer contract repeats the instruction.

Validation on Node 24 (Windows): corpus validation passed (correctness 2 cases covering 12 rules; C# 26 cases covering 77 rules, unchanged); the CI-equivalent suite `src/quality/*.test.cjs` plus `.marc/self-review.test.cjs` passed **240/240** (two new corpus tests, plus the size-hint assertion within an existing packet test); syntax and catalogue link checks passed. Both case patches reproduce their after-files when applied to the base. No model, reviewer or hosted CI ran.

### Recommended before the next comparison

1. Add a supported frozen-replay command (packets, assembly and usage for a frozen capture, with no action authority), so benchmarks stop measuring Captain improvisation.
2. Run comparisons with the host's available reviewer slots rather than a two-slot cap, and without per-step progress messages, or report those calls separately.
3. Run the correctness corpus pair and a PR16 rerun with the new check and size hint, repeated to expose variance. These need separate authorization; no model run is implied here.

## Claude Code in-flight PR16 assessment — 2026-09-27

The Captain (this Claude Code session) ran the frozen PR16 workload with the committed follow-up tool `277a015` (the size-hint arithmetic fix below came after the run): source `b905d99`, base `74921a1`, intent `7cd5b27e…`, reused CI run 36283816229 attempt 1 (artifacts re-inspected from the previous run's download). This was an explicit local experiment: the trusted-master check was not applied, no CI was dispatched, and nothing was published, repaired or merged. The run lock was acquired and released by this run. External state is under run `20260927-claude-followup`.

**Not comparable to the Codex rows.** The model (`claude-opus-5-5`), harness, system prompt and tokenizer differ, and Claude reports cache writes separately from uncached input. The Captain carried this whole implementation conversation, so its tokens are not measured; it made about eight assessment calls, dispatching all eight reviewers in one turn and waiting once.

Reviewers got a clean detached worktree at the source commit, because the branch checkout now contains this adjudication and the eval corpus. Transcripts show no reads of work docs, evals, registers or earlier run directories. One correctness `git show` output was saved to a temporary scratch file, outside its assigned output.

### Reviewer measurements

| Gate | Verdict | Calls | Cache write | Cache read | Output | Mean context | Wall time |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Security | human-required | 7 | 105,822 | 511,358 | 322 | 88,171 | 91s |
| Correctness | repair | 11 | 117,981 | 935,372 | 3,652 | 95,761 | 155s |
| Code quality | repair | 8 | 106,663 | 614,351 | 876 | 90,129 | 103s |
| Test integrity | repair | 7 | 103,324 | 501,455 | 903 | 86,399 | 101s |
| Intent | pass (1 advisory) | 7 | 103,228 | 507,295 | 765 | 87,220 | 80s |
| C# | pass | 5 | 90,332 | 294,485 | 656 | 76,965 | 43s |
| GitHub Actions | pass | 8 | 95,177 | 575,143 | 866 | 83,792 | 69s |
| JavaScript | pass (3 advisory) | 10 | 126,773 | 875,854 | 1,123 | 100,265 | 205s |
| **Total** | **Held** | **63** | **849,300** | **4,815,313** | **9,163** | **89,916** | **~3.4 min elapsed** |

Uncached input was 126 tokens in total; inclusive input was 5,664,739. Output is as recorded by the host.

### In-flight observations

- **Brief reads:** every reviewer read its brief in exactly two calls. The host's Read tool truncated at about 630 lines, and each reviewer then read the whole remainder in one call as the size hint instructs (the Codex run took four). Two calls is the floor on this host unless briefs are split to fit its read limit.
- **Brief tokens:** the first two reads wrote about 41k tokens of cache, so briefs run about 2.2 bytes per token. The hint's estimate used three bytes per token; it now uses two.
- **No cross-session cache reuse:** every reviewer's first call wrote about 45.8k tokens of cache (system prompt and tools) with zero cache reads, because all eight started within two seconds, before any cache existed. That is about 320k avoidable cache-write tokens. Starting one reviewer, letting its first call complete, then dispatching the rest would let them read that shared prefix.
- **Calls:** reviewers averaged 7.9 calls, versus 9.75 in the Codex E6–E9 run and 11.9 in the Codex baseline, with a larger mean context because the brief is front-loaded.

### Quality

The frozen report is **Held**: sensitive-path approval plus four unresolved gates.

- **Known legacy-report defect: missed again.** The correctness reviewer inspected `marc.cjs:545-557` and described the legacy receipt bootstrap, but did not flag the stranded legacy approval path. The new previously-accepted-states check did surface a different regression of that kind (below). One run cannot show whether the check helps.
- **New findings not reported by the Codex runs:**
  - Correctness, code quality and JavaScript independently found that the public approval entry is compared byte for byte (`approval-publication.cjs:28-29`). A PR description edited in the GitHub web editor can come back with CRLF line endings, stranding both merge and `record-approval`. Plausible from source; the line-ending behavior was not verified here.
  - Correctness found that `report` writes evidence and both report files before `saveReceipt`, so regenerating an unpublished report with a different approval leaves evidence that every later command rejects (`marc.cjs:606-624`). **Spot-checked against the source and confirmed.**
  - Security and JavaScript found that with a receipt present, merge skips re-rendering and the approval-audit equality check, so gate changes in external evidence can reach merge while the public report still says Held (`marc.cjs:338`, `631`).
  - Test integrity found the rewritten operator-approval test now passes on a different error, and two report assertions were deleted (`operator-approval.test.cjs:209`).
- **Corpus correction:** reviewer analysis showed that exempting only `merge` still strands legacy PRs at `record-approval`, because merge requires the entry only `record-approval` writes (line 633). The clean corpus case now removes the guard instead, and both cases moved to version 2.

### Recommended next changes

1. Warm-start dispatch: launch one reviewer, wait for its first model call, then dispatch the rest, so the shared system prompt (and, on hosts that start sessions from the brief, the shared prefix) is read from cache.
2. Split briefs at the shared-prefix boundary (or into chunks under common host read limits) so hosts with a ~25k-token read cap can read each part in one call.
3. Treat the new CRLF, receipt-ordering, receipt-bypass and test-weakening findings as PR16 review input; they are independent of the efficiency work.

