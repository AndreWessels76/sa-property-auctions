# SOURCE CHANGE REPORT

**Date:** 2026-08-08  
**Engine:** Live Source Re-fetch 1.0  
**Evidence:** `LIVE_SOURCE_REFETCH_EVIDENCE.json` + `npm run test:refetch`

---

## Change classification model

| Class | Meaning |
|-------|---------|
| NO_CHANGE | Content hash unchanged — extraction skipped |
| CONTENT_CHANGED | Hash differs; structured compare follows |
| AUCTION_DATE_CHANGED | Open/close/auction date fields differ |
| AUCTION_STATUS_CHANGED | Auction type/status fields differ |
| PROPERTY_DATA_CHANGED | Beds/baths/type/address etc. |
| LAND_DATA_CHANGED | Land / erf / hectares |
| DOCUMENT_ADDED / DOCUMENT_REMOVED | Document URL set diff |
| IMAGE_CHANGED | Image URL set diff (when present) |
| AGENCY_CHANGED | Agency fields |
| LEGAL_DATA_CHANGED | Zoning / servitude / lease etc. |
| SOURCE_VALUE_REMOVED | Field gone from source (non-verified) |
| CONFLICT_REVIEW_REQUIRED | Diff against VERIFIED value |
| SOURCE_UNAVAILABLE | HTTP 403/404/410 — property retained |

---

## Field outcomes

| Outcome | Rule |
|---------|------|
| NEW | Appeared in new extraction |
| UNCHANGED | Same value |
| UPDATED | Differed; previous not verified (incl. source_confirmed) |
| REMOVED | Gone; previous not verified |
| CONFLICT | Differed or removed while previous was **verified** |

Verified values are **never** silently overwritten.

---

## Fixture proofs (deterministic)

| Case | Result |
|------|--------|
| Land 4.164 Ha (verified) vs 4.21 Ha | CONFLICT / CONFLICT_REVIEW_REQUIRED |
| Bedrooms 2 (source_confirmed) → 3 | UPDATED |
| Auction date 11 Aug → 18 Aug | AUCTION_DATE_CHANGED |
| Document URL A → B | DOCUMENT_ADDED + DOCUMENT_REMOVED |
| Viewing removed while verified | CONFLICT |

---

## Live listing change report

Live Bidders Choice page diffs for Haenertsburg / Benoni / Crystal Park were **not** recorded in this evidence run because `BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH` was not enabled. No fabricated “actual changes” are claimed.

When enabled, each refresh writes:

- previous hash / new hash
- change classes
- fieldChanges (in snapshot `meta`)
- conflicts count
- audit row in `source_refetch_runs`
