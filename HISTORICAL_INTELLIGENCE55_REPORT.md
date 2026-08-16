# Historical Intelligence 5.5 — Live Report

Generated: 2026-08-16T06:39:25.170Z

## VERDICT

**ENGINE READY / DATA COVERAGE INSUFFICIENT**

Evidence exists but requires human review

## CAMPAIGN

**CAMPAIGN_AWAITING_REVIEW**

P1 Progress [████████████████] 19 / 19
Remaining: 0

P1 Progress [████████████████] 19 / 19 · Remaining: 0

Data coverage improving: **YES**
Data coverage ready: **NO**

## PRODUCTION COUNTS

| Metric | Value |
|--------|-------|
| Historical Events | 33 |
| Licensed Sources | 33/33 |
| Fetch Attempted | 33 |
| Never Attempted | 0 |
| Fetch Successful | 29 |
| Fetch Failed | 4 |
| Snapshots | 13/33 |
| Extractions | 33/33 |
| Outcome Evidence | 5/33 |
| Verified SOLD | 0 |
| SOLD Without Price | 5 |
| Verified Sale Prices | 0 |
| Comparable Ready | 0 |
| Market Ready Towns | 0 |
| Catalogue Leaks | 0 |

## RECOVERY LANES

Never attempted (P1): **0**
Legacy unknown failures: **4**
Retryable failures: **0**
Snapshot extraction pending: **0**

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

## BATCH PLAN

No P1 candidates remaining — do not auto-acquire

## PROVEN

- Public catalogue safety — 0 leaks
- Historical events: 33
- Licensed sources: 33/33
- Fetch attempted: 33/33
- Fetch successful: 29

## TESTED

- HI 5.5 orchestration over HI 5.4
- Batch limit ≤5
- Dry-run read-only
- Rebuild catalogue-leak guard
- Legacy vs never-attempted separation

## MISSING

- Verified SOLD: 0
- Verified sale prices: 0
- Comparable ready: 0
- Market-ready towns: 0
- Never attempted remaining: 0

## REVIEW REQUIRED

- 37 review queue items

## PUBLIC SAFETY

Catalogue leaks: **0**
Rebuild: **ALLOWED**

## NEXT ADMIN ACTION

Retry Legacy Failures (5) — 4 legacy failures

## PRODUCTION WRITES

Executed by this script: **none**
Not executed: Acquire P1 / Extract / Retry / Resolve / Quality / Rebuild
