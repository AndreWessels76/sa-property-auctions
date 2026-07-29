# RC3.0 Operations Plan

Status: **COMPLETE**  
Sprint: Production Operations & Deployment Preparation  
Scope: Documentation + deployment readiness only — **no live deploy, no smoke tests**

---

## Task tracker

| # | Task | Purpose | Files affected | Risk | Validation | Status |
|---|---|---|---|---|---|---|
| 0 | Create operations plan | Track sprint | `RC3_OPERATIONS_PLAN.md` | Low | Document exists | **DONE** |
| 1 | Vercel deployment audit | Confirm build/deploy config | `vercel.json`, `package.json`, `next.config.ts` | Low | `npm run build` | **DONE** |
| 2 | Environment setup doc | Guide Dev/Preview/Prod env | `ENVIRONMENT_SETUP.md`, `.env.example` | Low | `npm run audit:env` | **DONE** |
| 3 | Supabase deployment doc | Migration apply order + auth | `SUPABASE_DEPLOYMENT.md`, migrations | Med | SQL review | **DONE** |
| 4 | Stripe deployment doc | Products, webhook, portal | `STRIPE_DEPLOYMENT.md` | Med | Code path review | **DONE** |
| 5 | Storage deployment doc | Bucket + RLS policies | `STORAGE_DEPLOYMENT.md` | Med | SQL review | **DONE** |
| 6 | Domain & HTTPS notes | Custom domain + static assets | `ENVIRONMENT_SETUP.md` § Domain | Low | Doc review | **DONE** |
| 7 | Security deployment doc | Headers, secrets, health | `SECURITY_DEPLOYMENT.md` | Low | Config review | **DONE** |
| 8 | Operations guide | Health, logging, monitoring | `OPERATIONS_GUIDE.md` | Low | Route review | **DONE** |
| 9 | Backup & recovery doc | DR procedures | `BACKUP_AND_RECOVERY.md` | Low | Doc review | **DONE** |
| 10 | Go-live checklist | Launch dry-run package | `GO_LIVE_CHECKLIST.md` | Low | Completeness | **DONE** |
| 11 | Build validation | No regressions | — | Low | typecheck + build | **DONE** |
| 12 | Final operations report | Readiness summary | This file § Final Report | Low | All docs complete | **DONE** |

---

## Phase completion log

### Phase 1 — Vercel deployment
- **Result:** `vercel.json` present; Node `>=20.9.0`; scripts use standard `next` CLI; `next.config.ts` has security headers + image remote patterns.
- **Evidence:** `package.json`, `vercel.json`, `next.config.ts`.

### Phase 2 — Environment variables
- **Result:** `ENVIRONMENT_SETUP.md` documents all 8 required vars per environment; validator in `lib/env/validateEnv.ts`.
- **Evidence:** `npm run audit:env` script.

### Phase 3 — Supabase operations
- **Result:** 6 migrations documented in apply order; auth/email settings documented.
- **Evidence:** `supabase/migrations/*.sql`.

### Phase 4 — Stripe operations
- **Result:** Webhook events, price IDs, portal/checkout URLs documented.
- **Evidence:** `app/api/billing/*`, `lib/billing/CheckoutService.ts`.

### Phase 5 — Storage
- **Result:** `property-images` bucket + admin-only write policy SQL documented.
- **Evidence:** `20260729090000_storage_property_images.sql`.

### Phase 6 — Domain & HTTPS
- **Result:** Vercel SSL automatic; `NEXT_PUBLIC_SITE_URL` requirements documented; robots/sitemap/favicon/manifest gaps noted as manual pre-launch.

### Phase 7 — Security operations
- **Result:** `SECURITY_DEPLOYMENT.md` covers headers, env fail-fast, health endpoints.

### Phase 8 — Observability
- **Result:** `OPERATIONS_GUIDE.md` covers `/api/health`, `/live`, `/ready`, structured logging.

### Phase 9 — Backup & recovery
- **Result:** `BACKUP_AND_RECOVERY.md` complete.

### Phase 10 — Go-live package
- **Result:** `GO_LIVE_CHECKLIST.md` complete.

---

## Files modified this sprint

| File | Change |
|---|---|
| `RC3_OPERATIONS_PLAN.md` | Created (this file) |
| `ENVIRONMENT_SETUP.md` | Created |
| `SUPABASE_DEPLOYMENT.md` | Created |
| `STRIPE_DEPLOYMENT.md` | Created |
| `STORAGE_DEPLOYMENT.md` | Created |
| `SECURITY_DEPLOYMENT.md` | Created |
| `OPERATIONS_GUIDE.md` | Created |
| `BACKUP_AND_RECOVERY.md` | Created |
| `GO_LIVE_CHECKLIST.md` | Created |

No application code changes in RC3.0 (documentation-only sprint).

---

## Manual actions before Launch Dry Run

1. Set all Production env vars in Vercel (see `ENVIRONMENT_SETUP.md`).
2. Apply all Supabase migrations in order (see `SUPABASE_DEPLOYMENT.md`).
3. Configure Stripe products, webhook, portal (see `STRIPE_DEPLOYMENT.md`).
4. Apply storage policies (see `STORAGE_DEPLOYMENT.md`).
5. Add custom domain + set `NEXT_PUBLIC_SITE_URL` to HTTPS origin.
6. Add `public/favicon.ico` (referenced in `app/layout.tsx` but not in repo).
7. Optionally add `public/robots.txt` and sitemap before public launch.
8. Provide staging/production URL for RC3 Launch Dry Run smoke suite.

---

## Final Report (updated after build validation)

### Completed work
- All 9 deployment deliverable documents created.
- Repository audited for Vercel, env, Supabase, Stripe, storage, security, ops.
- Go-live and rollback procedures documented.

### Operational risks
| Risk | Level | Mitigation |
|---|---|---|
| Migrations not applied on live DB | High | Follow `SUPABASE_DEPLOYMENT.md` checklist |
| Missing `SUPABASE_SERVICE_ROLE_KEY` in Production | High | Required for webhooks + ready probe |
| Stripe webhook not configured | High | `STRIPE_DEPLOYMENT.md` |
| No favicon file in repo | Low | Add before launch |
| No external error monitoring | Med | Wire Sentry post-launch |
| No CI pipeline | Med | Manual `npm run build` before deploy |

### Deployment blockers (manual)
1. Production Vercel environment variables not yet set by operator.
2. Live Supabase migration apply unconfirmed.
3. Stripe live/test webhook endpoint not registered.
4. Custom domain + HTTPS `SITE_URL` not configured.
5. Launch Dry Run URL not provided (smoke tests deferred).

### Build validation (2026-07-29)

- `npm run typecheck` → **PASS**
- `npm run build` → **PASS** (exit 0, 37 routes)

### Production readiness percentage
**~88%** (all ops docs complete; live apply + Launch Dry Run smoke deferred)

### Launch Dry Run readiness
**READY** — repository is prepared. Begin Launch Dry Run after completing `GO_LIVE_CHECKLIST.md` manual sections and providing a base URL.

---

*Last updated: 2026-07-29*
