# Historical Intelligence 5.3 — Live Report

Generated: 2026-08-14T19:56:10.494Z

## VERDICT

**INSUFFICIENT DATA — ENGINE READY**

13 / 33 attempted · 4 successful · 9 failed · 20 remaining

## CAMPAIGN

**CAMPAIGN_IN_PROGRESS**

████████░░░░░░░░░░░░

13 / 33 attempted · 4 successful · 9 failed · 20 remaining

## PROVEN IN PRODUCTION

- Public catalogue safety — 0 leaks
- Historical events: 33
- Licensed sources: 33/33
- Fetch attempted: 13/33
- Fetch successful: 4

## TESTED

- HI 5.3 campaign controller (batch limit 5)
- Explicit before/after deltas (zeros visible)
- Ranked bottleneck + review queue

## RECOVERED

- 4 successful fetches in production
- 4/33 snapshots available
- 9/33 extractions available
- 2/33 outcome observations

## STILL MISSING

- 20 events never fetch-attempted
- 9 legacy failures awaiting modern metadata retry
- No verified SOLD outcomes
- No verified sale prices

## REVIEW REQUIRED

- 18 review queue items

## INSUFFICIENT DATA

- Sale statistics — INSUFFICIENT_DATA (no verified sale prices)
- Comparables — INSUFFICIENT_DATA (min 3)
- Market towns — INSUFFICIENT_DATA (min 5 sales)

## EVIDENCE FUNNEL

33 Historical Events
↓ 33 Licensed Sources
↓ 13 Fetch Attempted
↓ 4 Fetch Successful
↓ 4 Snapshots
↓ 9 Extractions
↓ 2 Outcome Observations
↓ 0 Verified SOLD
↓ 0 Verified Sale Prices

## BOTTLENECK

**FETCH_NOT_ATTEMPTED** — 20/33

Recommended: Acquire P1 (5)

- FETCH_NOT_ATTEMPTED: 20/33 → Acquire P1 (5)
- LEGACY_UNKNOWN_FAILURE: 9/33 → Retry Legacy (5)
- OUTCOME_MISSING: 7/33 → Resolve Evidence (HI 4.2)
- SALE_PRICE_MISSING: 2/33 → Quality Audit — explicit sale evidence only

## PUBLIC SAFETY

Catalogue leaks: **0**
Catalogue safe: **YES**

## NEXT ADMIN ACTION

FETCH_NOT_ATTEMPTED (20/33) → Acquire P1 (5)
