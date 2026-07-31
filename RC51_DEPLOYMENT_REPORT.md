# RC5.1 Deployment Report — Live Sync Verification

**Date:** 2026-07-31  
**Production URL:** https://sa-property-auctions.vercel.app  
**Local validation:** `npm run typecheck` ✅ · `npm run build` ✅

---

## Executive verdict

# READY FOR CLOSED BETA

**Not** ready for public beta or production until production env readiness is green and the INSERT-harden migration is confirmed applied on Supabase.

---

## Synchronization matrix

| Layer | SHA / state | Result |
|---|---|---|
| Local repository | `63619e6c94133a95205b85e1ae1b21aa4426ab5b` | **PASS** (clean vs `origin/main`) |
| GitHub `main` | `63619e6c94133a95205b85e1ae1b21aa4426ab5b` | **PASS** |
| Vercel Production deployment | `63619e6c94133a95205b85e1ae1b21aa4426ab5b` | **PASS** |
| Live behavioural markers | robots / coming-soon / hasNext / property 200 | **PASS** |
| Supabase migration 7 applied | Not remotely confirmed | **FAIL / OPS PENDING** |
| Production env readiness | `/api/health/ready` → `env=fail` | **FAIL** |

**Deployment Synchronization:** **YES** (Repo ↔ GitHub ↔ Vercel ↔ Live app code).  
**Full stack sync including ops config/DB:** **NO**.

---

## Phase 1 — Git verification

| Item | Value |
|---|---|
| Branch | `main` |
| Upstream | `origin/main` |
| Git SHA | `63619e6c94133a95205b85e1ae1b21aa4426ab5b` |
| Commit timestamp | `2026-07-31 13:36:39 +0200` (`2026-07-31T11:36:39Z`) |
| Message | Sync RC4/BFS/RC5 production fixes to main for Vercel deploy. |
| Working tree (after sync commit) | Clean vs remote |
| Production branch | `main` |

### Pre-sync finding (root cause of RC5 drift)

Before RC5.1, local `HEAD` matched GitHub at `dcfc117`, but the working tree held **uncommitted** RC4/BFS/RC5 production fixes. Redeploy alone could not heal live drift.

**Fix applied:** commit `63619e6` + push to `origin/main` (deployment drift correction only; no new features).

---

## Phase 2 — GitHub verification

| Check | Result | Evidence |
|---|---|---|
| Default branch | **PASS** | `main` |
| Latest commit SHA | **PASS** | `63619e6…` matches local |
| Pending local commits | **PASS** | `0` ahead / `0` behind after push |
| Detached deploy | **PASS** | Deploy ref = `main` SHA |

---

## Phase 3 — Vercel verification

| Check | Result | Evidence |
|---|---|---|
| Prior production SHA | `dcfc117…` | GitHub Deployments API (id `5687179363`, 2026-07-31T06:06:40Z) |
| New production SHA | `63619e6…` | Deployments API id `5690861628`, created `2026-07-31T11:38:05Z` |
| Commit status | **PASS** | Vercel context `success` — “Deployment has completed” |
| Deploy URL | Documented | https://vercel.com/auction76/sa-property-auctions/FA9BjXrn9jKTD1P4psGjR12J1e9d |
| Production alias | **PASS** | https://sa-property-auctions.vercel.app served new markers |
| Framework | Next.js (from app / prior builds) | Local build Next.js 16.2.9 |
| Node / build log detail via CLI | **NOT AVAILABLE** | `vercel` / `gh` CLIs not installed; certificate issues blocked `npx vercel` |
| Originates from latest GitHub commit | **PASS** | Status + Deployments SHA = `63619e6` |

---

## Phase 4 — Environment validation

Method: presence/validity inferred from `/api/health/ready` only. **No secret values exposed.**

| Signal | Result |
|---|---|
| `checks.database` | **ok** |
| `checks.stripe` | **ok** → `STRIPE_SECRET_KEY` present |
| `checks.env` | **fail** → overall **503 not_ready** |
| Individual key listing via Vercel dashboard/CLI | **NOT VERIFIED** (no authorized CLI session) |

Required keys (must be set non-empty in Vercel Production; ops to confirm in dashboard):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` (present per ready)
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MONTHLY`
- `STRIPE_PRICE_YEARLY`
- `NEXT_PUBLIC_SITE_URL`
- `OPENAI_API_KEY` / `AI_PROVIDER` (app AI; not in ready required set)

Likely causes of `env=fail` (from app validator; do not invent values):

1. One or more required vars empty on Vercel, **or**
2. `NEXT_PUBLIC_SITE_URL` still localhost in production, **or**
3. Monthly/yearly Stripe price IDs identical

**Environment Status:** **FAIL** until `/api/health/ready` returns 200.

---

