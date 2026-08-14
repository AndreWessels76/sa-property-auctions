# AUCTION PRICE INTELLIGENCE 4.0 — SPRINT 2A REPORT

**Date:** 2026-08-13  
**Module:** Auction Price Intelligence 2A  
**Verdict:** **AUCTION PRICE INTELLIGENCE 2A READY WITH LIMITATIONS**

---

## Objective

Deliver a deterministic **Auction Price Intelligence** panel on `/properties/[id]` that explains supplied auction pricing without investment advice and without fabricating missing values.

---

## Architecture

| Layer | Path |
|-------|------|
| Calculations | `lib/intelligence/pricing/priceCalculations.ts` |
| Semantics / reference selection | `lib/intelligence/pricing/priceBasis.ts` |
| Provenance | `lib/intelligence/pricing/priceProvenance.ts` |
| Panel builder | `lib/intelligence/pricing/priceIntelligence.ts` |
| Service | `lib/services/AuctionPriceIntelligenceService.ts` |
| UI | `components/property/detail/AuctionPriceIntelligencePanel.tsx` |
| Aside wrapper | `components/property/detail/PropertyPricingIntelligence.tsx` |
| API | `GET /api/intelligence/pricing/[id]` |
| Tests | `npm run test:pricing` |
| Live script (read-only) | `scripts/auction-price-intelligence-live.ts` |

Property Masters / Auction Events are reused via `AuctionEventRepository.listByMaster`. No parallel pricing database. No second property store. Detail page sections remain intact; the sticky pricing aside now renders 2A intelligence.

Methodology version: **2A.1.0**

---

## Price Semantics

| Field | Source | Rule |
|-------|--------|------|
| Auction price | `properties.auction_price` | Shown as **Auction price** — never labelled Guide |
| Reserve | `properties.reserve_price` | Only when > 0 |
| Guide | Explicit separate guide only | Never inferred from `auction_price` |
| Estimated value | `properties.estimated_value` | Never treated as sale price |
| Sale / winning bid | `auction_events.winning_bid` | Historical only |

Missing values: **Not supplied**.

---

## Calculations

- **Difference vs reference:** `auction_price − reference` and percentage of reference. Narrative: “X% below/above reference price”. Never “discount”.
- **Reference priority:** Estimated Value → explicit Guide → Reserve (premium) → historical sale.
- **Price / building m²:** `auction_price / floor_size` only. Land/erf size never used as building area.
- **Price / hectare (premium, farm types):** `auction_price / agricultural_details.totalHectares` only. Approximate (±/~) source text marks the result approximate.
- **Historical change (premium):** first→last timeline prices on the same Property Master — labelled **Historical auction-price change**, not appreciation/return/forecast.

Invalid inputs (null, 0, negative, NaN) → **Not available**.

---

## Provenance

Every supplied field and calculation carries:

- property ID
- property master ID (when linked)
- auction event ID (historical rows)
- source / source URL
- verification state
- calculation type + timestamp + inputs (calculated fields)
- methodology version

---

## Verification Safety

- No silent overwrite of verified prices.
- Optional `conflictDetected` surfaces: **Price conflict detected**.
- Conflicts remain for admin/verification workflow — never auto-resolved.

---

## Premium Access

| Capability | Free | Premium / Admin |
|------------|------|-----------------|
| Current auction / reserve / estimate fields | Yes | Yes |
| Difference vs estimated value | Yes (when both exist) | Yes |
| Price / building m² | Yes (when valid) | Yes |
| Price / hectare | No | Yes |
| Historical timeline + change | No | Yes |
| Admin | Independent of Stripe (`SubscriptionService.premium()`) | |

Server-side gating in `AuctionPriceIntelligenceService` and the API. UI hiding is not the security boundary.

---

## UI

Sticky aside on property detail:

1. Current Auction fields with status chips  
2. Difference vs reference (labelled)  
3. Unit analysis (m² / Ha)  
4. Historical table (premium)  
5. Data availability checklist  
6. Collapsible methodology  

Removed misleading copy from the previous pricing card (“Potential discount”, “Auction guide price” alias for `auction_price`).

---

## Tests

| Suite | Result |
|-------|--------|
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** (`/api/intelligence/pricing/[id]` present) |
| `npm run test:refetch` | **PASS** |
| `npm run test:dd` | **PASS** |
| `npm run test:ops-quick-actions` | **PASS** |
| `npm run test:investor-intelligence` | **PASS** |
| `npm run test:pricing` | **PASS** |

Pricing selftests cover difference, m², hectare, historical change, invalid data, semantics (no field substitution), approximate hectares, free/premium gates, conflict note, public catalogue expired hide, and “no discount” UI language.

---

## Live Data Validation

### Offline / known identities (executed)

Using known production IDs from prior enrichment evidence:

| Listing | Public catalogue | Result |
|---------|------------------|--------|
| Rosettenville guest lodge `8125134b-…` (upcoming verified) | **visible** | Prices **Not supplied** in offline fixture — panel honest |
| Haenertsburg guest farm `3e7ea1ff-…` (expired) | **hidden** | Historical-only; not treated as current catalogue |

Haenertsburg **±4.164 Ha** behaviour is covered by unit tests (approximate flag + `/Ha` label) using the known agricultural extent from DD extraction evidence — not a fabricated market value.

### Full live DB pull

Script ready: `scripts/auction-price-intelligence-live.ts`  
(read-only Supabase queries + local calculation; no mutations)

This session could not complete the autonomous production DB pull (approval gate). Run manually:

```bash
npx --yes tsx --env-file=.env.local scripts/auction-price-intelligence-live.ts
```

---

## Limitations

- Many verified listings still have **Not supplied** auction/estimate/building fields — the panel stays empty rather than inventing values.
- Guide price only appears when a **distinct** guide is available; listing `auction_price` is never re-labelled as guide.
- Historical timeline requires a linked `property_master_id` and stored `auction_events` with prices.
- Full live production price sampling was not completed in this agent session (script provided).
- Does **not** implement: full Historical Intelligence 2B, Area Intelligence, Market Forecasting, Comparable Engine, Investor Report 4.0, investment recommendations.

---

## Future Work

- Sprint 2B Historical Intelligence (market-level stats with sample sizes)
- Persist expensive pricing snapshots only if query cost requires it
- Surface provenance drawer per field in UI
- Wire DD extraction land approximate flag into agricultural_details schema explicitly

---

## Final Verdict

**AUCTION PRICE INTELLIGENCE 2A READY WITH LIMITATIONS**

Working deterministic engine, correct semantics, property-detail UI, API, premium gating, and full automated regression. Limitation: live production price-field sampling script awaits a manual run; offline known-identity checks confirm catalogue safety and honest Not supplied behaviour.
