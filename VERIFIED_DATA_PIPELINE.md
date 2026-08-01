# VERIFIED DATA PIPELINE

DATA FOUNDATION 2.0 establishes a production-oriented verified property pipeline for SA Property Auctions.

## Goals

Every public listing must be real, traceable, verified (or explicitly pending), up-to-date, and linked to its original auction source.

## Architecture

```
Source connectors (licensed/CSV/manual)
        ↓
Import pipeline stages + audit trail
        ↓
Normalize → Validate → Deduplicate → Merge
        ↓
Verify → Publish → Archive
        ↓
Admin verification dashboard + scheduled jobs
```

## Core modules

| Concern | Module |
|--------|--------|
| Verification states | `lib/data/verificationStates.ts` |
| Connectors registry | `lib/connectors/sourceRegistry.ts` |
| Import stages | `lib/imports/ImportPipeline.ts` |
| Audit trail | `lib/imports/ImportPipelineAudit.ts` |
| Verification service | `lib/services/VerificationService.ts` |
| Verification repository | `lib/repositories/VerificationRepository.ts` |
| Multi quality scores | `lib/data/multiQualityScore.ts` |
| Lifecycle | `lib/data/listingLifecycle.ts` |
| Deduplication | `lib/data/deduplicationStandard.ts` |
| Scheduled jobs | `lib/jobs/scheduledJobs.ts` |
| Cron API | `app/api/cron/data-foundation/route.ts` |
| Admin UI | `app/admin/verification` |

## Rules

- No scraping where prohibited; connectors are framework-first (`licensed_feed` / `csv` / `manual`).
- Never fabricate addresses, auction outcomes, or comparable sales.
- Quality scores are admin-only (`data_quality_score` stripped from public DTO).
- Seed inventory converts to **Pending Verification** or **Archived**, never auto-**Verified**.

## Migrations

1. `supabase/migrations/20260801100000_data_foundation_verification_pipeline.sql`
2. `supabase/migrations/20260801101000_data_foundation_seed_cleanup.sql`

Apply in Supabase SQL Editor (or CLI) before relying on structured columns / pipeline events.

## Related docs

- `IMPORT_PIPELINE.md`
- `VERIFICATION_STANDARD.md`
- `DEDUPLICATION_STANDARD.md`
- `DATA_QUALITY_STANDARD.md`
- `SOURCE_CONNECTOR_GUIDE.md`
- `ADMIN_VERIFICATION_GUIDE.md`
- `DATA_FOUNDATION20_REPORT.md`
