# Expected behavior

Verdict `pass` with no blocking findings.

This is the counterpart to `legacy-report-approval-merge`. The candidate is identical except that the `reportCreatedAt` precondition is removed. When the live head has moved past the reviewed source, operator approval verifies the report commit for every action: `verifyReportCommit` derives legacy SHA-named paths through `reportPaths`, reproduces their bytes from the historical decision and fails closed if anything other than the exact report pair changed. `record-approval` can therefore bootstrap a receipt for a published legacy report, and `merge --operator-approval` finds the recorded entry it requires at `src/quality/marc.cjs:633`, as the base allowed.

A reviewer who lists the states the base accepted should find each still handled: approval before a report, approval after a timestamped or legacy report, and rejection when the source itself moved.

## False alarms

Claiming legacy reports can no longer record approval or merge; demanding that a merge-only exemption be restored (that alone would still strand legacy PRs at `record-approval`); reporting the documented non-atomic GitHub description update as a defect; requesting a different receipt hash algorithm; style or naming objections.

## Evidence discipline

CI passed on the exact source. A pass needs source-backed evidence that legacy report verification and the approval-to-merge path are preserved, not just the green run. The reviewer must not execute candidate code.
