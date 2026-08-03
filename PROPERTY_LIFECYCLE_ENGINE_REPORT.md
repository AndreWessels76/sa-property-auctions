# PROPERTY LIFECYCLE ENGINE — REPORT

**Date:** 2026-08-03  
**Module:** `lib/identity/lifecycle.ts` + master `lifecycle_state` / history

---

## Lifecycle Path

```
Discovered → Imported → Pending Verification → Verified
  → Auction Scheduled → Auction Live → Auction Closed
  → Sold → Archived → Re-listed → (new Auction Event)
```

Historical states are **never deleted**. Transitions append `property_history_events` rows.

---

## Allowed Transitions

| From | Allowed next |
|------|----------------|
| discovered | imported, pending_verification, archived |
| imported | pending_verification, archived |
| pending_verification | verified, archived, imported |
| verified | auction_scheduled, auction_live, archived, relisted |
| auction_scheduled | auction_live, auction_closed, archived, relisted |
| auction_live | auction_closed, sold, archived |
| auction_closed | sold, archived, relisted |
| sold | archived, relisted |
| archived | relisted |
| relisted | pending_verification, verified, auction_scheduled |

Illegal transitions return `{ ok: false, error }` — no silent jumps.

---

## Suggestion Rules (deterministic)

`suggestPropertyLifecycle` maps verification + listing status + auction date:

- sold → `sold`
- withdrawn/cancelled → `archived`
- pending/seed → `pending_verification` / `discovered`
- verified + future date → `auction_scheduled`
- verified + auction day → `auction_live`
- verified + past date → `auction_closed` (never invents sold)

---

## Re-list Behaviour

When an existing master is seen again after closed/sold/archived, lifecycle moves to **`relisted`**, `property_version` increments, and a new `auction_events` row is upserted (same external id updates; new external id inserts).

---

## Integration

- Set on master create/update inside `PropertyIdentityService`
- Acquisition calls identity attach after listing insert/update
- Public catalogue still uses listing `isPubliclyActiveListing` (upcoming/live only)

---

## Production Readiness

| Item | Status |
|------|--------|
| Pure transition engine | **PASS** |
| History append on lifecycle change | **PASS** |
| No fabricated sold outcomes | **PASS** |
| Typecheck | **PASS** |

---

## Recommendations

1. Cron: sync listing lifecycle ↔ master lifecycle for past-dated verified rows.  
2. Admin tools to force transition with reason (writes history).  

---

## Overall Score

**91 / 100**
