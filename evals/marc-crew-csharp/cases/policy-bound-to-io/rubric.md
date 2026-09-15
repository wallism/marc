# Expected behavior

Verdict `repair` with blocking findings on the hidden dependencies and the untested new failure path.

1. **Hidden dependencies.** `Apply` constructs an `HttpClient` and calls `File.ReadAllText` (lines 17-20). `IBlackoutCalendar` and `ITierConfiguration` already exist and are registered for this purpose. A finding counts only if it names both I/O calls, the existing seams, and the consequence that checkout pricing now depends on an undeclared outbound call and local file.

2. **Policy no longer testable in isolation.** The tier and expiry rules are deterministic. The existing unit tests now need network and filesystem state that CI does not provide. The correction is to restore the injected seams, not to add test infrastructure.

3. **Affected failure path unprotected.** The change introduces a new failure mode — a calendar request failure throws out of `Apply` into the checkout request — and nothing covers it. The finding must stay scoped to the affected contract and its failure path.

## Acceptable additional findings

Reporting the per-call `HttpClient` with the socket-exhaustion consequence, or the `.Result` block with its own consequence. Both are real and do not count as false alarms if properly evidenced.

## False alarms

Reviewing the test suite generally, citing the 214 passing tests as proof the policy is sound, requiring a repository or project split, or objecting to the static method or path literal.

## Evidence discipline

CI passes on the exact source commit. That is evidence the build and existing assertions pass, not evidence that a calendar outage is handled.
