# LIVE SOURCE REFETCH — PRODUCTION EVIDENCE

**Date:** 2026-08-13  
**Verification type:** Read-only Supabase queries (no data modified)  
**Project:** `erflfvhxqitpprczmbiq`  
**Query script:** `scripts/live-refetch-production-evidence-readonly.mjs`  
**Raw JSON:** `LIVE_SOURCE_REFETCH_PRODUCTION_EVIDENCE.json`

---

## Production UI (operator-reported)

| Metric | UI value |
|--------|----------|
| Processed | 5 |
| Changed | 0 |
| Unchanged | 2 |
| Conflicts | 0 |
| License skips | 0 |
| Robots skips | 0 |
| Unavailable | 0 |
| Failed | 0 |

---

## Database summary (read-only)

| Table | Total rows (all time) |
|-------|----------------------|
| `source_refetch_runs` | **7** |
| `source_snapshots` | **5** |

**Latest activity window:** 2026-08-13 14:05:24 UTC → 14:06:29 UTC (operator: `wesselsandre76@gmail.com`)

| DB aggregate (7 runs in session) | Count |
|----------------------------------|-------|
| Processed (runs) | 7 |
| `no_change` | 6 |
| `completed` (changed) | 1 |
| Conflicts | 0 |
| License skips | 0 |
| Robots skips | 0 |
| Unavailable | 0 |
| Failed | 0 |

| DB aggregate (5 unique properties) | Count |
|--------------------------------------|-------|
| Unique properties touched | 5 |
| Latest run `no_change` per property | 4 |
| Latest run `completed`/changed | 1 |

**UI ↔ DB reconciliation:** The operator UI (processed **5**, unchanged **2**, changed **0**) does **not** match the full audit trail in `source_refetch_runs` (7 runs; 6 `no_change`, 1 `completed`/changed). Likely causes: a second refresh click on two properties (duplicate runs for Pretoria + Guest Lodge), and/or UI panel showing a prior partial batch response. Conflicts, license, robots, unavailable, and failed counts **do** match (all zero).

---

## Verification checklist

| # | Requirement | Result | Evidence |
|---|-------------|--------|----------|
| 1 | `source_refetch_runs` contains latest successful runs | **PASS** | 7 rows; all HTTP 200 where fetched; 0 failed |
| 2 | Bidders Choice listings have fetch/refetch records | **PASS** | All runs: `connector_id=bidders_choice`, `partner_code=bidders_choice`, BC URLs |
| 3 | `source_snapshots` contain SHA-256 hashes | **PASS** | 5 snapshots; all `content_hash` valid 64-char hex |
| 4 | `NO_CHANGE` did not create duplicate snapshots | **PASS** | 0 snapshots with `fetched_at` within 2 min of any `no_change` run |
| 5 | DD extraction NOT rerun for `NO_CHANGE` | **PASS** | 0 rows in `due_diligence_extraction_runs` during batch window |
| 6 | Zero conflicts from run | **PASS** | Sum of `conflicts` = 0 |
| 7 | No verified listing silently overwritten | **PASS** | All 5 properties remain `verification_state=verified`; `last_verified_at` unchanged (2026-08-03) |
| 8 | No duplicate Property Master / Auction Event | **PASS** | 0 duplicate auction events for batch property IDs; 0 masters created in batch window |
| 9 | Audit / provenance records exist | **PARTIAL** | `source_refetch_runs` + `source_snapshots` present; `extraction_run_id` null on all runs; no new `due_diligence_extraction_runs` row for changed fetch |

---

## Run records (latest session, chronological)

