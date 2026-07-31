# Property Import Guide

**Version:** DATA FOUNDATION 1.0  
**Status:** Framework only — no scraping in this sprint

## Pipeline (existing code)

1. Admin triggers import (`app/admin/imports`, `app/api/admin/imports`)  
2. Importer/connector loads rows (`lib/importers`, `lib/connectors`)  
3. Normalize address / province (`lib/property/address`, import normalizers)  
4. Duplicate detection (`lib/imports/duplicate`)  
5. Image pipeline (`lib/imports/images`, `lib/images`)  
6. Persist via import services → `properties` / `property_images`  
7. Set provenance: `source_name`, `source_url`, `external_listing_id`, `imported_at`, `data_classification`

## Deduplication strategy

1. Exact `external_listing_id` + `source_name`  
2. Fuzzy address / erf / title / coords scoring  
3. Optional AI review for borderline matches  
4. Merge history retained (`mergeHistory`)

## Source priority (recommended)

1. Contracted auctioneer / bank feed  
2. Official sheriff list (licensed)  
3. Partner CSV  
4. Manual admin entry  
5. Seed (never auto-promote to production)

## Conflict resolution

| Conflict | Rule |
|---|---|
| Price differs | Prefer newer `last_verified_at` / import batch |
| Status differs | Prefer terminal states (sold/withdrawn) over upcoming when dated |
| Agency differs | Prefer structured feed over seed parse |
| Coords differ | Prefer higher `geocode_confidence` |

## Image strategy

- Prefer provider URLs → download/optimize → `property_images`  
- One `is_hero` primary  
- Attribute source on image row when available  
- Fallback type image only if gallery empty (UI explains)

## Update strategy

- Re-import upserts by external ID or title+town interim key  
- Refresh `updated_at`, optionally `last_verified_at` when confirmed  
- Soft-retire: `listing_status` withdrawn/cancelled/completed

## Verification workflow

See `PROPERTY_VERIFICATION_GUIDE.md`.

## Related

- `DATA_PIPELINE_AUDIT.md`  
- `scripts/data-foundation-backfill.mjs`
