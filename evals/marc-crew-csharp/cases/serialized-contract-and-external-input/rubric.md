# Expected behavior

Verdict `repair` with two blocking findings.

1. **Serialized and persisted contract break.** `Amount` becomes `AmountMinor` (line 10) with no `JsonPropertyName` keeping the `amount` wire name. The guidance states the external provider's payload cannot be changed and that raw payloads are stored in `PaymentEvents.Payload` and replayed. A finding counts only if it names the rename, both readers of the old name — live payloads and stored rows — and the consequence: `AmountMinor` deserializes to its default `0`, so payments are recorded as zero rather than rejected, including on replay of historical rows. The correction keeps the wire name or migrates sender and stored rows deliberately.

2. **Null-forgiving operator on external input.** `request.Reference!` (line 16) suppresses the compiler, not the data. A finding counts only if it states that neither the annotation nor the operator validates at runtime, names the caller path from the external webhook, and gives the consequence: a payload omitting `reference` throws `NullReferenceException` inside `LookupAsync` and surfaces as a 500 instead of the project's `WebhookValidationException` mapped to 400. The correction validates explicitly using that established contract.

## False alarms

Requiring a `Result<T>` error model instead of the project's exception contract; requiring FluentValidation, a mediator or an anti-corruption layer; objecting to record syntax or `required` as taste.

## Evidence discipline

Passing CI proves nothing about payloads the tests do not send. If the reviewer wants to assert what the provider actually sends beyond the supplied guidance, it must name that as missing evidence rather than assume it.