## Phase 5 — Supabase verification

| Item | Status |
|---|---|
| Migration file in repo | **PASS** — `supabase/migrations/20260731120000_profiles_insert_harden.sql` |
| Documented in `SUPABASE_DEPLOYMENT.md` | **PASS** |
| Applied on live project | **NOT CONFIRMED** — no Supabase management API/CLI access in this run |
| Billing / storage / profiles RLS history | Present in repo migrations; live apply history **not queried** |

**Migration Status:** **OPS PENDING** — treat INSERT harden as **not certified applied**.

---

## Phase 6 — Deployment drift (before → after)

| Behaviour | RC5 (pre-sync) | RC5.1 (post-deploy) |
|---|---|---|
| Heatmaps nav / route | Linked; login redirect | **Hidden**; `/heatmaps` → `/coming-soon` |
| Pagination `hasNext`/`hasPrevious` | Absent | **Present** |
| `/robots.txt` | 404 | **200** |
| `/sitemap.xml` | 404 | **200** |
| Property detail | 500 | **200** |
| Image repository harden | Not live | **Live** (detail renders) |
| `/coming-soon` | 404 | **200** |

**Drift fix:** push + Vercel auto-deploy of `63619e6`. No extra app code changes beyond the sync commit.

---

## Phase 7 — Live smoke recheck (post-deploy)

| Path | RC5 | RC5.1 |
|---|---|---|
| `/` | 200 | **200** |
| `/pricing` | 200 | **200** |
| `/robots.txt` | 404 | **200** |
| `/sitemap.xml` | 404 | **200** |
| `/coming-soon` | 404 | **200** |
| `/heatmaps` | 307 → login | **307 → `/coming-soon`** |
| Property detail | 500 | **200** |
| `/api/health` | 200 | **200** |
| `/api/health/live` | 200 | **200** |
| `/api/health/ready` | 503 env=fail | **503 env=fail** (unchanged) |
| `/api/properties?page=1&pageSize=1` | 200 old shape | **200** with `hasNext`/`hasPrevious` |
| Gallery | 200 | **200** |

Home HTML: no remaining `Heat Maps` / `/heatmaps` nav matches in post-deploy scrape.

---

## Phase 8 — Stripe deployment (no payment)

| Check | Result | Evidence |
|---|---|---|
| Checkout route reachable | **PASS** | `POST /api/billing/checkout` → **401** Authentication required |
| Portal route reachable | **PASS** | `POST /api/billing/portal` → **401** |
| Webhook endpoint exists | **PASS** | `POST /api/billing/webhook` → **400** Invalid signature |
| Webhook URL matches production | **OPS CONFIRM** | Expect `https://sa-property-auctions.vercel.app/api/billing/webhook` in Stripe Dashboard |
| Price IDs configured | **UNKNOWN** | Part of `env=fail` risk; confirm distinct `price_…` IDs in Vercel |
| Portal enabled | **NOT LIVE-TESTED** | Requires authenticated subscriber |

---

## Issues fixed (RC5.1)

1. Uncommitted production fixes committed and pushed (`63619e6`).  
2. Vercel Production redeployed from that SHA.  
3. Live drift closed for heatmaps, pagination, robots/sitemap, coming-soon, property detail.

## Remaining issues

1. `/api/health/ready` still **503** (`env=fail`).  
2. INSERT harden migration apply **unconfirmed** on Supabase.  
3. Authenticated auth/billing E2E still not certified (unchanged from RC5).  
4. Vercel CLI env audit not performed (tooling unavailable).  
5. SEO still lacks og:image / canonical / JSON-LD (not deployment drift).

---

## Risk level

**Medium** — application deploy is synchronized; configuration/DB ops still open.

| Risk | Level |
|---|---|
| Code deploy drift | **Resolved** |
| Env misconfiguration | **High** (ready fail) |
| Migration not applied | **High** for security posture |
| Billing misconfig | **Medium–High** until price IDs + webhook confirmed |

---

## Overall production readiness

| Question | Answer |
|---|---|
| Repo ↔ GitHub ↔ Vercel ↔ Live code synced? | **YES** |
| Ready for Closed Beta? | **YES** (invite-only; fix env + apply migration first) |
| Ready for Public Beta? | **NO** |
| Ready for Production? | **NO** |

**Classification: READY FOR CLOSED BETA**

---

## Evidence anchors

- Local/GitHub/Vercel SHA: `63619e6c94133a95205b85e1ae1b21aa4426ab5b`  
- Vercel status success at `2026-07-31T11:38:05Z`  
- Prior live SHA: `dcfc117c24753c5e0afc1ef82ae665b6d0548a6d`  
- Ready body post-deploy: `{"status":"not_ready","checks":{"env":"fail","database":"ok","stripe":"ok"}}`
