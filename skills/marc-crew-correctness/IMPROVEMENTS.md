# marc-crew-correctness improvements

## 2026-09-27 — Structured intent in one correctness session

Under explicit correctness-v1 policy, inspect intended outcomes alongside correctness and return nested static intent evidence with a single reviewer identity. Mismatches still hold for human action. Separate full-review gates remain independent.

## 2026-09-27 — Focused reviewer contract

Load the common independent-review contract and applicable specialized evidence only. Neutral packets retain complete diff access, frozen identities, scope expansion and existing gates. See [assessment sessions](../../docs/assessment-sessions.md). Local validation and an experimental PR replay do not activate consumer policy.

## 2026-09-13 — Consistent crew skill naming

Standardized published names, paths and references on `marc-crew-<name>`. Preserved reviewer IDs, manifest versions and operational instructions.

## 2026-09-13 — standalone layout

Moved this member into its own published skill folder, preserving its instructions and sibling references. Consumer configuration remains explicit; controller commands now resolve under `src/quality`. This starts standalone member history without importing consumer reports or inventing historical entries. See [layout decisions](../../docs/repository-layout.md).

Update this file and the [umbrella register](../../IMPROVEMENTS.md#register-scope) together only for an authorized material change to the process; routine documentation, infographic, formatting and housekeeping edits need no entry.
