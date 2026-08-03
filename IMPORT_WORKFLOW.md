# IMPORT WORKFLOW

1. Admin provides licensed rows, listing URLs, or enables robots-checked public fetch.
2. `PropertyAcquisitionEngine.run` executes stages with audit logs.
3. Invalid listings → `import_rejections` (never silent).
4. Duplicates → merge/update existing row + `listing_change_events`.
5. New rows → pending verification queue.
6. Admin approves → public verified catalogue.
7. Daily cron (optional): `BIDDERS_CHOICE_DAILY_SYNC=true`.

## APIs

- `POST /api/admin/acquisition/bidders-choice`
- `POST /api/admin/imports` with `source: "BiddersChoice"`
- `GET/POST /api/admin/verification`
- Cron: `/api/cron/data-foundation?cadence=daily`
