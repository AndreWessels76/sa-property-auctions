# DATA QUALITY STANDARD

## Dimensions (admin-only)

| Score | Meaning |
|-------|---------|
| Completeness | Required field coverage (`scorePropertyQuality`) |
| Verification | Verification state + `last_verified_at` |
| Image | Hero/gallery quality or presence |
| Address | Street/suburb/town/province/postal/coords |
| Auction | Agency, date, venue, docs |
| Source trust | Source name/URL/external ID/import |
| **Overall** | Weighted composite 0–100 |

Module: `lib/data/multiQualityScore.ts`.  
Persisted columns: `completeness_score`, `verification_score`, `image_score`, `address_score`, `auction_score`, `source_trust_score`, `data_quality_score`.

## Visibility

- **Admin:** Verification dashboard shows overall + issues.  
- **Public:** Overall quality score is **not** exposed (`PropertyMapper` sets `data_quality_score: null`). Image `qualityScore` on cards remains media quality only.

## Image quality

`calculateImageQuality` (resolution, size, aspect) + pipeline meta (primary, gallery, source, copyright, hash, broken URL, placeholder).

## Analytics & AI readiness

- Analytics (`lib/data/analyticsFoundation.ts`) only uses verified/sold/expired rows; returns `null` when sample insufficient.  
- AI readiness (`lib/data/aiReadiness.ts`) blocks seed/pending from geo/AI feature claims.
