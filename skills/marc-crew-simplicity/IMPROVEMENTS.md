# marc-crew-simplicity improvements

## 2026-09-24 — Configurable size limits and 3,000-line default

Aligned routing guidance with supplied defaults of 3,000 counted lines and 50 counted files, excluding documentation/tests from both size metrics. The actual consumer policy remains authoritative, and the simple-route advisory guides remain five counted files and 200 counted lines with the same exclusions. Size never replaces complete-diff review or other gates.

## 2026-09-13 — Consistent crew skill naming

Standardized published names, paths and references on `marc-crew-<name>`. Preserved reviewer IDs, manifest versions and operational instructions.

## 2026-09-13 — standalone layout

Moved this member into its own published skill folder, preserving its instructions and sibling references. Consumer configuration remains explicit; controller commands now resolve under `src/quality`. This starts standalone member history without importing consumer reports or inventing historical entries. See [layout decisions](../../docs/repository-layout.md).

Update this file and the [umbrella register](../../IMPROVEMENTS.md#register-scope) together only for an authorized material change to the process; routine documentation, infographic, formatting and housekeeping edits need no entry.
