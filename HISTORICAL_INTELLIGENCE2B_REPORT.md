# Historical Intelligence 2B

## Mission

Build a production-grade Historical Property & Auction Intelligence engine using only verified, source-traceable historical data. Auction Events are the unit of history. Sale price is never inferred from auction, guide, reserve, or estimate. Missing data stays missing.

## Architecture

```text
Property Master
      ↓
Auction Events          (preferred historical unit)
      ↓
Listing fallback        (only when no Auction Event exists; labelled)
      ↓
Pricing Observations    (sale / auction / guide / reserve kept separate)
      ↓
Historical Intelligence 2B  (historical-intelligence-2.0.0)
      ↓
Property detail / area API / agency API / admin audit
```

No parallel historical property model. No new analytics tables. Aggregation is deterministic in `lib/intelligence/historical/` and loaded by `HistoricalIntelligenceService`.

Existing listing-level classifier `lib/platform/historicalIntelligence.ts` is unchanged for Verified Data Platform summaries.

## Historical Dataset

Live production sample (2026-08-14):

| Source | Count |
| --- | --- |
| `auction_events` | **0** |
| `property_masters` | **0** |
| `pricing_observations` | **0** |
| `properties` loaded | 53 |
| Dataset observations | 38 (all listing fallback) |
| Public historical | 33 expired |
| Upcoming excluded | 5 (`NOT_HISTORICAL`) |

## Event Classification

Supported: upcoming, live, completed, sold, withdrawn, cancelled, expired, unknown.

- `expired ≠ sold`
- `completed ≠ sold` (winning bid is not a sale price unless status is sold)
- Unknown outcomes remain unknown and are excluded from sale-rate denominators

Live: 33 historical rows are **expired** with **outcome not supplied**. 0 sold / withdrawn / cancelled.

## Pricing Semantics

Separate fields: sale_price, auction_price, guide_price, reserve_price, estimated_value, starting_bid.

Sale statistics require `sale_price` on a sold event (observation or `winning_bid` only when status is sold). Guide/reserve/estimate/auction prices never enter **Average/Median Sale Price**.

## Metrics

Implemented with sample safety:

- 0 → Insufficient data
- 1 → Limited data — 1 record
- 2–4 → Limited historical sample
- 5+ → statistic, still showing sample size

Count / median / average / min / max. Growth only from comparable period medians (`Not calculable` if prior is missing or zero). Neutral wording only.

Live calculable: **event counts by state, area, agency, date coverage**.  
Not calculable: sale/auction price, price/m², price/ha, sale rate, growth.

## Coverage

Every metric exposes numerator/denominator. Live sale-price coverage: **0 / 33**. Floor and hectare coverage: **0 / 33**. Date coverage: **33 / 33**. Source: Bidders Choice.

## Area Intelligence

Reusable API `GET /api/intelligence/area/[town]`. Groups by stored town/province. No `/towns/[town]` frontend in this sprint.

Limitation: some listing `town` values are polluted source fragments (`of`, `Pre-fab wall`). They are not rewritten.

## Agency Intelligence

`GET /api/intelligence/agency/[agency]` — completed/sold/withdrawn/cancelled counts and sale-price coverage. No “best/worst agency” ranking.

## Agricultural Intelligence

Agricultural market category is isolated from residential averages. Price/ha uses hectares only; approximate hectares stay approximate. Live: agricultural listings exist historically (e.g. Haenertsburg Guest Farm) but **no confirmed sale prices or stored hectares on the listing row**.

## Comparables Foundation

Eligibility flags (identity, type, price kind, size) — no AI similarity score. Live eligible sale comparables: **0** (no sale prices).

## Provenance

Reports include version, sample size, coverage label, source names, and (when present) auction event / master IDs. Admin audit lists exclusion reasons.

## Exclusions

Tracked: `NOT_HISTORICAL`, `UNVERIFIED`, `DUPLICATE_EVENT`, `MISSING_PRICE`, `MISSING_DATE`, `INVALID_PRICE`, `INVALID_SIZE`, `UNKNOWN_PROPERTY_TYPE`, `CONFLICT`, `INSUFFICIENT_IDENTITY`.

Live upcoming Tzaneen listing is excluded from completed-history stats (`NOT_HISTORICAL`). Expired Linden listing is historical and **not** on the public catalogue.

## Performance

On-request aggregation (no materialised tables). Suitable for current corpus size. Dataset version: `historical-intelligence-2.0.0`.

## Access Control

- Public catalogue: upcoming/live only (unchanged)
- Free: activity counts; pricing/trends gated
- Premium: full metrics, timelines, longer windows
- Admin: `/api/admin/intelligence/historical` via existing admin role (independent of Stripe)

## Tests

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run test:historical-intelligence` | PASS |
| `npm run test:pricing-acquisition` | PASS |
| `npm run test:pricing` | PASS |
| `npm run test:dd` | PASS |
| `npm run test:refetch` | PASS |
| `npm run test:investor-intelligence` | PASS |
| `npm run test:ops-quick-actions` | PASS |
| `npm run build` | PASS |

## Live Evidence

File: `HISTORICAL_INTELLIGENCE_LIVE.json`

## Limitations

1. **No Auction Event rows and no Property Masters** in production — engine falls back to labelled listing observations. Identity linkage is therefore weak.
2. **No confirmed sold events** and **no sale/auction prices** in the live corpus — price statistics correctly return Insufficient data (not zeros).
3. **`pricing_observations` empty** — Pricing Acquisition 1.0 migration may still need apply, and licensed pages often omit prices.
4. Listing `town` quality is uneven; area groups use stored values without invention.
5. No `/towns/[town]` pages, charts only render when a metric has a sample (UI shows honest empty states).
6. Historical Intelligence 2B does not backfill Auction Events; that remains an identity/acquisition job.

## Next Phase

- Backfill Property Masters + Auction Events for historical listings
- Apply pricing acquisition migration and extract prices from licensed snapshots
- Record explicit sold/withdrawn outcomes from sources (never infer from expired)
- Town/suburb normalisation for area intelligence
- Optional `/towns/[town]` UI once priced samples exist

## Final Verdict

**HISTORICAL INTELLIGENCE 2B READY WITH LIMITATIONS**
