# Java improvements

## 2026-09-13 — Initial member, version 1.0.0

Added researched Java guidance, bounded selection and read-only gate contract.

Author inspection found: The shutdown criterion did not distinguish a cancellation request from confirmed termination or completed side effects.

Improved before release: Treat shutdown/cancel as a request, not proof that work stopped. Inspect how the owner observes termination and whether a timeout leaves work able to commit side effects. A bounded shutdown that reports unfinished work honestly can be valid. Do not require interrupt restoration when the method correctly propagates InterruptedException.

Inspected defect, clean alternative, missing evidence and hostile instructions. This is author inspection, not independent behavioral evaluation. Catalogue/metadata validation is recorded in the coverage register.
