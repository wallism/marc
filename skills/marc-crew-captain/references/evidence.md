# Gate evidence contract, version 1

Captain-side evidence rules. Reviewers use the concise [independent reviewer contract](reviewer.md), which owns the gate result schema and verdict rules; ordinary reviewers need not load this file.

## Explicit PR intent

New captures include controller-owned `intent` with schema, status, normalized paragraph, entries and hash; capture fields are not reviewer-editable. The [static intent contract](intent.md) owns the conditional `gates.intent` result, the human-approved repair boundary and the intent-only refresh command. Confidence is qualitative and never overrides a finding. Reports put a succinct current intent assessment and required human action near the top; stages retain the complete captured intent and gate result in the audit.

## Impact scope

All reviewers must apply the shared [language-specific impact guidance](language-impact.md) for affected languages, including caller relationships lexical discovery cannot resolve and rules against expanding whole projects from incidental matches.

New captures distinguish `crew.impact.changedFiles` from the combined `files` inventory. Each unchanged file has a `references` entry with its originating path, symbol or module/resource, matching line, immutable revision and relationship kind. These are lexical leads, not semantic proof. Area mappings add expertise but are not substituted for file-level reference evidence. `incomplete` and its holds report search limits or unavailable source; they require resolution and recapture before approval, without recruiting every specialist merely because a search stopped. Changed shared governance and unclassified behavioral scope retain broad selection.

Reviewers trace scope under the [reviewer contract](reviewer.md) and language guidance. Missing expertise or unresolved coverage blocks; never assume the captured list is exhaustive or edit capture-owned fields to add approval.

## Capture, approval and execution records

Sensitive-path approval is separate operator input under the [operator approval contract](../../../docs/operator-approval.md), never a reviewer/evidence assertion. Decisions may include `humanApproval`; new report evidence and stages retain the record and its SHA-256 in `humanApprovalAudit` and the stage decision. These copies are audit only: supply the same authorized external record again at merge.

