# SOURCE CONNECTOR GUIDE

## Supported sources (framework)

| ID | Name | Methods |
|----|------|---------|
| `high_street_auctions` | High Street Auctions | licensed_feed, csv, manual |
| `bidders_choice` | Bidders Choice | licensed_feed, csv, manual |
| `claremart` | Claremart | licensed_feed, csv, manual |
| `in2assets` | In2Assets | licensed_feed, csv, manual |
| `park_village_auctions` | Park Village Auctions | licensed_feed, csv, manual |
| `sheriff_auctions` | Sheriff Auctions | licensed_feed, csv, manual |
| `bank_auction_portals` | Bank Auction Portals | licensed_feed, csv, manual |

Registry: `lib/connectors/sourceRegistry.ts`.

## Legal posture

- **Do not scrape** where prohibited.  
- Respect robots.txt, terms of service, and licensing.  
- Bank portals (Absa / FNB / Nedbank / Standard Bank EasySell) require contract.  
- Existing stub connectors under `lib/connectors/**` remain; production ingestion waits on licensed feeds.

## Required envelope fields

See `ConnectorListingEnvelope`: sourceId, externalListingId, listingUrl, importDate, verificationDate, updateDate, listingStatus, importMethod, sourceVersion, connectorVersion, connectorId, payload.

## Enabling a real feed

1. Confirm licence / ToS.  
2. Implement download against the licensed API/CSV.  
3. Wrap with `ImportPipeline.runFramework(connectorId, { envelope })`.  
4. Run validate → dedupe → verify → publish.  
5. Confirm audit rows in Admin → Verification → Import logs.
