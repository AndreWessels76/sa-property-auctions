# INVESTOR INTELLIGENCE 4.0 — MASTER REPORT

**Date:** 2026-08-13  
**Stage delivered:** Sprint 1 (Search + Comparison + Dashboard) + Sprint 2A (Auction Price Intelligence)  
**Verdict:** **INVESTOR INTELLIGENCE 4.0 READY WITH LIMITATIONS**

This is not a platform rewrite. Property Identity, Property Masters, Auction Events, Verification, Acquisition, Live Source Re-fetch, Due Diligence Extraction, Stripe, and admin-role independence were not redesigned.

See also: `AUCTION_PRICE_INTELLIGENCE40_REPORT.md` (Sprint 2A).

---

## What was implemented (Sprint 1)

### Search Intelligence
- Additional normalized filters: town, suburb, auction date range, listing status (upcoming/live only on public search), bedrooms, land/building size, hectares, agricultural type, agency.
- Deterministic ranking boosts for verified listings, auction proximity, and filter matches. No AI ranking.
- Agricultural type matching uses supplied `property_type` / title / `farmCategory` only. Hectares use `agricultural_details.totalHectares` only — erf_size is never converted into hectares.
- Advanced filters (agricultural type, hectares, agency, land/building size) are **stripped server-side** for non-premium users.

### Property comparison (`/compare` + `/api/compare`)
- Side-by-side matrix of verified public-catalogue listings.
- Free: 2 listings, basic property + auction fields.
- Premium / admin: up to 6 listings, plus land/building size, registration, agricultural rows, and pricing rows that actually exist.
- Missing values: **Not supplied**.
- Reserve is never inferred from estimated value or auction price.
- Expired / completed / cancelled / withdrawn listings remain hidden (public `getByIds` catalogue gate).

### Investor dashboard (`/workspace`)
- Server-side auth redirect + `SubscriptionService.premium()` (admin still independent of Stripe).
- Watchlist, upcoming, this week, due-diligence *tracker* attention, alerts, private notes, research/calendar links.
- Historical saved listings are retained in the workspace even when hidden from the public catalogue.
- Device favourites and saved comparisons are shown honestly as browser-local until a later persistence sprint.

---

## What was tested

| Check | Result |
|-------|--------|
| Typecheck | **PASS** |
| Build | **PASS** (`/compare`, `/workspace`, `/api/compare` present) |
| `npm run test:refetch` | **PASS** |
| `npm run test:dd` | **PASS** |
| `npm run test:ops-quick-actions` | **PASS** |
| `npm run test:investor-intelligence` | **PASS** |

Selftests cover: Not supplied, advanced-filter gating, agricultural match without erf conversion, ranking, compare limits, no reserve inference, expired hidden from public catalogue, workspace historical retention.

---

## What remains unavailable (later sprints)

| Sprint | Scope |
|--------|--------|
| 1 | Search + Comparison + Investor Dashboard — **done** |
| 2A | Auction Price Intelligence — **done** (see `AUCTION_PRICE_INTELLIGENCE40_REPORT.md`) |
| 2B | Historical Intelligence (market-level statistics) |
| 3 | Area + agricultural intelligence pages |
| 4 | Deterministic comparables + market trends |
| 5 | Investor Report 4.0 (`/properties/[id]/investor-report`) |
| 6 | Smart Alerts 2.0 + full workspace trackers (target price, reminders, document availability) |
| 7 | Map / heat-map intelligence layers |
| 8 | Admin intelligence monitoring queues + final QA |

Existing research report (`/properties/[id]/research`), calendar, maps, heatmaps, DD centre, and alerts remain in place and were not replaced.

---

## Data required

- Verified upcoming/live listings with populated structured fields.
- `agricultural_details.totalHectares` / `farmCategory` for farm filters.
- User watchlist rows and workspace notes/trackers for a populated dashboard.
- Pricing fields only display when stored on the listing.

---

## Limitations

- Saved comparisons persist on-device only.
- Hearted favourites are still browser-local; DB watchlist is used when present.
- Public comparison cannot include expired listings (by catalogue policy).
- Auction Price Intelligence, Area Intelligence, Comparables engine, Investor Report 4.0, map layers, and admin intelligence queues are **not** in this sprint.
- No fabricated market statistics, comparables, coordinates, or returns.

---

## Final verdict

**INVESTOR INTELLIGENCE 4.0 READY WITH LIMITATIONS**

Sprint 1 search, comparison, and dashboard are working with server-side premium gating, no fabricated values, and passing tests. The remaining modules in the master brief are not claimed as delivered.
