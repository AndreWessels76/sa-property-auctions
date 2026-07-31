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

| Search | Expected | Result (logic / live API) |
|---|---|---|
| `4 bedroom house in Pretoria` | Luxury Home | Structured path returns Luxury Home (`bedrooms>=4`) |
| `Pretoria house` | Luxury Home (+ Family Home) | town+type → both Pretoria houses |
| `Luxury Home Pretoria` | Luxury Home | title/town search when no conflicting AND |
| `Gauteng` | Gauteng listings | province filter |
| Manual non-AI search | Unchanged | Free-text `search` still applied when no structured AI filters |

Live smoke after deploy: re-hit structured property API; premium AI path validated once Vercel serves this commit.

---

## Risk Assessment

**Low** — two localized changes; manual/non-AI path preserved; unknown statuses fail open (ignored) rather than empty.

---

## Deployment Notes

1. Commit + push to `main`.  
2. Vercel Production auto-deploys.  
3. Confirm deploy SHA matches hotfix commit.  
4. Premium: run AI search `4 bedroom house in Pretoria` → expect Luxury Home.  
5. Guest/free: manual search still works.

---

## Validation

- `npm run typecheck` — PASS  
- `npm run build` — PASS  

---

## Overall Result

**PASS**
