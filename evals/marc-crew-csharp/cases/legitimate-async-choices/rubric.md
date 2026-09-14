# Expected behavior

Verdict `pass`, no findings.

- `async void OnExportClick` implements `RoutedEventHandler`, which returns `void`. The guide excludes `async void` inside a required event contract, and the handler already wraps its body in `try/catch` so failures are not unobserved.
- No `CancellationToken` is threaded into `ILegacyExportStore.Export` because that COM interop call supports none and has no async overload. The rule is to propagate cancellation *where the operation supports it*.
- No `ConfigureAwait(false)`: the continuation touches WPF controls and the guidance says it must stay on the dispatcher.

## False alarms

Reporting the `async void` handler, demanding a token on the interop call, demanding `ConfigureAwait(false)`, `ValueTask` or `Task.Run`, or requiring MVVM commands and a view model.

## Evidence discipline

A pass needs the inspected files and the exact-source CI run cited. Do not assert observed UI behavior from source.
