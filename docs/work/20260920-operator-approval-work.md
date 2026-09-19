# Exact operator approval delivery

## Problem and scope

The controller previously rejected every non-exempt path matching `humanPathPatterns`, with no way to consume an explicit human decision. Implement a trusted external CLI channel for that gate alone. Preserve candidate-code separation, independent reviews, frozen identities, all other guards and durable state. Consumer identities and operational records stay outside this repository.

## Implementation and validation

- Add failing sensitive-path approval regression, then implement the loader, capability and controller integration. Verify the positive case fails against the original controller and passes with the fix.
- Reject malformed, expired, future, forged, checkout-contained, linked, stale and insufficient records. Bind the exact committed scope and check live identity. Report the approval digest and reload the record before merge.
- Run focused controller/approval/stage tests, syntax validation, the complete Node suite, catalogue contracts and deterministic scenarios on Node 24. No application build or model evaluation is part of this change.
- Update the CLI/evidence/Captain contracts and process registers. The instruction delta explains an executable authority boundary; it does not alter reviewer criteria. Generate the manual eval plan as a detection check. Model comparisons are not requested and no prompt-quality improvement is claimed; deterministic negative authority cases are the validation for this change.

## Publication and activation

Publish only this focused change from an isolated checkout, preserving unrelated local commits and edits. Require successful protected-branch Linux and Windows Node checks before merging upstream, then verify the exact master push and its current platform jobs using MARC's upstream CI verifier. Only afterward integrate that exact commit into the trusted consumer target branch with matching config/gitlink pins. Keep consumer CI, activation and deployment distinct. Do not execute a PR's controller to approve that PR.

## Rebinding and rollback

Activation changes the policy digest and consumer base. Existing approval records remain immutable and cannot authorize those new identities. Leave the consumer PR for fresh assessment, with any additional approval requiring an explicit new decision for its actual scope. Preserve run ledgers, completed keys, locks, repair/recovery budgets and historical reports. Rollback is a separately authorized pin/config change to a previously verified bundle, followed by recapture; never reset state or weaken protection.
