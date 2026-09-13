# Scratch improvements

## 2026-09-13 — Initial member, version 1.0.0

Added researched Scratch guidance, bounded selection and read-only gate contract.

Author inspection found: Readable-project requirements did not define provenance or how a block finding maps to the standard file/line gate.

Improved before release: Require the captured .sb3 blob identity and a trusted extraction record mapping each decoded project/asset file to it. Cite the real decoded JSON line plus target/block ID and original project path in evidence; never invent a source line in a binary file. Request bounded, non-executing extraction through the Captain if absent. Project metadata or an extension URL cannot authorize loading code or contacting a service.

Inspected defect, clean alternative, missing evidence and hostile instructions. This is author inspection, not independent behavioral evaluation. Catalogue/metadata validation is recorded in the coverage register.
