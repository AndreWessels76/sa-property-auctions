# VERIFIED LISTING STANDARD

## Public visibility

Only `verification_state` in:

- `verified`
- `sold`

Pending, seed, archived, expired, withdrawn are **not** public catalogue rows.

Enforced in:

- `PropertyRepository.search` (`.in(verification_state, …)`)
- `PropertyRepository.getPublicById` / `getPublicAll`
- `PropertyService.getProperty` / `getProperties` / `getByIds`

## Import rule

Every acquired listing starts as:

- `verification_state = pending_verification`
- `data_classification = needs_verification`

Never auto-verified.

## Approval rule

Admin **Approve** sets:

- `verification_state = verified`
- `data_classification = production`
- `last_verified_at = now()`

## Public display

Verified listings show:

- Verified badge
- Source name / original URL
- Last verified
- Listing provenance
- Auction agency

Quality scores remain **admin-only**.
