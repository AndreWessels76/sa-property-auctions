# Historical Intelligence 5.4 — Live Report

Generated: 2026-08-16T06:39:25.170Z

## VERDICT

**CAMPAIGN AWAITING REVIEW**

Evidence exists but requires human review

## CAMPAIGN

**CAMPAIGN_AWAITING_REVIEW**

P1 Progress [████████████████] 20 / 20
Remaining: 0

P1 Progress [████████████████] 20 / 20 · Remaining: 0

## PROVEN IN PRODUCTION

- Public catalogue safety — 0 leaks
- Historical events: 33
- Licensed sources: 33/33
- Fetch attempted: 33/33
- Fetch successful: 29

## TESTED

- HI 5.3 campaign controller (batch limit 5)
- Explicit before/after deltas (zeros visible)
- Ranked bottleneck + review queue

## RECOVERED

- 29 successful fetches in production
- 13/33 snapshots available
- 33/33 extractions available
- 5/33 outcome observations

## STILL MISSING

- 4 legacy failures awaiting modern metadata retry
- No verified SOLD outcomes
- No verified sale prices

## REVIEW REQUIRED

- 37 review queue items

## INSUFFICIENT DATA

- Sale statistics — INSUFFICIENT_DATA (no verified sale prices)
- Comparables — INSUFFICIENT_DATA (min 3)
- Market towns — INSUFFICIENT_DATA (min 5 sales)

## EVIDENCE FUNNEL

33 Licensed Sources
↓ 33 Fetch Attempted
↓ 29 Fetch Successful
↓ 13 Snapshots
↓ 33 Extractions
↓ 5 Outcome Evidence
↓ 0 Verified SOLD
↓ 0 Verified Sale Price
↓ 0 Comparable Ready
↓ 0 Market Ready

## BOTTLENECK

**FETCH_FAILURE** — 4/33 (12.1%)

Recommended: Retry Failed (5) / Retry Network Failures (5)

- FETCH_FAILURE: 4/33 → Retry Failed (5) / Retry Network Failures (5)
- MISSING_SNAPSHOT: 10/33 → Acquire P1 — successful fetch without snapshot
- MISSING_OUTCOME: 28/33 → Resolve Evidence
- MISSING_SALE_PRICE: 5/33 → Quality Audit — explicit sale evidence only

## PUBLIC SAFETY

Catalogue leaks: **0**
Rebuild status: **ALLOWED**
Catalogue safe: **YES**

## NEXT ADMIN ACTION

PRIMARY BOTTLENECK FETCH_FAILURE 4/33 → Retry Failed (5) / Retry Network Failures (5)
