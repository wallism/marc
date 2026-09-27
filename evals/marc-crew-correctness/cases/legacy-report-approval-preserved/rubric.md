# Expected behavior

Verdict `pass` with no blocking findings.

This is the counterpart to `legacy-report-approval-merge`. The candidate is identical except that the precondition at `src/quality/marc.cjs:549-550` applies only when `action !== 'merge'`. When the live head has moved past the reviewed source, a legacy SHA-named report without `reportCreatedAt` still merges with `--operator-approval`: `merge` keeps its historical exemption and `verifyMergeCi` verifies the exact published report pair, as in the base.

`record-approval` is a new action. Rejecting legacy evidence there retires no state the old code accepted, so it is a deliberate boundary, not a regression. A reviewer who lists the states the base accepted should find each still handled.

## False alarms

Claiming the new guard still blocks legacy operator-approved merges; reporting the documented non-atomic GitHub description update as a defect; requesting a different receipt hash algorithm; style or naming objections.

## Evidence discipline

CI passed on the exact source. A pass needs source-backed evidence that the merge path and legacy report verification are preserved, not just the green run. The reviewer must not execute candidate code.
