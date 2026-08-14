# Property History Backfill Production Reconciliation 1.0

**Date:** 2026-08-14  
**Investigation:** Operations Centre showed last run “Masters created: 38 / Events created: 38” while dashboard counters showed Property Masters: 0, Auction Events: 0.

---

## 1. Root cause

**The last production run was a dry-run preview, not an execute backfill.**

Production query evidence (`PROPERTY_HISTORY_BACKFILL_RECONCILIATION_LIVE.json`):

| Field | Value |
|-------|-------|
| `latestRun.run_kind` | `preview` |
| `latestRun.dry_run` | `true` |
| `latestRun.id` | `6a21a953-da47-4cdd-8bfa-3f7ff43d36c7` |

**No Property Masters or Auction Events were ever written.** The dashboard counters (0 / 0) were **correct**. The “Last run” panel was **misleading** because:

1. **Counter semantics bug:** `applyRecordCounters()` incremented `masters_created` / `events_created` during dry-run projection, treating proposed records as persisted.
2. **UI labelling bug:** “Masters created” / “Events created” did not indicate dry-run mode.
3. **Audit item insert failure (secondary):** Dry-run used placeholder ID `"dry-run-master"` for `property_master_id` on audit items, violating the UUID FK → all 38 `property_history_backfill_items` inserts failed silently (`items COUNT = 0`).

There was **no** UI readback/cache bug, **no** RLS blocking service-role reads, and **no** partial persistence of masters/events.

---

## 2. Actual production counts

| Table | COUNT(*) |
|-------|----------|
| `property_masters` | **0** |
| `auction_events` | **0** |
| `property_history_backfill_runs` | **1** |
| `property_history_backfill_items` | **0** |
| `property_history_backfill_reviews` | **0** |

---

## 3. Last backfill run

| Field | Value |
|-------|-------|
| Run ID | `6a21a953-da47-4cdd-8bfa-3f7ff43d36c7` |
| Status | `completed` |
| Kind | `preview` |
| Dry run | `true` |
| Scanned | 38 |
| Masters created (stored — inflated) | 38 |
| Events created (stored — inflated) | 38 |
| Masters matched | 0 |
| Review required | 0 |
| Duplicates skipped | 0 |
| Pricing linked | 0 |
| Started | `2026-08-14T06:34:22.735851+00:00` |
| Completed | `2026-08-14T06:34:39.702+00:00` |

---

## 4. Do 38 masters actually exist?

**No.** Sample query returned empty. `property_masters COUNT(*) = 0`.

---

## 5. Do 38 events actually exist?

**No.** Sample query returned empty. `auction_events COUNT(*) = 0`.

---

## 6. Relationship / linkage results

| Metric | Value |
|--------|------:|
| Historical properties | 38 |
| `property_master_id` populated | 0 |
| Auction events linked to valid masters | 0 |
| Orphan events | 0 |

---

## 7. Duplicate protection verified

- Idempotency keys unchanged (fingerprint + `(connector_id, external_listing_id)` unique index).
- No masters/events exist → no duplicates created.
- Public catalogue: **5** upcoming/live, **0** historical leaks.
- Reconciliation refresh is read-only; no duplicate risk from this investigation.

---

## 8. Dashboard query analysis

**Property Masters / Auction Events counters** (`PropertyHistoryBackfillService.audit()`):

- Previously: `listCandidates(5000).length` / `listAll(5000).length` — capped but accurate when rows exist.
- **Fixed:** `PropertyMasterRepository.count()` / `AuctionEventRepository.count()` — exact `COUNT(*)` head queries.

**Review queue:** `PropertyHistoryBackfillRepository.listPendingReviews()` — correctly 0.

**Last run:** `property_history_backfill_runs` ordered by `started_at DESC LIMIT 1` — correct; stored counters were wrong due to dry-run inflation (now fixed forward).

Dashboard showing 0 was **not** a readback defect.

---

## 9. Code changes (fix root cause)

| File | Change |
|------|--------|
| `lib/services/PropertyHistoryBackfillService.ts` | Separate **proposed** vs **persisted** counters; only increment created after confirmed DB write; dry-run stores proposed in `meta`; sanitize UUIDs on audit items |
| `lib/backfill/types.ts` | Add `masterPersisted`, `eventPersisted`, `masterProposed`, `eventProposed`, `mastersProposed`, `eventsProposed` |
| `lib/repositories/PropertyIdentityRepository.ts` | Add `count()` on masters and events |
| `app/admin/operations/components/PropertyHistoryBackfillPanel.tsx` | Show dry-run badge; “proposed” vs “persisted” labels |
| `scripts/property-history-backfill-reconciliation-live.ts` | Read-only production reconciliation script (new) |

**Execute-mode persistence** now requires:

- `masterPersisted = Boolean(attached.master?.id && attached.schemaAvailable)`
- `eventPersisted = Boolean(upserted?.id)`

---

## 10. Validation results

All executed and **PASS**:

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

## 11. Is another backfill execution required?

**Yes — one safe execute backfill is still required.**

Nothing was persisted. After deploying these fixes:

1. Use **Dry run preview** first (will show “proposed”, persisted = 0).
2. Then **Execute backfill** once (not preview).
3. Verify dashboard counters rise to match persisted counts.
4. Re-run Historical Intelligence audit — event-backed rows should appear.

**Do not re-run until fixes are deployed.**

---

## VERDICT

### **NO ISSUE — UI CACHE/REFRESH ONLY**

(with counter-semantics and dry-run labelling defects fixed)

Production database correctly contains **zero** masters and events. The inconsistency was caused by a **dry-run preview** being reported as “created”. Dashboard readback was accurate. Execute backfill has not yet run successfully.

---

## Evidence files

- `PROPERTY_HISTORY_BACKFILL_RECONCILIATION_LIVE.json` — read-only production queries (2026-08-14)
