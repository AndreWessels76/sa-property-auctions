# RC2.2 Hotfix Plan — Production Blockers Only

Status: **COMPLETE**  
Classification: see Final Release Report below

Rules: minimal, safe, backwards compatible. No features / rewrites / optimizations.

---

## Blocker 1 — Premium access (past_due / unpaid) — DONE

| Field | Detail |
|---|---|
| **Issue** | `markPastDue` leaves `role=premium`; gates fall back to role |
| **Fix** | Premium = `isPremiumStatus(status)` OR `role === admin` only. `markPastDue` demotes `role` to `free`. |
| **Files** | `lib/subscription/SubscriptionService.ts`, `lib/auth/isPremium.ts`, `app/components/subscription/PremiumGuard.tsx`, `lib/repositories/SubscriptionRepository.ts` |
| **Risk** | Low |
| **Validation** | typecheck PASS; build PASS |
| **Status** | **COMPLETED** |

---

## Blocker 2 — RoleGuard JWT Premium — DONE

| Field | Detail |
|---|---|
| **Issue** | Heatmaps / valuation used JWT RoleGuard |
| **Fix** | Switched to `PremiumGuard`. `RoleGuard` now uses profile role (admin use). |
| **Files** | `GatedHeatMapDashboard.tsx`, `GatedAIValuation.tsx`, `RoleGuard.tsx` |
| **Risk** | Low |
| **Validation** | typecheck PASS; build PASS |
| **Status** | **COMPLETED** |

---

## Blocker 3 — Home search — DONE

| Field | Detail |
|---|---|
| **Issue** | Guests/free hit premium AI endpoint |
| **Fix** | Option A+B: local keyword filter for non-premium; Upgrade CTA; AI only when premium/admin |
| **Files** | `components/search/PropertySearch.tsx` |
| **Risk** | Low |
| **Validation** | typecheck PASS; build PASS; eslint on file PASS |
| **Status** | **COMPLETED** |

---

## Blocker 4 — Ready endpoint — DONE

| Field | Detail |
|---|---|
| **Issue** | Anon RLS false 503 |
| **Fix** | Service-role DB probe; hide `missingEnv` in production responses |
| **Files** | `app/api/health/ready/route.ts` |
| **Risk** | Low |
| **Validation** | typecheck PASS; build PASS |
| **Status** | **COMPLETED** |

---

## Blocker 5 — Email verification (confirm ON) — DONE

| Field | Detail |
|---|---|
| **Issue** | Stub verify page; no redirect/resend |
| **Fix** | `emailRedirectTo`; metadata on signup; register → `/verify-email`; resend + login CTA |
| **Files** | `signUp.ts`, `resendVerification.ts`, `RegisterForm.tsx`, `VerifyEmailCard.tsx`, `verify-email/page.tsx`, `AuthService.ts` |
| **Risk** | Med (depends on Supabase confirm-email ON — confirmed by ops) |
| **Validation** | typecheck PASS; build PASS |
| **Status** | **COMPLETED** |

---

## Blocker 6 — Image upload security — DONE

| Field | Detail |
|---|---|
| **Issue** | Public property page allowed anonymous upload UI |
| **Fix** | Removed upload from property detail; `ImageUpload` admin-gated if remounted |
| **Files** | `app/properties/[id]/page.tsx`, `components/images/ImageUpload.tsx` |
| **Risk** | Med — **ops must confirm** Storage RLS denies anon writes |
| **Validation** | typecheck PASS; build PASS |
| **Status** | **COMPLETED** (app-layer); storage RLS ops checklist item remains |

---

## Blocker 7 — Alerts & Watchlist — DONE

| Field | Detail |
|---|---|
| **Issue** | Stub features linked in UI |
| **Fix** | Removed Header Alerts + Dashboard tiles; routes redirect to `/dashboard` |
| **Files** | `Header.tsx`, `Dashboard.tsx`, `app/alerts/page.tsx`, `app/watchlist/page.tsx` |
| **Risk** | Low |
| **Validation** | typecheck PASS; build PASS |
| **Status** | **COMPLETED** |

---

## Blocker 8 — Mobile navigation — DONE

| Field | Detail |
|---|---|
| **Issue** | Dead hamburger |
| **Fix** | Menu open/close, Escape, outside click, aria, body scroll lock, full link set |
| **Files** | `components/layout/Header.tsx` |
| **Risk** | Low |
| **Validation** | typecheck PASS; eslint PASS; build PASS |
| **Status** | **COMPLETED** |

---

## Blocker 9 — Deployment validation — DONE (checklist)

| Field | Detail |
|---|---|
| **Issue** | Production config must be verified |
| **Fix** | Aligned `.env.example` with `REQUIRED_ENV`; ready probe uses service role |
| **Files** | `.env.example`, health ready, this checklist |
| **Risk** | Ops-dependent |
| **Validation** | Code-side complete; live env/migration apply is ops |
| **Status** | **COMPLETED** (code + checklist) |

### Deployment checklist (ops before go-live)

- [ ] Apply `supabase/migrations/20260728210000_profiles_billing.sql` on production DB
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- [ ] Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`
- [ ] Set `NEXT_PUBLIC_SITE_URL` to production HTTPS origin
- [ ] Confirm Supabase Auth **Confirm email = ON** matches verify-email flow
- [ ] Configure Stripe webhook → `/api/billing/webhook` (signed)
- [ ] Verify `GET /api/health`, `/api/health/live`, `/api/health/ready` → 200
- [ ] Confirm Storage bucket `property-images` **rejects anonymous uploads**
- [ ] Never set `SKIP_ENV_VALIDATION=1` in production
- [ ] Smoke: register → verify → login → checkout (test mode) → webhook activate → portal

---

## Execution log

| Blocker | Completed | Notes |
|---|---|---|
| 1 | YES | Status-only premium (+ admin exception) |
| 2 | YES | PremiumGuard for heatmaps/valuation |
| 3 | YES | Local fallback + Upgrade CTA |
| 4 | YES | Service-role ready probe |
| 5 | YES | Full confirm-email path |
| 6 | YES | UI removed; admin-gated component |
| 7 | YES | Hidden + redirect |
| 8 | YES | Mobile drawer |
| 9 | YES | Env example + checklist |

## Validation performed

- `npm run typecheck` — PASS
- ESLint on hotfix files — PASS
- Repo-wide ESLint — pre-existing failures elsewhere (not introduced by hotfix)
- `npx next build` (clear `NODE_OPTIONS`) — PASS (exit 0)

Note: `npm run build` embeds `--use-system-ca` which breaks Next workers; use `npx next build` with empty `NODE_OPTIONS` until scripts are adjusted in a future sprint.
