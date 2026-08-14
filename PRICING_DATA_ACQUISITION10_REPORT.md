# Pricing Data Acquisition & Normalisation 1.0

## Mission

Build a production-grade pricing data acquisition and normalisation layer that discovers, extracts, normalises, validates, conflict-checks, and stores property pricing (and size) observations from licensed auction sources — without fabrication — so Auction Price Intelligence 2A and future intelligence modules can consume reliable fields.

## Architecture

Reuses the existing pipeline:

```text
Licensed Partner → Connector → Source URL → Live Source Re-fetch → Snapshot
  → Due Diligence Extraction (+ Pricing Extraction)
  → Normalisation → Validation → Conflict Detection
  → pricing_observations → Auction Price Intelligence 2A
```

No parallel acquisition stack. Pricing hooks into:

- `runDueDiligenceExtraction` (field evidence)
- `persistRefetchExtraction` on `CONTENT_CHANGED` (observations)
- `DueDiligenceExtractionService` (manual/admin extract)
- Admin Operations Centre + `/api/admin/acquisition/pricing`

Core modules: `lib/acquisition/pricing/` (`pricingParser`, `pricingExtractor`, `pricingNormalizer`, `pricingValidator`, `pricingEvidence`, `pricingConflict`, `pricingService`, `pricingCoverage`).

Parser version: **`pricing-parser-1.0.0`**

## Price Semantics

Fields remain separate:

| Field | Meaning |
| --- | --- |
| `auction_price` | Explicit auction price only |
| `reserve_price` | Explicit reserve only |
| `guide_price` | Explicit guide only |
| `estimated_value` | Explicit estimate/valuation only |
| `sale_price` | Explicit completed sale / hammer only |
| `starting_bid` | Separate; **needs verification** — not auto-mapped to reserve |
| `from_price` | Separate; **needs verification** |

`reference_price` is UI-only (Intelligence 2A) and is not stored as a source observation.

Fixed identity bleed: `PropertyIdentityService` no longer maps `listing.auction_price` → `guide_price`.

## Extraction

Label-driven deterministic regex over structured listing fields + licensed snapshot / page text.

- Structured `auction_price` / `reserve_price` / `estimated_value` preserved as themselves (never cross-mapped).
- Connector-agnostic labels with room for source-specific rules later.
- Empty pricing → status **`not_supplied`** (not a technical failure).

## Normalisation

- ZAR formats: spaces, commas, SA decimal commas, millions shorthand.
- Unsupported USD/EUR/GBP/AUD → **unsupported currency** (no FX guess).
- Approximate (`±`) preserved via `is_approximate`.
- Ranges stored as `is_range` + `min_value` / `max_value`.
- Floor size → `floor_size_m2` only when building/floor language is clear.
- Land → `land_size_m2` / `total_hectares`; acres → hectares labelled **Calculated**.

## Validation

- Zero prices → **anomaly** (not treated as valid auction price).
- Negative / invalid ranges rejected.
- Starting bid / from-price forced to needs verification.

## Provenance

Each observation stores source name/URL, snapshot id (when present), content hash, raw + evidence snippet, parser version, extraction method, timestamps, and status.

## Conflict Handling

Verified / source_confirmed observations are never silently overwritten. Divergent new values create `pricing_conflicts` rows for admin: Approve / Reject / Keep Existing / Mark Conflict / Request Re-fetch.

## Property Master / Auction Event Linkage

Observations accept `property_master_id` and `auction_event_id` when present on the listing/event graph. Live samples currently often have `null` masters/events — linkage works when identity linkage exists; it does not invent masters.

## Coverage

`buildPricingCoverageReport()` exposes numerator/denominator metrics (never bare “90%”) plus per-source breakdown. Surfaces in Operations Centre via `PricingAcquisitionPanel`.

## Source Health

Pricing outcomes classify as: extracted / not_supplied / needs_verification / anomaly / unsupported_currency / conflict. “No price supplied” is not a fetch failure.

## Tests

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run test:pricing-acquisition` | PASS |
| `npm run test:pricing` | PASS |
| `npm run test:dd` | PASS |
| `npm run test:refetch` | PASS |
| `npm run test:ops-quick-actions` | PASS |
| `npm run test:investor-intelligence` | PASS |

## Live Evidence

File: `PRICING_DATA_ACQUISITION_LIVE.json`

Authorised Bidders Choice samples:

1. **Tzaneen holding (upcoming, public)** — Pricing **not supplied by source**. Extracted approximate building `425 m²` and hectares `±32.8202` from licensed snapshot text.
2. **Springbokvlakte cattle farm (expired, not public)** — Pricing not supplied. Extracted `±749` ha from listing title/text. Remains out of public catalogue.
3. **Rosettenville lodge (upcoming, public)** — Pricing not supplied; no fabricated values.

No upcoming verified listing with usable `auction_price > 0` was available in the live sample set.

## Limitations

1. **Licensed sources often omit explicit guide/reserve/auction labels** — engine correctly returns not_supplied rather than inventing values.
2. **`pricing_observations` migration** (`20260813180000_pricing_data_acquisition.sql`) must be applied to production before persistence/admin conflict rows are durable.
3. **Property Master / Auction Event** linkage depends on prior identity backfill; many live rows still have null master/event ids.
4. **Live run did not persist observations** (read-only evidence script); persistence is wired on CONTENT_CHANGED refetch / admin extract once the migration is live.
5. **Connector-specific label maps** are starter-level; agency terminology may need expansion as more partners go live.
6. Historical Intelligence 2B, area forecasting, and investment advice remain out of scope.

## Future Work

- Apply migration + backfill pricing observations from existing snapshots.
- Expand connector-specific mappings (High Street, Claremart, In2Assets, etc.).
- Safe write-back of verified observations into listing columns / auction events (admin-gated).
- Coverage dashboards by province / property type.
- Historical Intelligence 2B consuming event-scoped sale prices.

## Changed surface (summary)

- `lib/acquisition/pricing/*` (new engine)
- `supabase/migrations/20260813180000_pricing_data_acquisition.sql`
- `lib/repositories/PricingObservationRepository.ts`
- DD extraction + refetch linkage + identity guide-price fix
- `AuctionPriceIntelligenceService` consumes observations
- Admin API + Operations Centre panel
- Tests, live evidence JSON, this report

## Final Verdict

**PRICING DATA ACQUISITION 1.0 READY WITH LIMITATIONS**
