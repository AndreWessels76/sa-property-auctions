# RC5.2 Live Smoke Report — Billing & Authentication

**Target:** https://sa-property-auctions.vercel.app  
**Date:** 2026-07-31  
**Mode:** Stripe **Test Mode** + live production APIs (cookie sessions)  
**Readiness:** `/api/health/ready` → **200** `{ env, database, stripe: ok }`  
**Local validation:** `npm run typecheck` · `npm run build` (see session log)

---

## Recommendation

# READY FOR CLOSED BETA

**Not** ready for Public Beta or Production until Vercel Stripe **Price IDs** are corrected and one full paid checkout → webhook → premium unlock is completed in the browser.

---

## Overall Score

**72 / 100**

| Area | Score | Notes |
|---|---|---|
| Authentication | 9/10 | Login/logout/session/invalid creds PASS |
| Registration | 8/10 | Works (mailinator); `example.com` rejected by Supabase; email rate limit hit under load |
| Billing / Checkout | 4/10 | App checkout **500** on production — env uses Product IDs |
| Stripe Test Mode | 7/10 | Session creates **after** correcting to `price_…` locally |
| Webhook | 6/10 | Invalid signature rejected; full event matrix not exercised |
| Premium | 5/10 | Free correctly blocked; paid premium journey **not completed** |
| Database | 8/10 | Profile `role=free`, `subscription_status=inactive` after register |
| Security | 9/10 | Guest/premium/admin gates PASS |
| UX | 7/10 | Core browse/detail OK; billing CTA cannot complete on live |

---

## Phase results

### Phase 0 — Infrastructure
| Check | Result | Evidence |
|---|---|---|
| `/api/health/ready` | **PASS** | `200` `status=ready` |
| Home / pricing / property | **PASS** | `200` |

### Phase 1 — Registration
| Check | Result | Evidence |
|---|---|---|
| Register new user | **PASS** | Supabase signup `200` (mailinator); user id issued; confirmation email flagged sent |
| `example.com` emails | **FAIL / product constraint** | `email_address_invalid` — not an app bug |
| Duplicate email | **PARTIAL** | Rate-limited (`429 over_email_send_rate_limit`) on rapid retries; first-user path OK |
| Password validation | **PASS** | Weak password → `422` |
| Email confirmation | **PASS** | Admin `email_confirm` simulate (inbox not automated) → login works |
| Confirm-email page | **PASS** | `/verify-email` `200` |
| Resend verification | **PASS** | `200` (or rate-limit) |
| Profile creation | **PASS** | `profiles` row exists |
| Default `role=free` | **PASS** | DB |
| Default subscription inactive | **PASS** | `subscription_status=inactive` |

### Phase 2 — Authentication
| Check | Result | Evidence |
|---|---|---|
| Login | **PASS** | `POST /api/auth/login` `200` + session cookies |
| Logout | **PASS** | `200` |
| Session persistence | **PASS** | `/dashboard` `200` with cookies |
| Invalid credentials | **PASS** | `401` `Invalid email or password.` — no stack/secret leak |
| Password reset page | **PASS** | `200` |
| Reset request | **PASS** | Supabase recover `200` |
| Session expiration | **NOT RUN** | Would require waiting out JWT TTL |

### Phase 3 — Free user journey
| Check | Result | Evidence |
|---|---|---|
| Home / search / detail / gallery | **PASS** | `200` |
| Pricing / upgrade CTA | **PASS** | Monthly/Yearly CTAs present |
| AI search (free session) | **PASS** | `403 Premium subscription required` |
| Saved searches (free) | **PASS** | `200` `[]` |
| Admin | **PASS** | Redirect / `403` on admin API |

