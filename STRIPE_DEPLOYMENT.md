# Stripe Deployment — SA Property Auctions

Billing stack: Stripe Checkout (subscriptions) + Customer Portal + webhooks → Supabase `profiles`.

---

## Products & prices

Create in Stripe Dashboard → **Products**:

| Product | Billing | Env variable | Used by |
|---|---|---|---|
| Premium Monthly | Recurring monthly | `STRIPE_PRICE_MONTHLY` | Checkout `interval: "monthly"` |
| Premium Yearly | Recurring yearly | `STRIPE_PRICE_YEARLY` | Checkout `interval: "yearly"` |

**Rules:**

- Monthly and yearly must be **different** Price IDs (validated at boot).
- Copy Price IDs (`price_...`) into Vercel env — not Product IDs.

### Test vs Live

| Environment | Secret key | Webhook |
|---|---|---|
| Development | `sk_test_...` | Stripe CLI or test endpoint |
| Preview | `sk_test_...` (recommended) | Test endpoint pointing to preview URL |
| Production | `sk_live_...` | Live endpoint |

---

## Checkout

**Route:** `POST /api/billing/checkout`  
**Auth:** Session required (`SessionService.requireUser`)  
**Body:** `{ "interval": "monthly" | "yearly" }`

**Stripe session config** (`lib/billing/CheckoutService.ts`):

| Field | Value |
|---|---|
| `mode` | `subscription` |
| `client_reference_id` | Supabase user ID |
| `metadata.userId` | Supabase user ID |
| `subscription_data.metadata.userId` | Supabase user ID |
| `success_url` | `{NEXT_PUBLIC_SITE_URL}/billing/success` |
| `cancel_url` | `{NEXT_PUBLIC_SITE_URL}/pricing` |
| `line_items[0].price` | Monthly or yearly Price ID |

User ID is **never** accepted from client body — only from session.

---

## Customer Portal

**Route:** `POST /api/billing/portal`  
**Auth:** Session required  
**Requires:** `profiles.stripe_customer_id` set (after first checkout)

Return URL: `{NEXT_PUBLIC_SITE_URL}/profile`

Enable Customer Portal in Stripe Dashboard → **Settings** → **Billing** → **Customer portal**:

- Allow subscription cancellation (recommended)
- Allow payment method update
- Link to pricing page optional

---

## Webhook endpoint

**URL:** `https://<your-domain>/api/billing/webhook`  
**Method:** POST  
**Secret:** Set as `STRIPE_WEBHOOK_SECRET` (`whsec_...`)

### Events to subscribe

| Event | Handler behaviour |
|---|---|
| `checkout.session.completed` | Activate subscription on `profiles` |
| `customer.subscription.updated` | Activate / past_due / cancel based on status |
| `customer.subscription.deleted` | Cancel subscription on `profiles` |
| `invoice.payment_failed` | Mark `past_due`, demote role |

**Not explicitly handled:** `invoice.paid` — renewals rely on `customer.subscription.updated` (ensure this event is enabled).

### Signature verification

Invalid signature → **400** `Invalid signature` (fail closed).

### Activation flow

`WebhookService.activateSubscription` → `SubscriptionRepository.activate`:

- `role = premium`
- `subscription_status = active`
- `subscription_plan = premium_monthly | premium_yearly`
- Stripe customer/subscription IDs stored
- `subscription_expires_at` from period end

### Past due / cancel

- `markPastDue` → `subscription_status = past_due`, `role = free`
- `cancel` → `role = free`, `subscription_status = inactive`, clears subscription ID

---

## Environment variables

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
```

---

## Local development webhook

```bash
stripe login
stripe listen --forward-to localhost:3000/api/billing/webhook
# Copy whsec_... to .env.local as STRIPE_WEBHOOK_SECRET
```

Trigger test events:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

---

## Production webhook setup

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**
2. URL: `https://<production-domain>/api/billing/webhook`
3. Select events listed above
4. Copy signing secret → Vercel `STRIPE_WEBHOOK_SECRET`
5. Redeploy application

---

## Customer sync & orphan prevention

| Check | Status |
|---|---|
| Checkout binds `userId` from session | ✅ |
| Webhook uses `client_reference_id` / metadata `userId` | ✅ |
| Customer lookup fallback via `stripe_customer_id` | ✅ |
| Missing `userId` on checkout.completed | ⚠️ Silent skip (returns 200) — monitor webhook logs |

**Manual reconciliation:** If webhook fails, compare Stripe Customers → Supabase `profiles.stripe_customer_id`.

---

## Deployment checklist

- [ ] Products created (monthly + yearly)
- [ ] Price IDs in Vercel env (different values)
- [ ] Customer Portal enabled
- [ ] Webhook endpoint registered (correct URL)
- [ ] All 4 event types enabled
- [ ] `STRIPE_WEBHOOK_SECRET` set in Vercel
- [ ] Test checkout in test mode before live keys
- [ ] Verify `profiles` row updates after test checkout
- [ ] Switch to `sk_live_...` only when ready for real payments

---

## Go-live billing smoke (Launch Dry Run)

1. Register test user → login
2. `POST /api/billing/checkout` with `{ "interval": "monthly" }`
3. Complete Stripe test checkout
4. Confirm webhook received (Stripe Dashboard → Webhooks → event log)
5. Confirm `profiles.subscription_status = active`, `role = premium`
6. Open portal from profile → cancel or update payment method
7. Simulate `invoice.payment_failed` → confirm `past_due` + access revoked
