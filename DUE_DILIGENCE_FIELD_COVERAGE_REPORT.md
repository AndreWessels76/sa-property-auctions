# DUE DILIGENCE FIELD COVERAGE REPORT

**Date:** 2026-08-08  
**Engine:** Due Diligence Extraction 1.0

---

## Coverage by domain

| Domain | Extractable when source supplies | Never fabricated |
|--------|----------------------------------|------------------|
| Property | description, type, beds, baths, garages, parking, unit, scheme, erf, portion, floor | — |
| Auction | type, mode, date/time, open/close, viewing, deposit/%, venue, online URL, docs | — |
| Land | hectares, m², acres, combined extent text, approximate flag, farm name/number/portions | — |
| Location | province, town, suburb, street, postal; municipality/ward **only if explicit** | Guessed municipality/ward |
| Legal | servitudes/restrictions/zoning/occupation/lease **only if explicit in text** | Silent legal defaults |
| Documents | terms, catalogue, brochure, registration + typed URLs in text | Fake document links |
| Utilities | electricity/water/sewer/borehole **only if mentioned** | Assumed services |

---

## Fixture completeness (after extraction)

| Fixture | Overall % | Notable present | Notable missing |
|---------|-----------|-----------------|-----------------|
| Benoni sectional | ~11–36 property | beds, scheme, town, suburb, open/close | municipality, zoning, title, land |
| Haenertsburg farm | higher land/location | hectares±, boreholes, grazing, town/province | municipality, zoning, title |
| Commercial sample | deposit %, docs if linked | deposit, terms link | land, legal |

Exact numbers: see `DUE_DILIGENCE_EXTRACTION_EVIDENCE.json`.

---

## Display mapping

Structured DB fields → **Verified** (when listing verified) or **Source Confirmed**.  
Text-recovered fields → **Source Confirmed** / **Extracted**.  
Absent legal/municipal → **Not supplied by auction source**.