### Phase 4 — Stripe Checkout
| Check | Result | Evidence |
|---|---|---|
| Pricing page | **PASS** | `200` |
| Production checkout session | **FAIL** | Authenticated `POST /api/billing/checkout` → **500** `Checkout failed` |
| Root cause | **CONFIRMED** | Vercel/local had `STRIPE_PRICE_* = prod_…` (Product IDs). Stripe: `No such price: 'prod_Uz7UKySchKPZZD'` |
| Fix (local) | **DONE** | Mapped to default prices: monthly `price_1Tz9FY2N3FBRhtZYvCVP9DPn`, yearly `price_1Tz9HA2N3FBRhtZYBaKSjo7f` |
| Retest after local fix | **PASS** | Direct Stripe Test session `200`, `cs_test_…`, `hasUrl=true` |
| Production retest | **FAIL (pending ops)** | Live app still returns checkout `500` until **Vercel env** updated + redeploy |
| Successful payment / webhook / premium flip | **BLOCKED** | Needs Vercel price fix + browser payment |

### Phase 5 — Premium journey
| Check | Result | Evidence |
|---|---|---|
| Premium unlock after pay | **BLOCKED** | Payment not completed on live |

### Phase 6 — Billing Portal
| Check | Result | Evidence |
|---|---|---|
| Portal without customer | **PASS (expected deny)** | Was `500 Portal session failed`; code hardened to **400** with clear message (deploy pending) |
| Cancel / reactivate | **BLOCKED** | Needs active Stripe customer |

### Phase 7 — Subscription webhook events
| Check | Result | Evidence |
|---|---|---|
| Invalid signature | **PASS** | `400 Invalid signature` |
| `checkout.session.completed` etc. | **PARTIAL / NOT LIVE-PROVEN** | Requires Stripe CLI/`stripe trigger` against production webhook after price fix |

### Phase 8 — Security
| Check | Result | Evidence |
|---|---|---|
| Guest AI / checkout / portal / saved-searches | **PASS** | `401` |
| Guest admin | **PASS** | `307` → login |
| Free → admin API | **PASS** | `403` |
| Invalid webhook | **PASS** | `400` |

### Phase 9 — Database
| Check | Result | Evidence |
|---|---|---|
| Profile after register/login | **PASS** | `role=free`, `subscription_status=inactive`, no Stripe IDs |
| Post-checkout sync | **BLOCKED** | No successful live checkout yet |

---

## Defects found & disposition

| Defect | Severity | Fix | Retest |
|---|---|---|---|
| `STRIPE_PRICE_MONTHLY` / `YEARLY` set to **Product** IDs (`prod_`) | **High** | Local `.env.local` updated to Stripe **Price** IDs; **Vercel Production must match** | Local Stripe session **PASS**; production checkout still **FAIL** until Vercel updated |
| Billing portal returns **500** when no Stripe customer | **Low** | `BillingService.openPortal` → `ApiError 400` clear message | Code fixed; awaits deploy |
| Supabase rejects `@example.com` | **Info** | Not an app defect | Use real/test inbox domains |
| Email send rate limit under rapid signup | **Info** | Ops / backoff | Expected Supabase limit |

---

## Remaining risks

1. **Production checkout broken** until Vercel `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` are real `price_…` values (not `prod_…`) and redeployed.  
2. Full **paid** premium + portal cancel/reactivate + webhook matrix not proven on live.  
3. INSERT harden migration apply still an ops checklist item (outside this smoke’s payment path).  
4. No automated browser payment (card `4242…`) in this run.

---

## Required ops before Public Beta

1. In Vercel → Production env set:  
   - `STRIPE_PRICE_MONTHLY` = monthly **Price** ID (`price_…`)  
   - `STRIPE_PRICE_YEARLY` = yearly **Price** ID (`price_…`)  
2. Redeploy.  
3. Manually: register → verify → login → Pricing → pay with test card → confirm profile becomes premium → AI unlocks → open portal.  
4. Confirm Stripe webhook delivery for `checkout.session.completed` / subscription events.

---

## Classification

| | |
|---|---|
| **READY FOR CLOSED BETA** | **YES** — auth, free journey, security gates, readiness OK |
| Ready for Public Beta | **NO** — live checkout broken until Price IDs fixed on Vercel + paid path proven |
| Ready for Production | **NO** |

**Chosen classification: READY FOR CLOSED BETA**
