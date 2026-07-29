# Operations Guide — SA Property Auctions

Day-2 operations reference for production.

---

## Health endpoints

| Endpoint | Purpose | Expected response |
|---|---|---|
| `GET /api/health` | Basic service info | `200` `{ status: "ok", service, version, environment, time }` |
| `GET /api/health/live` | Liveness (process up) | `200` `{ status: "alive", time }` |
| `GET /api/health/ready` | Readiness (deps OK) | `200` if env + DB + Stripe key OK; else `503` |

### Ready check details

`ready` verifies:

1. All required env vars present and valid
2. Supabase reachable via **service role** (`profiles` select limit 1)
3. `STRIPE_SECRET_KEY` present

Use for load balancer / uptime monitors:

- **Liveness:** `/api/health/live` — restart if fails
- **Readiness:** `/api/health/ready` — remove from rotation if fails

---

## Logging

**Implementation:** `lib/logger.ts` → `LoggerService`

| Level | Production | Format |
|---|---|---|
| `error` | Yes | JSON line to stderr |
| `warn` | Yes | JSON line |
| `info` | Yes | JSON line |
| `debug` | No | Dev only |

**Structured fields:** `level`, `message`, `timestamp`, `env`, plus context object.

**Stripe events:** `LoggerService.stripe(message, context)`

**Repository errors:** `LoggerService.error` with operation name.

### Vercel log access

Vercel Dashboard → Project → **Logs** (Runtime / Build).

Filter by:

- `level:error`
- `Stripe webhook handler failed`
- `Environment validation failed`

---

## Audit logging

**Current state:** No dedicated audit table. Security-relevant events logged to stdout:

- Checkout session created
- Portal session created
- Webhook handler failures
- Repository errors

**Future:** Consider `audit_log` table for admin actions and billing state changes.

---

## Application version

Exposed at `GET /api/health`:

```json
{ "version": "0.1.0" }
```

Source: `npm_package_version` from `package.json`.

Bump `version` in `package.json` for each production release.

---

## Monitoring integration points

### Uptime (recommended)

| Monitor | URL | Interval |
|---|---|---|
| Liveness | `https://<domain>/api/health/live` | 1 min |
| Readiness | `https://<domain>/api/health/ready` | 5 min |

Alert on 2+ consecutive failures.

### Stripe

- Dashboard → **Webhooks** → failed deliveries
- Dashboard → **Billing** → failed payments

### Supabase

- Dashboard → **Reports** → API errors, auth errors
- Database → connection pool / disk usage

### Error reporting (not wired)

Hook points for Sentry/Datadog:

- `instrumentation.ts` — `register()` catch
- `lib/api/http.ts` — `jsonError`
- `LoggerService.error` — add transport

---

## Common operational tasks

### Check if app is healthy

```bash
curl -s https://<domain>/api/health/ready | jq
```

### Verify env locally before deploy

```bash
npm run audit:env
npm run verify:supabase
```

### Force env validation

```bash
NODE_ENV=production node -e "require('./lib/env/validateEnv').validateEnv({force:true})"
```

(Requires loading env first in Node context.)

### Grant admin access

In Supabase SQL:

```sql
update public.profiles set role = 'admin' where id = '<user-uuid>';
```

Also set JWT `app_metadata.role = admin` in Supabase Auth if middleware admin gate is used.

### Revoke premium manually

Prefer Stripe Customer Portal. Emergency SQL:

```sql
update public.profiles
set role = 'free', subscription_status = 'inactive', subscription_plan = 'free'
where id = '<user-uuid>';
```

---

## Deployment commands

| Command | When |
|---|---|
| `npm ci` | Vercel install (configured in `vercel.json`) |
| `npm run build` | Vercel build |
| `npm run typecheck` | Pre-deploy local check |
| `npm run verify:supabase` | Post-env-change connectivity |

**Vercel deploy:** Push to connected branch or `vercel --prod` (manual).

---

## Incident severity guide

| Severity | Example | Response |
|---|---|---|
| P1 | Site down, auth broken, billing broken | Immediate rollback + comms |
| P2 | Ready 503, webhook failures | Fix env/migrations within 1h |
| P3 | Single feature degraded | Fix in next deploy |
| P4 | Non-critical UI issue | Backlog |

See `BACKUP_AND_RECOVERY.md` for incident response steps.
