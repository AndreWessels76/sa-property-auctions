# Property History Backfill — Post-Execution Reconciliation 2.0

**Date:** 2026-08-14  
**Execute run ID:** `e66899c5-9d33-403d-932b-2b880e80ae53`  
**Evidence:** `PROPERTY_HISTORY_BACKFILL_POST_EXECUTION_LIVE.json`

---

## 1. Exact production counts (direct Supabase query)

| Table | COUNT(*) |
|-------|----------|
| `property_masters` | **36** |
| `auction_events` | **38** |
| `property_history_backfill_runs` | 3 |
| `property_history_backfill_items` | 152 |
| `property_history_backfill_reviews` | 0 |

---

## 2. Why 38 persisted vs 36 current masters

**The run counter `masters_created: 38` counted listings attached, not unique master rows inserted.**

Reconciled totals for execute run `e66899c5`:

| Metric | Count | Meaning |
|--------|------:|---------|
| Scanned | 38 | Historical listings processed |
| **Unique masters inserted** | **36** | Rows in `property_masters` |
| **Masters reused (in-batch)** | **2** | Second listing in each shared pair |
| **Listings attached to a master** | **38** | All properties have `property_master_id` |
| **Events inserted** | **38** | One event per listing |
| **Orphan events** | **0** | All events reference valid masters |

**36 + 2 reuse = 38 listing attachments.** Dashboard master count **36 is correct**.

### Shared master pairs (identity review required)

| Master ID | Fingerprint on master row | Properties | Issue |
|-----------|---------------------------|------------|-------|
| `852a132f-…` | `pf_bef9d699_8f8a8c1d` | Louis Trichardt 8.5HA land + Vacant stand (Flamboyant St) | Listing fingerprints **differ** (`pf_bef9d699` vs `pf_92d9ef98`) — merged via in-batch scoring, not exact fingerprint |
| `7eaf47fc-…` | `pf_a4fe9fc8_92bff1cc` | Pretoria sectional units + Pretoria North agricultural holding | Listing fingerprints **differ** (`pf_a4fe9fc8` vs `pf_8774c80f`) — different streets/towns merged to one master |

These are **not title-only merges** (multi-signal: town/province/ext/title), but **fingerprints are not identical**. Admin should review whether the two Louis Trichardt and two Pretoria-area listings truly represent the same physical property.

---

## 3. Meaning of `duplicates skipped: 38`

**This was a counter bug, not real duplicate suppression.**

Root cause: after `resolveAndAttach()` created an event, the service called `assessBackfillEvent({ existingEventId: auctionEventId })`, which always flagged `isDuplicate: true`. The counter incremented `duplicates_skipped` for all 38 records even though 38 **new** events were inserted.

**Corrected semantics (code fix):**

| Counter | Meaning |
|---------|---------|
| `mastersInserted` | New `property_masters` rows |
| `mastersReused` | Existing master linked (fingerprint/match) |
| `mastersCreated` / `mastersAttached` | Listings linked (insert + reuse) |
| `eventsInserted` | New `auction_events` rows |
| `eventsReused` | Existing event linked |
| `eventsDuplicatesSkipped` | Skipped because pre-existing duplicate found **before** this record's work |

For this execute run the corrected values would be: **mastersInserted=36, mastersReused=2, eventsInserted=38, eventsDuplicatesSkipped=0**.

---

## 4. Latest execute run

| Field | Value |
|-------|-------|
| Run ID | `e66899c5-9d33-403d-932b-2b880e80ae53` |
| run_kind | `backfill` |
| dry_run | `false` |
| status | `completed` |
| scanned | 38 |
| masters_created (stored — misleading) | 38 |
| events_created (stored) | 38 |
| duplicates_skipped (bug) | 38 |
| started_at | 2026-08-14T06:50:53Z |
| completed_at | 2026-08-14T06:51:54Z |

Backfill items (76 rows = 2 audit rows × 38 listings): **38× MASTER_CREATED, 38× EVENT_MATCHED** (audit labels also fixed to show MASTER_MATCHED when reusing).

