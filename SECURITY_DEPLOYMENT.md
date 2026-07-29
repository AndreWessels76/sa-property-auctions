# Security Deployment — SA Property Auctions

Production security configuration reference.

---

## HTTP security headers

Configured in `next.config.ts` for all routes:

| Header | Value | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Clickjacking protection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused APIs |

**Also configured:**

- `poweredByHeader: false` — removes `X-Powered-By: Next.js`

**Not configured (gap):**

- `Content-Security-Policy` — not set. Acceptable for beta; add before broad public traffic if XSS risk is a concern.

---

## HTTPS

- **Vercel:** Automatic TLS for `*.vercel.app` and custom domains.
- **Requirement:** `NEXT_PUBLIC_SITE_URL` must use `https://` in production (validated — localhost rejected in prod).
- **HSTS:** Provided by Vercel edge (no app config required).

---

## Cookies & sessions

- Auth via Supabase SSR (`@supabase/ssr`) with HTTP-only session cookies.
- Middleware refreshes session on each request (`middleware.ts`).
- Cookies managed by Supabase — follow [Supabase SSR cookie docs](https://supabase.com/docs/guides/auth/server-side) for production cookie domain if using custom domain.

**Production middleware behaviour:**

- Missing `NEXT_PUBLIC_SUPABASE_URL` or anon key → **503** `Service misconfigured` (fail closed).

---

## Secrets management

| Secret | Where | Never |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env (server) | Client bundle, `NEXT_PUBLIC_*` |
| `STRIPE_SECRET_KEY` | Vercel env (server) | Client bundle |
| `STRIPE_WEBHOOK_SECRET` | Vercel env (server) | Client bundle |
| Anon key | `NEXT_PUBLIC_*` | OK public (RLS-bound) |

**Git:** `.gitignore` excludes `.env*`. Only `.env.example` is committed.

**Never in production:**

- `SKIP_ENV_VALIDATION=1`
- Committed `.env.local`

---

## Environment validation

**Boot-time** (`instrumentation.ts`):

- Runs `validateEnv({ force: true })` when `NODE_ENV=production`
- Skips during `NEXT_PHASE=phase-production-build`
- Throws on missing/invalid required vars → deployment fails fast

**Invalid conditions:**

- Duplicate monthly/yearly Stripe Price IDs
- `NEXT_PUBLIC_SITE_URL` = localhost in production

---

## Authentication & authorization

| Layer | Mechanism |
|---|---|
| Route protection | Middleware → `enforceRouteProtection` |
| Admin routes | JWT `app_metadata.role = admin` |
| Premium features | `SubscriptionService` / `PremiumGuard` (profile subscription status) |
| API routes | Per-route `SessionService`, `PermissionService` |
| Profile self-elevation | Blocked by RLS (migration 5) |
| Billing userId | Session-only, never from request body |

---

## API security

| Route | Protection |
|---|---|
| `/api/billing/checkout` | Auth + rate limit |
| `/api/billing/portal` | Auth + rate limit |
| `/api/billing/webhook` | Stripe signature only |
| `/api/properties/ai-search` | Auth + premium + rate limit |
| `/api/admin/imports` | Admin + rate limit |
| `/api/auth/login` | Rate limit + sanitized errors |

**Rate limiting:** In-memory (`lib/api/rateLimit.ts`) — per-instance; upgrade to Redis at scale.

---

## Health endpoints

| Endpoint | Auth | Leakage |
|---|---|---|
| `/api/health` | Public | Version + env name only |
| `/api/health/live` | Public | Status + timestamp |
| `/api/health/ready` | Public | Checks only; `missingEnv` hidden in production |

---

## Debug / development configuration

| Item | Production status |
|---|---|
| `SKIP_ENV_VALIDATION` | Must not be set |
| Debug logs | `LoggerService` suppresses debug level in production |
| Stack traces in API errors | Sanitized via `jsonError` in production |
| Source maps | Next.js default (not exposed to clients) |

---

## CORS

- Same-origin Next.js app — no custom CORS middleware.
- Stripe webhook is server-to-server (no browser CORS).

---

## Deployment security checklist

- [ ] All secrets in Vercel env (not in repo)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` server-only
- [ ] Production `NEXT_PUBLIC_SITE_URL` is HTTPS
- [ ] Supabase RLS enabled on all user tables
- [ ] Storage policies applied (no anon upload)
- [ ] Stripe webhook signature verification active
- [ ] Admin users assigned via `profiles.role` or JWT metadata
- [ ] No `SKIP_ENV_VALIDATION` in production
- [ ] Review Vercel deployment protection for preview if needed

---

## Post-launch hardening (optional)

- Add Content-Security-Policy header
- Wire Sentry or similar for error reporting
- Enable Vercel Deployment Protection on preview
- Rotate service role key if ever exposed
