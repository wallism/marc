# MARC improvements

| Date | Component | Improvement | Details |
| --- | --- | --- | --- |
| 2026-09-13 | Captain, crew and controller | Established a standalone source/catalogue layout with consumer-owned configuration and pinned installation. | [Layout and migration boundaries](docs/repository-layout.md) |

This starts MARC's standalone history. Prior consumer reports, approvals and operational ledgers stay in their original repositories and are not imported. Local validation and publication status belong in the extraction record; a source move does not establish hosted CI or live activation. Each existing member now owns an improvement register; new specialist routing remains separate work.

## Component registers

- [marc](skills/marc/IMPROVEMENTS.md)
- [marc-code-quality](skills/marc-code-quality/IMPROVEMENTS.md)
- [marc-correctness](skills/marc-correctness/IMPROVEMENTS.md)
- [marc-repair](skills/marc-repair/IMPROVEMENTS.md)
- [marc-security](skills/marc-security/IMPROVEMENTS.md)
- [marc-simple-tests](skills/marc-simple-tests/IMPROVEMENTS.md)
- [marc-simplicity](skills/marc-simplicity/IMPROVEMENTS.md)
- [marc-test-integrity](skills/marc-test-integrity/IMPROVEMENTS.md)
- [Shared controller and installation](src/quality/IMPROVEMENTS.md)
