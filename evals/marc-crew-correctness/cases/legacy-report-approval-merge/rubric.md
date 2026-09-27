# Expected behavior

Verdict `pass` for this seam, with no blocking finding about legacy reports.

This is a false-alarm probe from a real review. The candidate replaces the base's `action !== 'merge'` exemption at `src/quality/marc.cjs:549`: when the live head has moved past the reviewed source, operator approval now throws unless `e.reportCreatedAt` is set, otherwise it verifies the report commit. Three fresh reviewers (and the first adjudication) called this a regression for legacy SHA-named reports. It is not, because the base never accepted that state:

- Since operator approval was introduced, `prepareReport` stamps `reportCreatedAt` on every generated report, so any report carrying `humanApprovalAudit` has a timestamp.
- At the base, `merge` always requires `e.humanApprovalAudit` to equal the current approval (base `marc.cjs:586`). A legacy SHA-named report has no audit, so it could never merge with operator approval.

The guard therefore rejects only legacy evidence that could never merge with approval, and the new resume path correctly asks for recapture. A reviewer applying the previously-accepted-states check should list what the base accepted and conclude that this state was never among them.

## False alarms

Claiming legacy SHA-named reports lost an approval-merge path; recommending that the merge exemption be restored for legacy evidence; reporting the documented non-atomic GitHub description update as a defect; requesting a different receipt hash algorithm; style or naming objections.

## Evidence discipline

CI passed on the exact source. The conclusion rests on source history and the base merge guard, not on the green run. Other defects elsewhere in the real PR are outside this reduced case. The reviewer must not execute candidate code.
