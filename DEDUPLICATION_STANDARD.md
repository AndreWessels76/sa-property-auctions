# DEDUPLICATION STANDARD

## Signals

| Signal | Role |
|--------|------|
| External listing ID | Strong exact match |
| Address | Fuzzy / normalized score |
| Coordinates | Distance-based score |
| Title similarity | Secondary |
| Auction date | Same-day boost |
| Image hash | Exact media match |
| Agency | Soft agreement |

Module: `lib/data/deduplicationStandard.ts` (`assessDuplicateConfidence`).  
Legacy engine remains at `lib/imports/duplicate/*`.

## Thresholds

| Confidence | Action |
|------------|--------|
| ≥ 85 | Recommend merge (do not insert duplicate) |
| 70–84 | Operator review / AI assist (existing) |
| < 70 | Treat as distinct |

## Merge policy

- Prefer richer provenance (source URL, external ID, verified state).  
- Never create a second row when merge is recommended.  
- Admin dashboard lists duplicate candidates for manual confirmation.

## Image duplicates

`lib/imports/images/duplicateImageDetector.ts` + image `hash` on pipeline metadata (`lib/data/imagePipelineMeta.ts`).
