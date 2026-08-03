# ADMIN ROLE FIX REPORT

**Date:** 2026-08-03  
**Type:** Authorization / security fix  
**Scope:** Keep `profiles.role` independent of Stripe subscription updates

---

## Verdict

**PASS**

---

## Root cause (evidence)

`SubscriptionRepository.activate` previously wrote `role: "premium"`.  
`cancel` / `markPastDue` wrote `role: "free"`.

When the admin account completed Stripe Premium checkout, the webhook overwrote `profiles.role` from `admin` → `premium`.  

UI Admin link uses `role === ROLES.admin` from the profile (`Header.tsx`). Middleware falls back to `profiles.role === "admin"`. Both failed once role was overwritten.

Premium gates already used `subscription_status` (and grant admins premium access). The bug was **writing role from billing**, not reading subscription for admin.

---

## Fix

| File | Change |
|------|--------|
| `lib/repositories/SubscriptionRepository.ts` | **Removed all `role` updates** from activate / cancel / markPastDue |
| `lib/billing/WebhookService.ts` | Comment: subscription fields only |
| `lib/auth/isAdmin.ts` | Role-only check via `fromDatabaseRole(profiles.role)` |
| `lib/auth/getCurrentRole.ts` | Role from profile only; documents independence from Stripe |
| `lib/auth/authMiddleware.ts` | Documents that subscription must not grant/revoke admin; case-normalized profile role check |

### Authorization model (after fix)

| Concept | Source | Controls |
|---------|--------|----------|
| **Role** | `profiles.role` | Admin dashboard, admin APIs, Admin nav |
| **Subscription** | `profiles.subscription_status` (+ plan / Stripe IDs) | AI Search, premium analytics, paid features |

Admin + active subscription → admin **and** premium features.  
Admin + free/cancelled → admin retained; premium features via admin bypass (`SubscriptionService.premium` / `PremiumGuard`).

---

## Audit summary

| Area | Admin depends on subscription? | Result |
|------|-------------------------------|--------|
| Middleware | No (role / JWT admin) | OK |
| Header Admin button | No (`role === admin`) | OK after role preserved |
| `PermissionService.requireAdmin` | No (`isAdmin` → profile role) | OK |
| Admin API routes | `requireAdmin()` | OK |
| PremiumGuard / AI Search | Subscription (+ admin bypass) | OK — not used for admin |
| Profile PATCH | Strips role from client updates | OK |
| RLS profile update | Locks role self-change | OK |
| Stripe webhook | **Was writing role — fixed** | Fixed |

---

## Combinations (expected)

| Role | Subscription | Admin UI/API | Premium features |
|------|--------------|--------------|------------------|
| admin | active (Premium) | Yes | Yes (admin bypass + status) |
| admin | inactive / free | Yes | Yes (admin bypass) |
| admin | cancelled / past_due | Yes | Yes (admin bypass) |
| free/user | active | No | Yes |
| free/user | inactive | No | No |

`premium → admin` is never granted by billing.

---

## Ops recovery (if admin already demoted)

If the admin account still has `role = 'premium'` or `'free'` from earlier Stripe tests, restore once in Supabase:

```sql
update public.profiles
set role = 'admin', updated_at = now()
where id = '<ADMIN_USER_UUID>';
```

Do **not** set role from Stripe again (code no longer does this).

---

## Validation

| Command | Result |
|---------|--------|
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** (middleware→proxy deprecation warning noted) |

---

## Residual notes

- Legacy `profiles.role = 'premium'` may still exist on older rows; premium access does **not** grant from that field (`PremiumGuard` / `SubscriptionService.premium`).
- JWT `app_metadata.role = admin` remains a secondary middleware path; profile role is the ops source of truth for the Admin button.
