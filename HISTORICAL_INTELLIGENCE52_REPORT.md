# Historical Intelligence 5.2 — Live Report

Generated: 2026-08-14T19:44:21.239Z

## VERDICT

**INSUFFICIENT DATA — ENGINE READY**

Engine operational — verified sale evidence still insufficient

## PROVEN IN PRODUCTION

- Public catalogue safety — 0 leaks
- Licensed sources: 33/33
- Historical events: 33
- 9 successful fetches in production

## TESTED

- HI 5.2 controlled batch orchestration (limit 5)
- P1 / Legacy / Extraction dry-run paths
- Fetch classifier + legacy separation

## ENGINE READY

- Acquire P1 (5) via HEA 4.3
- Retry Legacy Failures (5)
- Extract Existing Snapshots (5) without refetch
- HI 4.2 resolve + HEQ 4.4 quality + rebuild

## INSUFFICIENT DATA

- No verified SOLD outcomes
- No verified sale prices — do not declare sale statistics ready
- Comparable ready = 0 (threshold not met)
- Market ready towns = 0 (min 5 sales)
- 20 events never fetch-attempted

## REVIEW REQUIRED

- 4 P4 blocked records visible

## PRODUCTION COUNTS

| Metric | Value |
|--------|-------|
| Historical Events | 33 |
| Licensed Sources | 33/33 |
| Fetch Attempted | 13/33 |
| Never Attempted | 20 |
| Fetch Successful | 9 |
| Fetch Failed | 4 |
| Retryable | 0 |
| Permanent | 4 |
| Legacy Failures | 4 |
| Snapshots | 4/33 |
| Missing Extraction | 0 |
| Extractions | 9/33 |
| Outcome Evidence | 2/33 |
| Verified SOLD | 0 |
| SOLD Without Price | 2 |
| Verified Sale Prices | 0 |
| Comparable Ready | 0 |
| Market Ready Towns | 0 |
| Catalogue Leaks | 0 |

## BOTTLENECK

**FETCH_NOT_ATTEMPTED** — 20/33

Recommended: Acquire P1 (5)

- FETCH_NOT_ATTEMPTED: 20/33 → Acquire P1 (5)
- LEGACY_UNKNOWN_FAILURE: 4/33 → Retry Legacy Failures (5)
- OUTCOME_MISSING: 7/33 → Resolve Evidence (HI 4.2)
- SALE_PRICE_MISSING: 2/33 → Quality Audit (HEQ 4.4) — explicit sale evidence only
- SOURCE_BLOCKED: 4/33 → Review source / licensing

## STAGES

- **A_P1** P1 Unattempted Recovery: eligible 20, next 5, remaining 20
- **B_LEGACY** Legacy Failure Recovery: eligible 4, next 4, remaining 4
- **C_EXTRACTION** Existing Snapshot Extraction: eligible 0, next 0, remaining 0
- **D_RESOLUTION** Resolution & Quality Rebuild: eligible 9, next 5, remaining 9

## PUBLIC SAFETY

Catalogue leaks: **0**

## NEXT ADMIN ACTION

FETCH_NOT_ATTEMPTED (20/33) → Acquire P1 (5)
