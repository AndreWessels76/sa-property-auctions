# Historical Intelligence 3.0 Report

**Version:** `historical-intelligence-3.0.0`  
**Generated:** 2026-08-14  
**Verdict:** **READY WITH LIMITATIONS**

---

## Executive Summary

Historical Intelligence 3.0 transforms the platform from historical activity tracking into a deterministic **Auction Outcome & Market Performance Intelligence** layer. Outcome classification, sale price semantics, auction performance metrics, area/agency intelligence, time series, property master history chains, conflict detection, and admin audit are implemented with full provenance and explicit sample-size rules.

Production data currently lacks confirmed auction outcomes and verified sale prices. All statistics correctly return **Insufficient data** rather than fabricated values. Architecture is complete; operational enrichment of outcome evidence is the next step.

---

## Architecture

Built on existing systems without parallel models:

| Layer | Location |
|-------|----------|
| Outcome engine | `lib/intelligence/outcomes/` |
| Service orchestration | `lib/services/OutcomeIntelligenceService.ts` |
| Persistence (optional) | `lib/repositories/OutcomeIntelligenceRepository.ts` |
| Database | `supabase/migrations/20260814120000_historical_intelligence30_outcomes.sql` |
| HI 2.5 comparables | Reused; scoring weights aligned via `COMPARABLE_WEIGHTS` |

Flow: **Property Master → Auction Event → Outcome → Sale evidence → Historical intelligence**

---

## Outcome Classification

Deterministic states: `SOLD`, `WITHDRAWN`, `CANCELLED`, `EXPIRED`, `UNSOLD`, `POSTPONED`, `UNKNOWN`.

Safety rules enforced:

- `expired` → `EXPIRED` (never `UNSOLD`)
- `completed` → `UNKNOWN` (never inferred sold/unsold)
- `UNSOLD` only with explicit evidence text (`passed in`, `not sold`, etc.)
- No date-passed inference

---

## Sale Price Intelligence

Only `sale_price` used for sale statistics. Never cross-mapped:

- `auction_price`, `guide_price`, `reserve_price`, `estimate`, `starting_bid`

Fields exposed per event: `salePrice`, `salePriceSource`, `salePriceObservedAt`, `salePriceEvidence`, `salePriceConfidence`, `conflict`.

---

## Auction Performance

Explicit denominators:

- **Sale rate** = Sold / confirmed outcomes (sold + withdrawn + cancelled)
- **Outcome coverage** = Confirmed outcomes / total historical events
- **Unknown outcome rate** = Unknown / total events

Never: sold / all records without definition.

---

## Area Intelligence

Extended `/api/intelligence/area/[town]` with `outcomePerformance` report including:

- Historical auctions, confirmed sales, outcome coverage, sale rate
- Median sale price, price/m², price/ha (when ≥5 verified sales)
- Property type distribution, monthly activity, limitations

Dedicated routes: `/api/intelligence/market/[town]`, `/api/intelligence/market/[town]/timeseries`

---

## Agency Intelligence

Extended `/api/intelligence/agency/[agency]` with `outcomePerformance` — neutral metrics only (no rankings).

---

## Time Series

Monthly and quarterly series in `lib/intelligence/outcomes/timeseries.ts`:

- Auction volume, confirmed sales, sale rate
- Median sale price / m² / ha when sample ≥ threshold
- No forecasting or extrapolation

---

## Comparable Engine

HI 2.5 engine retained. Scoring now uses documented `COMPARABLE_WEIGHTS` from HI 3.0 config — deterministic, explainable weights for suburb, town, property type, floor/land size, bedrooms, bathrooms, agricultural type, distance, verified sale.

---

## Property Master History

`GET /api/intelligence/property/[id]/history` and `buildPropertyHistoryChain()` expose chronological immutable event chains with outcome and sale evidence.

Property detail page: **Historical performance** panel (`HistoricalOutcomePerformancePanel`).

---

## Data Coverage

Every report includes:

- Outcome coverage, sale-price coverage, location coverage, evidence coverage
- Sample size and date range labels
- `notCalculableReason` when below minimum thresholds (5 market sales, 3 time-series sales)

