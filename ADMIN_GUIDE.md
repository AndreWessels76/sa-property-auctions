# Admin Guide — SA Property Auctions

**Audience:** Platform administrators  
**Version:** RC6

## Access

- Admin role: JWT `app_metadata.role` or `profiles.role = admin`  
- Routes: `/admin`, `/admin/dashboard`, `/admin/imports`, `/admin/queue`, `/admin/operations`  
- APIs require `PermissionService.requireAdmin()`

## Daily ops

1. Check `/api/health/ready` and admin Health panel.  
2. Review import queue / failed jobs.  
3. Spot-check new listings (province, town, date, source, images).  
4. Review structured logs for `support.request`, `account.delete`, `account.export`.  
5. Escalate privacy requests within SLA (see `SUPPORT_GUIDE.md`).

## Imports

- Prefer CSV / partner connectors over scraping.  
- Use admin Imports UI or `/api/admin/imports`.  
- Duplicate detection + optional AI review — resolve merges carefully.  
- Always set source attribution.  
- See `DATA_PIPELINE_AUDIT.md` for onboarding sequence.

## Billing (read-only awareness)

- Stripe Customer Portal for user self-serve.  
- Webhooks update subscription fields on `profiles`.  
- Do **not** change billing logic without a dedicated sprint.  
- Ensure Vercel uses Stripe **Price** IDs (`price_…`), not Product IDs.

## Security hygiene

- Never commit `.env` secrets.  
- Rotate service role / Stripe keys if exposed.  
- Prefer least-privilege admin accounts.  
- After account deletion requests, confirm user cannot log in.

## Useful docs

- `SUPABASE_DEPLOYMENT.md`, `STRIPE_DEPLOYMENT.md`, `SECURITY_DEPLOYMENT.md`  
- `OPERATIONS_GUIDE.md`, `BACKUP_AND_RECOVERY.md`
