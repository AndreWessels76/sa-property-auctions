# Data Pipeline Audit — Public Beta

**Date:** 2026-07-31  
**Scope:** Production ingestion readiness (no new scrapers)

## Current pipeline

| Layer | Location | Notes |
|---|---|---|
| Admin UI | `app/admin/imports`, `queue`, `operations` | Admin-gated |
| Run APIs | `app/api/admin/imports`, `app/api/imports/run` | `PermissionService.requireAdmin` |
| Importers | `lib/importers` — Sheriff, Bank, Auctioneers, CSV | Connector-driven |
| Connectors | `lib/connectors/sheriff`, `bank`, `csv` | Trusted-source pattern |
| Orchestration | `lib/imports/runImport.ts`, queue/job services | Job logs in DB |
| Duplicates | `lib/imports/duplicate/*`, scoring, optional AI review | Address/erf/coords/title |
| Address | `lib/property/address/*`, import normalizers | Province dictionary present |
| Images | `lib/images/*`, `lib/imports/images/*` | Download, hash, gallery, storage |

## Validation checklist

| Concern | Status | Recommendation |
|---|---|---|
| Duplicate handling | Present | Prefer CSV/API feeds; review AI merge in admin before bulk auto-merge |
| Address normalization | Present | Extend suburb dictionary as real towns onboard |
| Province mapping | Present (`provinceNormalizer`) | Reject unknown provinces at import |
| Town / suburb mapping | Partial | Maintain allow-lists per provider; do not invent GPS |
| Auction dates | Importer-dependent | Require ISO/parseable dates; drop invalid rows |
| Property types | Present on model | Normalize to House/Flat/etc. at ingest |
| Image handling | Present | Prefer provider CDN URLs; run optimize pipeline |
| Source attribution | Present (`source` field) | Always set sheriff/bank/auctioneer/CSV label |

## Do not scrape unsupported sources

Public beta must use **licensed or contractual feeds**, official sheriff lists where permitted, bank partner exports, and CSV uploads from trusted operators. Do not add aggressive website scrapers without legal clearance.

## Recommended onboarding sequence

1. Agree written data licence / attribution with the provider.  
2. Sample 20–50 rows → CSV import in staging.  
3. Validate province/town/type/date/images/duplicates.  
4. Run admin import job; spot-check merges.  
5. Promote schedule (manual then queued).  
6. Monitor `import_job_logs` and `/api/health/ready`.  
7. Document source owner + refresh cadence in admin ops notes.

## Manual processes still required

- Legal approval per new source  
- First-load QA by an admin  
- Image rights confirmation  
- Handling provider schema changes
