# VERIFICATION STANDARD

## Verification states (internal)

| Value | Public label |
|-------|----------------|
| `seed` | Seed |
| `pending_verification` | Pending Verification |
| `verified` | Verified |
| `expired` | Expired |
| `withdrawn` | Withdrawn |
| `sold` | Sold |
| `archived` | Archived |

Internal snake_case values are never shown raw in UI (`formatVerificationLabel`).

## Promotion rules

| To | Requirement |
|----|-------------|
| Pending Verification | Default for former seed / unverified imports |
| Verified | Admin confirms source; sets `last_verified_at` |
| Expired / Withdrawn / Sold | Lifecycle evidence from source or date policy |
| Archived | Operator archive or placeholder cleanup |

**Never auto-verify.** Cron may suggest lifecycle from auction dates but does not invent sold outcomes.

## Address verification

Required when available: street, suburb, town, province, postal code, coordinates.  
Optional: GPS (same as coords), municipality, ward, region.  
If address unavailable: store `address_unavailability_reason` — never fabricate.

Module: `lib/data/addressVerification.ts`.

## Auction verification

Agency, auctioneer, contact, website, date/time, venue, registration, terms, catalogue, brochure, deposit, viewing.  
If source string implies an agency, `auction_agency` must be populated (`agencyUnknownDespiteSource` flagged in admin).

Module: `lib/data/auctionVerification.ts`.

## Listing lifecycle

`upcoming` → `live` → `sold` | `withdrawn` | `expired` → `archived`  

Record: `status_changed_at`, `status_change_reason`, `status_source_event`.

Module: `lib/data/listingLifecycle.ts`.