New captures include `agentExecutionSchema: 1` and an initially empty `repairExecutions` array. The Captain records each session's `execution` using the [harness contract](harnesses.md#model-selection-at-dispatch); gate and routing execution records stay attached to their immutable review identities. Repair execution history stays with the cumulative ledger and is restored on recapture. The controller checks selections against trusted configuration and rejects missing application evidence or observed substitutions. Each record may also carry the session's observed `usage` token counts from the host, following [token consumption](harnesses.md#token-consumption); the controller validates the shape of a recorded count and never gates on the amount or its absence. These are host-record attestations, not independent model telemetry. New `marc-v3` reports retain these tables within assessment stages; existing `marc-v2`, `marc-v1` and legacy rendering remains unchanged.

`capture` creates an external JSON document. Capture-owned fields are `schema`, `repository`, `pr`, `sourceHead`, `base`, `policyHash`, `state`, `draft`, `author`, `headRepository`, `branch`, `target`, `baseIncluded`, `files`, `changedLines`, `projectChanges`, and `ci`. Only the trusted controller recaptures these. `repairCycles` comes from the cumulative external ledger.

`changedLines` counts additions plus deletions, excluding documentation and tests by path/name. The file-count limit uses the same exclusions. Exclusions are `.md`, `.mdx`, `.markdown`, `.rst` and `.adoc` files; files inside `doc`, `docs`, `documentation`, `test`, `tests`, `spec`, `specs`, `__tests__` or directories ending in `.Test`, `.Tests`, `.UnitTests` or `.IntegrationTests`; `*.test.*`, `*.spec.*`, `test_*.py`, `*_test.py`, `*_test.go`, `*_spec.rb`, and `*Test.cs`/`*Tests.cs` files. Matching is case-insensitive except the C# filename suffixes. Unrecognized test/documentation layouts still count. This affects only size metrics: excluded files remain in `files`, specialist selection, sensitive-path checks and required reviews/CI. It never makes instructions or test changes trusted. A docs/tests-only PR can have zero counted files and lines; the complete `files` inventory must still be nonempty.

The metric uses explicit Git rename detection at 50% similarity. Unchanged moves contribute zero; edits within recognized moves count unless both old and new paths are excluded. Unrecognized moves/replacements remain additions/deletions subject to their path exclusions. NUL-delimited parsing preserves unusual filenames; binary/unmeasurable entries outside excluded paths exceed the configured limit. Capture and the final merge guard use the same line-count function. The `files` inventory and report/merge guards deliberately retain rename detection disabled, so both old and new paths remain visible to security and scope checks.

The consumer policy selected by `.marc/config.json`'s `policy` field sets the inclusive `maxChangedLines` and `maxFiles` limits. Supplied policies default to `"maxChangedLines": 3000` and `"maxFiles": 50`, permitting up to 3,000 counted additions/deletions across 50 counted paths; these are configurable policy values, not hard-coded runtime ceilings. Existing consumer values are not overwritten by tool upgrades. `simpleRoute.recommendedMaxChangedLines` and `recommendedMaxFiles` use the same exclusions and remain separate advisory guides requiring a rationale above either. Publish policy changes through the consumer's trusted configuration workflow. Adopting the new tool version or changing policy requires fresh capture/review; historical report counts and cumulative budgets are not rewritten.

For manifest classification and dependency-only security results, load the [dependency evidence contract](dependency-evidence.md).

## Crew and gate results

When `crew` is configured, the controller captures a `crew` record containing the tool commit, immutable source/base/policy identity, inspected impact, selected and omitted member IDs, versions, content hashes, reasons and `selectionHash`. The Captain cannot edit these fields: operational decisions recompute them from both Git trees and trusted configuration. Core Captain/gate/repair skill versions are the full bundle commit; optional specialists additionally have semantic versions. All tracked skill/reference bytes participate in the policy digest.

Selected specialist results use `gates["crew:<id>"]` with the standard gate fields plus `memberVersion`, `memberHash` (the selected `contentHash`) and `selectionHash`. Missing, incompatible or unavailable required expertise holds. `coordinator` records the actual Captain session and `repairReviewers` records cumulative repair-session IDs from the external ledger. Required reviewers, including browser and selected specialists, must have distinct sessions, separate from Captain/router/repair sessions. These IDs are audit assertions verified by the Captain against host session receipts; JSON is not cryptographic attestation or proof that a host sandbox exists.

Each reviewer saves only its gate entry, in the [reviewer contract's](reviewer.md) schema, at its assigned external path. MARC checks the identity fields and assembles it into the shared `gates` document; reviewers never edit that document concurrently.

`browser` uses the same gate structure. When a reviewer sets `requiresBrowser: true`, the Captain must supply browser evidence; source alone cannot assert runtime behavior.

Browser evidence also references the external runtime record: captured source/build provenance, URL and data environment, listener reuse or isolated startup attempts, readiness, effective persona/permissions, chosen tool and capability fallbacks, expected/observed checkpoints, sanitized artifacts and process cleanup. Follow [browser-runtime.md](browser-runtime.md). A missing listener triggers provisioning discovery, not an immediate blocked verdict. An explicit retry records fresh observations separately without rewriting historical reports or reusing gates against changed identities.

## Reports

Reports are append-only evidence artifacts owned by this workflow, outside `docs` because their names and structured content are machine-generated per commit. The work document under `docs/work` is their indexed entry point. Never include credentials, access tokens, raw resumes, candidate data, secret matches or unrestricted command logs; recorded model token counts are consumption figures, not secrets. Preserve sanitized facts and safe source/artifact references. CI artifacts expire; preserve the important counts, scanner summaries and findings in the gate evidence rather than relying exclusively on URLs.

The PR report describes the reviewed source commit and captured base. Its own report-only commit cannot include its eventual SHA without another commit. Before new report publication, the controller rechecks CI for the exact reviewed source. A matching successful captured run/attempt produces `reportCiReuse` (`sourceHead`, `runId`, `runAttempt`) and a returned commit message with `[skip ci]`. Before merge, the controller verifies that the later head differs only by the exact regular-file report pair and that their bytes match trusted evidence, then rechecks that bound source run. A missing report-head run is acceptable only with this verified reuse record; existing pending/failed/incomplete report-head CI still blocks. Without the record, historical reports retain their report-head CI requirement. Preserve source artifact/scan inspection; a recent build for a different SHA never qualifies. Record reuse honestly in the external ledger; do not fabricate a report-head CI run or relabel the source run as one. Target-branch CI after merge remains required. Merge outcome belongs in the external run ledger and GitHub's merge history. Reports are audit evidence, not signatures: the trusted controller and its external ledger remain the authority.

## Report names and presentation

The controller adds `reportCreatedAt` when first preparing publication, using a canonical UTC minute such as `2026-09-12T10:45:00.000Z`. Persist that value in the external evidence before rendering. It produces the pair `.quality/reports/pr-24/20260912-1045-24-audit.json` and `.quality/reports/pr-24/20260912-1045-24.md`; the Markdown also displays the timestamp explicitly as UTC. The `-audit` suffix marks the machine-readable record that retains gate evidence and findings, while the unsuffixed Markdown stays the human report. Reports persisted as `marc-v2`, `marc-v1` or legacy keep their original unsuffixed JSON name: the suffix follows the persisted `reportFormat`, so verification derives historical names without adopting the current convention. Source/base SHAs, policy digest and independent gate identities remain unchanged inside both artifacts. A later verification derives paths from the persisted timestamp, never the current clock. Do not manually change it after report publication.

New preparations persist `reportFormat: "marc-v3"`, which renders chronological assessment stages under the MARC heading. Missing `reportFormat` preserves the former Chief of Quality heading for both SHA-named and timestamped historical reports; unknown formats fail closed. Preparing an already timestamped report preserves its existing format, including `marc-v1` and `marc-v2`. Never change the marker on previously published evidence. Byte verification of historical reports does not waive the current policy digest or authorize a merge after a tool change.

New preparations also persist `auditFormat: "marc-audit-v1"`. Published JSON uses a lossless envelope that shares identical evidence and represents near-identical inventories as array differences; use `expandAudit` from `src/quality/audit.cjs` before reading its evidence fields. The readable Markdown, expanded working evidence and stage journal retain their existing forms. Previously prepared evidence without this marker keeps its original audit bytes. See [audit encoding and reader](../../../docs/audit-reports.md).

Evidence without `reportCreatedAt` uses legacy SHA filenames and its original Markdown bytes for verification. Preserve those historical files. Only new regular-file additions in the owning PR's exact legacy or valid timestamp namespace are metadata; edits/deletions, foreign PR names, malformed dates and symlinks are still reviewed changes. A minute collision stops rather than overwriting either file. Recheck the completed-assessment ledger; only an actually new assessment may be prepared in a later minute with a fresh publication timestamp.

## Assessment stages

Run `checkpoint <evidence.json>` before repairing or replacing a capture. It records the deterministic decision, immutable source/base/policy, route, selected and omitted crew with reasons, CI and gate/session results. `report` automatically records the current review and embeds retained stages in new reports. Storage is `<stateDirectory>/assessment-stages/pr-<number>.jsonl`, outside candidate control, with an exclusive per-PR lock, append-only writes and chained hashes to detect corruption. It is audit history, not signed attestation or a substitute for current gates. Preserve it across runs alongside cumulative repair/recovery records. A corrupt journal or foreign lock stops recording; investigate rather than deleting history. Identical consecutive checkpoints are idempotent.

Observed repair/CI events use `checkpoint <evidence.json> <event.json>`. Use pre-repair evidence for repair events; `toHead` is the actual resulting source and `reviewer` is the actual repair session. Include the host `execution` record when available. For example, the event shape is:

```json
{
  "kind": "repair",
  "toHead": "<40-character resulting Git SHA>",
  "reviewer": "<actual repair session ID>",
  "result": "repaired",
  "summary": "<observed change and validation result>",
  "evidence": ["<retained repair artifact>"]
}
```

`result` may also be `blocked`; use the observed unchanged head if no repair was made. CI events require `kind: "ci"`, `phase` (`source`, `report` or `post-merge`), exact `head`, positive numeric `runId`/`runAttempt`, GitHub `status` (`queued`, `in_progress`, `completed`), `conclusion` (null while pending), `summary` and nonempty `evidence`. The source phase must match the evidence source SHA. These are Captain-recorded observations; recording them neither contacts GitHub nor waives hosted-CI verification. Preserve evidence references and record only observed results.

Each later report retains earlier crew/results alongside the new review, allowing an initial narrow selection and subsequent broad selection to be compared honestly. Earlier missing stages are not reconstructed automatically. Later report CI and merge outcomes remain external, and appear only if another assessment requires a new report. Published report bytes stay unchanged; the journal and historical `stages` never authorize a merge of the current candidate.

The Captain's chat presentation rules are in its [SKILL.md](../SKILL.md#communication). Historical SHA-named reports use the same rendered-link format; no rename or new report commit is needed merely to improve presentation.

## CI recovery investigation

`recover-ci` accepts a current capture and, for a rerun, a separate trusted external investigation. This is an operator/MARC assessment of actual logs and artifacts, not candidate-supplied text. Keep raw logs and sensitive values out of it. Example (replace identities and evidence with observed values):

```json
{
  "sourceHead": "full 40-character captured source SHA",
  "runId": 123456,
  "runAttempt": 1,
  "reason": "infrastructure",
  "testOrScanFailure": false,
  "summary": "Runner disconnected before validation; no test or scan failure was observed.",
  "evidence": ["absolute path to sanitized investigation or exact GitHub job URL"]
}
```

Allowed reasons are `infrastructure` and `artifacts-unavailable`, under the conditions in [guarded actions](guarded-actions.md#ci-recovery-and-report-ci-reuse); never set `testOrScanFailure: false` without checking. CI capture records `runId`, `runAttempt` and `conclusion` for binding.

The immutable request record stores PR/head/base/policy, timestamp, CI state, action and investigation before the POST; the separate accepted receipt proves only API acceptance. After any request, wait and recapture CI, verify the exact run SHA and inspect the actual results/artifacts. The recovery command never modifies a capture, approves a review or merges. To recover a final report head, capture that current head separately; retain the original source assessment unchanged.

## Simplicity route

Optional `routing` uses the standard gate fields plus `route: simple|full` and `risks: string[]`. Missing routing requires full review. A simple decision must be current, pass, contain evidence and no risks/findings, stay within the overall PR limits and have no UI behavior impact. It requires `changeKind: additive-tests|documentation|local-change`, verified against the complete diff by both MARC and the independent focused reviewer. These labels do not establish safety by themselves. Follow the [simplicity rules](../../marc-crew-simplicity/SKILL.md): additive cases and reviewed baselines without production changes, ordinary documentation without runtime/instruction/policy changes, or a small local production change with traced callers and boundaries. Test or prose length alone does not require full review.

When trusted policy sets `riskAssessment: 1`, a top-level `risk` result from its own fresh session is required. It carries the standard identity fields, `reviewer`, `summary` and nonempty `evidence`, plus `level: low|medium|high`, `position: leaf|branch|trunk`, `reversibility: gated|revertible|one-way`, `triggers: string[]` and `unknowns: string[]`. The controller holds a missing or stale rating, a level below its position or reversibility, low with unknowns, anything but high when a changed file matches `policy.riskTrunkPatterns`, high on a simple route, low beside routing risks, and a rating sharing a session with the Captain, router, repairer or any gate. Its execution record uses member ID `risk`. Reports show the level, dimensions, triggers and unknowns. No level relaxes a gate; see the [risk assessor](../../marc-crew-risk/SKILL.md).

`policy.simpleRoute.recommendedMaxFiles` and `recommendedMaxChangedLines` are advisory guides. Above either, require a nonblank `routing.sizeRationale` explaining why the complete scope remains simple and where the extra size comes from. This rationale cannot waive actual risks, existing findings, CI, scans, sensitive paths, or the overall configured file/line limits. Reports display the change kind and supplied size rationale. MARC records its own session as router. The deterministic controller enforces structured evidence and hard guards; semantic classification and rationale quality remain independent review judgments. A policy change invalidates older approvals; historical reports retain their original fields and rendering.

A simple candidate contains `gates.simple-tests` instead of the four specialist entries. Remove only untouched capture placeholders before review; actual specialist results forbid downgrading. This gate uses the standard fields plus `testDecision: existing-sufficient|updated|not-needed|needs-test` and `testRationale`. Only the first three can pass, with evidence and rationale. CI, scans, identity, sensitive-path holds, repair limits and final merge checks are unchanged. Reports identify the route and omitted reviews without fabricating passes. Reroute after source/base/policy changes.
