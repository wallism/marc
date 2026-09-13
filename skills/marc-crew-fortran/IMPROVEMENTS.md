# Fortran improvements

## 2026-09-13 — Initial member, version 1.0.0

Added researched Fortran guidance, bounded selection and read-only gate contract.

Author inspection found: Numerical guidance lacked a concrete check for storage settings changing hidden shared state.

Improved before release: Inspect effective storage flags and SAVE attributes before declaring a routine reentrant. In GNU Fortran, -fno-automatic can retain local state; a threaded caller can therefore change the ownership assumptions even when the routine source is unchanged. Accept deliberately serialized access and request relevant multi-call evidence instead of prescribing one storage flag.

Inspected defect, clean alternative, missing evidence and hostile instructions. This is author inspection, not independent behavioral evaluation. Catalogue/metadata validation is recorded in the coverage register.
