# BFS-001 Report — Beta Finalization Sprint

**Date:** 2026-07-31  
**Scope:** RC4 blockers only (INSERT harden, pagination, heatmaps hide)  
**Validation:** `npm run typecheck` ✅ · `npm run build` ✅

---

## Migration Status

| Item | Status |
|---|---|
| `supabase/migrations/20260731120000_profiles_insert_harden.sql` | **Present** |
| SQL validity | **PASS** — DROP + CREATE INSERT policy |
| Order | **PASS** — after `20260728210000_profiles_billing.sql` |
| Deployment docs | **PASS** — `SUPABASE_DEPLOYMENT.md` order 7 + checklist |
| Validation doc | **PASS** — `RC4_DATABASE_VALIDATION.md` |
| Applied on live Supabase | **Ops pending** — must run before production |

**Policy:** authenticated INSERT only for own row with `role=free`, inactive plan, no Stripe IDs. Does not weaken existing UPDATE RLS.

---

## Pagination Summary

Home Featured Auctions and Favourites no longer load the full property catalog in the browser.

| Surface | Behaviour |
|---|---|
| Home (`/?page=N`) | Server `PropertyService.search` (24/page) → `PropertySearch` |
| Favourites (`/favourites?page=N`) | Favourite IDs → `/api/properties?ids=&page=` |
| API `GET /api/properties` | Always paginated; `ids` path uses repository slice |
| Repository | Supabase `.range()` / ID page slice + `count: exact` |
| Result shape | `page`, `pageSize`, `total`, `totalPages`, `hasNext`, `hasPrevious` |
| UI | Previous / Next / Page X of Y · loading · empty |

Filters, sorting, AI search, cards, and maps remain intact. Default page size: **24**.

### Performance impact (concise)

- Payload per home/favourites request capped at ~24 properties instead of full table.
- Fewer bytes over the wire; faster first paint on large catalogs.
- Count still queried once per search page (exact total for pagination).
- Deprecated `getProperties()` / `getAll()` remain for internal/cache only — not used by home or favourites.

---

## Heatmap Status

| Action | Status |
|---|---|
| `/heatmaps` route | Redirects to `/coming-soon` |
| Nav / menu / dashboard cards | Removed (no Header/dashboard links) |
| Sitemap | No `/heatmaps` URL |
| Route protection prefix | Removed |
| LayerSelector “Heat Map” control | Hidden (stub UI) |
| Implementation code | **Retained** under `app/components/heatmap/` |
| Permission keys | Unchanged (future use) |

---

## Files Modified / Added

**Migration / docs**

- `supabase/migrations/20260731120000_profiles_insert_harden.sql`
- `RC4_DATABASE_VALIDATION.md`
- `SUPABASE_DEPLOYMENT.md` (migration 7 listing)
- `BFS001_REPORT.md` (this file)

**Pagination**

- `lib/dto/SearchResult.ts`
- `lib/repositories/PropertyRepository.ts`
- `lib/services/PropertyService.ts`
- `app/api/properties/route.ts`
- `app/page.tsx`
- `components/home/FeaturedAuctions.tsx`
- `components/search/PropertySearch.tsx`
- `app/favourites/page.tsx`
- `app/favourites/FavouritesClient.tsx`

**Heatmaps hide**

- `app/heatmaps/page.tsx`
- `app/coming-soon/page.tsx`
- `app/components/map/LayerSelector.tsx`
- Header / dashboard / sitemap / routeProtection (nav exposure removed)

---

## Security Impact

| Change | Impact |
|---|---|
| Profiles INSERT harden | Blocks client self-escalation to admin/premium/moderator on insert |
| Heatmaps redirect | Reduces exposure of unfinished premium stub |
| Pagination | No auth change; list endpoints remain rate-limited |

**Does not replace:** applying migration 7 on live DB, or existing UPDATE RLS / subscription webhook path.

---

## Risk Level

**Low–Medium**

- Pagination is isolated to Repository → Service → API/UI.
- Heatmaps code kept; only entry points gated.
- Live DB still needs migration 7 applied (ops).

---

## Production Readiness

| Question | Answer |
|---|---|
| Closed beta (invite-only) | **YES** — after migration 7 applied on target env |
| Public beta | **NO** — staging smoke + remaining RC4 polish still needed |
| Production | **NO** |

---

## Overall Beta Score (updated)

| Prior (RC4) | After BFS-001 |
|---|---|
| **78 / 100** | **86 / 100** |

Score lift reflects closed blockers (harden migration in repo + docs, pagination, heatmaps stub gated). Remaining gap is largely ops (apply migration, live smoke, assets/CSP polish).

---

## Verdict

BFS-001 complete in codebase. Typecheck and build green. Apply `20260731120000_profiles_insert_harden.sql` on Supabase before treating any environment as beta-ready.