| Run ID | Run code | Property ID | Title | Status | HTTP | SHA-256 (content_hash) | Conflicts | Fetched (UTC) |
|--------|----------|-------------|-------|--------|------|------------------------|-----------|---------------|
| `699ac26c-d7c0-42a6-8804-0143f83c373a` | `rf_f23a607c-3` | `8125134b-387c-42dd-923a-c6f01826277f` | 20 Bed Guest Lodge Rosettenville | `no_change` | 200 | `33ae0053…73018e5e` | 0 | 2026-08-13 14:05:29 |
| `f5e3851c-9d82-46d3-8aa9-ab795e975b3b` | `rf_240441c8-a` | `e5f7ca0d-8c2e-4ad0-b4c9-934e4b6243f6` | ±32,8Ha Agricultural Holding, Tzaneen | `no_change` | 200 | `5c3f4b29…e4b4a1` | 0 | 2026-08-13 14:05:34 |
| `fa629e8a-8436-4ff2-b60a-225a53ace411` | `rf_c751e80d-0` | `f3f47cca-73c8-420c-9144-146b0f4c9aba` | 8.5HA Vacant Land, Louis Trichardt | **`completed`** | 200 | `ae289066…bb01a9` | 0 | 2026-08-13 14:05:39 |
| `2215c199-0e6c-4e72-a507-4820082c0b8d` | `rf_6d484090-a` | `78e0ab0e-0b33-4a2a-a9e3-eda3677c6209` | 2x Sectional Title Units, Pretoria | `no_change` | 200 | `3e4f1c33…2e5d87` | 0 | 2026-08-13 14:05:44 |
| `eb77b8f6-e9ea-427f-81f9-6ae8a682d5e6` | `rf_bfe82696-1` | `b8eb4cb5-d9c1-46de-a338-266357d3d8f9` | Vacant Stand – Louis Trichardt | `no_change` | 200 | `31b7422f…020a2de` | 0 | 2026-08-13 14:05:48 |
| `00bf158b-0812-4eb5-bd46-8902b9eedcbf` | `rf_8bc89b0a-8` | `8125134b-387c-42dd-923a-c6f01826277f` | 20 Bed Guest Lodge (repeat) | `no_change` | 200 | `33ae0053…73018e5e` | 0 | 2026-08-13 14:06:22 |
| `4dca1047-11c2-4d15-ab49-871f39cb52c1` | `rf_65e5d16d-9` | `78e0ab0e-0b33-4a2a-a9e3-eda3677c6209` | 2x Sectional Title Units (repeat) | `no_change` | 200 | `3e4f1c33…2e5d87` | 0 | 2026-08-13 14:06:29 |

### Source URLs (Bidders Choice)

| Property | Source URL |
|----------|------------|
| Guest Lodge | `https://bidderschoice.co.za/property-listings/online-auction-20-bedroom-guest-lodge-rosettenville-johannesburg/` |
| Tzaneen holding | `https://bidderschoice.co.za/property-listings/online-auction-328ha-prime-agricultural-holding-tzaneen/` |
| Louis Trichardt 8.5Ha | `https://bidderschoice.co.za/property-listings/insolvent-estate-auction-85ha-vacant-land-louis-trichardt/` |
| Pretoria sectional | `https://bidderschoice.co.za/property-listings/insolvent-estate-auction-2x-sectional-title-units-pretoria/` |
| Louis Trichardt stand | `https://bidderschoice.co.za/property-listings/insolvent-estate-auction-vacant-stand-louis-trichardt/` |

*Haenertsburg / Benoni / Crystal Park fixture listings were **not** in this production refresh batch.*

---

## Snapshot records

| Snapshot ID | Property ID | Fetched (UTC) | SHA-256 | Change class | Extraction ver. | New in 2026-08-13 run? |
|-------------|-------------|---------------|---------|--------------|-----------------|------------------------|
| `bcd9d752-c762-4be8-895f-70a7292aeef6` | `f3f47cca-…` | 2026-08-13 14:05:39 | `ae289066…bb01a9` | PROPERTY_DATA_CHANGED | 1.0.0 | **Yes** (only new snapshot) |
| `e14e7c5b-18d4-4937-a384-73a82fa1ee1e` | `b8eb4cb5-…` | 2026-08-08 13:40:04 | `31b7422f…020a2de` | PROPERTY_DATA_CHANGED | 1.0.0 | No (prior) |
| `a6adabcd-20af-4400-9e38-09377682715c` | `78e0ab0e-…` | 2026-08-08 13:39:59 | `3e4f1c33…2e5d87` | PROPERTY_DATA_CHANGED | 1.0.0 | No (prior) |
| `7237ba95-feff-42c4-9712-b70b6b4af240` | `e5f7ca0d-…` | 2026-08-08 13:39:55 | `5c3f4b29…e4b4a1` | PROPERTY_DATA_CHANGED | 1.0.0 | No (prior) |
| `61cb217e-66b1-4e0f-9a3a-cecc99637efb` | `8125134b-…` | 2026-08-08 13:39:50 | `33ae0053…73018e5e` | PROPERTY_DATA_CHANGED | 1.0.0 | No (prior) |

