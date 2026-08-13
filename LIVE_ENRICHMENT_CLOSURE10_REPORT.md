# LIVE ENRICHMENT CLOSURE 1.0 — FINAL PRODUCTION EVIDENCE

**Date:** 2026-08-13  
**Code:** extraction linkage + `enrich_from_snapshot` + targeted live refresh  
**Evidence:** `LIVE_ENRICHMENT_CLOSURE_EVIDENCE.json`  
**Operator:** `enrichment_closure` (local script against production DB) + prior Ops operator `wesselsandre76@gmail.com`

---

## 1. Previous Evidence Gap

`source_refetch_runs.extraction_run_id` was **NULL** on the first production batch because the refetch engine ran `runDueDiligenceExtraction` **in memory only**.

It stored field diffs in `source_snapshots.meta`, but never called `DueDiligenceExtractionRepository.recordRun`, and `RefetchAudit.recordRun` did not write `extraction_run_id`.

Chain broke at:

```
Refetch Run → Snapshot → (in-memory extraction) ✗ no DD row
```

---

## 2. Fix

On **CONTENT_CHANGED** (hash differs from previous snapshot):

1. Insert append-only `source_snapshots` row.
2. Call `persistRefetchExtraction()` → existing `runDueDiligenceExtraction` + `DueDiligenceExtractionRepository.recordRun`.
3. Write `extraction_run_id` onto `source_refetch_runs`.
4. Store provenance in `result_json.refetch_provenance` (`source_snapshot_id`, `content_hash`, `refetch_run_code`).

On **NO_CHANGE** (same SHA-256):

- No new snapshot
- No DD extraction
- `extraction_run_id` remains NULL

`force` still skips the **interval** gate. It no longer bypasses hash equality (duplicate-snapshot fix after Benoni).

Admin API action: `enrich_from_snapshot` backfills linkage from an existing snapshot without a new HTTP fetch.

No schema migration was required: `extraction_run_id` already existed on `source_refetch_runs`.

---

## 3. Louis Trichardt Evidence

**8.5HA Vacant Land, Louis Trichardt** (already CONTENT_CHANGED in the first live batch)

| Link | ID |
|------|-----|
| Property | `f3f47cca-73c8-420c-9144-146b0f4c9aba` |
| Source URL | `https://bidderschoice.co.za/property-listings/insolvent-estate-auction-85ha-vacant-land-louis-trichardt/` |
| Refetch run | `fa629e8a-8436-4ff2-b60a-225a53ace411` / `rf_c751e80d-0` |
| HTTP | 200 |
| Snapshot | `bcd9d752-c762-4be8-895f-70a7292aeef6` |
| SHA-256 | `ae2890667eba5c0c3197ca85c14652bcc5c39b1655905f8d105c71fee5bb01a9` |
| Change | CONTENT_CHANGED (`changed=true`, 18 field diffs) |
| DD extraction run | **`6d1e3231-4b59-46a9-9c07-3d7620669b4d`** |
| Fields found | 18 |
| Conflicts | 0 |
| Verification | still `verified`; `last_verified_at` 2026-08-03 (not overwritten) |
| Duplicate events | 0 |

Chain:

```
bidders_choice → rf_c751e80d-0 → snapshot bcd9d752… → DD 6d1e3231… → 18 fields / 0 conflicts
```

---

## 4. Haenertsburg Evidence

**Online Auction Guest Farm Haenertsburg Magoebaskloof Limpopo**

| Field | Value |
|-------|-------|
| Property ID | `3e7ea1ff-f237-4a6c-8b36-23bb34c4136c` |
| Source URL | `https://bidderschoice.co.za/property-listings/online-auction-guest-farm-haenertsburg-magoebaskloof-limpopo/` |
| Run | `be25b6e8-944d-4b17-a635-d6bb64eae8dc` / `rf_fa94a312-2` |
| HTTP | 200 |
| Snapshot | `32390623-9c15-4393-833e-a0c16a17153c` (first snapshot for this listing) |
| SHA-256 | `ce53665fb1dcb77ac9bf5b2a9f87b833915f37570920c76ea9c9bc417a74cb8a` |
| Status | `completed` / CONTENT_CHANGED (no prior hash) |
| Extraction run | **`b14d97b7-f65d-442f-a80f-e98c8c94b17e`** |
| Fields found | 20 |
| Land size extracted | **4.164 Ha** (`Combined Extent: ± 4.164Ha`, approximate=true) |
| Town | Haenertsburg |
| Conflicts | 0 |
| Lifecycle state | `expired` (auction already passed — not silently re-verified) |
| Duplicate events | 0 |

