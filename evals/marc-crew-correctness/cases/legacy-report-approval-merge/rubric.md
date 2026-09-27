# Expected behavior

Verdict `repair` with one blocking finding.

**Removed exemption blocks a still-supported state.** In the base, operator approval checked that the live head was still the reviewed source *except for `merge`*, which verifies the published report pair itself. The candidate replaces that exemption at `src/quality/marc.cjs:549`: when the head has moved past the reviewed source, it throws unless `e.reportCreatedAt` is set. `reportPaths` (lines 47-55) still accepts evidence without `reportCreatedAt` and names such legacy reports by source SHA, and the guidance says legacy reports remain verifiable. A PR whose legacy SHA-named report is published and which is held for sensitive-path approval can no longer merge with `--operator-approval`; it fails with "Operator approval source is no longer current" where the base merged it.

A finding counts only if it names the new guard and the exemption it replaced, the legacy state `reportPaths` still supports, the concrete consequence for `merge --operator-approval`, and a correction that keeps the legacy merge path, such as retaining the merge exemption or letting `verifyReportCommit` decide.

## False alarms

The non-atomic GitHub description update in `record-approval` is a documented limitation, not a defect. Receipt hashing choices and code style are out of scope. This is a bounded verified defect, so `human-required` is the wrong verdict.

## Evidence discipline

CI passed on the exact source. `reports.test.cjs` verifies legacy report bytes, but no case exercises operator-approved merge after a legacy report, so passing tests are not evidence that this path still works. The reviewer must not execute candidate code.
