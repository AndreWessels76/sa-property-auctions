# Investor Intelligence 4.5 — Live Validation Report

Generated: 2026-08-14T12:54:38.766Z

## VERDICT

**INSUFFICIENT DATA — ENGINE READY**

## Production counts

| Metric | Value |
|--------|------:|
| Property Masters (sample) | — |
| Auction Events (sample) | 0 |
| Historical events | 0 |
| Verified SOLD | 0 |
| Verified sale prices | 0 |
| Comparable-ready | 0 |
| Market-ready towns | 0 |
| Market-ready agencies | 0 |
| Evidence quality HIGH | 0 |
| Open conflicts | 0 |
| Public catalogue leaks | 0 |

## Status

- **Implemented**: Investor Intelligence 4.5 composition layer
- **Tested**: `npm run test:investor-intelligence45` (30 cases)
- **Live-proven**: counts above from production/sample DB
- **Insufficient data**: Yes — market medians not calculable
- **Pending migrations**: None required for II 4.5 core
- **Pending enrichment**: Verified sale-price observations via HEA 4.3 / HDA queues

## Note

Absence of verified sale prices is **not** evidence of negative investment outcomes.
The engine returns `INSUFFICIENT_DATA` — never fabricated prices or trends.
