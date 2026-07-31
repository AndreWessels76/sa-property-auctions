# Launch 1 — Data Sources

**Date:** 2026-07-31  
**Script:** `scripts/launch1-seed-properties.mjs`

## Summary

Production catalogue seeded with **15** curated South African auction-style listings across all nine provinces, plus **gallery images** (Unsplash stock photography for launch presentation).

These are **not** live scraped sheriff/bank notices. They are a trusted starter catalogue for public beta UX, QA, and SEO until licensed partner feeds replace them.

## Source attribution (per listing)

Each property `source` field uses one of:

| Label pattern | Meaning |
|---|---|
| `Launch seed · Sheriff-style example (…) ` | Illustrative sheriff-sale style record |
| `Launch seed · Bank-repo style example (…) ` | Illustrative bank repossession style record |
| `Launch seed · Public auction example (…) ` | Illustrative public auction style record |
| `Launch seed · Auctioneer notice example (…) ` | Illustrative auctioneer notice style record |

Province coverage: Gauteng, Western Cape, KwaZulu-Natal, Eastern Cape, Free State, Mpumalanga, Limpopo, North West, Northern Cape.

## Images

- Primary + gallery rows in `property_images` (`image_url`, `is_hero`, `display_order`)
- Asset host: `images.unsplash.com` (allowed in `next.config.ts`)
- Aspect ratio: cards use `aspect-[16/11]`; Unsplash URLs request `w=1200`

## Duplicate handling

Upsert key: `title` + `town` (update-in-place if exists). Gallery rows replaced per property on each seed run.

## Replacement path

Follow `DATA_PIPELINE_AUDIT.md`: contract → CSV sample → admin import → schedule. Remove or retag seed rows once real feeds land.
