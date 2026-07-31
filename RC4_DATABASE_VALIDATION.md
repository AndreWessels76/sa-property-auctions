# RC4 Database Validation — Profiles INSERT Harden

**Migration:** `supabase/migrations/20260731120000_profiles_insert_harden.sql`  
**Status:** Present in repository · documented in `SUPABASE_DEPLOYMENT.md` (order 7)  
**Date:** 2026-07-31

---

## Verification

| Check | Result |
|---|---|
| File exists | **PASS** |
| Valid SQL (DROP POLICY + CREATE POLICY) | **PASS** |
| Order after billing migration (`20260728210000`) | **PASS** (`20260731120000`) |
| Included in `SUPABASE_DEPLOYMENT.md` | **PASS** |
| Does not weaken UPDATE RLS from billing migration | **PASS** (INSERT only) |

---

## Policy intent

Authenticated users may insert **only their own** profile row, and only with free/inactive defaults:

| Field | Allowed on INSERT |
|---|---|
| `id` | Must equal `auth.uid()` |
| `role` | Must be `free` (or null → coalesced to free) |
| `subscription_status` | Must be `inactive` |
| `subscription_plan` | Must be `free` |
| `stripe_customer_id` | Must be `null` |
| `stripe_subscription_id` | Must be `null` |

Blocked self-escalation targets:

- `admin`
- `premium`
- `user` (non-free elevated app roles)
- Any moderator-style custom role
- Active / trial / past_due subscription statuses
- Stripe IDs on create

New profiles are created safely by:

1. `handle_new_user()` trigger (security definer) — already inserts `role=free`
2. `ProfileService.saveProfile` — forces `role: "free"` on first upsert
3. This INSERT RLS policy — defence in depth if a client attempts a direct insert

---

## Apply (ops)

Run in Supabase SQL editor **after** `20260728210000_profiles_billing.sql`:

```sql
-- contents of 20260731120000_profiles_insert_harden.sql
```

### Post-apply check

```sql
select polname, polcmd
from pg_policy
join pg_class on pg_class.oid = pg_policy.polrelid
where relname = 'profiles'
  and polname = 'Profiles: users can insert own row';
```

---

## Risk

| Risk | Level |
|---|---|
| Breaking legitimate client profile create | Low — app already inserts free |
| Trigger `handle_new_user` | Unaffected (security definer bypasses RLS) |
| Service-role webhooks | Unaffected |

**Mandatory before production:** apply this migration on the live Supabase project.
