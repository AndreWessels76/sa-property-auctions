# Property History Backfill 1.0 — Sprint Report

## Mission

Build a deterministic Property History Backfill & Auction Event Reconstruction Engine that converts verified historical listing records into the permanent **Property Master → Auction Event → Historical Intelligence** architecture without fabricating identities, outcomes, or prices.

## Existing Architecture

Reused without parallel systems:

- `PropertyIdentityService.resolveAndAttach()` — master creation, listing linkage, provenance
- `PropertyIdentityRepository` — `property_masters`, `auction_events`, history, provenance
- `assessIdentityMatch()` / fingerprint engine — multi-signal matching, title-only suppression
- `buildHistoricalDataset()` — Historical Intelligence 2B event-first aggregation
- `PricingObservationRepository` — pricing linkage without semantic changes

## Identity Matching

Backfill-specific decisions in `lib/backfill/identityDecision.ts`:

| Decision | Auto-attach |
|----------|-------------|
| `MATCH_CONFIRMED` | Yes |
| `MATCH_HIGH_CONFIDENCE` | Yes (strong non-title signals required) |
| `NEW_MASTER` | Yes (≥2 fingerprint signals) |
| `MATCH_REVIEW` | No — admin queue |
| `IDENTITY_REVIEW_REQUIRED` | No — bad location + weak signals |
| `INSUFFICIENT_EVIDENCE` | No |
| `MATCH_REJECTED` | No |

Title-only matches are blocked. Possible duplicates never silently merge.

## Property Master Backfill

`PropertyHistoryBackfillService` paginates candidates via `PropertyRepository.listBackfillCandidates()` — verified + historical states, seed/demo excluded, unlinked listings prioritised.

Dry-run preview counts proposed masters without writing identity rows.

## Auction Event Reconstruction

`lib/backfill/eventReconstruction.ts` applies conservative rules:

- **sold** only from explicit sold verification/listing status
- **expired** from expired verification or past auction date — never sold
- **closed** from completed — not sold
- **Online auctions** labelled “Online Auction”, not “Venue: Not listed”
- Event fingerprint deduplication via `computeEventFingerprint()`

## Event Classification

Uses existing `normalizeAuctionEventStatus` mapping with backfill-specific classifier that does not infer sold from disappearance or expiry.

## Pricing Linkage

`PricingObservationRepository.linkToMasterAndEvent()` sets `property_master_id` and `auction_event_id` on existing observations only — no field reinterpretation, no price fabrication.

## Provenance

Auto-attach path delegates to `PropertyIdentityService` which writes `property_history_events` and `property_field_provenance` with source URL, confidence, and matching signals.

## Duplicate Protection

- Unique index: `(connector_id, external_listing_id)` on `auction_events`
- Event fingerprint assessment before insert
- Second run identifies existing events → `DUPLICATE_EVENT` / skip

## Admin Review

Migration tables:

- `property_history_backfill_runs`
- `property_history_backfill_items`
- `property_history_backfill_reviews`

Admin API: `POST/GET /api/admin/intelligence/history-backfill`

Operations panel: `PropertyHistoryBackfillPanel` — preview, execute, audit counts, review queue.

Actions: approve match, reject match, create new master, approve/reject event.

## Historical Intelligence Integration

`HistoricalIntelligenceService.adminAudit()` now exposes:

```text
historicalCoverage.eventBacked
historicalCoverage.listingFallback
historicalCoverage.unresolved
```

Property detail panel labels listing fallback vs event-backed timeline rows.

## Public Catalogue Safety

`publicCatalogueSafetyCheck()` confirms expired/sold/withdrawn listings are not publicly active. Live evidence: **5 upcoming/live**, **0 historical leaks**.

## Data Quality

Location quality flags (`LOCATION_DATA_REVIEW`) for tokens like `unknown`, `of`, `Pre-fab wall`. Labelled **Data Quality**, not investment quality.

## Live Evidence

File: `PROPERTY_HISTORY_BACKFILL_LIVE.json` (read-only preview against production)

| Metric | Value |
|--------|-------|
| Records scanned | 38 |
| Current property_masters | 0 |
| Current auction_events | 0 |
| Preview: new masters | 38 |
| Preview: new events | 38 |
| Location review flags | 3 |
| Source | Bidders Choice (38) |
| Event-backed HI rows | 0 |
| Listing fallback HI rows | 38 |
| Public catalogue | 5 (clean) |
| **Production backfill executed** | **No** |

Production write backfill requires:

1. Apply migration `20260814100000_property_history_backfill.sql`
2. Apply identity engine migration if not already applied
3. Run admin dry-run preview → review queue → execute backfill (`BACKFILL_EXECUTE=1` or Operations panel)

## Tests

All executed and passing:

- `npm run test:history-backfill` — PASS
- `npm run typecheck` — PASS
- `npm run build` — PASS
- `npm run test:historical-intelligence` — PASS
- `npm run test:pricing-acquisition` — PASS
- `npm run test:pricing` — PASS
- `npm run test:dd` — PASS
- `npm run test:refetch` — PASS
- `npm run test:investor-intelligence` — PASS
- `npm run test:ops-quick-actions` — PASS

## Limitations

1. **Migration not applied in production** — audit/review tables unavailable until SQL is run in Supabase.
2. **Production backfill not executed** — only read-only in-memory preview; DB still has 0 masters/events.
3. **No pricing observations to link** — pricing table empty in production.
4. **Candidate scan capped** — identity matching uses 500 master candidates; large catalogues may need ordered batch runs.
5. **Town/suburb normalisation** — 3 records flagged for location review; weak geography must not drive false merges.

## Next Phase

1. Apply Supabase migrations (identity + backfill audit).
2. Execute admin preview → review uncertain matches → run backfill batch.
3. Re-run Historical Intelligence live script — expect event-backed > 0, listing fallback decreasing.
4. Populate pricing observations via refetch/DD pipeline and re-link to events.
5. Extend partner connectors (High Street, Claremart, etc.) using same backfill architecture.

---

**Verdict: PROPERTY HISTORY BACKFILL READY WITH LIMITATIONS**

Engine, tests, admin UI, and API are complete. Production database remains unpopulated until migration is applied and backfill is explicitly executed.
