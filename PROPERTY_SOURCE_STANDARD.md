# Property Source Standard

**Version:** DATA FOUNDATION 1.0

## Required provenance

Every property must answer:

| Question | Field(s) |
|---|---|
| Where did it come from? | `source_name`, `source_url`, legacy `source` |
| When imported? | `imported_at` (fallback `created_at`) |
| When last verified? | `last_verified_at` (null = unverified) |
| Who conducts the auction? | `auction_agency`, contact, website |
| Can original source be traced? | `source_url` and/or `external_listing_id` |

If unknown → UI must say so. Never invent.

## Accepted source name examples

- Bidders Choice  
- High Street Auctions  
- Claremart  
- In2Assets  
- Park Village Auctions  
- Sheriff Auction / Sheriff of the Court  
- Bank Property (named institution)  
- Partner CSV feed (named partner)

## Seed / illustrative sources

Must be prefixed or classified:

- `data_classification = seed`
- and/or `source` begins with `SEED DATA ·`

Seed agency names used for UX testing are **not** proof of a live instruction to that agency.

## Untraceable listings

Do not publish as production. Keep as `needs_verification` or remove until source fields exist.
