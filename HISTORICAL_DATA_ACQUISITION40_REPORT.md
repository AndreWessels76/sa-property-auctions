# Historical Data Acquisition 4.0 — Report

**Version:** `historical-data-acquisition-4.0.0`  
**Generated:** 2026-08-14  
**Live evidence:** `HISTORICAL_DATA_ACQUISITION40_LIVE.json`

---

## Verdict

**HISTORICAL DATA ACQUISITION 4.0 — READY WITH LIMITATIONS**

The enrichment platform is implemented, tested, and build-ready. Live production has **33 historical events**, **0 verified outcomes**, and **0 verified sale prices** — which is an honest result when sources have not yet been enriched or do not publish explicit outcome evidence. Migrations must be applied and a controlled enrichment batch run before persistence counts will rise.

---

## What Was Built

### Core pipeline (extends HI 3.1)

- `lib/acquisition/historical/` — source resolution, deterministic priority queue (P1–P4), version config
- `lib/acquisition/outcomes/` — expanded extraction patterns (knocked down, final sale, purchaser confirmed, no acceptable bid, rescheduled)
- `HistoricalEnrichmentService` — queue build, dry-run, batch enrichment, HDA 4.0 dashboard, intelligence rebuild
- `HistoricalEnrichmentRepository` — runs, reviews, `resolveReview`
- Refetch integration via existing `SourceRefetchService` + `refetchExtractionLinkage` (DD + pricing + outcomes on CONTENT_CHANGED)

### Admin & operations

- `HistoricalDataAcquisition40Panel` — queue, outcomes, source health, conflicts, quick actions
- Extended `/api/admin/intelligence/historical-enrichment` — dry-run, queue view, batch modes, review resolve, rebuild
- Quick Actions — **Enrich Historical Auctions** button
- Cron — `/api/cron/historical-enrichment` registered in `vercel.json` (03:30 UTC daily, limit 5)

### Intelligence & UI

- Comparables engine — rejects non-SOLD and missing verified sale price
- Research report — historical evidence chain with outcomes, sale prices, provenance
- Property detail — existing HI 3.0 outcome panel retained

### Validation

- `npm run test:historical-data-acquisition40` — 30-case matrix (PASS)
- `scripts/historical-data-acquisition40-live.ts` → live JSON from database

---

## Live Counts (from database)

| Metric | Value |
|--------|------:|
| Property Masters | 38 |
| Auction Events | 38 |
| Historical events (event-backed) | 33 |
| Enrichment queue eligible | 33 |
| Queue P1 (no confirmed outcome) | 33 |
| Verified SOLD | 0 |
| Verified sale prices | 0 |
| UNKNOWN outcomes | 33 |
| Outcome observations persisted | 0 |
| Enrichment runs | 0 |
| Open conflicts | 0 |
| Public catalogue leaks | 0 |
| Duplicates | 0 |

This is **not a failure** — the system discovers evidence; it does not manufacture it.

---

## Evidence Coverage

| Area | Status |
|------|--------|
| Source URL on historical events | Present (33 queued) |
| Outcome extraction pipeline | Implemented, not yet run at scale |
| Sale price semantics | Guide/reserve/estimate/auction rejected |
| Provenance fields | evidence_text, extraction_method, source_hash idempotency |
| Multi-source conflicts | Table + admin review API |
| Identity safety | REVIEW_REQUIRED path; no town-only attachment |

---

## Sale-Price Coverage

- **Verified sale prices:** 0  
- **Market statistics:** Insufficient data (< 5 verified sales)  
- Comparables feed requires SOLD + verified sale price only

---

## Conflicts & Review

- Open `historical_outcome_conflicts`: 0  
- Open `historical_enrichment_reviews`: 0  
- Admin conflict actions: Accept A / Accept B / Reject (audited)

---

## Public Catalogue Safety

- **Leaks:** 0  
- Historical records remain excluded from `/properties`, search, compare, calendar unless separately represented as upcoming/live

---

## Migrations Required

Apply in Supabase (if not already):

1. `20260814120000_historical_intelligence30_outcomes.sql`
2. `20260814140000_historical_intelligence31_outcome_evidence.sql`

Tables: `auction_outcome_observations`, `historical_outcome_conflicts`, `historical_enrichment_runs`, `historical_enrichment_reviews`

---

## Deployment Requirements

1. Apply migrations  
2. Set `CRON_SECRET` in production (cron auth)  
3. Ensure licensed source fetch env (`BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH` etc.) per partner  
4. Run dry-run from Ops Centre → review counts → batch enrich (limit 5–10)  
5. Inspect snapshots, observations, conflicts before full batch

---

## Tests & Build

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run test:historical-data-acquisition40` | PASS |
| `npm run test:historical-intelligence30` | PASS |
| `npm run test:historical-intelligence31` | PASS |
| `npm run test:historical-intelligence25` | PASS |
| `npm run test:pricing-acquisition` | PASS |
| `npm run test:pricing` | PASS |
| `npm run test:dd` | PASS |
| `npm run test:refetch` | PASS |
| `npm run test:investor-intelligence` | PASS |
| `npm run test:ops-quick-actions` | PASS |

---

## Remaining Limitations

1. **No enrichment runs executed yet** — persistence counts are zero until admin/cron batch runs  
2. **0 verified sales** — expected until sources are refetched and contain explicit evidence  
3. **Two identity-review split cases** (Louis Trichardt, Pretoria) still need admin action — do not rerun backfill  
4. **Sale-price market statistics** unavailable until ≥5 verified sales  
5. **HI 3.1 enrichment panel** replaced by HDA 4.0 panel in Ops Centre (functionality consolidated)

---

## Commit Status

**Not committed** — HI 3.1 + HDA 4.0 changes remain in working tree pending explicit commit request.
