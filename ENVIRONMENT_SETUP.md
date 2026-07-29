# Environment Setup — SA Property Auctions

Guide for **Development**, **Preview**, and **Production** environment variables.

---

## Required variables (all environments)

These are enforced by `lib/env/validateEnv.ts` and fail-fast on production boot (`instrumentation.ts`).

| Variable | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (browser) | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (browser) | Supabase anon key (RLS-bound) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Webhooks, billing sync, health ready probe |
| `STRIPE_SECRET_KEY` | **Server only** | Checkout, portal, webhook verification |
| `STRIPE_WEBHOOK_SECRET` | **Server only** | Stripe webhook signature validation |
| `STRIPE_PRICE_MONTHLY` | **Server only** | Stripe Price ID for monthly plan |
| `STRIPE_PRICE_YEARLY` | **Server only** | Stripe Price ID for yearly plan (must differ from monthly) |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical origin for auth redirects, Stripe URLs, metadata |

Copy template from `.env.example` → `.env.local` for local development.

---

## Per-environment values

### Development (local)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key from Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (never commit) |
| `STRIPE_SECRET_KEY` | `sk_test_...` from Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | From Stripe CLI or test webhook endpoint |
| `STRIPE_PRICE_MONTHLY` | Test mode Price ID (`price_...`) |
| `STRIPE_PRICE_YEARLY` | **Different** test Price ID |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |

**Local Stripe webhook (development):**

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Use the signing secret printed by the CLI as `STRIPE_WEBHOOK_SECRET`.

**Verify locally:**

```bash
npm run audit:env      # masked key presence check
npm run verify:supabase # anon connectivity
```

---

### Preview (Vercel preview deployments)

Set the same keys as Production **except** use Stripe **test mode** keys unless you intentionally test live billing on preview.

| Variable | Guidance |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Vercel preview URL, e.g. `https://sa-property-auctions-abc123.vercel.app` **or** fixed staging subdomain |
| Stripe keys | Test mode recommended |
| `SUPABASE_SERVICE_ROLE_KEY` | Same project as staging DB, or dedicated staging Supabase project |

**Important:** Supabase Auth redirect URLs must include the preview origin if testing auth on preview branches.

In Supabase Dashboard → Authentication → URL Configuration, add:

- `https://<preview-host>/login`
- `https://<preview-host>/reset-password`

---

### Production (Vercel)

| Variable | Guidance |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production service role — **never** prefix with `NEXT_PUBLIC_` |
| `STRIPE_SECRET_KEY` | `sk_live_...` when going live |
| `STRIPE_WEBHOOK_SECRET` | From production webhook endpoint (`whsec_...`) |
| `STRIPE_PRICE_MONTHLY` | Live Price ID |
| `STRIPE_PRICE_YEARLY` | Live Price ID (different from monthly) |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.co.za` (no trailing slash) |

**Production rules (enforced in code):**

- `NEXT_PUBLIC_SITE_URL` cannot be `localhost` in production.
- `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_YEARLY` must be different.
- Never set `SKIP_ENV_VALIDATION=1` in production.

---

## Vercel configuration steps

1. Open Vercel project → **Settings** → **Environment Variables**.
2. Add each required variable for **Production**, **Preview**, and **Development** as appropriate.
3. Mark server-only keys as available to **Production** and **Preview** only (not exposed to browser — Vercel handles this for non-`NEXT_PUBLIC_` vars).
4. Redeploy after changing env vars.

---

## Optional variables (not required for boot)

| Variable | Purpose |
|---|---|
| `AI_PROVIDER` | `openai` \| `anthropic` \| `gemini` |
| `OPENAI_API_KEY` | AI search / analysis |
| `ANTHROPIC_API_KEY` | AI provider |
| `GEMINI_API_KEY` | AI provider |
| `SKIP_ENV_VALIDATION` | **Local only** — bypass fail-fast (never in production) |

AI keys are optional for deployment boot but required for premium AI features.

---

## Validation checklist

- [ ] All 8 required keys present in Production
- [ ] No placeholder values (`price_xxxx`, `sk_test_...` ellipsis in prod)
- [ ] Monthly and yearly Price IDs are different
- [ ] `NEXT_PUBLIC_SITE_URL` matches deployed HTTPS origin
- [ ] Service role key set and not committed to git
- [ ] `.env.local` in `.gitignore` (confirmed)
- [ ] `npm run audit:env` passes locally before promoting config to Vercel

---

## Domain & HTTPS

| Item | Status | Action |
|---|---|---|
| Custom domain | Manual | Vercel → Domains → add domain, configure DNS |
| HTTPS / SSL | Automatic on Vercel | Verify certificate active |
| `NEXT_PUBLIC_SITE_URL` | Must match domain | Update after domain is live |
| `robots.txt` | **Not in repo** | Add `public/robots.txt` before public SEO launch |
| `sitemap.xml` | **Not in repo** | Add when SEO launch is scheduled (out of RC3 scope) |
| `favicon.ico` | **Referenced but missing** | Add `app/favicon.ico` or `public/favicon.ico` |
| `manifest.json` | **Not in repo** | Optional PWA manifest for future |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| App crashes on boot in production | Missing env var | Check Vercel logs; run `validateEnv` message |
| `/api/health/ready` → 503 | Missing service role or DB unreachable | Set `SUPABASE_SERVICE_ROLE_KEY`; apply migrations |
| Stripe checkout fails | Wrong price IDs or test key in prod | Verify `STRIPE_PRICE_*` match Dashboard |
| Auth redirect fails | `SITE_URL` mismatch | Align `NEXT_PUBLIC_SITE_URL` with Supabase redirect URLs |
| Email verify link wrong host | `SITE_URL` or Supabase redirect config | Set both to production HTTPS origin |
