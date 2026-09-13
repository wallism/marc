# Shared controller improvements

## 2026-09-13 — React web impact requires browser evidence

Adding the React member exposed that a confirmed React area containing only a `.js`/`.ts` Hook did not require browser evidence unless separately labeled `web`. A red regression reproduced the missing requirement. Treat captured `react` impact as browser-facing, retaining full review and the independent browser gate. Selection remains based on trusted configured areas, not an assumption that every JSX file is React. Tests cover companion selection, missing expertise, unrelated JSX/JS/docs and callers found only in the old revision. No consumer configuration is changed.

## 2026-09-13 — Bound indirect reference collection

The installed historical-PR smoke check exposed reference expansion beyond the documented 300-file limit and unrelated data matches. Enforce the limit while collecting matches and follow source or explicitly configured runtime areas. Direct changed files remain fully classified; uncertainty still broadens review. A failing 502-versus-300 regression verifies the correction.

## 2026-09-13 — Trusted crew selection and upgrade verification

Added declarative versioned C#, JavaScript, Blazor and front-end selection from frozen source, referenced callers and trusted impact areas. Decisions recompute selection and reject edited/stale identities, missing expertise, reused sessions and conflicting blocking results. Upgrade/rollback regression preserves foreign locks, repair history, recovery reservations and historical report bytes.

## 2026-09-13 — standalone layout and pinned integration

Moved the controller, adapters, fixtures and adjacent tests together into src/quality. Updated digest coverage and path resolution; added a pinned consumer bootstrap and installer that reject tool/configuration/gitlink drift before importing code. Review and merge semantics remain unchanged. Local regression tests cover real synthetic submodule installation. Hosted execution is not claimed.
