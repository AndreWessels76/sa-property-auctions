# Historical Intelligence 4.2 — Validation Report

**Version:** historical-intelligence-4.2.0  
**Resolver:** historical-resolution-4.2.0  
**Verdict:** INSUFFICIENT DATA — ENGINE READY

## What was built

Historical Intelligence 4.2 adds a deterministic **Verified Sale Evidence & Outcome Resolution Engine** on top of HI 4.0 / HDE 4.1 without replacing Property Master → Auction Event architecture.

### Core module: `lib/intelligence/historicalResolution/`

- Outcome resolver (never infers SOLD from expired/closed listings)
- Strict sale price resolver (rejects guide/reserve/auction/starting bid)
- Outcome + price agreement validation (SOLD_WITHOUT_PRICE, CONFLICT, REVIEW_REQUIRED)
- Identity verification (IDENTITY_REVIEW_REQUIRED for town+agency-only matches)
- Size evidence (floor vs land separation, ± hectares preserved)
- Source evidence hierarchy
- Resolution states: UNRESOLVED → SOURCE_FOUND → EXTRACTED → VERIFIED / CONFLICT / REVIEW_REQUIRED
- Comparable eligibility with explicit rejection codes

### Persistence

Migration `20260814160000_historical_intelligence42_resolution.sql` adds `historical_resolution_audit` for admin resolution audit trail (idempotent keys, RLS admin-only).

### APIs

| Route | Purpose |
|-------|---------|
| `GET/POST /api/admin/intelligence/historical-resolution` | Dashboard, batch resolve, rebuild |
| `GET /api/admin/intelligence/historical-resolution/[eventId]` | Evidence review payload |
| `POST /api/admin/intelligence/historical-resolution/review` | Confirm SOLD, reject, re-run extraction |
| `GET /api/intelligence/historical/evidence/[id]` | Public resolved evidence by ID |

### Admin UI

- **Historical Evidence Resolution 4.2** panel on Operations Centre
- Evidence review page at `/admin/operations/historical-resolution/[eventId]`

### Comparable Engine

- Rejection codes (`OUTCOME_NOT_SOLD`, `SALE_PRICE_MISSING`, `SAME_PROPERTY_MASTER`, etc.) exposed on comparable rows

## Production reality (expected)

| Metric | Expected |
|--------|----------|
| Historical events | ~33 |
| Verified SOLD | 0 (valid — sources not yet enriched) |
| Verified sale prices | 0 |
| Public catalogue leaks | 0 |
| Market statistics | Insufficient data (< 5 verified sales) |

Run `npm run hi42:live` after applying migrations to refresh live counts.

## Migrations to apply

1. `20260814120000_historical_intelligence30_outcomes.sql`
2. `20260814140000_historical_intelligence31_outcome_evidence.sql`
3. `20260814160000_historical_intelligence42_resolution.sql` **(new)**

## Tests

- `npm run test:historical-intelligence42` — 30 cases PASS
- HI 4.0, HDE 4.1 regression PASS
- Typecheck PASS
- Build PASS

## Next steps

1. Apply HI 4.2 migration in Supabase
2. Run HDE 4.1 enrichment (5-event batch) to populate outcome observations
3. Re-run resolution dashboard — verified counts will reflect **actual source evidence only**
4. Use admin review screen for conflicts and identity reviews
