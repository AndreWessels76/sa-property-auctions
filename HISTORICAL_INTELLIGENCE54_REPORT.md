# Historical Intelligence 5.4 — Live Report

Generated: 2026-08-14T20:14:11.336Z

## VERDICT

**CAMPAIGN IN PROGRESS**

Historical evidence recovery still has unattempted or incomplete events

## CAMPAIGN

**CAMPAIGN_IN_PROGRESS**

P1 Progress [░░░░░░░░░░░░░░░░] 0 / 20
Remaining: 20

P1 Progress [░░░░░░░░░░░░░░░░] 0 / 20 · Remaining: 20

## PROVEN IN PRODUCTION

- Public catalogue safety — 0 leaks
- Historical events: 33
- Licensed sources: 33/33
- Fetch attempted: 13/33
- Fetch successful: 9

## TESTED

- HI 5.3 campaign controller (batch limit 5)
- Explicit before/after deltas (zeros visible)
- Ranked bottleneck + review queue

## RECOVERED

- 9 successful fetches in production
- 4/33 snapshots available
- 9/33 extractions available
- 2/33 outcome observations

## STILL MISSING

- 20 events never fetch-attempted
- 4 legacy failures awaiting modern metadata retry
- No verified SOLD outcomes
- No verified sale prices

## REVIEW REQUIRED

- 13 review queue items

## INSUFFICIENT DATA

- Sale statistics — INSUFFICIENT_DATA (no verified sale prices)
- Comparables — INSUFFICIENT_DATA (min 3)
- Market towns — INSUFFICIENT_DATA (min 5 sales)

## EVIDENCE FUNNEL

33 Licensed Sources
↓ 13 Fetch Attempted
↓ 9 Fetch Successful
↓ 4 Snapshots
↓ 9 Extractions
↓ 2 Outcome Evidence
↓ 0 Verified SOLD
↓ 0 Verified Sale Price
↓ 0 Comparable Ready
↓ 0 Market Ready

## BOTTLENECK

**FETCH_NOT_ATTEMPTED** — 20/33 (60.6%)

Recommended: Acquire P1 (5)

- FETCH_NOT_ATTEMPTED: 20/33 → Acquire P1 (5)
- FETCH_FAILURE: 4/33 → Retry Failed (5) / Retry Network Failures (5)
- MISSING_OUTCOME: 7/33 → Resolve Evidence
- MISSING_SALE_PRICE: 2/33 → Quality Audit — explicit sale evidence only

## PUBLIC SAFETY

Catalogue leaks: **0**
Rebuild status: **ALLOWED**
Catalogue safe: **YES**

## NEXT ADMIN ACTION

PRIMARY BOTTLENECK FETCH_NOT_ATTEMPTED 20/33 → Acquire P1 (5)
