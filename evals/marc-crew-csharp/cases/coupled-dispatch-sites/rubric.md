# Expected behavior

Verdict `repair`: one blocking finding and one advisory finding.

1. **Blocking — missed dispatch site.** `PaymentMethod.Klarna` is added and handled in `FeeCalculator` and `PaymentIcons`, but not in `SettlementWindow.For`, whose default arm throws `ArgumentOutOfRangeException`. The guidance states the nightly settlement job calls it for every captured payment. A finding counts only if it names the new member, the unhandled site, the throw and the consequence for the settlement job, with the correction of handling the member there.

2. **Advisory — extension seam.** Three coupled sites have had to change for each new payment method, and this change demonstrates the cost by missing one. That justifies raising a seam: a single table or per-method descriptor owning fee, icon and settlement window. This must be advisory, not blocking — the blocking defect is the missed site. Recommending a class hierarchy or a module rewrite is disproportionate.

A reviewer that blocks on the seam instead of the missed site has inverted the severity and fails this case.

## False alarms

Requiring a strategy pattern for the unrelated closed two-case switch in `RefundReasons`; requiring CQRS or a hierarchy; objecting to switch syntax.

## Evidence discipline

CI passes because no test covers a Klarna settlement. The reviewer must reach the missed site from source rather than inferring from CI that the change is complete.
