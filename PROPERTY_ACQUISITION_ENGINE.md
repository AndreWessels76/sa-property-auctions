# PROPERTY ACQUISITION ENGINE

Orchestrates verified listing import for any replaceable connector.

## Entry

`lib/acquisition/PropertyAcquisitionEngine.ts`

## Stages (logged)

Discover → Download → Extract → Normalize → Validate → Deduplicate → Quality Score → Verification Queue → Admin Approval → Verified Listing → Public Website

Pending imports **never** auto-publish. Public visibility requires admin **Approve** (`verification_state=verified`).

## Supporting modules

| Module | Role |
|--------|------|
| `validateListing.ts` | Hard rejects with reasons |
| `changeDetection.ts` | Field/change event persistence |
| `metrics.ts` | Import reports + daily metrics |
| `verificationChecklist.ts` | Admin checklist |
| `publicListingPolicy.ts` | Public allowlist |

## Tables (migration)

`20260802120000_verified_listings_acquisition.sql`

- `import_rejections`
- `listing_change_events`
- `acquisition_import_reports`
- Extra property columns (features, viewing, deposit, registration, hashes)

## Blueprint

New sources (High Street, Claremart, …) should:

1. Implement connector discover/download/extract (robots-safe).
2. Call `PropertyAcquisitionEngine` (or extend it with a connector interface).
3. Land all rows as `pending_verification`.
4. Publish only via admin approve.
