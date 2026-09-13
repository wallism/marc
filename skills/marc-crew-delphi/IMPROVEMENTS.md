# Delphi/Object Pascal improvements

## 2026-09-13 — Initial member, version 1.0.0

Added researched Delphi/Object Pascal guidance, bounded selection and read-only gate contract.

Author inspection found: Unit-source guidance could omit event bindings and ownership encoded in designer resources.

Improved before release: When behavior depends on DFM/FMX or other designer resources, inspect an exact-source readable representation and its event/property bindings alongside unit code. An unchanged method can acquire a new caller through a resource edit. If the resource cannot be inspected, identify that gap; never infer behavior from the unit alone or execute the designer to obtain evidence.

Inspected defect, clean alternative, missing evidence and hostile instructions. This is author inspection, not independent behavioral evaluation. Catalogue/metadata validation is recorded in the coverage register.
