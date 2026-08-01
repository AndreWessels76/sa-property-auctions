# IMPORT PIPELINE

## Stages

1. **Discover** — identify licensed feed / CSV / manual batch  
2. **Download** — fetch payload (no scraping)  
3. **Normalize** — map to property model  
4. **Validate** — required fields & enums  
5. **Deduplicate** — confidence scoring  
6. **Merge** — update existing listing when duplicate  
7. **Verify** — operator / source verification state  
8. **Publish** — visible catalogue  
9. **Archive** — lifecycle end states  

Implemented as `ImportPipeline.runFramework()` with per-stage audit via `ImportPipelineAudit`.

## Audit trail

Each stage writes:

- Structured log: `LoggerService.audit("import.pipeline", …)`
- Optional DB row: `import_pipeline_events` (after migration)

Fields: `job_id`, `property_id`, `connector_id`, `stage`, `status`, `message`, `meta`, `created_at`.

## Listing envelope metadata

Every connector payload should carry (`ConnectorListingEnvelope`):

- Source ID / external listing ID  
- Listing URL  
- Import date  
- Verification date  
- Update date  
- Listing status  
- Import method  
- Source version  
- Connector version  

## Existing importers

Legacy `lib/importers` and `lib/imports/runImport.ts` remain compatible. New runs should call `ImportPipeline` around connector sync for full stage logging.

## Failure policy

- Missing licensed payload → `download` / `normalize` **skipped** (not scraped).
- Unknown connector → stage `discover` **failed**.
- Persist failures to `import_pipeline_events` are non-fatal (logged as warn).
