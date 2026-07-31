# Supabase Deployment — SA Property Auctions

Apply migrations in **timestamp order** on the target Supabase project (Dashboard → SQL → New query, or Supabase CLI).

---

## Prerequisites

- Supabase project created (production and/or staging).
- Base tables `profiles`, `properties`, `property_images` must already exist in the project (created outside this repo or via earlier manual setup).
- Auth **Confirm email** = **ON** (required for registration flow).

---

## Migration apply order

| Order | File | Purpose |
|---|---|---|
| 1 | `20260727103000_profiles_rls.sql` | Profiles RLS, `handle_new_user` trigger (superseded partially by #5) |
| 2 | `20260727194000_property_ai_analysis.sql` | AI analysis cache table + public read RLS |
| 3 | `20260728084000_alerts.sql` | Alerts table + user-scoped RLS |
| 4 | `20260728084500_saved_searches.sql` | Saved searches + user-scoped RLS |
| 5 | `20260728210000_profiles_billing.sql` | Billing columns, Stripe indexes, entitlement lock, safe signup trigger |
| 6 | `20260729090000_storage_property_images.sql` | Storage bucket + admin-only write policies |
| 7 | `20260731120000_profiles_insert_harden.sql` | Profiles INSERT cannot self-assign role/billing |

**Path:** `supabase/migrations/<filename>`

---

## Migration 1 — Profiles RLS

**File:** `20260727103000_profiles_rls.sql`

- Enables RLS on `profiles`
- Policies: users read/insert/update own row
- `handle_new_user()` trigger on `auth.users` (initial version — **replaced by migration 5**)

---

## Migration 2 — Property AI analysis

**File:** `20260727194000_property_ai_analysis.sql`

- Table: `property_ai_analysis` (one row per property)
- Public read for anon + authenticated
- **Public insert/update removed by migration 5** — writes must use service role server-side

---

## Migration 3 — Alerts

**File:** `20260728084000_alerts.sql`

- Table: `alerts` with `user_id`, `property_id`, `alert_type`, etc.
- Full user-scoped CRUD RLS
- Indexes on `user_id`, `property_id`, unread

---

## Migration 4 — Saved searches

**File:** `20260728084500_saved_searches.sql`

- Table: `saved_searches` with JSONB `filters`
- User-scoped CRUD RLS

---

## Migration 5 — Billing (critical)

**File:** `20260728210000_profiles_billing.sql`

Adds to `profiles`:

- `subscription_plan`, `stripe_customer_id`, `stripe_subscription_id`, `subscription_expires_at`, `updated_at`
- Check constraints on plan and status
- Unique indexes on Stripe customer/subscription IDs
- **Update policy** prevents users from self-granting premium or changing Stripe fields
- **`handle_new_user()`** always inserts `role=free`, `subscription_status=inactive`, `subscription_plan=free`
- Drops public write policies on `property_ai_analysis`

---

## Migration 6 — Storage

**File:** `20260729090000_storage_property_images.sql`

- Creates/updates `property-images` bucket (public read)
- Policies: anon/authenticated **read**; authenticated **admin** insert/update/delete only

---

## Authentication settings

In Supabase Dashboard → **Authentication** → **Providers** → Email:

| Setting | Required value |
|---|---|
| Confirm email | **ON** |
| Secure email change | ON (recommended) |
| Minimum password length | ≥ 8 (match app validation) |

### URL configuration

**Site URL:** `https://<your-production-domain>`

**Redirect URLs (add all that apply):**

```
https://<production-domain>/login
https://<production-domain>/reset-password
http://localhost:3000/login
http://localhost:3000/reset-password
https://<staging-domain>/login
https://<staging-domain>/reset-password
```

Registration uses `emailRedirectTo: {SITE_URL}/login` (see `lib/auth/signUp.ts`).

---

## RLS summary

| Table | Anon read | User CRUD own | Service role |
|---|---|---|---|
| `profiles` | No | Read/update own (entitlement fields locked) | Full (webhooks) |
| `alerts` | No | Own rows | Via service role |
| `saved_searches` | No | Own rows | Via service role |
| `property_ai_analysis` | Yes (read) | No write | Write via service role |
| `storage.objects` (property-images) | Read | Admin write only | Full |

---

## Indexes (from migrations)

- `profiles_stripe_customer_id_uidx` (unique, partial)
- `profiles_stripe_subscription_id_uidx` (unique, partial)
- `profiles_subscription_status_idx`
- `alerts_user_id_idx`, `alerts_user_unread_idx`
- `saved_searches_user_id_idx`
- `property_ai_analysis_property_id_idx`

---

## Functions & triggers

| Name | Purpose |
|---|---|
| `handle_new_user()` | Auto-create profile on signup (safe defaults) |
| `on_auth_user_created` | Trigger on `auth.users` INSERT |

---

## Backups

In Supabase Dashboard → **Settings** → **Database**:

- Enable **daily backups** (Pro plan) or **Point-in-Time Recovery** if available.
- Document RPO/RTO in `BACKUP_AND_RECOVERY.md`.

---

## Post-migration verification

Run in SQL editor:

```sql
-- Billing columns exist
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name in ('stripe_customer_id', 'subscription_plan', 'subscription_status');

-- Storage bucket
select id, public from storage.buckets where id = 'property-images';

-- RLS enabled
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'alerts', 'saved_searches', 'property_ai_analysis');
```

**Connectivity from app:**

```bash
npm run verify:supabase
```

**Readiness (after deploy with service role set):**

```
GET /api/health/ready → 200
```

---

## Known gaps (document only)

- No in-repo `CREATE TABLE` for `properties`, `property_images`, or base `profiles` — assume pre-existing schema.
- `watchlist` table referenced in code but **no migration in repo** — feature hidden in UI; add migration if re-enabled.

---

## Apply checklist

- [ ] Migration 1 applied
- [ ] Migration 2 applied
- [ ] Migration 3 applied
- [ ] Migration 4 applied
- [ ] Migration 5 applied
- [ ] Migration 6 applied
- [ ] Migration 7 applied (`20260731120000_profiles_insert_harden.sql`)
- [ ] Confirm email ON
- [ ] Redirect URLs configured
- [ ] Backups enabled
- [ ] `verify:supabase` passes
- [ ] Admin user: set `profiles.role = 'admin'` for ops account(s)
