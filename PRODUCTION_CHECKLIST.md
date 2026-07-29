# RC3 — Production Checklist

Status: **REPO / OPS AUDIT COMPLETE — LIVE SMOKE BLOCKED**  
Date: 2026-07-29  
Scope chosen by operator: **no live deployment URL** until provided later.

Legend: `[x]` validated with evidence · `[~]` partial / blocked on live · `[!]` failed · `[ ]` pending

When a staging/production base URL is provided, execute Phase 8 smoke suite and update the Final recommendation.

---

## Phase 1 — Deployment audit

- [x] Vercel configuration — `vercel.json` added (framework nextjs, `npm run build`, `npm ci`)
- [x] Next.js / build configuration reviewed — `next.config.ts` (security headers, `poweredByHeader: false`, remote image hosts)
- [x] Node / package engines — `engines.node >= 20.9.0` added; local Node **v24.18.0**
- [x] Deployment scripts — removed broken `node --use-system-ca` wrappers from `package.json` (were breaking Next workers / non-portable)
- [x] Build output validated — `npm run build` **PASS** (2026-07-29)
- [x] Middleware / instrumentation reviewed — fail-closed without Supabase env in production; `validateEnv` on Node runtime (skips build phase)
- [x] No project `.github` workflows — CI not configured (documented risk)
- [x] Deployment checklist generated (this document)

**Evidence:** `package.json`, `vercel.json`, `next.config.ts`, `middleware.ts`, `instrumentation.ts`, successful `npm run build`.

**Risk:** Medium until first Vercel/preview deploy is proven. No CI pipeline.

---

## Phase 2 — Environment validation

Required keys in `lib/env/validateEnv.ts` + `.env.example`:

| Variable | In validator | In `.env.example` | Local `.env.local` (masked audit) |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | yes | present (url) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | yes | present |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | yes | **[!]** missing |
| `STRIPE_SECRET_KEY` | yes | yes | **[!]** placeholder-like (len 11) |
| `STRIPE_WEBHOOK_SECRET` | yes | yes | **[!]** placeholder-like |
| `STRIPE_PRICE_MONTHLY` | yes | yes | present but **[!]** identical to yearly |
| `STRIPE_PRICE_YEARLY` | yes | yes | present but **[!]** identical to monthly |
| `NEXT_PUBLIC_SITE_URL` | yes | yes | present (`localhost`) |

- [x] Required vars documented + fail-fast validated in code
- [x] Local masked audit via `npm run audit:env` (`scripts/rc3-env-audit.mjs`)
- [!] Local values **not production-ready** (missing service role; Stripe placeholders; duplicate price IDs)
- [x] Duplicate monthly/yearly price IDs rejected by `getInvalidEnvVars()` (new)
- [x] Production localhost `NEXT_PUBLIC_SITE_URL` rejected by validator (new)
- [x] `.gitignore` ignores `.env*`; allowlists `.env.example` + `.env.local.example`
- [~] Preview vs Production env values — ops must set distinct Vercel envs (not verifiable without dashboard)

**Evidence:** `scripts/rc3-env-audit.mjs` output 2026-07-29; `validateEnv.ts`.

**Changes made:** `validateEnv` invalidation rules; `.gitignore` allow `.env.example`; `audit:env` script.

---

## Phase 3 — Supabase validation

Repo migrations:

| Migration | Purpose | Repo review |
|---|---|---|
| `20260727103000_profiles_rls.sql` | profiles RLS + trigger (JWT role coalesce — superseded later) | reviewed |
| `20260727194000_property_ai_analysis.sql` | AI cache table + RLS (public write dropped by billing mig) | reviewed |
| `20260728084000_alerts.sql` | alerts + RLS | reviewed |
| `20260728084500_saved_searches.sql` | saved searches + RLS | reviewed |
| `20260728210000_profiles_billing.sql` | billing cols, indexes, entitlement lock, safe `handle_new_user` | reviewed |
| `20260729090000_storage_property_images.sql` | **NEW** storage deny-anon-write policies | authored for ops apply |

- [x] Migrations listed and reviewed in repo
- [x] Billing + profiles RLS reviewed
- [x] Anon Supabase connectivity — `npm run verify:supabase` **PASS** → `https://erflfvhxqitpprczmbiq.supabase.co`
- [~] Live migration apply status — **BLOCKED** (no dashboard confirmation)
- [~] Live RLS / triggers / backups / PITR — **BLOCKED**
- [x] Email verification code path matches confirm-email ON (RC2.2 hotfix)

**Remaining:** Apply all migrations + storage SQL in the live project; confirm Auth confirm-email ON; enable backups.

---

## Phase 4 — Stripe validation (code)

