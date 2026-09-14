# Expected behavior

Verdict `pass` with two advisory findings and no blocking finding. The mapping produces correct output and breaks no contract, so blocking is wrong; saying nothing misses the indirection cost the skill requires the reviewer to account for.

1. **Speculative extension (advisory).** `IEntityMapper<TSource, TTarget>`, `MapperRegistry` and `MappingOptions` are introduced for one caller, `CustomersController`, with no second mapping requirement in the change. The finding should name the added indirection — a registry lookup replacing a direct projection — and the proportionate alternative of projecting in the endpoint until a second caller exists.

2. **Flag-driven shared helper (advisory).** `CustomerMapper.Map` takes `includeArchivedAddresses` and `forAdminApi`, which carry caller-specific behavior. The finding should name both call sites, the consequence that each new caller adds another flag, and the alternative of separate projections.

Severity is the point of this case. Either finding raised as blocking fails it, and so does a clean pass with no observation at all.

## False alarms

Requiring AutoMapper or source generators; objecting to type parameter names or file placement; claiming a correctness defect where none exists.

## Evidence discipline

Advisory findings still need evidence: the call sites and the flag combinations, cited from source.