First attempt `rf_bd86f921-8` was **SKIPPED_LICENSE** (local env missing fetch allow). That is correct gate behaviour, not a fetch.

---

## 5. Benoni Evidence

**Insolvent Estate Online Auction Unit in Crystal Park Benoni** (SS The Orchards)

| Field | Value |
|-------|-------|
| Property ID | `97ae53e8-ecc0-4ad0-bb8f-b52cfa9a03bd` |
| Source URL | `https://bidderschoice.co.za/property-listings/insolvent-estate-online-auction-2-bedroom-unit-in-ss-the-orchards-crystal-park-ext-28-benoni/` |
| Run | `d679e966-535b-49c9-9893-788b20d16c6b` / `rf_973219b4-4` |
| HTTP | 200 |
| Snapshot | `dd1d2159-bc43-42d1-8ff7-ba66b48ca5de` |
| SHA-256 | `245f790c533e8fc22b3b9c9d5d84039720591b65e1ffd4953a3b3b4586daa783` |
| Extraction run | **`5e7f8ad4-ec48-4be1-a3d9-e1316d011cb7`** |
| Fields found | 18 |
| Structured facts still on listing | bedrooms **2**, town **Benoni** |
| Extracted suburb | Crystal Park |
| Conflicts | 0 |
| Lifecycle state | `expired` |
| Duplicate events | 0 |

**Known issue on this run:** hash matched the 2026-08-08 snapshot (`bf6fa956-…`), but `force=true` still inserted a second snapshot and re-ran extraction. That bypass is **now removed** — identical hashes always return `NO_CHANGE` with `extraction_run_id=NULL`.

---

## 6. Safety Verification

| Rule | Result |
|------|--------|
| No silent verified overwrite | **PASS** — Louis Trichardt remains `verified`; `last_verified_at` unchanged |
| Haenertsburg / Benoni not auto-reverified | **PASS** — remain `expired` |
| NO_CHANGE duplicate snapshots (interval/hash) | **PASS** on first production batch; Benoni force-duplicate noted and code-fixed |
| Duplicate Property Masters | **PASS** — none created (`property_master_id` still null; no new master rows) |
| Duplicate Auction Events | **PASS** — 0 events for these listing IDs |
| No auto-verification | **PASS** — extraction stored as evidence only |
| No fabricated values | **PASS** — Haenertsburg 4.164 Ha from source text; Benoni 2-bed / Crystal Park / Benoni from source |
| License gate | **PASS** — fetch blocked until operational allow env present |
| Robots | No `SKIPPED_ROBOTS` on successful fetches |

---

## 7. Automated Validation

| Check | Result |
|-------|--------|
| Typecheck | **PASS** |
| Build | **PASS** |
| Refetch tests (`npm run test:refetch`) | **PASS** |
| DD tests (`npm run test:dd`) | **PASS** |
| Ops tests (`npm run test:ops-quick-actions`) | **PASS** |

New regression coverage: CONTENT_CHANGED persists extraction + `extraction_run_id`; NO_CHANGE path does not call `persistRefetchExtraction`; `enrich_from_snapshot` API action exists.

---

## 8. Final Verdict

**PRODUCTION READY WITH MINOR EVIDENCE GAP**

Changed-source linkage is now live:

- Louis Trichardt: refetch → snapshot → **DD run `6d1e3231…`**
- Haenertsburg: live HTTP 200 → snapshot → **DD run `b14d97b7…`** (4.164 Ha from source)
- Benoni: live HTTP 200 → snapshot → **DD run `5e7f8ad4…`** (2-bed / Crystal Park / Benoni)

Not scored **PRODUCTION READY** because:

1. Haenertsburg and Benoni are currently **`expired`**, not `verified` (lifecycle already applied).
2. Benoni’s forced refresh created a **same-hash snapshot** (fixed in code; historical duplicate row remains).
3. Local first attempts correctly **SKIPPED_LICENSE** until the production fetch-allow env was present.

Core enrichment chain for changed sources is now traceable in production.