---

## Provenance

Outcome evidence includes: source URL, timestamp, evidence text, extraction method, evidence types, confidence. Never silently overwrites verified values.

---

## Conflict Handling

`detectOutcomeConflicts()` flags sale price conflicts as `HISTORICAL_CONFLICT`.  
Database table `historical_outcome_conflicts` supports admin review via `POST /api/admin/intelligence/outcomes/review`. Never auto-resolved.

---

## Public Catalogue Safety

Historical states (expired, sold, withdrawn, cancelled) never appear as active public listings. Live validation: **0 catalogue leaks**.

---

## Admin Operations

**Historical Outcome Audit (3.0)** panel in Operations Centre:

- Events scanned, confirmed sold, withdrawn, cancelled, expired, unknown
- Sale prices found, conflicts, needs review
- Admin review endpoint for conflicts

---

## API

| Route | Purpose |
|-------|---------|
| `GET /api/intelligence/outcomes` | Market overview |
| `GET /api/intelligence/outcomes/[id]` | Event/property outcome detail |
| `GET /api/intelligence/market` | Market overview alias |
| `GET /api/intelligence/market/[town]` | Town performance |
| `GET /api/intelligence/market/[town]/timeseries` | Town time series |
| `GET /api/intelligence/property/[id]/history` | Property master history |
| `GET /api/admin/intelligence/outcomes` | Admin audit |
| `POST /api/admin/intelligence/outcomes/review` | Conflict review |

Premium gating via `SubscriptionService.premium()`. Admin independent of Stripe.

---

## Database

New tables (RLS admin-only):

- `auction_outcome_observations` — append-only outcome/sale evidence persistence
- `historical_outcome_conflicts` — auditable conflict queue

Reuses: `property_masters`, `auction_events`, `pricing_observations`, `source_snapshots`.

---

## Caching

Deterministic keys: `outcomes:{scope}:{scopeId}:{dateRange}:{version}:{dataVersion}`

Invalidates when corpus count or latest event date changes.

---

## Testing

`npm run test:historical-intelligence30` — 20+ cases covering classification, price semantics, coverage, time series, conflicts, catalogue safety, cache keys, provenance.

Full regression suite: **PASS** (typecheck, build, all test scripts).

---

## Live Evidence

From `HISTORICAL_INTELLIGENCE30_LIVE.json` (2026-08-14):

| Metric | Value |
|--------|------:|
| Property Masters | 38 |
| Auction Events | 38 |
| Historical corpus | 33 |
| Event-backed | 33 / 33 |
| Confirmed outcomes | 0 |
| Verified sale prices | 0 |
| Pricing observations | 0 |
| Public catalogue leaks | 0 |
| Outcome breakdown | 33 UNKNOWN |

**Verdict:** READY WITH LIMITATIONS — architecture verified; production lacks outcome confirmation and sale price evidence.

---

## Limitations

1. All 33 production historical events classify as **UNKNOWN** — auction event states not yet mapped to confirmed sold/withdrawn/expired outcomes in source data.
2. Zero verified sale prices — market statistics correctly unavailable.
3. New DB tables not yet populated with persisted observations (engine computes from live corpus).
4. Identity review cases (Louis Trichardt, Pretoria) still require admin split before master-level history is fully reliable.

---

## Future Expansion

1. Populate `auction_outcome_observations` from verified extraction/refetch pipelines
2. Acquire verified sale prices via pricing acquisition
3. Map auction event `outcome_status` fields where sources supply them
4. Admin outcome confirm/reject workflow for individual events
5. Investor workspace historical performance section (API ready; UI partial via property panel)

---

## Exact Next Operational Step

Run **Pricing Data Acquisition** and **Due Diligence / Refetch** on historical auction result pages to populate verified outcomes and sale prices. Then re-run:

```bash
npx tsx --env-file=.env.local scripts/historical-intelligence30-live.ts
```

Until verified sale prices ≥ 5 exist, market statistics will correctly report **Insufficient verified sale data**.
