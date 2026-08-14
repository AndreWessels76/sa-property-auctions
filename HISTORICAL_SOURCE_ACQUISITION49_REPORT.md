# Historical Source Acquisition 4.9 — Live Report

Generated: 2026-08-14T14:48:49.147Z
Mode: READ_ONLY

## VERDICT

**INSUFFICIENT DATA — ENGINE READY**

Source fetches completed but licensed sources have not yielded verified sale outcomes or prices

## Connectivity

CONNECTED: Production database reachable via authoritative tables

## PROVEN

- 33 historical auction events audited
- 38 property masters
- Public catalogue safety — 0 leaks

## TESTED

- HSC 4.8 per-event evidence chain diagnostic
- HEA 4.3 P1–P4 queue integration
- Refetch audit + enrichment run join
- HI 4.2 / HEQ 4.4 / II 4.6 gap mapping

## MISSING

- No verified sale prices in production
- No verified SOLD outcomes in production
- 20 events never fetch-attempted

## LIVE COUNTS

| Metric | Value |
|--------|-------|
| Property Masters | 38 |
| Auction Events | 38 |
| Historical Events | 33 |
| P1 eligible | 24 |
| P4 blocked | 9 |

## FETCH COVERAGE

| Stage | Count |
|-------|-------|
| Source licensed | 33/33 |
| Attempted | 13/33 |
| Successful | 4 |
| Failed | 9 |
| Retryable | 0 |
| Retry exhausted | 9 |
| Permanent | 9 |

## EVIDENCE COVERAGE

| Stage | Count |
|-------|-------|
| Snapshots | 4/33 |
| Extractions | 6/33 |
| Outcome evidence | 1/33 |
| Verified SOLD | 0 |
| SOLD without price | 1 |
| Verified sale prices | 0 |
| Comparable ready | 0 |
| Market ready towns | 0 |

## FAILURE BREAKDOWN

- CONTENT_UNAVAILABLE: 9

## PUBLIC SAFETY

Catalogue leaks: **0**

## BEFORE / AFTER

| Metric | Before | After |
|--------|--------|-------|
| Fetch attempted | 13 | 13 |
| Fetch successful | 4 | 4 |
| Snapshots | 4 | 4 |
| Verified sale prices | 0 | 0 |

**NO EVIDENCE GAIN** — pipeline ready; missing evidence is reported, not fabricated.

## LIMITATIONS

- Read-only validation unless HSA49_WRITE=1 with Operations Centre actions
- Verified SOLD = 0 is acceptable when sources lack explicit sale evidence

## NEXT ACTION

Controlled **Acquire P1 (5)** via Operations Centre when ready — do not run unbounded batches.

## Source Health

### Bidders Choice
Eligible: 33 · Attempted: 13 · Success rate: 30.8%
