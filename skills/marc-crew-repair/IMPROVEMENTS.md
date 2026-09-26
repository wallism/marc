# marc-crew-repair improvements

## 2026-09-27 — Human approval for intent proposals

Require explicit human approval of an intent-related repair and its rationale in the trusted handoff. Prevent routing the same proposal through another gate to evade that decision. Preserve existing automatic repairs for independent non-intent defects and require normal new validation after an approved code repair.

## 2026-09-13 — Consistent crew skill naming

Standardized published names, paths and references on `marc-crew-<name>`. Preserved reviewer IDs, manifest versions and operational instructions.

## 2026-09-13 — standalone layout

Moved this member into its own published skill folder, preserving its instructions and sibling references. Consumer configuration remains explicit; controller commands now resolve under `src/quality`. This starts standalone member history without importing consumer reports or inventing historical entries. See [layout decisions](../../docs/repository-layout.md).

Update this file and the [umbrella register](../../IMPROVEMENTS.md#register-scope) together only for an authorized material change to the process; routine documentation, infographic, formatting and housekeeping edits need no entry.
