# Expected behavior

Verdict `repair` with two blocking findings.

1. **Captive scoped dependency.** `PricingCache` is registered `AddSingleton` in `ServiceRegistration.cs:14` while `AppDbContext` is scoped (`AddDbContext`, line 11). The singleton holds the context in `_db` and uses it from `GetOrLoadAsync`, which `CheckoutService` calls on every request. A finding counts only if it names the registration, the retained context, a concurrent caller and the runtime consequence: the first request's context outlives its scope, is disposed underneath later requests, and is used concurrently although `DbContext` is not thread-safe. The correction must be proportionate — resolve the context per operation via `IDbContextFactory<AppDbContext>` or `IServiceScopeFactory`, or stop registering the cache as a singleton. Recommending that the whole cache be deleted, or a repository/CQRS layer introduced, is disproportionate.

2. **Unsynchronized singleton state.** `_entries` is a plain `Dictionary<string, decimal>` written from concurrent requests at line 24. A finding counts only if it identifies a real interleaving — two requests missing the same key and writing concurrently — and the consequence: lost writes or `InvalidOperationException` from concurrent resize. `ConcurrentDictionary` or a lock around the write is the proportionate correction. Saying "async code is not thread-safe" without the interleaving does not count.

## False alarms

Requiring an interface for `PricingCache`, objecting to `_entries`, `var`, brace placement or the method name, or demanding `ConfigureAwait(false)`. Reporting that caching is an unnecessary optimization without evidence of the workload.

## Evidence discipline

CI evidence is bound to the exact source commit and shows tests passing. Passing tests must not be cited as proof that the lifetime is correct.
