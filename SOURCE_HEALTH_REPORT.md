# SOURCE HEALTH REPORT

**Date:** 2026-08-08  
**Engine:** Live Source Re-fetch 1.0

---

## Health states

| State | When |
|-------|------|
| HEALTHY | completed / no_change |
| DEGRADED | rate/interval/lock skips or conflicts after change |
| BLOCKED | missing URL / connector |
| LICENSE_EXPIRED | SKIPPED_LICENSE |
| ROBOTS_BLOCKED | SKIPPED_ROBOTS |
| SOURCE_UNAVAILABLE | 403 / 404 / 410 (listing retained) |
| ERROR | fetch/extraction failure |
| UNKNOWN | no runs yet |

Health is derived from observed fetch/audit status only — never fabricated.

---

## Monitoring metrics (`summarizeRefetchMetrics`)

- Fetch success / failure rate  
- Robots blocks · License skips  
- HTTP 403 / 404 / 429 · 5xx  
- Changed vs no-change sources  
- Conflicts · Fields updated  

## Alerts (`buildRefetchAlerts`)

- Repeated failures (≥3)  
- License / robots blocks  
- Many changed listings (≥10)  
- Auction date changes  
- Document changes  
- Verified conflicts  
- Source disappearance (unavailable)

---

## Partner dashboard

`PartnershipPlatformService.getPartnerDashboard` exposes soft `sourceRefresh` summary:

- lastFetch, successRate, changedListings, failedListings  
- licenseSkips, robotsSkips, totalRuns  

No secrets, raw HTML, or private snapshots.

---

## Cron health check

`GET /api/cron/source-refetch`  

- Unauthorized without `Authorization: Bearer CRON_SECRET` → **401** (production)  
- Returns aggregate counts only (no private source bodies)

---

## Current evidence posture

Offline selftests: **PASS**.  
Live BC health samples: **not collected** in this run (fetch env disabled). Sources without runs remain **UNKNOWN**.
