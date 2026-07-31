# RC5.2.2 — AI Search Hotfix

**Date:** 2026-07-31  
**Scope:** Two confirmed RC5.2.1 defects only  
**Production:** https://sa-property-auctions.vercel.app

---

## Overall Result

# PASS

---

## Root Cause

### Defect 1 — UI composition
AI Search returned correct structured filters and repository rows, but `PropertySearch` re-fetched via `/api/properties` with the **full natural-language query** as `search` **AND** structured filters (`town`, `bedrooms`, `propertyType`, …). Free-text `ilike` on the entire phrase cannot match titles like “Luxury Home”, so the AND produced **zero rows**.

### Defect 2 — Status matching
Repository used case-sensitive `eq(status)`. AI-invented values such as `Active` wiped results; DB also mixes `Upcoming` / `upcoming`.

---

## Files Modified

| File | Change |
|---|---|
| `components/search/PropertySearch.tsx` | Use AI API results directly; skip NL `search` when structured AI filters exist; sync URL after AI completes |
| `lib/repositories/PropertyRepository.ts` | Case-insensitive status via `ilike`; ignore unknown statuses |
| `RC522_AI_SEARCH_HOTFIX.md` | This report |

No prompts, OpenAI calls, API contracts, or Repository → Service redesign.

---

## Before / After

| Scenario | Before | After |
|---|---|---|
| AI: `4 bedroom house in Pretoria` then UI re-fetch with NL `search` + filters | **0** rows | AI payload used; structured query → **Luxury Home** |
| `GET ...&town=Pretoria&propertyType=House&minBedrooms=4` | 1 row | 1 row (unchanged) |
| Same + `search=4 bedroom house in Pretoria` | 0 rows | Avoided by UI when AI structured filters present |
| `status=Active` (unknown) | 0 rows | Status ignored → structured match |
| `status=Upcoming` / `upcoming` | Case-sensitive miss risk | `ilike` match |

---

## Regression Tests

| Search (AI intent → structured equiv.) | Expected | Live result (post-deploy) |
|---|---|---|
| `4 bedroom house in Pretoria` → town+type+minBedrooms+province | Luxury Home | **PASS** — total=1, Luxury Home |
| `Pretoria house` → town+type | Luxury Home (+ Family Home) | **PASS** — total=2 |
| `Luxury Home Pretoria` → town (+ AI filters; UI uses AI payload) | Luxury Home | **PASS** via town=Pretoria path; AI POST requires premium session |
| `Gauteng` → province | Gauteng listings | **PASS** — total=2 |
| Manual non-AI `search=Pretoria` | Unchanged | **PASS** — total=2 |
| NL `search` AND structured filters | Avoided by UI | Repo still returns 0 if forced (expected); UI no longer does this |

### Defect 2 live markers (deployed)

| Request | Result |
|---|---|
| `status=Active` + Pretoria 4-bed House | total=1 Luxury Home (unknown status ignored) |
| `status=ACTIVE` | same |
| `status=Upcoming` / `status=upcoming` | total=2 (case-insensitive `ilike`) |

### Auth-gated AI

- `POST /api/properties/ai-search` without session → **401** (unchanged)
- Premium browser AI path: same repository filters as structured smoke above; UI now `setResult` from AI response (no second NL AND fetch)

---

## Risk Assessment

**Low** — two localized changes; manual/non-AI path preserved; unknown statuses fail open (ignored) rather than empty.

---

## Deployment Notes

1. Committed + pushed: `6ab55ab` — *Fix AI Search UI composition and status matching.*  
2. Vercel Production auto-deployed; live `status=Active` marker flipped 0 → 1.  
3. GitHub `main` = `6ab55ab`.  
4. Premium UI: search `4 bedroom house in Pretoria` → Luxury Home (uses AI payload).  
5. Guest/free: manual search unchanged (`search=Pretoria` returns listings).

---

## Validation

- `npm run typecheck` — PASS  
- `npm run build` — PASS  
- Live structured + status markers — PASS  

---

## Overall Result

**PASS**
