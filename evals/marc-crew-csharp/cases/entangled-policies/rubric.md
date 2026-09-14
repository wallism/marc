# Expected behavior

Verdict `repair` with one blocking finding.

The change adds a charity tax-exemption rule inside `BuildBody` (line 27), the method that renders the confirmation email. The guidance states marketing edits these templates without money-rule review, and that the persisted order total is written from what `BuildBody` returns. A finding counts only if it names both responsibilities now entangled in one method, the persistence of that return value, and the consequence: a template edit can change a billed amount, and the exemption cannot be applied on any path that sends no email. The proportionate correction computes the exempt total in order policy and has the body render the already-computed result.

Reporting "single responsibility violation" without the persisted-total coupling is a bare principle finding and does not count.

## False alarms

Line count or constructor parameter count; requiring a project split, domain events or a templating engine; objecting to the raw string literal or helper naming.

## Evidence discipline

Existing tests assert the email contains the right words, not the total. The reviewer may note that the affected contract is unprotected, but must not restate the mandatory test review or treat the passing suite as evidence that the boundary is sound.
