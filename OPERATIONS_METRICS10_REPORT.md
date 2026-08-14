# Operations Metrics 1.0 — Live Validation Report

**Verdict:** LIVE OPERATIONS METRICS 1.0 — READY

**Generated:** 2026-08-14T13:17:48.231Z  
**SA date:** 2026-08-14  
**Timezone:** Africa/Johannesburg  
**Version:** operations-metrics-1.0.0

## Confirmation

- No hardcoded demo values (18,432 / 57,892 / 842 / 75%) are used in this report.
- All counts below are read directly from production Supabase tables.

## Metrics

| Metric | Source | Value |
|--------|--------|-------|
| Properties total | `properties` (excl. seed/demo) | 38 |
| Properties today | `imported_at` or `created_at` (SA day) | 0 (0 today) |
| Images total | `property_images` | 443 |
| Images today | `property_images.created_at` (SA day) | 0 (0 today) |
| Merged records | `property_merge_history` | 0 |
| Failed imports | `import_jobs` (Failed/error) | 0 |

## Import queue

- **Source:** `import_queue.queue_status`
- **Total:** 0
- **Completed:** 0
- **Failed:** 0
- **Waiting:** 0
- **Running:** 0
- **Percentage:** 0%
- **Label:** No active queue items
- **Formula:** completed / total × 100 (rounded)

## Day bounds (UTC ISO)

- Start: 2026-08-13T22:00:00.000Z
- End: 2026-08-14T22:00:00.000Z

## Limitations

None — all authoritative tables queried successfully.

## API

- `GET /api/admin/operations/metrics` (admin-authenticated)
