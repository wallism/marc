# Concise audit reports

Read the `.md` report for the decision, assessment stages, repairs, CI and crew used. Its paired `-audit.json` is the complete machine-readable evidence record.

New reports persist `auditFormat: "marc-audit-v1"` in trusted external evidence. The published JSON is an envelope with:

- `auditSchema`: `marc-audit-v1`.
- `evidence`: the evidence tree, with duplicate large values replaced by null placeholders.
- `references`: JSON Pointer locations of placeholders mapped to the location of their original value. Nearly identical arrays instead use `{base, start, deleteCount, items}` to describe one splice into a copy of the base array. Order and every item are preserved.

Pointers are relative to `evidence`, with standard `~0` and `~1` escapes. Only locations listed in `references` are placeholders; ordinary nulls and reference-looking evidence fields retain their literal meaning. Small values remain inline. Short JSON containers share a line for readability. Repeated inventories, selection details, gate results and repair records are stored once where identical. Distinct findings and reviewer summaries remain complete.

Use the bundled reader to recover the ordinary evidence shape:

```javascript
const fs = require('node:fs');
const { expandAudit } = require('./src/quality/audit.cjs');
const evidence = expandAudit(JSON.parse(fs.readFileSync(auditPath, 'utf8')));
```

The reader also accepts historical unwrapped audits. Consumers of published JSON must expand new envelopes before accessing evidence fields. Decoding does not authenticate evidence or authorize a merge; the controller still compares the exact published bytes against trusted external evidence.

This is publication encoding only. The controller's working evidence and append-only stage journal remain expanded, including their hashes. Selection, impact collection, review gates and approval authority are unchanged. Old prepared reports without `auditFormat` retain their exact JSON bytes. Never retrofit the marker or rewrite a published report: adopting a new MARC pin requires fresh evidence under the new tool/policy identity.

Synthetic tests cover lossless recovery, ordered inventory differences, independent historical findings, literal special keys, invalid references, legacy bytes and exact-pair verification. A read-only measurement against an existing 5,332-line audit produced 2,572 lines (52% fewer) and 323,311 bytes versus 563,845 (43% fewer), with exact expanded evidence equality. That consumer's report was not modified or copied into this repository.
