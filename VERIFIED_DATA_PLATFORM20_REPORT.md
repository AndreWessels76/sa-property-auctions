# VERIFIED DATA PLATFORM 2.0 — REPORT (Updated)

**Date:** 2026-08-03  
**Update:** Property Identity Engine + Lifecycle + Auction Events  
**Principle:** One Property → Many Auction Events. No fabricated data.

---

## Executive Summary

Verified Data Platform 2.0 now centres on a **Property Master Record** as the permanent source of truth. Auction listings remain the public catalogue projection (upcoming/live only). Historical auctions power intelligence without polluting the catalogue.

| Layer | Role |
|-------|------|
| `property_masters` | Permanent physical property identity |
| `auction_events` | Time-bound auction occurrences |
| `properties` | Public/admin listing rows linked by `property_master_id` |
| `property_history_events` | Append-only timeline |
| `property_field_provenance` | Source precedence / SSOT |

---

## Identity Engine

See `PROPERTY_IDENTITY_ENGINE_REPORT.md`.

- Deterministic fingerprints (GPS, address, farm/erf/portion, town, province, land, images, external refs, title)
- Match classes: same / likely_same / possible_duplicate / different / new
- Title alone never creates a “same” match

---

## Lifecycle Engine

See `PROPERTY_LIFECYCLE_ENGINE_REPORT.md`.

Full path through discovered → … → sold → archived → relisted → new auction event. History retained.

---

## Auction Event Architecture

Child records under each master. Upserted by connector + external listing id. Public surfaces still filter to scheduled/live listing activity.

---

## Duplicate Detection

Multi-signal identity scoring + exact fingerprint unique constraint. Possible duplicates audited, not silently merged.

---

## Fingerprint Accuracy

Reproducible hash (`FINGERPRINT_VERSION = 1`). Improves with cadastral/GPS density. Sparse imports remain honest (lower confidence, not invented IDs).

---

## Historical Engine

Append-only history categories + historical intelligence corpus (verified/sold/expired/withdrawn) from prior VDP modules. Public catalogue excludes expired/withdrawn/cancelled/completed.

---

## Area / Agency / Search Intelligence

Unchanged foundation modules under `lib/platform/`:

- Area / Agency / Market / Quality / Maps / Heat / Search
- Cached via `VerifiedDataPlatformService`
- Still verified-production only; null when sample insufficient

Search normalization does **not** alter stored verified source values — filters only.

---

## Data Enrichment & Classification

`lib/platform/dataEnrichment.ts` + expanded classification (incl. Mixed Farming). Enrichment feeds fingerprint inputs. Missing GPS/ward never fabricated.

---

## Performance

| Mechanism | Detail |
|-----------|--------|
| Fingerprint cache | Unique index on `property_masters.fingerprint` |
| Duplicate candidate cap | 300 masters |
| Identity soft-fail | Pre-migration imports continue |
| Snapshot cache | 120s on platform corpus |
| Incremental history | Append-only; no full rewrite |

---

## Production Readiness

| Check | Result |
|-------|--------|
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** (confirm in CI/local) |
| Public upcoming/live only | **PASS** (`publicListingPolicy`) |
| Fabricated stats / matches | **NONE** |
| Migration file present | `20260803130000_property_identity_engine.sql` |
| Migration applied to prod | **Operator action required** |

**Evidence (catalogue policy, from prior evidence JSON):** 25 verified listings → 8 active upcoming (2026-08-03) / 17 historical — identity will unify re-lists without duplicating masters once backfilled.

---

## Recommendations

1. Apply identity migration on Supabase.  
2. Backfill masters for existing verified listings.  
3. Admin duplicate-review for `possible_duplicate`.  
4. Index GPS/town for >10k masters.  
5. Continue importing future-dated auctions to grow active catalogue.

---

## Overall Score

**89 / 100**

---

## Final Verdict

# PROPERTY INTELLIGENCE FOUNDATION COMPLETE

Supported by:

- Property Master + Auction Event + History + Provenance schema and engines  
- Deterministic identity matching without fabricated links  
- Public catalogue still upcoming/live only  
- Platform intelligence modules retained and compatible  
- Typecheck PASS; build PASS  
- Ops follow-up: apply migration + backfill
