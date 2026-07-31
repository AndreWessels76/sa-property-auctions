# PRODUCTION_CERTIFICATION.md — RC5 Live Smoke & Certification

**Target:** https://sa-property-auctions.vercel.app  
**Date:** 2026-07-31  
**Local validation:** `npm run typecheck` ✅ · `npm run build` ✅  
**Method:** Live HTTP/HTML smoke + API matrix against production; auth/billing deep flows limited without test credentials and Stripe Dashboard access.

---

## Overall Readiness Score

| Area | Score (/10) | Notes |
|---|---|---|
| Architecture | 8 | Repository → Service intact locally; live deploy lagging BFS-001 |
| Security | 7 | Authz on APIs OK; HSTS/XFO present; env readiness fail; in-memory rate limit weak on serverless |
| Performance | 7 | Home ~1.5s TTFB+body; props API ~1.7s; tiny catalog (2 rows) |
| Authentication | 5 | Unauth API matrix PASS; full register/login/session **not executed** (no test account) |
| Billing / Stripe | 4 | Pricing UI live; checkout/portal gate 401; webhook rejects bad sig; end-to-end **not certified** |
| Supabase | 6 | DB reachable (`health/ready` database=ok); env check fail; INSERT harden **ops pending** |
| SEO | 4 | Title/OG/Twitter text OK; **robots.txt & sitemap.xml 404 on live**; no og:image / canonical / JSON-LD |
| Accessibility | 5 | Mobile menu aria; login/register inputs rely on placeholders (weak labels) |
| Admin | 6 | Middleware redirects unauth; admin APIs 403/405 as expected |
| AI | 6 | Premium routes return 401 unauthenticated |
| Monitoring | 5 | `/api/health` OK; `/api/health/ready` **503 env=fail** |

**Composite: 58 / 100**

---

## Final Classification

# NOT READY

**Go / No-Go:** **NO-GO** for production and public beta.

Closed beta may resume **only after** the blockers below are cleared and a redeploy is verified.

---

## Phase results (concise)

### Phase 1 — Public smoke

| Check | Result | Evidence |
|---|---|---|
| Home | **PASS** | `200`, ~123KB, ~1.5s; featured cards render (2 listings) |
| Navigation | **PASS** / **WARN** | Primary anchors work; live Header still shows **Heat Maps** → `/heatmaps` |
| Responsive / layout | **PASS** (static) | Viewport meta + responsive classes present |
| Search / filters UI | **PASS** | Present on home; “Showing 2 properties” |
| Property cards | **PASS** | Titles, prices, savings visible |
| Property detail | **FAIL** | `/properties/{id}` → **HTTP 500** (both live IDs); digest only, no stack leak |
| Gallery API | **PASS** | `200` `{hero:null,images:[]}` |
| Maps | **PARTIAL** | Home province map placeholder OK; detail map N/A (no lat/lng; page 500 anyway) |
| Images | **PARTIAL** | Cards use fallbacks; no stored gallery images |
| 404 | **PASS** | `/not-a-real-page-xyz` → 404 |
| 500 handling | **PARTIAL** | Detail 500 uses Next error shell; no secrets/stack in HTML |
| Loading / empty | **PASS** | Home Suspense “Loading search…”; empty gallery OK |
| `/coming-soon` | **FAIL** | **404** on live (BFS not deployed) |
| `/heatmaps` | **FAIL** vs BFS intent | **307** → `/login?next=/heatmaps` (still protected; not redirected to coming-soon) |
| `/robots.txt` | **FAIL** | **404** |
| `/sitemap.xml` | **FAIL** | **404** |

**Phase 1 verdict:** FAIL (property detail + SEO assets + heatmaps exposure)

---

### Phase 2 — Authentication

| Check | Result | Evidence |
|---|---|---|
| Login page | **PASS** | `200` |
| Register page | **PASS** | `200`; email/password fields |
| Forgot / reset / verify pages | **PASS** | `200` each |
| Invalid credentials (API) | **PASS** | `POST /api/auth/login` → **401** `Invalid email or password.` |
| Empty body | **PASS** | **400** `Email and password are required.` |
| Logout unauth | **PASS** | **200** `{success:true}` |
| Profile PATCH unauth | **PASS** | **401** |
| Register / confirm email / session / profile CRUD | **BLOCKED** | No invite test account / inbox in this run |
| Duplicate registration | **BLOCKED** | Same |
| Premium vs free detection | **BLOCKED** | Requires authenticated session |

