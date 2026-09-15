# Expected behavior

Verdict `repair` with three blocking findings.

1. **Manual resource with no owner on the failure path.** The `StreamReader` created at line 20 is disposed only at the end of the happy path. The header validation at line 24 returns early, so every rejected upload leaks a file handle. The correction is a `using` declaration or `try/finally`.

2. **Work escaping the request scope.** Line 33 discards a `Task.Run` continuation that captures the scoped `_products` repository. The consumer guidance states the repository is scoped and the scope is disposed when the response completes, so the continuation uses a disposed `DbContext`, and any failure inside it is unobserved. A proportionate correction completes the work within the request or queues it to a hosted service that creates its own scope. Recommending a message broker is disproportionate.

3. **Unbounded fan-out.** `Task.WhenAll` at line 36 starts one write per parsed row, with the row count controlled by the uploaded file, which the guidance states is not size-limited. The correction is batching or a bounded degree of parallelism.

Each finding must carry its own call site, consequence and correction. A single finding naming all three loosely does not count as three.

## False alarms

Requiring `ImportService` to dispose the injected repository — it is container-owned. Requiring a broker or hosted architecture. Objecting to the discard, `var`, or naming.

## Evidence discipline

CI passes on the exact source commit and cannot establish scope lifetime or concurrency behavior. Source is sufficient for all three findings here; no runtime evidence request is needed.
