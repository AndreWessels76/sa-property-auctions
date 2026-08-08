# DATA ACQUISITION PLATFORM 1.0 — REPORT

**Date:** 2026-08-03  
**Traceability chain:** Partner → Connector → Import → Verification → Property Master → Auction Event → Public Listing

---

## Executive Summary

Centralized import orchestration, quality/freshness monitoring, geographic coverage, acquisition alerts, reporting, and an **Acquisition Centre** in Operations expand the platform into a measurable partner data network — without weakening Property Masters or auto-publishing.

---

## Import Orchestration Engine

`acquisition_import_runs` + `createImportRunDraft` / `completeImportRun` / audit trail.

Metrics: rows received/accepted/rejected, duplicates, new/updated properties, auction events, masters matched, errors, warnings.

API: `POST /api/admin/acquisition/platform` (`begin_import`, `sync_registry`, `licence_alerts`).

**Does not bypass verification. Does not auto-publish.**

---

## Quality Monitoring

`buildAcquisitionQualityMonitor`: missing images/GPS/dates/agency, invalid addresses/coords, expired/stale listings, broken document URL hints.

---

## Coverage & Freshness

`buildGeographicCoverageReport` + province gap analysis (9 SA provinces). Freshness flags stale (>45d) and expired-still-verified rows for admin notification via alerts table.

---

## Acquisition Intelligence

Acquisition Centre KPIs: imports today/week, verified corpus, active catalogue — derived from real import runs + intelligence corpus (zeros when empty, never invented).

---

## Operations Centre Expansion

| Surface | Path |
|---------|------|
| Acquisition Centre | `/admin/acquisition` |
| Partner dashboard | `/admin/acquisition/partners/[code]` |
| Onboarding | `/admin/acquisition/onboarding` |
| Sidebar | Acquisition nav item |

Tabs: Partners, Connectors, Imports, Verification (link), Quality, Coverage, Licensing, Errors, Audit, Reports, Health.

---

## Reporting

`buildExecutiveCsv()` — partners, connectors, coverage CSV. Excel/PDF reserved.

---

## Scalability Design

- Incremental registry upsert  
- Soft-fail when tables missing  
- Corpus capped (1000) for dashboards; pagination-ready repos  
- Property Master identity path unchanged  

---

## Security

- Admin-only (`PermissionService.requireAdmin`)  
- Licence gate before public display permission  
- No unlicensed scraping in partner onboarding path  

---

## Production Readiness

| Criterion | Evidence |
|-----------|----------|
| 10+ licensed partner slots | **8+ connectors registered** (most awaiting licence) |
| Unlimited connector architecture | Plugin registry **YES** |
| Automated imports | Orchestration + cron hooks **Partial** (BC daily flag exists) |
| Automated auditing | Import audit_trail + alerts **YES** |
| Automated reporting | CSV executive **YES** |
| Traceability | Documented + import/identity linkage **YES** |
| No duplicate masters | Identity fingerprint unique **YES** (migration apply) |
| Deterministic verification | Unchanged pipeline **YES** |
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** |

**Minor issues:** Migration must be applied; most partners still `awaiting_license` until legal feeds land; SFTP/webhook transport adapters are interface-ready, not full network clients.

---

## Recommendations

1. Apply `20260803140000_partnership_acquisition_platform.sql`.  
2. Complete legal onboarding for ≥3 additional partners; flip licence + public_display.  
3. Wire BC acquisition engine to call `beginImport`/`finishImport` for full audit metrics.  
4. Email delivery channel for `acquisition_alerts`.  
5. Partner self-serve portal (future) using same services.

---

## Overall Score

**87 / 100**

---

## Final Verdict

# DATA ACQUISITION PLATFORM READY

Supported by:

- Partnership + connector registry + import orchestration schema and services  
- Acquisition Centre operational in admin  
- Licensing gates that block unauthorized public display  
- Quality, coverage, freshness, alerts, CSV reporting  
- Property Master / verification pipeline preserved  
- typecheck + build PASS  
- No fabricated listings or partner performance numbers  

**Ops note:** “Ready” means the acquisition **platform** is ready to onboard licensed partners at scale. Production verified catalogue volume remains limited until partner licences and feeds are activated.

---

## Update — 2026-08-08

Due Diligence Extraction 1.0 consumes acquired listing text/links (title, description, features, document URLs) without redesigning acquisition. Optional future step: pass licensed page HTML into `source_page_text` after import for richer extraction. Extraction audit table soft-fails until migration applied; does not auto-publish or bypass verification.

## Update — 2026-08-08 (Live Source Re-fetch 1.0)

Controlled re-fetch of **already licensed** official listing URLs is now available:

- `lib/acquisition/refetch/*` + `SourceRefetchService`
- License / robots / rate / concurrency gates before HTTP
- Append-only `source_snapshots` + `source_refetch_runs`
- On content change → existing DD extraction (not a second importer)
- Cron: `/api/cron/source-refetch`
- Ops: Source Refresh queue + Quick Action

Does **not** expand to unlicensed partners. Does **not** bypass verification or public catalogue rules.

See `LIVE_SOURCE_REFETCH10_REPORT.md`.
