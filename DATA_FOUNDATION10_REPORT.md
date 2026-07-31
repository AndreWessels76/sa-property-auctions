# DATA FOUNDATION 1.0 — Report

**Date:** 2026-07-31  
**Product:** SA Property Auctions  

---

## Overall Result

# FOUNDATION READY

**Score: 72 / 100**

Evidence: field catalogue + quality framework + seed honesty (source tagged `SEED DATA ·`, UI badges/provenance), migrations authored, import/verification docs complete. Structured DB columns **not yet applied** on production Supabase (backfill fell back to source tagging). Not **PRODUCTION DATA READY** until migration applied and licensed feeds replace seeds.

---

## Schema Quality — 75

| Area | Status |
|---|---|
| Existing columns | 71 live columns audited |
| Foundation migration | `20260731220000_data_foundation_property_fields.sql` |
| Seed classify SQL | `20260731221000_data_foundation_seed_classify.sql` |
| TypeScript model/DTO/mapper | Extended with optional provenance fields |
| Field classification | `PROPERTY_DATA_STANDARD.md` + `lib/data/propertyFoundation.ts` |

**Top missing until migration applied:** `data_classification`, `source_name`, `source_url`, `imported_at`, `last_verified_at`, `auction_agency` (structured), `external_listing_id`, `reserve_price`, auction time/venue links.

---

## Source Integrity — 70

| Requirement | Status |
|---|---|
| Source name | Derived + `SEED DATA ·` prefix on all 15 rows |
| Source URL | Present when agency website was in source string |
| Imported timestamp | Falls back to `created_at` in mapper |
| Last verified | Explicitly **null** / “not verified” in UI |
| External ID | Missing on seeds (documented) |
| Untraceable display | Provenance card + seed badge |

---

## Address Quality — 68

Suburb/town/province/address present on seeds; `street_address` prepared; display modes documented (`full` / `suburb_only` / `withheld`). No fabricated street numbers.

---

## Image Quality — 72

33 gallery images on 15 properties; card/detail fallbacks; seed photos remain Unsplash (documented as presentation stock, not provider photos).

---

## Auction Metadata — 65

Agency shown via structured fields when present, else parsed source, else explicit unknown. Status formatting via listing status helpers. Time/venue/deposit/terms links schema-ready, mostly empty on seeds.

---

## Mapping Readiness — 70

Lat/lng present on current seeds; municipality/region columns in migration; radius/heatmap remain future (no scrape).

---

## Comparable Readiness — 68

Framework types in `lib/data/comparableFramework.ts`; runtime town/geo comps + placeholder UI from Launch 1.1. Not deeds-office comps.

---

## Analytics Readiness — 70

`lib/data/priceAnalyticsFramework.ts` + PriceSpreadCard only when both values exist — no fake math.

---

## Seed Data Audit

| Count | Classification |
|---|---|
| 15 / 15 | **Seed Data** (tagged) |
| 0 | Production Ready |
| 0 | Needs Verification (post-import) |

UI: amber **Seed data** badge on cards and detail; provenance card states not a verified live notice.

---

## Top Missing Fields (production)

1. Applied `data_classification` column on DB  
2. `last_verified_at`  
3. `external_listing_id`  
4. Structured `auction_agency` / contact  
5. Verified `source_url` to original notice  
6. Provider images + attribution  
7. Reserve / venue / brochure links  

---

## Top Risks

1. Users may still misunderstand seed catalogue if they ignore badges.  
2. Migration not applied → structured provenance only partially persisted.  
3. Agency names on seeds are illustrative associations, not live instructions.  
4. Stock photography can imply a photographed real listing.

---

## Recommendations

1. **Apply** `20260731220000` + `20260731221000` in Supabase SQL Editor.  
2. Re-run `node --env-file=.env.local scripts/data-foundation-backfill.mjs`.  
3. Onboard first licensed feed; promote only verified rows to `production`.  
4. Hide or filter `seed` from paid marketing campaigns.  
5. Add external listing IDs at import time for dedup.

---

## Validation

- `npm run typecheck` — PASS  
- `npm run build` — PASS  

---

## Docs delivered

- `PROPERTY_DATA_STANDARD.md`  
- `PROPERTY_SOURCE_STANDARD.md`  
- `PROPERTY_IMPORT_GUIDE.md`  
- `PROPERTY_VERIFICATION_GUIDE.md`  
- `DATA_QUALITY_GUIDE.md`  
- `DATA_FOUNDATION10_REPORT.md` (this file)

---

## Verdict

**FOUNDATION READY** — standards, scoring, honesty UI, and migrations exist.  
**Not** PRODUCTION DATA READY — catalogue remains seed; apply SQL + replace with verified sources.
