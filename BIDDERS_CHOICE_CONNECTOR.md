# BIDDERS CHOICE CONNECTOR

Reference production connector for Verified Listings 1.0.

## Module

- `lib/connectors/biddersChoice/BiddersChoiceConnector.ts`
- `lib/connectors/biddersChoice/extractListing.ts`
- `lib/connectors/biddersChoice/robots.ts`
- Importer adapter: `lib/importers/biddersChoice.ts`
- Admin API: `POST /api/admin/acquisition/bidders-choice`

## Legal posture

1. Prefer **licensed_feed / CSV / manual** payloads (`licensedRows`, `listingUrls`).
2. Public HTTP fetch only when `allowPublicFetch=true` **and** robots.txt allows the path.
3. robots.txt for Bidders Choice (`User-agent: *` / empty `Disallow`) is checked at runtime before fetch.
4. No fabricated listings. Failed extracts are rejected with stored reasons.

## Capabilities

| Capability | Support |
|------------|---------|
| Discover (sitemap) | Yes — graceful empty if sitemap unavailable |
| Download listing HTML | Yes — after robots allow |
| Extract metadata/images/auction/agency | Yes — null when absent |
| Track updates / removals | Yes — content hash + change events |
| Connector replaceable | Yes — engine depends on connector interface usage |

## Environment

| Variable | Purpose |
|----------|---------|
| `BIDDERS_CHOICE_DAILY_SYNC` | Enable cron acquisition (`true`) |
| `BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH` | Allow robots-checked public fetch in cron |
| `BIDDERS_CHOICE_MAX_LISTINGS` | Cap per run (default 25) |

## Admin run example

```json
POST /api/admin/acquisition/bidders-choice
{
  "listingUrls": ["https://www.bidderschoice.co.za/..."],
  "allowPublicFetch": false
}
```

Or licensed rows:

```json
{
  "licensedRows": [{
    "title": "...",
    "source_url": "https://...",
    "external_listing_id": "lot-123",
    "auction_date": "2026-09-01",
    "province": "Gauteng",
    "town": "Johannesburg"
  }]
}
```
