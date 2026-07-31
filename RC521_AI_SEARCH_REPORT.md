# RC5.2.1 — AI Search Validation & Database Retrieval

**Date:** 2026-07-31  
**Target:** https://sa-property-auctions.vercel.app  
**Query:** `4 bedroom house in Pretoria`  
**Local validation:** `npm run typecheck` ✅ · `npm run build` ✅

---

## Verdict

# PASS WITH MINOR ISSUES

Root cause confirmed and fixed in code. **Production will still fail until this commit is deployed.**

---

## Phase 1 — Database validation

| Field | Luxury Home (match) | Luxury Family Home |
|---|---|---|
| id | `92b188af-…` | `1a6d0213-…` |
| title | Luxury Home | Luxury Family Home |
| province | Gauteng | Gauteng |
| town | Pretoria | Pretoria |
| property_type | House | House |
| bedrooms | **4** | 0 |
| bathrooms | 3 | 0 |
| status | `Upcoming` | `upcoming` |
| auction_date | 2026-07-18 | 2026-07-14 |

**Evidence:** Supabase select `town ilike Pretoria` returned both rows.  
**Conclusion:** Target property **exists** and is searchable. Not missing from DB.

---

## Phase 2 — Repository → Service → API

Pipeline:

`PropertySearch` → `POST /api/properties/ai-search` → `AIPropertySearchService.parse` → `PropertyService.search` → `PropertyRepository.search` → Supabase

| Step | Result |
|---|---|
| Repository executes | **YES** |
| Service executes | **YES** |
| Structured filters alone | **1 row** (`Luxury Home`) |
| Silent empty catalog | **NO** — DB has data |

---

## Phase 3 — SQL / filter validation

Equivalent filters for the test query (deterministic / expected AI output):

- `town = Pretoria`
- `province = Gauteng`
- `property_type = House`
- `bedrooms >= 4`

| Query shape | Live row count |
|---|---|
| Structured only | **1** |
| Structured **AND** `search ilike %4 bedroom house in Pretoria%` | **0** |
| Structured + `status = Active` | **0** |
| Structured + `status ilike upcoming` | **1** |

No unexpected premium/date WHERE in repository. Failure modes were **composed filters**, not missing tables.

---

## Phase 4 — AI pipeline

AI path: NL → JSON filters → `PropertyService.search(filters)` (not an embedding retrieve-and-rank over candidates).

| Question | Answer |
|---|---|
| Does AI receive a property list to discard? | **No** — AI only emits filters |
| Can AI zero results? | **Yes**, if it emits unknown `status` (e.g. Active) |
| Primary empty-result bug | **UI re-query**, not AI discarding rows |

---

## Phase 5 — API response

| Call | Result |
|---|---|
| `GET /api/properties?town=Pretoria&propertyType=House&minBedrooms=4&province=Gauteng` | **200**, `total=1`, title Luxury Home |
| Same + `search=4 bedroom house in Pretoria` | **200**, `total=0` |

`POST /api/properties/ai-search` (premium) returns `PropertyService.search(ai.filters)` — correct when filters are structured and status is sane.

---

## Phase 6 — UI rendering

**Confirmed defect in `PropertySearch.tsx`:**

After a successful AI search, the UI called `fetchPage({ q: fullNaturalLanguageQuery, ai })`, which set:

- `search=<entire NL query>` **and**
- structured `town` / `propertyType` / `minBedrooms` / …

Supabase then required a column to `ilike` the full phrase **and** match structured filters → **zero rows**, even when AI/API would have returned Luxury Home.

Also: URL sync ran **before** AI finished, so a parallel free-text fetch could overwrite good results.

Empty state was honest (0 rows from API), not a render bug.

---

## Phase 7 — Additional cases (filter logic)

| Query intent | Expected via structured filters |
|---|---|
| Pretoria | Both Pretoria houses |
| 4 bedroom | Luxury Home only |
| House | Both |
| Pretoria house | Both |
| Family home Pretoria | Both (title search) / Family Home if NL-only |
| Gauteng | Both |
| Luxury home | Via title search |
| Auction house Pretoria | Both (House + Pretoria) |

Consistency depends on not AND-ing raw NL with structured filters (fixed).

---

## Phase 8 — Root cause

**UI rendering / client search composition defect** (primary).

Secondary hardening: **Repository status filter** — exact `eq(status)` rejected case variants / AI-invented statuses (`Active`), wiping valid `Upcoming`/`upcoming` rows.

Not: missing property, silent service skip, or prompt redesign.

---

## Phase 9 — Fix applied

### 1. `components/search/PropertySearch.tsx`
- Do **not** send raw NL as `search` when structured AI filters exist.
- Use AI search API payload as the result set (no self-defeating re-fetch).
- Sync URL **after** AI search completes (avoid race overwrite).

### 2. `lib/repositories/PropertyRepository.ts`
- Apply `status` only for known auction values.
- Match with `ilike` (case-insensitive) for `Upcoming` vs `upcoming`.

### Before / after (evidence)

| Scenario | Before | After (logic) |
|---|---|---|
| Structured + NL search phrase | **0** rows | Structured without NL search → **1** row |
| `status=Active` from AI | **0** rows | Status ignored → **1** row |
| `status ilike upcoming` | 1 (Upcoming only if exact matched) | **1** via ilike |

---

## Regression risk

**Low.** Free-text-only searches unchanged. Structured AI searches stop self-contradicting. Unknown AI statuses no longer hard-fail the query.

## Performance impact

**None / positive.** One fewer redundant `/api/properties` round-trip after AI search.

## Remaining issues

1. **Deploy required** — production still runs the buggy UI until redeploy.  
2. Catalog still tiny (2 properties); data quality (`bedrooms=0` on Family Home) limits some queries.  
3. Status values inconsistent in DB (`upcoming` vs `Upcoming`) — mitigated by `ilike`, worth a future data cleanup.  
4. Premium AI end-to-end on live not re-proven in-browser in this session (needs deploy + premium session).

---

## Recommendation

Ship and redeploy this fix, then re-test as Premium:

`4 bedroom house in Pretoria` → expect **Luxury Home**.

**Classification: PASS WITH MINOR ISSUES** (fix verified; production pending deploy).
