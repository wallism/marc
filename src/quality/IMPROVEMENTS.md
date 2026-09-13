# Shared controller improvements

## 2026-09-13 — standalone layout and pinned integration

Moved the controller, adapters, fixtures and adjacent tests together into src/quality. Updated digest coverage and path resolution; added a pinned consumer bootstrap and installer that reject tool/configuration/gitlink drift before importing code. Review and merge semantics remain unchanged. Local regression tests cover real synthetic submodule installation. Hosted execution is not claimed.