---

## 5. Master identity reconciliation

```text
Historical properties:     38
property_master_id set:  38
Unique master IDs:         36
Without master:            0
Masters with 2 listings:   2
```

---

## 6. Event reconciliation

```text
auction_events rows:       38
Listings with event:       38
Without event:             0
Orphan events:             0
Duplicate event fingerprints: 0
```

Every event references a valid Property Master.

---

## 7. Historical Intelligence

| Metric | Count |
|--------|------:|
| Corpus | 38 |
| **Event-backed** | **38** |
| Listing fallback | 0 |
| Public historical rows | 33 |
| Upcoming excluded | 5 |
| Public historical leaks | **0** |

Backfill succeeded in moving Historical Intelligence from 100% listing fallback to **100% event-backed**.

---

## 8. Pricing linkage

```text
pricing_observations:      0
linked to events:            0
```

Expected — no pricing observations in production yet.

---

## 9. Identity & public safety

| Check | Result |
|-------|--------|
| Title-only forced matches | None detected |
| Silent merges | 2 pairs merged via scoring — **review recommended** |
| Duplicate masters from rerun | N/A (not rerun) |
| Duplicate events | 0 fingerprint collisions |
| Orphan events | 0 |
| Public catalogue leaks | 0 |
| Verified listings overwritten | No |

---

## 10. Idempotency (isolated test — no production writes)

Self-test confirms:

- Identical fingerprint inputs → `matchClass: same` → second run would reuse, not insert
- `NEW_MASTER` + `created=false` → audit `MASTER_MATCHED`
- Event duplicate assessment only when pre-existing external key found

**Projected second execute run:** 0 new masters, 0 new events, 38 reuse/match operations.

---

## 11. Code / UI fixes applied

| File | Fix |
|------|-----|
| `PropertyHistoryBackfillService.ts` | Split inserted/reused/duplicate counters; fix false duplicate flag after identity attach |
| `lib/backfill/types.ts` | Extended summary types |
| `lib/backfill/identityDecision.ts` | `NEW_MASTER` + !created → `MASTER_MATCHED` |
| `PropertyHistoryBackfillPanel.tsx` | Show inserted/reused/attached; clarify duplicate skipped |
| `scripts/history-backfill-selftest.cjs` | Counter + idempotency tests |
| `scripts/property-history-backfill-post-execution-live.ts` | Read-only reconciliation script |

Run row `masters_created` / `events_created` now store **inserted** counts; meta holds attached/reused breakdown.

---

## 12. Validation (all PASS)

- `npm run typecheck`
- `npm run build`
- `npm run test:history-backfill`
- `npm run test:historical-intelligence`
- `npm run test:pricing-acquisition`
- `npm run test:pricing`
- `npm run test:dd`
- `npm run test:refetch`
- `npm run test:investor-intelligence`
- `npm run test:ops-quick-actions`

---

## VERDICT

### **MASTER IDENTITY DISCREPANCY — REVIEW REQUIRED**

**Data is largely correct** (36 masters, 38 events, 38/38 event-backed HI, public catalogue clean). The **36 vs 38 discrepancy is explained** by 2 in-batch master reuses, not missing data.

**However**, 2 property pairs share a master despite **different computed fingerprints** — admin review recommended for:

1. Louis Trichardt vacant land vs vacant stand (41 Flamboyant Street)
2. Pretoria sectional units vs Pretoria North agricultural holding

**Do not rerun backfill.** Deploy counter/UI fixes, then review the 2 shared masters in admin before treating identity as fully reconciled.

Counter bug (`duplicates skipped: 38`) is **RECONCILED — UI COUNTERS FIXED** in code; historical run row retains legacy misleading values until next execute.

---

## Recommended admin actions

1. Review shared master `852a132f-…` — split if distinct properties
2. Review shared master `7eaf47fc-…` — split if distinct properties  
3. Deploy reconciliation 2.0 counter fixes
4. **Do not** execute another full backfill (idempotent reuse only)