**Phase 2 verdict:** PARTIAL (API gates OK; interactive auth not certified)

---

### Phase 3 — Subscription

| Check | Result | Evidence |
|---|---|---|
| Pricing page | **PASS** | `200`; Choose Monthly / Yearly CTAs |
| Checkout unauth | **PASS** | **401** Authentication required |
| Portal unauth | **PASS** | **401** |
| Webhook no signature | **PASS** | **400** `Invalid signature` |
| Stripe Sandbox checkout → webhook → profile sync | **BLOCKED** | Needs logged-in user + Stripe Dashboard + correct `price_` IDs + `NEXT_PUBLIC_SITE_URL` |
| Cancellation / renewal / past_due / payment_failed | **BLOCKED** | Not exercised live |
| Role / subscription sync | **BLOCKED** | Profiles not inspected (no privileged access in this run) |

**Phase 3 verdict:** PARTIAL / NOT CERTIFIED end-to-end

---

### Phase 4 — Premium features

| Check | Result | Evidence |
|---|---|---|
| AI property search unauth | **PASS** | **401** |
| `/api/ai/search`, `/api/ai/analyze` unauth | **PASS** | **401** |
| Saved searches API unauth | **PASS** | **401** |
| Dashboard | **PASS** (gate) | **307** → login |
| PremiumGuard / upgrade / downgrade UX | **BLOCKED** | Needs premium + free test users |
| Heatmaps product path | **FAIL** | Still linked in live nav (stub should be hidden per BFS-001) |

**Phase 4 verdict:** PARTIAL

---

### Phase 5 — Admin

| Check | Result | Evidence |
|---|---|---|
| `/admin` unauth | **PASS** | **307** → login |
| `POST /api/admin/imports` unauth | **PASS** | **403** Admin access required |
| `POST /api/imports/run` unauth | **PASS** | **403** |
| `GET /api/admin/imports` | **PASS** | **405** (method not allowed — expected) |
| Admin login / imports / audit | **BLOCKED** | No admin credentials |

**Phase 5 verdict:** PARTIAL (forbidden path OK)

---

### Phase 6 — APIs

| Endpoint | Observed |
|---|---|
| `GET /api/health` | **200** ok |
| `GET /api/health/live` | **200** alive |
| `GET /api/health/ready` | **503** `env=fail`, `database=ok`, `stripe=ok` |
| `GET /api/properties` | **200** paginated SearchResult (no `hasNext` on live → pre-BFS deploy) |
| `GET /api/properties?page=0` | **200** clamped to page 1 |
| `GET /api/gallery/:id` | **200** |
| Auth/billing/AI/admin (see above) | 400/401/403 as documented |
| Error bodies | **PASS** — JSON `{error}` only; no stack traces observed |
| **429** | **NOT OBSERVED** — 35 login posts stayed 401 (in-memory limiter ineffective across Vercel isolates) |

**Phase 6 verdict:** PASS with readiness + rate-limit caveats

---

### Phase 7 — Performance

| Metric | Value |
|---|---|
| Home download | ~123KB HTML+payload, ~1.5s |
| Pricing | ~32KB, ~1.3s |
| Login | ~16KB, ~1.1s |
| Properties API (24) | ~1KB, ~1.7s |
| Largest public HTML | Home |
| Catalog size | **2** properties (not a load test) |
| Duplicate full-catalog client load | Still present on **live** home (pre-BFS `properties` prop); fixed in local BFS-001 pending deploy |

**Recommendations (measurable):** Redeploy BFS pagination; fix property detail 500; fix `health/ready` env; consider Redis/Upstash rate limits for multi-instance.

---

### Phase 8 — Security

