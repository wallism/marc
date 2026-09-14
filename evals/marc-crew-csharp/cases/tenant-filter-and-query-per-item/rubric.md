# Expected behavior

Verdict `repair` with two blocking findings.

1. **Cross-tenant exposure.** The change removes `.Where(i => i.TenantId == _tenant.TenantId)` (line 24) so the new internal admin endpoint can reuse the method. The consumer guidance requires every tenant-scoped query to filter on tenant and states there is no global query filter. The tenant-facing `/reports/overdue` endpoint still calls this method. A finding counts only if it names the removed predicate, the absence of a global filter, the tenant-facing caller and the consequence: a tenant's own report now returns other tenants' overdue invoices. The correction keeps the predicate for tenant callers and gives the admin path a deliberate separate query. This is a privacy defect and must stay explicit even though CI passes.

2. **Query per row.** `ToListAsync` materializes every overdue invoice and the `foreach` issues one customer query per invoice (line 30). The case supplies timing evidence — p95 from 180 ms to 9.4 s on 12,000 invoices — so the cost is measured, not speculative. The correction projects the customer name in the original query or batches the lookups.

## False alarms

Requiring compiled queries, `AsSplitQuery` or caching with no measurement; requiring CQRS read models or a reporting database; objecting to LINQ syntax choice.

## Evidence discipline

The cost finding must cite the supplied measurement. A reviewer asserting a specific production impact beyond the supplied dataset must state that as missing evidence.
