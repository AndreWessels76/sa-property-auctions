# Data Quality Guide

**Version:** DATA FOUNDATION 1.0

## Quality score

Implemented in `lib/data/qualityScore.ts` — completeness score **0–100**, not a market valuation.

Points cover title, location, type, auction date, status, source/agency, source URL, external ID, import/verify timestamps, coordinates, prices, images.

## Common defects

| Defect | Detection | Action |
|---|---|---|
| Duplicate properties | Dedup pipeline | Merge / master_property_id |
| Missing addresses | suburb/town empty | Block production class |
| Missing agencies | no agency/source_name | UI unknown message |
| Missing auction dates | null date | Block production class |
| Missing values | null prices | Allow; hide fake spreads |
| Broken images | gallery fetch fail | Fallback + note |
| Broken source links | URL check (ops) | Clear or fix `source_url` |
| Old / inactive | past date + upcoming | Update status |
| Seed listings | classification/source tag | Keep badge until replaced |

## Ops cadence

1. Weekly: list `data_classification = seed` count  
2. Weekly: listings with `last_verified_at` null and status upcoming  
3. After each import: sample 10 rows for agency + URL + images  

## Seed audit (Launch catalogue)

All **15** current public listings are **Seed Data** until licensed feeds replace them. See `DATA_FOUNDATION10_REPORT.md`.
