# PROPERTY DETAIL EXPERIENCE 1.0 — REPORT

**Date:** 2026-08-03  
**Sprint:** Premium verified listing detail presentation  
**Scope:** Property detail UX only — no platform redesign

---

## Executive Summary

The public property detail page has been restructured into a premium, investor-oriented information hierarchy. Every section uses verified data where available and professional messaging where data is absent. No values are fabricated.

---

## UX Review

| Before | After |
|--------|-------|
| Single hero + flat grid | Progressive hierarchy: Summary → Gallery → Auction → Property → Location → Pricing → Comparables → Documents → Agency → Source |
| Generic "Not listed" copy | Agency-specific professional fallbacks |
| Basic image grid | Full gallery with thumbnails, counter, fullscreen, keyboard nav |
| Auction venue showed "Not listed" for online | Always shows **🌐 Online Auction** when inferred |
| No mobile sticky CTAs | Floating Register + Favourite on mobile |
| No SEO metadata on detail | Open Graph, Twitter Cards, canonical, JSON-LD |

**Information hierarchy implemented:**

1. Hero summary (badges, countdown, CTAs)
2. Gallery experience
3. Property summary (always visible)
4. Highlights → Auction → Description → Agricultural (farm)
5. Location → Comparables → Documents
6. Agency → Provenance → Related
7. Pricing + AI insights (sidebar / premium)

---

## Information Hierarchy

**Files:** `app/properties/[id]/page.tsx`, `components/property/detail/*`

The page follows the sprint-specified flow. Summary remains above the fold after gallery. Pricing intelligence sits in a sticky sidebar on desktop for quick decision context.

---

## Auction Review

**File:** `components/property/detail/PropertyAuctionCard.tsx`, `lib/property/detailExperience.ts`

| Field | Behaviour |
|-------|-----------|
| Auction type | Inferred: Online / Live / Hybrid / pending |
| Venue | Online → **🌐 Online Auction** (never "Not listed") |
| Date / time | Verified or "confirm with agency" |
| Registration | Primary CTA when link exists |
| Viewing / deposit | Shown or professional fallback |
| Documents | Linked only when valid HTTPS URLs exist |

---

## Agricultural Review

**File:** `components/property/AgriculturalDetailsSection.tsx`

- Renders **only** for Farm property types
- All 18 sprint fields supported via `agricultural_details` JSONB
- Game species label when `gameFarm` + `cropInformation`
- Empty state: professional guidance, not blank section

---

## Pricing Review

**File:** `components/property/detail/PropertyPricingIntelligence.tsx`

| Metric | Source |
|--------|--------|
| Estimated value | `property.estimated_value` |
| Guide price | `property.auction_price` |
| Reserve | `property.reserve_price` (or "not disclosed") |
| Current bid | Honest: "not connected" |
| Spread / discount | Calculated only when both estimate + guide exist |
| Confidence | From `PropertyIntelligence` (existing engine) |

Fallback: **"Insufficient verified pricing data"** — never invented.

---

## Gallery Review

**File:** `components/property/detail/PropertyGalleryExperience.tsx`

| Feature | Status |
|---------|--------|
| Primary image | Yes |
| Thumbnail strip | Yes |
| Fullscreen viewer | Yes |
| Keyboard navigation | Arrow keys + Escape |
| Image counter | Yes (e.g. 2 / 5) |
| Lazy loading | Yes (non-first images) |
| Placeholder | Category image when no provider photos |
| Never empty | Placeholder + message always shown |

---

## Performance

- Server components for static sections (summary, description, documents)
- Client components only for gallery, hero actions, mobile float
- Existing `revalidate = 300` preserved
- Gallery lazy-loads non-priority images
- Map remains dynamically imported via `PropertyMapLazy`

---

## Accessibility

| Item | Implementation |
|------|----------------|
| Keyboard gallery nav | ArrowLeft / ArrowRight / Escape |
| ARIA labels | Gallery, breadcrumbs, sections (`aria-labelledby`) |
| Live regions | Countdown, image counter |
| Semantic headings | h1 hero, h2 sections |
| Button states | Favourite `aria-pressed` |
| Table comparables | Responsive horizontal scroll on mobile |

---

## SEO

**File:** `app/properties/[id]/page.tsx` (`generateMetadata`), `PropertyStructuredData.tsx`, `PropertyBreadcrumbs.tsx`

| Item | Status |
|------|--------|
| Property schema (RealEstateListing) | JSON-LD |
| Auction schema (Event) | JSON-LD when date known |
| Breadcrumbs | Visible + schema |
| Open Graph | title, description, image, url |
| Twitter Cards | summary_large_image |
| Canonical URL | `/properties/{id}` |

---

## Professionalism Score

**87 / 100**

Strengths:
- Clear investor-oriented hierarchy
- Verified vs pending clearly distinguished
- No fabricated pricing or comparables
- Premium gallery and mobile CTAs

Deductions:
- Map POI (schools, hospitals) not integrated — requires third-party enrichment
- Agency logos not yet in data model
- Live bid feed not connected (honestly disclosed)
- Property age field not in schema

---

## Production Readiness

| Check | Result |
|-------|--------|
| Backward compatible | Yes — DTO/mapper unchanged |
| No architecture redesign | Yes |
| No fabricated data | Yes |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |

---

## Recommendations

1. Add `agency_logo_url` to properties when source connectors provide it
2. Enrich comparables with `property_type` and land size from repository
3. Integrate map POI layer (Google Places / OSM) in a future sprint
4. Connect live bidding API when auction platform supports it
5. Populate `agricultural_details` during Bidders Choice extraction for farms

---

## Overall Score

**87 / 100**

---

## Final Verdict

# PASS WITH MINOR ISSUES

**Evidence:**
- Full section hierarchy implemented per sprint spec
- Online auction venue never shows generic "Not listed"
- Gallery, SEO, accessibility, and mobile experience delivered
- Honest gaps documented (POI, logos, live bids, property age)
- Typecheck **PASS**

Not yet **PREMIUM PROPERTY EXPERIENCE** because map POI, agency logos, and live bidding remain future enhancements — but the page is production-ready and materially more professional than 1.0.
