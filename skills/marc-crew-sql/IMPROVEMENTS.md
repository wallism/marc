# SQL improvements

## 2026-09-13 — Initial member, version 1.0.0

Added researched SQL guidance, bounded selection and read-only gate contract.

Author inspection found: Migration coverage mentioned compatibility without identifying the intermediate deployment states to inspect.

Improved before release: For schema changes, inspect old code/new schema and new code/transitional schema where the actual rollout permits those pairings. Trace backfill failure, lock duration, destructive data loss and whether rollback restores data or only structure. Require engine-specific supplied evidence for transactional DDL; do not infer it from PostgreSQL examples. Review plans without executing migrations.

Inspected defect, clean alternative, missing evidence and hostile instructions. This is author inspection, not independent behavioral evaluation. Catalogue/metadata validation is recorded in the coverage register.