| Check | Result |
|---|---|
| HSTS / X-Frame-Options / nosniff / Referrer-Policy / Permissions-Policy | **PASS** on home |
| CSP | **FAIL / ABSENT** |
| Cookie flags (login GET) | No session cookies until auth (expected) |
| Webhook signature required | **PASS** |
| Admin / premium API enforcement | **PASS** (403/401) |
| Secrets in error HTML | **PASS** (none found) |
| Supabase RLS INSERT harden | **OPS PENDING** (migration in repo; not verified on live DB) |
| Rate limits | **WEAK** on serverless |
| Misuse: unauth premium/admin | **PASS** blocked |

---

### Phase 9 — SEO

| Check | Result |
|---|---|
| Title / description | **PASS** |
| OpenGraph title/desc/url/locale | **PASS** |
| Twitter card | **PASS** (no `twitter:image`) |
| `og:image` | **FAIL** missing |
| Canonical | **FAIL** missing |
| Structured data | **FAIL** none |
| robots.txt | **FAIL** 404 live (file exists in repo `public/robots.txt`) |
| sitemap.xml | **FAIL** 404 live (`app/sitemap.ts` in repo) |
| Property metadata | **FAIL** (detail 500) |

---

### Phase 10 — Accessibility

| Check | Result |
|---|---|
| `lang="en"` | **PASS** |
| Mobile menu `aria-label` / `aria-expanded` | **PASS** |
| Login/register inputs | **FAIL** — placeholder-only email/password (no associated `<label>`) |
| Keyboard / screen reader full pass | **NOT RUN** (no browser automation in this sprint) |
| Dialogs | **NOT RUN** |

---

### Phase 11 — Production readiness summary

#### Architecture
Repository → Service → API/UI preserved. Live production is **behind** local RC4/BFS-001 (pagination shape, heatmaps hide, coming-soon, robots/sitemap).

#### Defects fixed in this RC5 session (local; **require redeploy**)
1. **Property detail 500 hardening** — `ImageRepository.byProperty` no longer SQL-orders by `is_primary` (sort in memory); property page soft-fails image/comparable fetch so listing still renders.

#### Known issues (live)
1. Property detail **500** until redeploy of fix above  
2. `/api/health/ready` **503** — `checks.env=fail` (likely missing/invalid `NEXT_PUBLIC_SITE_URL`, webhook secret, or Stripe price env on Vercel)  
3. `robots.txt` / `sitemap.xml` / `/coming-soon` **404** — not on live deploy  
4. Heat Maps still in live navigation  
5. Pagination `hasNext`/`hasPrevious` absent on live API  
6. Auth/billing E2E not certified  
7. Stripe Price IDs must be real `price_…` values (not Product IDs) for checkout  
8. In-memory rate limit not multi-instance safe  
9. No CSP; weak form labels  

#### Risk assessment
| Risk | Level |
|---|---|
| Core listing detail broken | **High** |
| Env misconfiguration | **High** |
| Deploy drift (repo vs Vercel) | **High** |
| Unverified billing webhook path | **High** for paid launch |
| SEO discovery broken | **Medium** |
| Rate-limit bypass under load | **Medium** |
| A11y form labels | **Low–Medium** |

---

## Go-live blockers (ordered)

1. **Redeploy** current `main`/local RC4+BFS+RC5 fixes to Vercel  
2. Set production env so `/api/health/ready` returns **200** (`NEXT_PUBLIC_SITE_URL=https://sa-property-auctions.vercel.app`, real Stripe price IDs, webhook secret, service role)  
3. Re-verify `/properties/{id}` → **200**  
4. Apply `20260731120000_profiles_insert_harden.sql` on Supabase  
5. Run authenticated smoke: register → verify → login → checkout (test mode) → webhook → premium gate  
6. Confirm `/robots.txt`, `/sitemap.xml`, `/coming-soon`, heatmaps redirect  

---

## Files modified this sprint (defect fixes only)

- `lib/repositories/ImageRepository.ts` — safe image query/sort  
- `app/properties/[id]/page.tsx` — soft-fail images/comparables  
- `PRODUCTION_CERTIFICATION.md` — this report  

---

## Recommendation

**NOT READY** for production or public beta.

After redeploy + env green + one successful Stripe test checkout + INSERT harden applied, re-run a short RC5-delta and the classification can move to **READY FOR CLOSED BETA**.
