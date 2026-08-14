# Historical Intelligence 4.0 — Report

**Version:** `historical-intelligence-4.0.0`  
**Generated:** 2026-08-14  
**Live evidence:** `HISTORICAL_INTELLIGENCE40_LIVE.json`

---

## Verdict

**INSUFFICIENT DATA — ENGINE READY**

The market evidence, comparable sales, and historical performance engine is implemented and validated. Production currently has **0 verified SOLD outcomes** and **0 verified sale prices** — median statistics correctly return **Insufficient data**. This is a successful validation state, not a failure.

---

## Architecture

Built on existing layers — no parallel models:

```text
Property Master → Auction Events → Outcome Evidence → Pricing Observations
        ↓
Historical Evidence Quality (HI 4.0)
        ↓
Comparable Engine 4.0 → Area/Agency Intelligence → Research & Ops UI
        ↓
HDA 4.0 acquisition feedback (reuse existing queue)
```

### New modules

| Module | Path | Purpose |
|--------|------|---------|
| Evidence quality | `lib/intelligence/historicalEvidence/` | Deterministic scoring (HIGH/MEDIUM/LOW/INSUFFICIENT) |
| HI 4.0 service | `lib/services/HistoricalIntelligence40Service.ts` | Coverage, performance, rebuild, conflicts |
| Comparable 4.0 | `lib/intelligence/comparables/` | Version bump + evidence-quality scoring bonus |
| Admin panel | `HistoricalIntelligence40Panel.tsx` | Coverage, conflicts, rebuild |
| Area page | `/intelligence/area/[town]` | Historical activity + sale evidence |
| APIs | See § APIs below | Evidence, coverage, conflicts, rebuild, resolve |

---

## Evidence Rules

- **SOLD** only with explicit evidence — expired/404/disappeared listings remain UNKNOWN
- **Sale price** only from explicit sold-for / hammer / final sale wording
- Guide, reserve, estimate, auction price, starting bid **never** map to sale price
- Low-confidence observations **never** upgraded to verified
- Conflicts create review items — no silent overwrite

---

## Comparable Methodology

Deterministic factors (existing engine, upgraded to 4.0):

- Primary: town, suburb, property type, floor size, land/hectares, bedrooms, scheme
- Secondary: evidence quality bonus, verified SOLD + sale price, date proximity
- Explicit rejection reasons recorded for every rejected candidate
- Minimum 3 verified comparables for comparable statistics
- Minimum 5 verified SOLD sales for median market statistics

---

## Live Production Counts

| Metric | Value |
|--------|------:|
| Property Masters | 38 |
| Auction Events | 38 |
| Historical events | 33 |
| Verified outcomes | 0 |
| Verified sale prices | 0 |
| Comparable-ready events | 0 |
| Market-stats-ready events | 0 |
| Towns represented | 25 |
| Median calculable | No |
| Conflicts | 0 |
| Public catalogue leaks | 0 |

---

## APIs

| Route | Status |
|-------|--------|
| `GET /api/intelligence/historical/evidence` | **New** |
| `GET /api/intelligence/comparables/[id]` | Existing |
| `GET /api/intelligence/area/[town]` | Existing |
| `GET /api/intelligence/agency/[agency]` | Existing |
| `GET /api/intelligence/market` | Existing |
| `GET /api/intelligence/market/[town]` | Existing |
| `GET /api/intelligence/market/[town]/timeseries` | Existing |
| `GET /api/admin/intelligence/historical/coverage` | **New** |
| `GET /api/admin/intelligence/historical/conflicts` | **New** |
| `POST /api/admin/intelligence/historical/rebuild` | **New** |
| `POST /api/admin/intelligence/historical/resolve` | **New** |

---

## UI

- **Ops Centre:** Historical Intelligence 4.0 panel (coverage, conflicts, rebuild)
- **Research report:** Historical Performance section (events, prices, price/m², comparables)
- **Area intelligence:** `/intelligence/area/[town]` page

---

## Cache Strategy

Cache keys include methodology version, data version, and evidence hash (`lib/intelligence/historicalEvidence/cache.ts`). Rebuild invalidates scoped keys (property, master, town, agency, market).

---

## Tests & Build

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run test:historical-intelligence40` | PASS (27 cases) |
| Full regression suite | PASS |

---

## Migrations

**None required** — HI 4.0 reuses existing tables (`auction_outcome_observations`, `pricing_observations`, `historical_outcome_conflicts`, etc.).

HI 3.1 migration (`20260814140000_*`) should be applied before outcome persistence from HDA 4.0 enrichment.

---

## Remaining Limitations

1. **0 verified SOLD / 0 sale prices** — engine correctly reports Insufficient data
2. **No size evidence** on historical events (0 events with floor/hectares in coverage KPI)
3. **Market median/trends** withheld until ≥5 verified sales
4. **Comparable matches** unavailable until verified SOLD + sale price evidence arrives via HDA 4.0
5. Cache keys computed but no persistent cache store (invalidation scopes returned on rebuild)

---

## Recommended Next Operational Step

Run HDA 4.0 enrichment batch from Ops Centre after applying HI 3.1 migration — then rebuild HI 4.0 intelligence. Even if sources lack explicit outcomes, the validation remains honest.

---

## Commit Status

**Not committed** — per master prompt instruction.

## Deployment Status

Code ready for deploy. No new migrations. HDA 4.0 enrichment should precede meaningful HI 4.0 statistics.
