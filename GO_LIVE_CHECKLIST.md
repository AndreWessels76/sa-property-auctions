# Go-Live Checklist — SA Property Auctions

Complete before **RC3 Launch Dry Run** and before **Production launch**.

---

## Pre-requisites

- [ ] All deployment docs reviewed (`ENVIRONMENT_SETUP.md`, `SUPABASE_DEPLOYMENT.md`, etc.)
- [ ] Staging or production base URL available for smoke tests
- [ ] `npm run build` passes locally

---

## 1. Supabase

- [ ] Production project selected (or dedicated staging project)
- [ ] Migration 1: `20260727103000_profiles_rls.sql`
- [ ] Migration 2: `20260727194000_property_ai_analysis.sql`
- [ ] Migration 3: `20260728084000_alerts.sql`
- [ ] Migration 4: `20260728084500_saved_searches.sql`
- [ ] Migration 5: `20260728210000_profiles_billing.sql`
- [ ] Migration 6: `20260729090000_storage_property_images.sql`
- [ ] Confirm email **ON**
- [ ] Redirect URLs include production HTTPS origin + `/login` + `/reset-password`
- [ ] Daily backups or PITR enabled
- [ ] Admin user: `profiles.role = 'admin'` for ops account
- [ ] `npm run verify:supabase` passes against target project

---

## 2. Stripe

- [ ] Products: Premium Monthly + Premium Yearly
- [ ] `STRIPE_PRICE_MONTHLY` = monthly Price ID
- [ ] `STRIPE_PRICE_YEARLY` = yearly Price ID (different)
- [ ] Customer Portal enabled
- [ ] Webhook: `https://<domain>/api/billing/webhook`
- [ ] Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] `STRIPE_WEBHOOK_SECRET` in Vercel
- [ ] Test checkout → profile `subscription_status = active` verified

---

## 3. Vercel

- [ ] Project connected to repository
- [ ] `vercel.json` present (framework: nextjs)
- [ ] Node version ≥ 20.9 (Vercel auto-detects from `engines`)
- [ ] All 8 required env vars set for **Production**
- [ ] Preview env vars set (test Stripe keys recommended)
- [ ] First production deploy successful
- [ ] Build logs clean (no env validation throw)

---

## 4. DNS & HTTPS

- [ ] Custom domain added in Vercel (if applicable)
- [ ] DNS records configured (A/CNAME per Vercel instructions)
- [ ] SSL certificate active (automatic)
- [ ] `NEXT_PUBLIC_SITE_URL` = `https://<production-domain>` (no trailing slash)
- [ ] Redeploy after `SITE_URL` change

---

## 5. Environment

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (server only)
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_PRICE_MONTHLY`
- [ ] `STRIPE_PRICE_YEARLY`
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] No placeholder values in Production
- [ ] No `SKIP_ENV_VALIDATION=1` in Production
- [ ] Optional: AI keys if AI features required

---

## 6. Health checks

After deploy:

```bash
curl https://<domain>/api/health
curl https://<domain>/api/health/live
curl https://<domain>/api/health/ready
```

- [ ] `/api/health` → 200
- [ ] `/api/health/live` → 200
- [ ] `/api/health/ready` → 200 (requires service role + migrations)

Configure uptime monitor on `/api/health/ready`.

---

## 7. Static assets (pre-public-launch)

- [ ] Add `app/favicon.ico` or `public/favicon.ico` (referenced in layout)
- [ ] Optional: `public/robots.txt`
- [ ] Optional: sitemap (future SEO sprint)

---

## 8. Smoke test prerequisites (Launch Dry Run)

**Blocked until base URL provided.** When ready, verify:

- [ ] Guest browse home + property detail
- [ ] Register → verify email → login
- [ ] Logout + password reset
- [ ] Property search (guest keyword + premium AI)
- [ ] Saved searches (authenticated)
- [ ] Dashboard + profile update
- [ ] Premium checkout (test mode) + webhook sync
- [ ] Customer portal open + cancel flow
- [ ] Heatmaps / premium guard
- [ ] Admin import (admin user)
- [ ] Mobile navigation

---

## 9. Launch steps (production)

1. Complete sections 1–7 above
2. Run Launch Dry Run smoke suite on staging URL
3. Fix any failures
4. Switch Stripe to live keys (if not already)
5. Final `ready` check → 200
6. Announce launch
7. Monitor logs and Stripe webhooks for 24h

---

## 10. Post-launch verification (first 24h)

- [ ] No spike in `/api/health/ready` 503
- [ ] Stripe webhook delivery success rate > 99%
- [ ] No auth redirect errors in Supabase logs
- [ ] At least one successful test registration + checkout (or real customer)
- [ ] Error log review (Vercel Runtime logs)

---

## 11. Rollback steps

If critical failure after launch:

1. Vercel → Deployments → Promote previous deployment
2. If billing corrupting data → disable Stripe webhook endpoint
3. Communicate status to users
4. Follow `BACKUP_AND_RECOVERY.md`
5. Root-cause and fix before re-launch

---

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Release Manager | | | |
| DevOps | | | |
| Product Owner | | | |

**Launch Dry Run status:** ☐ Not started — awaiting base URL  
**Production launch status:** ☐ Not approved