- **Duplicate snapshot count (same property + same hash):** 0  
- **`NO_CHANGE` runs created new snapshots:** 0 (confirmed)

---

## Changed run detail (single)

| Field | Value |
|-------|-------|
| Run | `fa629e8a-8436-4ff2-b60a-225a53ace411` / `rf_c751e80d-0` |
| Property | Insolvent Estate Auction: 8.5HA Vacant Land, Louis Trichardt |
| Status | `completed` |
| `changed` | true |
| `fields_changed` | 18 |
| Change classes | PROPERTY_DATA_CHANGED, AUCTION_DATE_CHANGED, AUCTION_STATUS_CHANGED, LAND_DATA_CHANGED, LEGAL_DATA_CHANGED |
| Conflicts | 0 |
| `extraction_run_id` | null |
| Property still verified | yes (`last_verified_at` 2026-08-03 — not auto-overwritten) |

Extraction ran in-engine (snapshot `extraction_version=1.0.0`) but was **not** persisted to `due_diligence_extraction_runs`.

---

## Extraction status

| Check | Result |
|-------|--------|
| `due_diligence_extraction_runs` during batch | **0 rows** |
| `NO_CHANGE` runs triggered DD table writes | **No** |
| Changed run linked via `extraction_run_id` | **No** (null) |
| Snapshot records extraction version | 1.0.0 on all 5 snapshots |

---

## Verified integrity (no silent overwrite)

| Property ID | Title | `verification_state` | `last_verified_at` | Updated during refetch? |
|-------------|-------|----------------------|--------------------|-------------------------|
| `e5f7ca0d-…` | Tzaneen ±32,8Ha | verified | 2026-08-03 | No (refetch did not change verification timestamp) |
| `f3f47cca-…` | Louis Trichardt 8.5Ha | verified | 2026-08-03 | No |
| `8125134b-…` | Guest Lodge | verified | 2026-08-03 | No |
| `78e0ab0e-…` | Pretoria sectional | verified | 2026-08-03 | No |
| `b8eb4cb5-…` | Louis Trichardt stand | verified | 2026-08-03 | No |

---

## Duplicate checks

| Check | Count |
|-------|-------|
| Duplicate snapshots (same property + hash) | 0 |
| Duplicate auction events (batch properties) | 0 |
| Property masters created in batch window | 0 |
| Total conflicts | 0 |

---

## Evidence gaps

1. **UI batch counts** (5 / 2 / 0) do not match full DB audit (7 / 6 / 1 or deduped 5 / 4 / 1).
2. **`extraction_run_id`** not populated; changed fetch did not write `due_diligence_extraction_runs`.
3. **Fixture listings** (Haenertsburg, Benoni/Crystal Park) not included in this production batch.
4. **Two duplicate manual refreshes** (Guest Lodge + Pretoria) explain extra runs beyond a single batch of 5.

---

## Final Verdict

**PRODUCTION READY WITH EVIDENCE GAP**

The live re-fetch engine is operating safely in production: licensed BC fetches succeed, SHA-256 hashes are stored, `NO_CHANGE` correctly skips duplicate snapshots and DD re-extraction, conflicts are zero, and verified listings were not silently overwritten. However, the operator UI counts cannot be fully reconciled with the audit table, and extraction provenance is incomplete (`extraction_run_id` / `due_diligence_extraction_runs` not updated for the one changed source).