- [x] Checkout session-bound (`SessionService.requireUser`, interval only) — `app/api/billing/checkout/route.ts`
- [x] Portal auth-bound — route present
- [x] Webhook signature verification — `constructEvent` → 400 on fail
- [x] Handlers: checkout.completed activate; subscription.updated active/trial/past_due/canceled/unpaid; deleted cancel; invoice.payment_failed past_due
- [x] Price ID mapping via env (`WebhookService.planFromPriceId`)
- [x] past_due demotes role (RC2.2)
- [~] `invoice.paid` renewal not explicitly handled — renewals rely on `customer.subscription.updated` (acceptable if Stripe emits update; document)
- [!] Checkout without `userId`/`subscription`/`customer` returns 200 without activate — orphan risk (known; log-only)
- [~] Live webhook endpoint + event delivery — **BLOCKED** until URL + Stripe Dashboard
- [~] Live smoke checkout → webhook → profile — **BLOCKED**

---

## Phase 5 — Storage validation

- [x] Public property page has no upload UI (RC2.2)
- [x] `ImageUpload` admin-gated
- [x] Bucket id in code: `property-images`
- [x] Remote image host includes project ref in `next.config.ts`
- [x] Migration `20260729090000_storage_property_images.sql` authored (public read, admin write)
- [~] Live policy apply — **BLOCKED** until SQL run in Supabase

---

## Phase 6 — Production security

- [x] Headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- [!] **No CSP** header configured — residual XSS defense-in-depth gap (Med)
- [x] Middleware auth for protected prefixes; admin JWT gate for `/admin`
- [x] Ready endpoint hides `missingEnv` in production
- [x] Service role only via `lib/supabase/admin.ts` (server)
- [x] Premium access status-driven (RC2.2)
- [~] CSRF: cookie session SameSite depends on Supabase SSR defaults — acceptable for same-site app
- [~] HTTPS enforced by host (Vercel) — must set `NEXT_PUBLIC_SITE_URL` to `https://…`
- [x] No Sentry / external error vendor wired — ops gap (Low–Med)

---

## Phase 7 — Production operations

- [x] `/api/health` — ok + version + env name
- [x] `/api/health/live` — process up
- [x] `/api/health/ready` — env (incl. invalid) + service-role DB + Stripe key presence
- [x] Structured `LoggerService`
- [x] Env fail-fast on production boot (`instrumentation.ts`)
- [!] Error reporting vendor — **not configured**
- [~] Monitoring / uptime on health URLs — requires live URL
- [x] App version from `npm_package_version` (0.1.0)

---

## Phase 8 — Production smoke tests

**Status: BLOCKED — no staging/production base URL provided.**

Do not check off until URL smoke run completes.

- [ ] Guest browse
- [ ] Registration
- [ ] Email verification
- [ ] Login / Logout
- [ ] Password reset
- [ ] Property search (guest fallback)
- [ ] Property details / gallery
- [ ] Dashboard / Profile
- [ ] Premium checkout (test mode OK)
- [ ] Health endpoints (`/api/health`, `/live`, `/ready` → expected statuses)
- [ ] Admin (if credentials)

**Resume protocol:** paste base URL → agent runs smoke suite → updates this section + Final recommendation.

---

## Phase 9 — Performance validation (observe-only)

- [x] Production build succeeds (~15s compile locally after script fix)
- [x] Routes are dynamic (`ƒ`) — expected for auth/session app
- [x] `sharp` present for image optimization
- [x] Maplibre / client heavy surfaces remain client components (known cost)
- [x] Home/property list may fetch broadly (known scale risk from RC2.2 — not a deploy blocker at beta volume)
- [x] No behaviour-changing optimizations performed

**Risk:** Medium at large inventory; acceptable for launch if inventory is modest.

---

## Phase 10 — Launch readiness artefacts

### Launch Checklist

- [ ] All Phase 2 env keys set in Vercel Production (and Preview as needed)
- [ ] Distinct Stripe monthly vs yearly Price IDs
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (server-only)
- [ ] `NEXT_PUBLIC_SITE_URL` = production HTTPS origin
- [ ] All repo migrations applied (including storage)
- [ ] Supabase Auth confirm-email = ON
- [ ] Stripe webhook → `https://<host>/api/billing/webhook` with events listed in Phase 4
- [ ] `/api/health/ready` returns 200
- [ ] Phase 8 smoke suite green
- [ ] Admin JWT `app_metadata.role=admin` for ops users
- [ ] Never set `SKIP_ENV_VALIDATION=1` in production

### Rollback Checklist

- [ ] Keep previous Vercel deployment Instant Rollback available
- [ ] Do not reverse DB migrations without backup restore plan
- [ ] Disable Stripe webhook endpoint if billing corrupt
- [ ] Feature-flag: set prices invalid / pause checkout if needed
- [ ] Communicate status page / support note

