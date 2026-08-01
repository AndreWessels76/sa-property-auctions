# ADMIN VERIFICATION GUIDE

## Access

- Path: `/admin/verification`  
- API: `GET/POST /api/admin/verification`  
- Requires admin (`PermissionService.requireAdmin`)  
- Sidebar: **Verification**

## Panels

1. **Needs Verification / Missing Images / Missing Address / Expired** — queue stats  
2. **Quality statistics** — admin-only overall averages + state counts  
3. **Verification queue** — set Pending / Verified / Archive  
4. **Duplicate candidates** — confidence + matched signals  
5. **Source errors** — missing provenance / agency column gaps  
6. **Import logs** — pipeline audit events  
7. **Source connectors** — registry versions  

## Operator workflow

1. Open Verification.  
2. Filter mentally: seed → convert Pending (migration may already have).  
3. Open listing + original source URL.  
4. Confirm address/auction/images against source.  
5. Click **Verified** only when source-confirmed.  
6. **Archive** placeholders that cannot be verified.  
7. Review duplicate candidates before imports.

## Scheduled jobs

Cron: `/api/cron/data-foundation?cadence=daily|weekly|monthly`  
Auth: `Authorization: Bearer $CRON_SECRET` (required in production).  
Definitions: `lib/jobs/scheduledJobs.ts` · schedules in `vercel.json`.

Daily: verify queue hint, lifecycle update, metadata refresh.  
Weekly: quality audit, broken links, expired.  
Monthly: archive policy stub, recalculate quality.

## Important

Marking **Verified** sets `last_verified_at` and `data_classification=production`. This is an operator attestation — not an automated scrape confirmation.
