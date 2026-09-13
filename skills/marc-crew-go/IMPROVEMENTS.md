# Go improvements

## 2026-09-13 — Initial member, version 1.0.0

Added researched Go guidance, bounded selection and read-only gate contract.

Author inspection found: The defer-in-loop question could generate a blanket style finding without evidence of harmful retention.

Improved before release: A defer inside a loop is not automatically a leak: determine the function lifetime, maximum iterations and resource budget. Flag retention only when it violates the actual bound or delays a required release. Accept a small bounded batch that intentionally releases its resources on return; request measurements only when cost is material and uncertain.

Inspected defect, clean alternative, missing evidence and hostile instructions. This is author inspection, not independent behavioral evaluation. Catalogue/metadata validation is recorded in the coverage register.
