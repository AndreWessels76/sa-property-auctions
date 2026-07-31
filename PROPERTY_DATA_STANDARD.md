# Property Data Standard

**Version:** DATA FOUNDATION 1.0  
**Date:** 2026-07-31

## Purpose

Define the production property record for SA Property Auctions. Every public listing must be traceable and honestly classified.

## Field catalogue

| Field | Class | Notes |
|---|---|---|
| `id` | Required | UUID |
| `title` | Required | Public title |
| `description` | Optional | Never invent |
| `address` / `street_address` | Optional | May be withheld legally |
| `suburb` | Required (public min) | |
| `town` | Required | |
| `province` | Required | |
| `postal_code` | Optional | |
| `country` | Optional | Default `South Africa` |
| `latitude` / `longitude` | Optional | Null until verified |
| `municipality` / `region` | Optional | Geo foundation |
| `property_type` | Required | |
| `bedrooms` / `bathrooms` / `garages` | Optional | N/A for some types |
| `erf_size` / `floor_size` | Optional | Land / building |
| `estimated_value` | Optional | Never fabricate |
| `auction_price` | Optional | Guide price |
| `reserve_price` | Optional | Often confidential |
| `auction_date` | Required | |
| `auction_time` / `auction_venue` | Optional | |
| `auction_agency` | Required* | Or explicit unknown |
| `agency_contact` / `agency_website` | Optional | |
| `source_name` | Required | Provenance |
| `source_url` | Optional | Prefer when public |
| `external_listing_id` | Optional | Dedup |
| `imported_at` | Required | Default `created_at` |
| `last_verified_at` | Optional | Null = unverified |
| `listing_status` | Required | upcoming/live/sold/withdrawn/cancelled/completed |
| `status` | Derived | Legacy display status |
| `data_classification` | Required | `production` \| `needs_verification` \| `seed` \| `demo` |
| `data_quality_score` | Computed | 0–100 completeness |
| `created_at` / `updated_at` | Required | |
| Images / gallery | Optional | Via `property_images` |
| Comparables | Derived | Framework only |
| Price spread | Computed | Only if both values exist |
| AI summary | Optional | Out of scope here |

\*If agency unknown, UI must say so — never invent an agency.

## Classification rules

| Value | Meaning | User presentation |
|---|---|---|
| `production` | Verified against licensed/original source | Normal listing |
| `needs_verification` | Imported but not verified | Caution |
| `seed` | Illustrative catalogue | **Seed data** badge |
| `demo` | Internal demo | Hidden or clearly marked |

## Migrations

- `supabase/migrations/20260731220000_data_foundation_property_fields.sql`
- `supabase/migrations/20260731221000_data_foundation_seed_classify.sql`

Apply in Supabase SQL Editor before treating structured columns as authoritative.

## Runtime

- Types: `lib/types/property.ts`, `lib/dto/PropertyDTO.ts`
- Catalogue helper: `lib/data/propertyFoundation.ts`
- Quality: `lib/data/qualityScore.ts`
- Mapper: `lib/mappers/PropertyMapper.ts`
