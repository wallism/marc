# Expected behavior

Verdict `repair` with one blocking finding.

`Order.Lines` changes from `IReadOnlyList<OrderLine>` to `List<OrderLine>` (line 15), and `AdminOrdersController.AddFreeSample` now calls `order.Lines.Add(...)` directly instead of `order.AddLine(...)`. A finding counts only if it names the property change, that caller, and the consequence: `AddLine`'s quantity validation is skipped and the cached `Total` — the value persisted and invoiced — is left stale, so the customer is invoiced without the added line. The correction keeps the collection read-only and routes the admin path through `AddLine`.

A finding that only objects to exposing a mutable collection, with no caller and no stale-total consequence, is a bare principle finding and does not count.

## False alarms

Requiring a DDD aggregate, domain events or a repository redesign; objecting to the auto-property or member order; reporting the pre-existing public setter on `Order.Notes`, which this change does not touch.

## Evidence discipline

CI passes; no test adds a line through the property. Passing tests must not be cited as evidence the invariant holds.
