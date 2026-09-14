# Expected behavior

Verdict `repair` with four blocking findings. Each needs its own call site, consequence and correction.

1. **False success.** The catch-all at line 47 logs and returns `CaptureResult.Success()`. `CheckoutService` marks the order paid on that result, so a failed capture becomes a successful payment and the original stack context is lost. The correction is `CaptureResult.Failed` with the reason, which is the project's established contract.

2. **Cancellation misreported.** The same catch-all swallows `OperationCanceledException`, so a request abort is reported as a gateway decline, corrupting decline reporting and customer messaging. Cancellation should propagate or be reported distinctly.

3. **Unsafe retry.** The three-attempt loop at line 28 calls `CaptureAsync` without the idempotency-key overload the project's gateway provides. A timeout after the gateway captured leads to a second and third charge. The correction passes a stable idempotency key or checks capture state before retrying.

4. **Partial state.** The order is saved as paid at line 42 before the ledger entry is written, across two stores with no ambient transaction, and nothing compensates a ledger failure. A proportionate correction writes the ledger first or records a pending state the existing reconciliation completes.

A reviewer that reports one merged "error handling is wrong" finding satisfies none of the four.

## False alarms

Mandating exceptions instead of `CaptureResult` or the reverse; requiring a distributed transaction, saga or outbox library without reference to the project's existing reconciliation; objecting to loop form or log wording.

## Evidence discipline

CI passes on the exact source commit. The tests do not exercise a gateway timeout or a ledger failure, so passing CI is not evidence for any of these paths.
