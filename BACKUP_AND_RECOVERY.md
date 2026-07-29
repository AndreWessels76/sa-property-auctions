# Backup & Recovery — SA Property Auctions

Disaster recovery and rollback procedures.

---

## Database backup (Supabase)

### Enable backups

Supabase Dashboard → **Settings** → **Database**:

| Plan | Option |
|---|---|
| Pro+ | Daily backups (7-day retention) |
| Team+ | Point-in-Time Recovery (PITR) |

**Recommendation:** Enable PITR for production if budget allows.

### What to back up

| Data | Location | Criticality |
|---|---|---|
| User profiles + billing | `profiles` | **Critical** |
| Properties | `properties` | **Critical** |
| Property images metadata | `property_images` | High |
| Saved searches | `saved_searches` | Medium |
| Alerts | `alerts` | Medium |
| AI analysis cache | `property_ai_analysis` | Low (regenerable) |
| Storage objects | `property-images` bucket | High |

### Manual export (ad-hoc)

Supabase Dashboard → **Database** → **Backups** → Download, or use `pg_dump` with connection string.

---

## Application rollback (Vercel)

### Instant rollback

1. Vercel Dashboard → **Deployments**
2. Find last known-good deployment
3. **⋯** → **Promote to Production**

**Does not rollback database** — only application code.

### Git rollback

```bash
git revert <bad-commit>
git push origin main
```

Triggers new deployment.

---

## Deployment rollback checklist

- [ ] Identify last good Vercel deployment ID
- [ ] Promote to Production in Vercel
- [ ] Verify `/api/health/ready` → 200
- [ ] Smoke test: login, browse, billing (if changed)
- [ ] If DB migration caused issue — see DB recovery below
- [ ] Notify stakeholders

---

## Database recovery

### Restore from backup

1. Supabase Dashboard → **Database** → **Backups** → Restore
2. **Warning:** Restore replaces current DB — coordinate downtime
3. Re-apply any migrations applied after backup if needed
4. Verify `profiles` billing columns intact

### Partial recovery (billing sync)

If Stripe and DB diverge:

1. Export Stripe customers/subscriptions from Dashboard
2. Compare with `profiles.stripe_customer_id`, `stripe_subscription_id`
3. Manual SQL update or re-fire webhook events from Stripe Dashboard

```sql
select id, email, role, subscription_status, stripe_customer_id, stripe_subscription_id
from public.profiles
where stripe_customer_id is not null;
```

---

## Storage recovery

- Supabase Storage has no automatic versioning by default.
- Re-upload images via admin importer if bucket data lost.
- Property `image_url` in DB may point to missing objects — run integrity check.

---

## Incident response

### 1. Detect

- Uptime monitor alert
- User reports
- Stripe webhook failure emails
- Vercel error spike

### 2. Triage

| Symptom | Likely cause |
|---|---|
| 503 on all routes | Missing Supabase env in middleware |
| Ready 503 | Service role missing or DB down |
| Auth broken | Supabase outage or redirect URL mismatch |
| Premium not activating | Webhook failure or migration not applied |
| Payments failing | Stripe config or price ID mismatch |

### 3. Mitigate

- Rollback Vercel deployment if code regression
- Disable Stripe webhook temporarily if corrupting data
- Put maintenance notice if extended outage

### 4. Communicate

- Status to users (email / social if P1)
- Internal team channel

### 5. Resolve

- Fix root cause
- Deploy fix
- Verify health + smoke subset

### 6. Postmortem (within 48h)

- Timeline
- Root cause
- Action items (prevent recurrence)

---

## Recovery time objectives (suggested)

| Scenario | Target RTO | Target RPO |
|---|---|---|
| App code regression | < 15 min (Vercel rollback) | 0 |
| DB corruption | < 4 hours | 24h (daily backup) or minutes (PITR) |
| Stripe desync | < 2 hours | Event log in Stripe |
| Storage loss | < 24 hours | Depends on backup strategy |

---

## Pre-launch backup checklist

- [ ] Supabase daily backups or PITR enabled
- [ ] Document Supabase project ID and region
- [ ] Document Stripe account ID
- [ ] Document Vercel project ID
- [ ] Store emergency contacts
- [ ] Test Vercel rollback on staging once
- [ ] Export initial `profiles` snapshot after go-live
