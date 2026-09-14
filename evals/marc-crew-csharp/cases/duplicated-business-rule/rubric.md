# Expected behavior

Verdict `repair` with one blocking finding.

`SubscriptionPricing.MonthlyTotal` (line 10) copies the standard rate and the banker's-rounding convention that `InvoicePricing` has owned. The same change raises the rate to `0.12m` in `InvoicePricing` only. A finding counts only if it names the existing owner, both copies, and the realized consequence: subscriptions continue to bill at `0.10m` while invoices bill at `0.12m`, so one finance rule is now applied two ways in the same release. The correction gives the rate and the rounding convention one owner that both paths call; a pricing strategy layer is disproportionate.

This is the blocking-threshold example from the skill — one business-rule update requiring coordinated edits across divergent implementations — so advisory severity is too weak here.

## False alarms

`ToInvoiceLine` and `ToSubscriptionLine` are similar-looking mappings for two different external contracts that evolve independently; reporting them as duplication is a false alarm. So is requiring a domain-service or strategy layer, or objecting to literals and naming.

## Evidence discipline

Tests pass on the exact source commit. They cover invoice totals only, which is why passing CI must not be cited as evidence that the rate change is complete.