### Backup Checklist

- [ ] Supabase daily backups or PITR enabled
- [ ] Export critical Stripe customer list / subscription IDs
- [ ] Confirm Storage bucket versioning/backup policy if required
- [ ] Document RPO/RTO targets

### Recovery Checklist

- [ ] Restore DB from backup → re-run missing migrations if needed
- [ ] Re-deploy last known-good Vercel build
- [ ] Re-point Stripe webhook
- [ ] Verify `/api/health/ready` then Phase 8 smoke subset
- [ ] Reconcile Stripe subscriptions vs `profiles` (manual SQL if needed)

### Monitoring Checklist

- [ ] Uptime check on `/api/health/live` and `/api/health/ready`
- [ ] Alert on ready 503
- [ ] Stripe Dashboard failed payments + webhook errors
- [ ] Supabase auth error rate
- [ ] (Optional) Wire Sentry/Log drain

### Support Checklist

- [ ] Document how to reset password / resend verification
- [ ] Document how to grant/revoke premium via Stripe portal
- [ ] Escalation contact for billing disputes
- [ ] Known incomplete surfaces: Alerts/Watchlist hidden (redirect)

### Incident Response Checklist

1. Detect (monitor / user report)
2. Triage severity (auth / billing / data / availability)
3. Mitigate (rollback / disable webhook / read-only)
4. Communicate
5. Root-cause from structured logs
6. Fix + verify smoke subset
7. Postmortem within 48h

---

## Evidence log

| Date | Phase | Item | Evidence | Result |
|---|---|---|---|---|
| 2026-07-29 | 1 | Build scripts | Removed `--use-system-ca`; `npm run build` PASS | PASS |
| 2026-07-29 | 1 | Vercel | Added `vercel.json` | PASS |
| 2026-07-29 | 2 | Env audit | `npm run audit:env` — service role missing; Stripe placeholders; duplicate prices | FAIL local |
| 2026-07-29 | 2 | Validator | Duplicate price + localhost production site URL checks | PASS code |
| 2026-07-29 | 3 | Supabase anon | `verify:supabase` PASS | PASS connectivity |
| 2026-07-29 | 3 | Migrations | 6 SQL files reviewed; storage SQL added | PARTIAL live |
| 2026-07-29 | 4 | Stripe code | webhook/checkout reviewed | PASS code / BLOCKED live |
| 2026-07-29 | 5 | Storage | App gated + SQL policy migration authored | PARTIAL live |
| 2026-07-29 | 6–7 | Security/ops | Headers + health + logging | PASS with CSP/Sentry gaps |
| 2026-07-29 | 8 | Smoke | No base URL | **BLOCKED** |
| 2026-07-29 | 9 | Perf | Observe-only from build | PASS observe |
| 2026-07-29 | 10 | Launch artefacts | Checklists authored below | PASS docs |

---

## Remaining production blockers

1. **Live smoke tests not executed** (no base URL) — mandatory before READY FOR PRODUCTION  
2. **Production env not proven** — local audit shows missing service role / placeholder Stripe / duplicate price IDs (must be correct in Vercel)  
3. **Migrations + storage policies apply** not confirmed on live Supabase  
4. **Stripe webhook** not confirmed against live endpoint  
5. **No CSP** and **no error-reporting vendor** — not hard blockers for beta, preferred before broad production traffic  
6. **No CI** — quality gate risk on future deploys  

---

## Scores (repo audit — pre-smoke)

| Dimension | Score | Notes |
|---|---|---|
| Architecture | 82 | Stable RC1–RC2.2 |
| Security | 74 | Headers + entitlement; no CSP; JWT admin |
| Database | 68 | Migrations solid in repo; live apply unverified |
| Billing / Stripe | 72 | Code path strong; live sync unverified |
| Deployment | 78 | Scripts + vercel.json fixed; first deploy unproven |
| Performance | 62 | Acceptable for beta volume |
| QA | 45 | Smoke blocked |
| Operations | 70 | Health/logging yes; monitoring vendor no |
| **Overall production readiness** | **~71%** | |

---

## Final recommendation

# NOT READY FOR PRODUCTION

**Evidence:** Repository deployment and operations audit is complete and the app builds cleanly with portable scripts, but live smoke tests are blocked by operator choice, local/production secrets are not yet proven complete, and Supabase migration/storage/Stripe webhook live apply remain unverified.

**READY FOR BETA** remains valid for a controlled environment once Preview/Production env keys are correct.

**Next step:** Provide staging or production base URL → execute Phase 8 smoke suite → reissue recommendation.
