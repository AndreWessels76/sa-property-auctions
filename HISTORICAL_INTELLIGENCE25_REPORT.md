# Historical Intelligence 2.5 — Comparable Sales & Market Evidence

**Date:** 2026-08-14  
**Version:** `historical-intelligence-2.5.0`  
**Live evidence:** `HISTORICAL_INTELLIGENCE25_LIVE.json`

---

## VERDICT

### **HISTORICAL INTELLIGENCE 2.5 READY WITH LIMITATIONS**

Engine, APIs, UI, admin audit, and tests are complete. Production has **38 Property Masters**, **38 Auction Events**, **33/33 event-backed historical observations**, **0 public leaks**, but **0 verified sale prices** and **0 pricing observations** — so sale comparables and market statistics correctly report **Insufficient data**. No statistics were fabricated.

---

## 1. Architecture

Built on existing HI 2B — no parallel property model.

| Layer | Path |
|-------|------|
| Comparable engine | `lib/intelligence/comparables/` |
| Orchestrator | `lib/services/ComparableIntelligenceService.ts` |
| Historical dataset | `lib/intelligence/historical/historicalAggregation.ts` |
| Identity / events | Property Masters + Auction Events (unchanged) |
| Pricing | `pricing_observations` (ready, empty in production) |

---

## 2. Comparable engine

`findComparables()` requires multiple verified matching signals (not town-only). Returns ranked comparables with explainable **Comparable Confidence** and evidence arrays.

---

## 3. Sale evidence

Strict price semantics — only `sale_price` for sale statistics. Conflicts surfaced, never averaged.

---

## 4–5. Price/m² and Price/ha

Floor size and verified hectares only. Approximate hectares flagged.

---

## 6–7. Area & agency intelligence

Extended area/agency APIs with `marketEvidence` — sample size rules (minimum 5 verified sales for market stats).

---

## 8–9. Master history & timeline

Property Master event chains and evidence-backed lifecycle stages.

---

## 10–11. Provenance & conflicts

Full provenance on every result. Pricing conflicts block sale price use.

---

## 12. Premium gating

Free: 2 comparables, summary counts. Premium: 12 comparables, timeline, pricing metrics.

---

## 13. Admin tooling

Ops Centre comparable audit — masters, events, verified sales, matches/rejected, insufficient data warnings.

---

## 14. Performance

Deterministic in-memory calculation with cache key identity for future persistence.

---

## 15. APIs

- `GET /api/intelligence/comparables/[id]` (new)
- Extended `/area/[town]` and `/agency/[agency]`

---

## 16. UI

- Property detail: **Historical Market Evidence** panel
- Research report: event-backed HI section
- Admin: comparable audit block

---

## 17. Test results

All validation suites PASS including `npm run test:historical-intelligence25`.

---

## 18. Live evidence

| Metric | Value |
|--------|------:|
| Property Masters | 38 |
| Auction Events | 38 |
| Event-backed | 33/33 |
| Verified sale prices | 0 |
| Public leaks | 0 |

---

## Limitations

No verified sale outcomes in production — comparables and market medians correctly report insufficient data until pricing pipeline populates sale evidence.

---

## Future opportunities

Pricing observation acquisition → sale comparables; comparable cache table at scale; unify legacy geo comparables with event-backed engine.
