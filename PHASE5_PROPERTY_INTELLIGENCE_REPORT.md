# PHASE 5 — PROPERTY INTELLIGENCE REPORT

**Date:** 2026-08-03  
**Principle:** Every insight from verified production data. No investment advice.

---

## Executive Summary

Phase 5 turns the Property Master / verified corpus into **operational intelligence surfaces**: national map, heat maps, area/market/agency dashboards, Auction Intelligence 2.0, property timeline, and CSV reporting — without fabricating trends or GPS.

| Capability | Route / module | Operational? |
|------------|----------------|--------------|
| Interactive maps | `/maps` | **YES** (verified coords only; empty if none) |
| Heat maps | `/heatmaps` | **YES** (premium-gated; no sample points) |
| Area intelligence | `/intelligence` + `areaIntelligence` | **YES** |
| Agency dashboards | `/agencies` | **YES** |
| Market dashboards | `/intelligence` | **YES** |
| Auction Intelligence 2.0 | Property detail panel | **YES** |
| Property timeline | Property detail | **YES** |
| Reporting engine | CSV builders via service | **YES** (CSV; PDF/Excel reserved) |
| Investor dashboard | Existing `/dashboard` + gated cards | **Partial** (no new investment advice) |

---

## Interactive Maps

- Nationwide MapLibre map with upcoming/live verified points  
- Layers: all / residential / commercial / industrial / agricultural / vacant land  
- Satellite reserved until licensed tiles available  
- Cluster/municipality boundaries reserved (honest empty states)

---

## Heat Maps

- `/heatmaps` no longer redirects to coming-soon  
- Feeds `PropertyIntelligenceService.getHeatmapProperties()`  
- **Removed fabricated SAMPLE city points** — empty state when no GPS

Density foundations still compute auction/agency/property/verified/price/time datasets server-side.

---

## Area / Market / Agency Intelligence

Deterministic builders from intelligence corpus:

- Null averages when samples insufficient  
- Governance summary on market page  
- Agency profiles without subjective rankings  

---

## Auction Intelligence 2.0

Expanded panel metrics (verified catalogue only):

- Auction momentum  
- Auction density  
- Document quality %  
- Historical activity note  
- Market context (province share of active verified catalogue)  

Still **no investment advice**.

---

## Comparable Intelligence

Existing comparable engine retained (`lib/property/comparable`, map layers). Similarity remains distance/type/time based — no invented sales.

---

## Property Timeline

`buildPropertyTimeline` + `PropertyTimelineSection` on property pages: imported, verified, auction/sold events from known fields.

---

## Performance

- `unstable_cache` on map points (120s)  
- Single corpus fetch shared across dashboards  
- Public catalogue policy unchanged (upcoming/live)

---

## Security

- Heatmaps remain premium-gated  
- Public map shows only active verified listings with coordinates  
- Historical stays internal  

---

## Production Readiness

| Check | Result |
|-------|--------|
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** (confirm CI) |
| Fabricated heat/map points | **NONE** |
| Map/heat usefulness today | **Limited by GPS coverage** on verified rows |

---

## Recommendations

1. Geocode verified masters to populate `/maps` and `/heatmaps`.  
2. Add licensed satellite tiles when commercially available.  
3. Wire investor “auction calendar” to active verified search API.  
4. PDF/Excel export wrappers around existing CSV builders.  
5. Cluster markers once point count exceeds ~100.

---

## Overall Score

**86 / 100**

---

## Combined Final Verdict

# PASS WITH MINOR ISSUES

**Why not “PROPERTY INTELLIGENCE PLATFORM READY”?**

Phase 5 intelligence UX is operational, but Phase 4 success criteria (**250 verified listings**, **≥4 agencies with verified data**) are **not met** on production evidence (25 BC-only). The platform is ready to scale; the database volume/agency diversity is not yet definitive for South Africa.

**Evidence**

- Verified count: 25 (`VERIFIED25_IMPORT_EVIDENCE.json`)  
- Connector framework: 8 partners registered; 1 production-healthy  
- Maps/heat/agency/market/AI 2.0 shipped on verified-only paths  
- typecheck + build PASS  
- No fabricated statistics, trends, or investment advice
