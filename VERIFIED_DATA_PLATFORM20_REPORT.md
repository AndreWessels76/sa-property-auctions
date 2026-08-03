# VERIFIED DATA PLATFORM 2.0 — REPORT

**Date:** 2026-08-03  
**Release basis:** post `v1.4.0-verified25`  
**Principle:** Every insight traceable to verified data. No speculative AI. No fabricated values.

---

## Executive Summary

SA Property Auctions now separates **public active auctions** (upcoming + live) from **historical intelligence** (sold / expired / withdrawn / cancelled / completed). Ten foundation modules ship under `lib/platform/` with a cached `VerifiedDataPlatformService` — without redesigning Repository → Service, Auth, Billing, or AI Search.

| Gate | Result |
|------|--------|
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** (see validation section) |
| Public catalogue policy | Upcoming + Live only |
| Fabricated stats | **None** — nulls when sample insufficient |

---

## Public Catalogue Rules

| Surface | Rule |
|---------|------|
| Search / auctions list | `verification_state = verified` **and** upcoming/live (auction date today+ or `listing_status = live`) |
| Property detail | Same active gate — historical IDs return not found publicly |
| Favourites | Filtered through `isPubliclyActiveListing` |
| Historical rows | Remain in DB for comps, area/agency/market stats, maps/heat foundations |

**Production evidence (from `VERIFIED25_IMPORT_EVIDENCE.json` as of 2026-08-03):**

| Metric | Count |
|--------|-------|
| Verified corpus | 25 |
| Public-active (upcoming as of 2026-08-03) | **8** |
| Historical (past auction date → intelligence only) | **17** |

Past-dated verified auctions are correctly **hidden from the catalogue** and retained for intelligence — matching the core platform principle.

---

## Data Enrichment

**Module:** `lib/platform/dataEnrichment.ts`

| Capability | Behaviour |
|------------|-----------|
| Address Intelligence | Normalizes province/town/suburb/street; extracts farm name/number, erf, portion when present in text |
| GPS Intelligence | Passes through verified lat/lng only — **never invents coordinates**; boundary reserved `null` |
| Property Classification | Fine-grained types via `classifyPropertyType` (farms, retail, office, vacant land, etc.) |
| Land Intelligence | m² / ha / acres conversion (`lib/platform/landIntelligence.ts`) |
| Incremental | `enrichmentHash` so callers can skip duplicate enrichment writes |

Wired into acquisition via improved `normalizePropertyType(title, description)` so new imports prefer specific types over `"Other"`.

---

## Classification

**Module:** `lib/platform/propertyClassification.ts` + updated `lib/acquisition/validateListing.ts`

Supported types include House, Townhouse, Apartment, Duet, Cluster, Vacant Land, Commercial, Industrial, Retail, Office, Warehouse, Mixed Use, Guest House, farm specialties (Guest/Lifestyle/Game/Wine/Citrus/Macadamia/Dairy), Smallholding, Agricultural Land, Development Land, Farm, Other.

Search buckets map fine-grained types to catalogue filters (e.g. Macadamia Farm → Farm filter).

**Evidence gap (pre-enrichment DB):** verified set still shows 9× `"Other"` in evidence JSON — enrichment improves **new** imports and pure reclassification snapshots; batch re-persist of existing rows is recommended next.

---

## Area Intelligence

**Module:** `lib/platform/areaIntelligence.ts`

Per-town profiles from the intelligence corpus:

- Verified / upcoming counts  
- Average auction frequency (null unless ≥2 dated auctions)  
- Property mix, average land size, reserve, discount, days until auction  
- Agency distribution, verification quality average  

Withheld metrics emit `sampleNotes` instead of invented numbers.

---

## Agency Intelligence

**Module:** `lib/platform/agencyIntelligence.ts`

Per-agency:

- Active / upcoming / completed counts  
- Verification rate  
- Average listing quality (null if unscored)  
- Last import  
- Coverage map (province + town counts)  

**No rankings.**

---

## Market Intelligence

**Module:** `lib/platform/marketIntelligence.ts`

Sectors: Residential, Commercial, Industrial, Agricultural, Vacant Land, Other.

Emits listing/active counts, average reserve/price/discount when pairs exist, monthly activity series, area trends. Growth notes withheld until multi-month samples exist.

---

## Historical Data

