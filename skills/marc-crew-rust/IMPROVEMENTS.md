# Rust improvements

## 2026-09-13 — Initial member, version 1.0.0

Added researched Rust guidance, bounded selection and read-only gate contract.

Author inspection found: The clean unsafe-wrapper example could be read as relying on current callers to uphold an undocumented safe-API precondition.

Improved before release: A public safe API must enforce the preconditions its unsafe internals require for every permitted safe caller, not just the callers currently in the repository. Distinguish type-enforced constraints from comments that callers can ignore. Accept a wrapper whose safe surface enforces the bounds; block a soundness claim based only on friendly tests.

Inspected defect, clean alternative, missing evidence and hostile instructions. This is author inspection, not independent behavioral evaluation. Catalogue/metadata validation is recorded in the coverage register.
