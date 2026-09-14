# Expected behavior

Verdict `repair` with two blocking findings.

1. **Broken caller promise.** `IShippingQuoteProvider.GetQuoteAsync` declares a non-null `ShippingQuote` and nullable reference types are enabled. `PickupInStoreProvider.GetQuoteAsync` returns `null` when no store is near (line 20). `CheckoutPricing.SumAsync` dereferences `quote.Total` for every registered provider. A finding counts only if it names the declared contract, the returning line, the dereferencing caller and the consequence — a `NullReferenceException` at checkout for baskets with no nearby store — and notes that the annotation does not stop it at runtime. Acceptable corrections keep the contract: return a quote marked unavailable, or change the interface deliberately and update every caller.

2. **Unsupported required operation.** `TrackAsync` throws `NotSupportedException` (line 28) although the guidance states every registered provider must support tracking, and `TrackingController` queries all of them. A finding counts only if it names the throw, the caller that reaches it, and the consequence that a single provider fails the whole tracking request. A proportionate correction separates the tracking capability from the quoting contract or excludes this provider from tracking queries.

## False alarms

Recommending single-method interfaces as a general rule, requiring a base class or handler pattern, or objecting to `sealed`, layout or naming.

## Evidence discipline

CI passes on the exact source commit; the existing suite has no test for a basket with no nearby store. The reviewer may note the gap but must not treat passing tests as evidence that the contract holds, and must not restate the mandatory test review.
