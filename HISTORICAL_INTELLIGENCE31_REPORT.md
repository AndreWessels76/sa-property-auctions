# Historical Intelligence 3.1 Report

**Version:** `historical-intelligence-3.1.0`  
**Verdict:** **PRODUCTION READY FOR DATA ENRICHMENT WITH SALE-PRICE COVERAGE LIMITATION**

---

## Executive Summary

Historical Intelligence 3.1 adds an **Outcome Evidence & Sale Price Enrichment Engine** that connects the existing refetch, pricing acquisition, and outcome intelligence layers. Historical auction events can now be refetched from licensed sources, outcomes extracted deterministically, sale prices validated with strict semantics, observations persisted with idempotency, and conflicts routed to admin review.

Production currently has **0 verified sale prices** — the engine is ready; source enrichment must run to populate data.

---

## Architecture

```
Auction Event (historical)
  → SourceRefetchService (licensed fetch, SHA-256)
  → persistRefetchExtraction
      → Due Diligence extraction
      → persistPricingObservations (sale_price semantics)
      → persistOutcomeObservations (NEW — HI 3.1)
  → auction_outcome_observations
  → historical_enrichment_runs (audit)
  → historical_enrichment_reviews (review queue)
  → OutcomeIntelligenceService (read path)
```

No parallel property models. No identity changes. No backfill rerun.

---

## Outcome Extraction

`lib/acquisition/outcomes/outcomeExtractor.ts` — deterministic text patterns:

| Outcome | Evidence |
|---------|----------|
| SOLD | "sold", "successfully sold" |
| WITHDRAWN | "withdrawn" |
| CANCELLED | "cancelled" |
| POSTPONED | "postponed" |
| PASSED_IN | "passed in", "not sold", "unsold" |
| EXPIRED | From verification state only |
| COMPLETED_UNKNOWN | completed state |
| UNKNOWN | No explicit evidence |

Never infers SOLD from passed auction dates.

---

## Sale Price Extraction

Enhanced `pricingExtractor.ts` with `final selling price` pattern.  
Enhanced `pricingValidator.ts` — rejects suspiciously low sale prices and non-price context.

Reserve, guide, estimate, auction price, starting bid **never** become sale_price.

---

## Evidence Model

Persisted in `auction_outcome_observations`:

- `evidence_type`: SOURCE_EXPLICIT | SOURCE_STATUS | SOURCE_RESULT | etc.
- `source_hash`, `source_snapshot_id`, `idempotency_key`
- `sale_price`, `sale_price_confidence`, `observed_at`

---

## Conflict Handling

- Outcome conflicts → `historical_outcome_conflicts`
- Review items → `historical_enrichment_reviews`
- WITHDRAWN + sale price → CONFLICT_REVIEW
- Two sale prices → CONFLICT (never auto-selected)

---

## Operations Centre

**Historical Outcome Enrichment (3.1)** panel:

- Outcome/sale price coverage metrics
- Batch enrich (5 historical events)
- Single property refresh / snapshot extract
- Review queue preview

---

## API

| Route | Purpose |
|-------|---------|
| `GET/POST /api/admin/intelligence/historical-enrichment` | Dashboard + enrich actions |
| `GET /api/cron/historical-enrichment` | Cron batch (CRON_SECRET) |

Existing outcome/market APIs unchanged.

---

## Database Migration

`supabase/migrations/20260814140000_historical_intelligence31_outcome_evidence.sql`

- Extends `auction_outcome_observations` (idempotency, source_hash, evidence_type)
- `historical_enrichment_runs` — audit trail
- `historical_enrichment_reviews` — review queue

**Required:** Apply migration in Supabase before enrichment persistence works.

---

## Tests

`npm run test:historical-intelligence31` — PASS  
Full regression suite — PASS (typecheck, build, HI 3.0/2.5, pricing, refetch)

---

## Live Evidence

See `HISTORICAL_INTELLIGENCE31_LIVE.json` for production counts.

Expected: verified sale prices = 0 until enrichment runs against sources containing explicit outcomes/prices.

---

## Known Limitations

1. Enrichment requires licensed source URLs on historical listings
2. Production corpus has 33 UNKNOWN outcomes until refetch enrichment executes
3. Cron not registered in vercel.json — manual or external trigger required
4. Identity review split cases still pending admin action

---

## Required Actions

1. Apply migration `20260814140000_historical_intelligence31_outcome_evidence.sql`
2. Run enrichment from Ops Centre or `GET /api/cron/historical-enrichment?limit=10`
3. Review queue items in admin panel
4. Re-run live validation after enrichment
