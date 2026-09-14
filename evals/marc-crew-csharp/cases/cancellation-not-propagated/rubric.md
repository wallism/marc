# Expected behavior

Verdict `repair` with one blocking finding.

`BuildAsync` gains a `CancellationToken` parameter and passes it to nothing. Inside the paging loop, `FetchPageAsync(page)` and `Task.Delay(2000)` both have overloads taking a token — the consumer guidance confirms it — and the loop condition never checks it. `NightlyWorker.ExecuteAsync` supplies `stoppingToken`.

A finding counts only if it names the parameter, both ignoring call sites, the caller that supplies the token, and the runtime consequence: a shutdown request is ignored until every remaining page is fetched, so the host exceeds its 30-second graceful period and terminates the process mid-report. The correction is to pass the token to `FetchPageAsync` and `Task.Delay` and to observe it in the loop.

A finding that says only "cancellation should be propagated" without the call sites, caller and consequence does not count.

## False alarms

Requiring `ConfigureAwait(false)` in a worker; calling the 500-row page size a performance defect without a measurement; objecting to `while (true)` or `var`.

## Evidence discipline

Passing CI does not establish shutdown behavior. If the reviewer wants to assert observed shutdown timing rather than the source-level defect, it must say what evidence is missing instead of claiming the observation.
