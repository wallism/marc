# Expected behavior

Verdict `repair` with two blocking findings on the same changed method.

1. **`async void` outside an event contract.** The change turns `Task NotifyAsync` into `async void NotifyPlaced` (line 18) and `OrdersController.Place` now calls it without awaiting. The consumer guidance states this project has no event-based UI framework, so no required event contract applies. A finding counts only if it names the signature change, the call site that can no longer observe completion or failure, and the consequence: an exception inside the method is raised on the synchronization context as an unobserved exception that can terminate the host, while the request still returns success. The correction is to return `Task` and await it.

2. **Sync-over-async on a request path.** `_http.PostAsJsonAsync(...).GetAwaiter().GetResult()` (line 23) blocks the request thread and re-wraps failures. A finding counts only if it places the call on the request path and states the consequence — thread-pool starvation under load, and `HttpRequestException` surfacing wrapped — with `await` as the correction.

Reporting only one of the two is a partial result. Reporting a single merged "async problems" finding without both call sites and both consequences does not satisfy either.

## False alarms

Demanding `ConfigureAwait(false)`, `ValueTask`, or `Task.Run`; requiring an outbox or message bus; objecting to the method name or interpolation.

## Evidence discipline

CI on the exact source commit passes. That must not be offered as evidence that the notification path is sound; the tests do not exercise a notification failure.
