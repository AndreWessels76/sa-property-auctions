# Investor Intelligence 4.7 — Live Evidence Report

Generated: 2026-08-14T13:27:14.960Z

## VERDICT

**INSUFFICIENT DATA — ENGINE READY**

Source fetches completed but licensed sources have not yet yielded verified sale outcomes or prices

## CONNECTIVITY

- Status: **CONNECTED**
- Message: Production database reachable via authoritative tables


## PROVEN IN PRODUCTION

- 33 historical auction events in corpus
- 38 property masters
- 33 P1-eligible licensed sources with exact URLs
- Public catalogue safety — 0 historical leaks detected

## ENGINE TESTED

- HEA 4.3 acquisition pipeline
- HI 4.2 outcome/sale-price resolution
- HEQ 4.4 evidence quality
- II 4.6 investor research layer
- Comparable engine rejection codes

## DATA STILL MISSING

- No verified sale prices in production
- No verified SOLD outcomes in production
- Verified sale prices (0) below market threshold (5)

## LIVE METRICS

| Metric | Value |
|--------|------:|
| Property Masters | 38 |
| Auction Events | 38 |
| Historical Events | 33 |
| Eligible P1 | 33 |
| Enrichment Runs | 27 |
| Successful Fetches | 6 |
| Verified SOLD | 0 |
| Verified Sale Prices | 0 |
| Public Catalogue Leaks | 0 |

## HISTORICAL COVERAGE (33 events)

- event:d4b95b88-2b87-4dd1-ac67-ba199829130b: SOURCE_FOUND outcome=COMPLETED_UNKNOWN price=NOT_VERIFIED
- event:1549f73a-684c-4497-9835-1b80041c9173: SOURCE_FOUND outcome=COMPLETED_UNKNOWN price=NOT_VERIFIED
- event:37b0e59f-7a43-4a9f-a000-b50c3e323cd8: SOURCE_FOUND outcome=COMPLETED_UNKNOWN price=NOT_VERIFIED
- event:66316a65-9ba8-41a1-b668-9a594b113129: INSUFFICIENT_DATA outcome=COMPLETED_UNKNOWN price=NOT_VERIFIED
- event:f9962d13-5821-4054-9934-1cabf293adc3: INSUFFICIENT_DATA outcome=COMPLETED_UNKNOWN price=NOT_VERIFIED
- event:f79a330b-7779-4719-8c21-174252c9ab3f: INSUFFICIENT_DATA outcome=COMPLETED_UNKNOWN price=NOT_VERIFIED
- event:5fd4b3fa-0693-4b31-966b-8e1298ba01fa: INSUFFICIENT_DATA outcome=COMPLETED_UNKNOWN price=NOT_VERIFIED
- event:fa7207e6-9ff8-404c-9ffb-1ede4094ffe2: INSUFFICIENT_DATA outcome=COMPLETED_UNKNOWN price=NOT_VERIFIED
- event:e8f8a339-e607-4cff-bf4b-39de60160113: INSUFFICIENT_DATA outcome=COMPLETED_UNKNOWN price=NOT_VERIFIED
- event:ccaf70ac-380b-41b4-9a28-b603c3ea8b8c: SOURCE_FOUND outcome=COMPLETED_UNKNOWN price=NOT_VERIFIED

## Evidence chain

Licensed Source → Snapshot → Extraction → Outcome → Sale Price → HEQ 4.4 → Comparable → II 4.6

No statistics are fabricated when verified sale evidence is absent.
