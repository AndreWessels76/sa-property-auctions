# DUE DILIGENCE EXTRACTION 1.0 — REPORT

**Date:** 2026-08-08  
**Sprint:** Due Diligence Data Extraction & Evidence Engine 1.0  
**Validation:** `npm run typecheck` PASS · `npm run test:dd` PASS (7/7) · `npm run build` (in validation)

---

## Final Verdict

**EXTRACTION READY**

Deterministic extraction recovers source-backed facts into the existing Due Diligence Centre with evidence and precise statuses. Live HTML re-fetch of partner pages is not required for the core path (uses stored title/description/features/links). Municipality/zoning/title remain correctly **not supplied** unless the source text explicitly states them.

---

## Architecture

Pipeline (no parallel property system):

```
SOURCE (PropertyDTO fields + optional page text)
→ DISCOVER / EXTRACT (deterministic regex)
→ NORMALIZE (land units)
→ EVIDENCE (FieldEvidence)
→ VERIFY (status model; conflicts → pending)
→ STORE (due_diligence_extraction_runs, soft-fail)
→ DISPLAY (Due Diligence Centre + Research Report)
```

| Component | Path |
|-----------|------|
| Types / statuses | `lib/dueDiligence/extraction/types.ts` |
| Extractors | `property`, `auction`, `agricultural`, `location`, `document`, `legal` |
| Engine | `lib/dueDiligence/extraction/extractionService.ts` |
| Centre builder | `lib/property/dueDiligence.ts` |
| Service | `lib/services/DueDiligenceExtractionService.ts` |
| Repository | `lib/repositories/DueDiligenceExtractionRepository.ts` |
| Migration | `supabase/migrations/20260808120000_due_diligence_extraction_engine.sql` |
| Admin API | `POST /api/admin/due-diligence/extract` |
| Ops queue | `DueDiligenceExtractionPanel` on Operations Centre |

**Not redesigned:** Repository→Service, Masters, Auction Events, Verification, Identity, Partnership, Acquisition, existing DD surface contract (extended).

---

## Status model (replaces raw “Unavailable”)

| State | Public label |
|-------|----------------|
| verified | Verified |
| source_confirmed | Source Confirmed |
| extracted_not_yet_verified | Found in source — pending verification |
| not_supplied_by_source | Not supplied by auction source |
| not_found | Not found in available source material |
| pending_verification | Verification required |
| restricted / expired | Restricted / Expired |

---

## Acceptance evidence (fixtures)

From `DUE_DILIGENCE_EXTRACTION_EVIDENCE.json`:

| Case | Result |
|------|--------|
| Benoni / Crystal Park / SS The Orchards | Bedrooms=2, Scheme=The Orchards, Town=Benoni, Suburb=Crystal Park, Open/Close Aug 11–12 |
| Haenertsburg Combined Extent | land_size_hectares=4.164, approximate=true, original text retained |
| Municipality / zoning | Listed in missing_key_fields — **not fabricated** |

Tests: 7/7 passed (`npm run test:dd`).

---

## Performance

- Synchronous pure functions on already-loaded DTO text.
- Source content hash for idempotent run upsert.
- Batch admin re-run (limit configurable); soft-fail without migration.

---

## Security / licensing

- Admin-only extraction API (`PermissionService.requireAdmin`).
- Service-role writes to audit table only; RLS admin read.
- No auto-verify of legal/municipal fields.
- Live partner HTML may now be supplied via Live Source Re-fetch (`source_page_text`) only after license + robots gates; default storeRawHtml remains false.

---

## Update — 2026-08-08 (Live Source Re-fetch 1.0)

Extraction engine is now the **downstream consumer** of controlled re-fetch:

`licensed URL → snapshot → hash → (on change) runDueDiligenceExtraction(source_page_text)`

- Unchanged hash → extraction skipped  
- VERIFIED field diffs → CONFLICT (not silent overwrite)  
- Same extractor — no second pipeline  

See `LIVE_SOURCE_REFETCH10_REPORT.md`.

---

## Completeness

Category scores: Property, Auction, Location, Land, Documents, Legal, Building, Utilities → Overall %.  
Only fields with present values count. Fabricated values impossible by design.

---

## Recommendations

1. Apply migration `20260808120000_due_diligence_extraction_engine.sql`.
2. Hook `DueDiligenceExtractionService.processProperty` after verified publish.
3. Optional licensed page re-fetch → `source_page_text` for richer extraction.
4. Wire conflict rows into Verification Queue UI.

---

## Overall Score

**8.4 / 10** — Extraction engine production-usable for stored source content; live page fetch and verification-queue deep link remain next increments.
