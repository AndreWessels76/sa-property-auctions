# Historical Intelligence 5.5 — Live Report

Generated: 2026-08-15T12:37:39.501Z

## VERDICT

**CAMPAIGN IN PROGRESS**

Historical evidence recovery still has unattempted or incomplete events

## CAMPAIGN

**CAMPAIGN_IN_PROGRESS**

P1 Progress [░░░░░░░░░░░░░░░░] 0 / 19
Remaining: 19

P1 Progress [░░░░░░░░░░░░░░░░] 0 / 19 · Remaining: 19

Data coverage improving: **NO**
Data coverage ready: **NO**

## PRODUCTION COUNTS

| Metric | Value |
|--------|-------|
| Historical Events | 33 |
| Licensed Sources | 33/33 |
| Fetch Attempted | 14 |
| Never Attempted | 19 |
| Fetch Successful | 9 |
| Fetch Failed | 5 |
| Snapshots | 9/33 |
| Extractions | 14/33 |
| Outcome Evidence | 4/33 |
| Verified SOLD | 0 |
| SOLD Without Price | 4 |
| Verified Sale Prices | 0 |
| Comparable Ready | 0 |
| Market Ready Towns | 0 |
| Catalogue Leaks | 0 |

## RECOVERY LANES

Never attempted (P1): **19**
Legacy unknown failures: **5**
Retryable failures: **0**
Snapshot extraction pending: **0**

## EVIDENCE FUNNEL

33 Licensed Sources
↓ 14 Fetch Attempted
↓ 9 Fetch Successful
↓ 9 Snapshots
↓ 14 Extractions
↓ 4 Outcome Evidence
↓ 0 Verified SOLD
↓ 0 Verified Sale Price
↓ 0 Comparable Ready
↓ 0 Market Ready

## BOTTLENECK

**FETCH_NOT_ATTEMPTED** — 19/33 (57.6%)

Recommended: Acquire P1 (5)

## BATCH PLAN

4 admin-triggered batch(es) of ≤5 required — never process all 19 automatically

## PROVEN

- Public catalogue safety — 0 leaks
- Historical events: 33
- Licensed sources: 33/33
- Fetch attempted: 14/33
- Fetch successful: 9

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
- Never attempted remaining: 19

## REVIEW REQUIRED

- 19 review queue items

## PUBLIC SAFETY

Catalogue leaks: **0**
Rebuild: **ALLOWED**

## NEXT ADMIN ACTION

Dry Run P1 (5) → Acquire P1 (5) — 19 never-attempted remaining

## PRODUCTION WRITES

Executed by this script: **none**
Not executed: Acquire P1 / Extract / Retry / Resolve / Quality / Rebuild