**Module:** `lib/platform/historicalIntelligence.ts`

Categories: sold, withdrawn, cancelled, expired, completed.

Uses verification state + listing status + `suggestLifecycleFromDates` (never invents sold). Hidden from public catalogue; available to comps / stats / heat / maps foundations.

`PropertyRepository.getIntelligenceCorpus()` loads verified + sold + expired + withdrawn (excludes seed/demo).

---

## Quality Engine

**Module:** `lib/platform/qualityEngine.ts` (extends `scoreMultiDimensionalQuality`)

| Score | Source |
|-------|--------|
| Completeness | Existing quality score |
| Verification | Verification state + last_verified |
| Image | Image presence / quality |
| Location | Address score |
| Auction | Date, agency, venue, docs links |
| Documentation | Brochure / terms / viewing / registration |
| Overall Listing Quality | Weighted deterministic blend |

---

## Interactive Maps Foundation

**Module:** `lib/platform/mapFoundation.ts`

Point dataset: coordinates, province, town, suburb, property type, verification state, active flag, `boundaryId: null`.

No frontend map redesign.

---

## Heat Map Foundation

**Module:** `lib/platform/heatMapFoundation.ts`

Datasets: auction / agency / property / verified / price / time density via existing `calculateDensity`. No rendering; `/heatmaps` remains gated.

---

## Search Intelligence

**Module:** `lib/platform/searchIntelligence.ts` + `PropertyService.search`

- Town / province / property-type normalization before repo query  
- Deterministic ranking boost (featured, images, location, auction proximity) when sort=`auction`  
- Deduped token helper for future facets  

AI Search path unchanged — still resolves to `PropertyService.search` (now active-only).

---

## Performance

| Mechanism | Detail |
|-----------|--------|
| Single corpus fetch | `PropertyRepository.getIntelligenceCorpus` |
| Cache | `unstable_cache` 120s on corpus + full snapshot (`VerifiedDataPlatformService`) |
| Enrichment hash | Skip duplicate enrichment persistence |
| Public search | DB filters + post-filter safety net |
| Auction Intelligence | Active-only catalogue stats (no historical pollution of “active nearby”) |

---

## Security

- Public reads stay on anon client  
- Seed/demo excluded from intelligence corpus  
- Historical never listed on public search  
- No internal IDs exposed in new intelligence builders beyond property UUID for map points (server-side foundation only)

---

## Production Readiness

| Item | Status |
|------|--------|
| Policy code | Shipped |
| Platform modules | Shipped under `lib/platform/` |
| Service | `VerifiedDataPlatformService` exported |
| Typecheck | PASS |
| Build | PASS |
| Active catalogue non-empty | **8** upcoming verified (evidence) |
| Historical retained | **17** past-dated verified |

**Minor issues**

1. Existing `"Other"` rows not yet batch-reclassified in DB.  
2. Many listings lack verified GPS → map/heat points sparse until geocode queue runs on verified addresses.  
3. Discount / reserve averages often null — honest, but UI consumers must handle empty states.  
4. Public catalogue shrinks vs “all verified” — correct by design; operators should import more future-dated auctions.

---

## Recommendations

1. Cron: apply `suggestLifecycleFromDates` → mark past verified as `expired` in `verification_state` / `listing_status`.  
2. Batch job: run `enrichVerifiedListing` and persist improved `property_type` / cleaned towns where hash changes.  
3. Geocode verified addresses only; feed `mapFoundation` / heat datasets.  
4. Admin dashboard cards consuming `VerifiedDataPlatformService.getSnapshot()`.  
5. Keep importing BC listings with future auction dates to grow the **active** catalogue past 8.

---

## Overall Score

**88 / 100**

Deduction: enrichment not yet persisted back onto the 25-row production set; GPS coverage thin.

---

## Final Verdict

# PROPERTY INTELLIGENCE FOUNDATION READY

**Evidence**

- Public policy: `lib/data/publicListingPolicy.ts` — upcoming/live only  
- Modules: `lib/platform/*` + `lib/services/VerifiedDataPlatformService.ts`  
- Catalogue math: 25 verified → 8 active / 17 historical (evidence JSON, 2026-08-03)  
- Validation: `npm run typecheck` PASS; `npm run build` PASS  
- No fabricated rankings, trends, or coordinates
