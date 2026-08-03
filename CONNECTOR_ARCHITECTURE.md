# CONNECTOR ARCHITECTURE

```
Source site / licensed feed
        ↓
BiddersChoiceConnector (replaceable)
        ↓
PropertyAcquisitionEngine
        ↓
Supabase properties + images + audit tables
        ↓
Admin Verification
        ↓
Public PropertyService (verified only)
```

## Replaceability

Connectors must not leak into UI. UI talks to PropertyService / VerificationService only.

Future connectors copy the Bidders Choice package shape:

`lib/connectors/<source>/{Connector,extractListing,robots}.ts`

Registry entry in `sourceRegistry.ts` remains the catalogue of enabled sources.
