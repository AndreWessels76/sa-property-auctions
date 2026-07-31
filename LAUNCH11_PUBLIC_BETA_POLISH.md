# Launch 1.1 — Public Beta Polish Report

**Date:** 31 July 2026  
**Production:** https://sa-property-auctions.vercel.app  

---

## Overall Result

# PASS

---

## Issues Fixed

| # | Issue | Fix |
|---|---|---|
| 1 | Auction agency missing | `AuctionAgencyCard` + agency resolution from `source`; seed updated with High Street, Bidders Choice, Claremart, In2Assets, Park Village, EasySell, Absa, Sheriff |
| 2 | “View all auctions” dead | New `/auctions` catalogue route; Featured + Footer + property “Browse more” link there |
| 3 | Comparable sales empty | Always-visible section + placeholder copy; town/geo fallback comparables when possible |
| 4 | Price spread empty | `PriceSpreadCard` with estimate/auction/diff/discount % or explanatory message; analytics spread uses estimate vs auction |
| 5 | Metadata nulls | Property detail fields use professional fallbacks (suburb, beds, source, description, map, gallery) |
| 6 | Production polish | No blank premium analytics while loading; no empty agency/comps/spread cards |

---

## Files Modified

- `app/properties/[id]/page.tsx`
- `app/auctions/page.tsx` (new)
- `app/components/investor/PropertyAnalytics.tsx`
- `app/components/subscription/PremiumGuard.tsx`
- `app/sitemap.ts`
- `components/home/FeaturedAuctions.tsx`
- `components/home/Hero.tsx`
- `components/layout/Footer.tsx`
- `components/property/AuctionAgencyCard.tsx` (new)
- `components/property/ComparableSalesSection.tsx` (new)
- `components/property/PriceSpreadCard.tsx` (new)
- `lib/auction/agencyDisplay.ts` (new)
- `lib/maps/getComparableSales.ts`
- `lib/maps/comparableTypes.ts`
- `scripts/launch11-polish-properties.mjs` (new)
- `LAUNCH11_PUBLIC_BETA_POLISH.md` (this report)

---

## Regression Tests

| Area | Result |
|---|---|
| Featured → View all auctions | Navigates to `/auctions` |
| Property detail | Agency, price spread, comparables sections always render |
| Desktop / tablet / mobile | Responsive grids retained (sm/lg breakpoints) |
| Manual search | Unchanged PropertySearch on home + `/auctions` |
| AI Search | Untouched |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |

---

## Production Screens Reviewed

- Home Featured header CTA  
- `/auctions` full catalogue  
- Property detail: hero, metadata grid, agency, price spread, comparables, map/fallback, aside pricing  
- Premium analytics gate loading state  

Live data polish: all 15 seed properties assigned agency `source` + coordinates for nearby comparable matching.

---

## Remaining Limitations

- Agency contact phone/email still often unavailable (website/name shown when known).  
- Comparables are other catalogue listings (auction-style), not deeds-office sold comps.  
- Stock gallery images remain until provider photography is onboarded.  
- Premium analytics still require Premium/admin session.

---

## Recommendations

1. Capture structured `auction_agency` / contact fields at import time.  
2. Prefer licensed feed photos over Unsplash.  
3. Expand true sold-comparable dataset when available.  

---

## Overall Result

**PASS**
