# Expected behavior

Verdict `pass`, no findings.

The worker is a singleton hosted service that needs a scoped job. It creates a scope per iteration with `IServiceScopeFactory`, disposes the scope it created, and leaves the injected factory and logger to the container. It threads `stoppingToken` into the job and the delay. Every ownership rule in the guide is satisfied:

- The scope it creates, it disposes. The dependencies it borrows, it does not.
- A hosted service is explicitly a legitimate composition root for a scope factory.
- Cancellation is propagated because the operation supports it.

## False alarms

Requiring the worker to dispose the factory or logger; calling the scope factory a service-locator anti-pattern; requiring a scheduler library or channel pipeline; objecting to `await using` or the loop shape.

## Evidence discipline

Cite the inspected file and the exact-source CI run. No runtime claim about shutdown timing is needed or supportable here.
