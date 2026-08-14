# INVESTOR SEARCH INTELLIGENCE 4.0 — REPORT

**Date:** 2026-08-13  
**Sprint:** 1 of Investor Intelligence 4.0

---

## Implemented

- Extended `PropertySearchDTO` + URL parsing for town, suburb, auction date range, bedrooms, land/building size, hectares, agricultural type, agency, garages.
- Repository filters for size, agency (`auction_agency` / `source_name`), and agricultural type needles against `property_type` and title.
- In-memory hectare filter using **only** `agricultural_details.totalHectares`.
- Agricultural types: farm, smallholding, agricultural land, guest farm, lifestyle farm, game farm, macadamia, citrus, dairy, wine, mixed.
- Deterministic ranking: featured, verified, images, location completeness, auction proximity, town/type match, agency/land-size presence.
- Public search still restricts status to **upcoming** and **live**. Expired/sold/cancelled/withdrawn cannot be searched into the public catalogue.
- Premium gating: `applySearchFilterAccess` strips agricultural/size/agency filters for free/anonymous users in `GET /api/properties`.
- UI: collapsible “more filters” on the home search form.

---

## Tested

`npm run test:investor-intelligence` — parse params, advanced-filter strip, agricultural match, no erf→hectare conversion, ranking boost, public expired hidden.

Typecheck **PASS**. Build **PASS**.

---

## Unavailable / required data

- Hectare filter does nothing unless `totalHectares` is stored.
- Agricultural type will not match listings that only imply farming in prose without type/title/category tokens.
- Verification-state filter is not exposed on public search (catalogue is verified-only).

---

## Limitations

- Ranking is field-presence + date proximity, not an investment score.
- AI search remains premium and still does not invent ranking.
