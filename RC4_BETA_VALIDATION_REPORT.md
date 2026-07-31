# RC4 Beta Validation Report

**Status:** COMPLETE  
**Date:** 2026-07-31  
**Method:** Code-path validation + static analysis + confirmed fixes  
**Live E2E:** Not executed (no staging/production URL in this sprint)

Build gate: `npm run typecheck` **PASS** · `npm run build` **PASS**

---

## Overall Beta Score: **78 / 100**

| Dimension | Score | Notes |
|---|---|---|
| Architecture | 84 | Repository → Service intact |
| Performance | 58 | Full-list client payloads remain |
| Security | 80 | Critical JWT metadata fix applied |
| UX | 76 | Toasts, error/404, upgrade CTA fixed |
| Accessibility | 62 | Dialogs still weak |
| SEO | 70 | robots + sitemap added; thin property SEO |
| Maintainability | 74 | Incomplete admin/heatmap stubs remain |
| Billing | 82 | Code path solid; live webhook unproven |
| Authentication | 85 | Confirm-email flow present |
| Mobile | 68 | Public OK; admin table scrolled |
| AI | 72 | Premium-gated; guest fallback works |
| Admin | 70 | Unfinished links hidden; real dashboard used |

---

## Ready for Closed Beta?

**YES — with documented limitations**

Invite-only testers; apply remaining migrations; set production env; run smoke on staging URL.

## Ready for Public Beta?

**NO** — heat map stub, full-catalog client fetch, missing CSP, no live smoke proof.

## Ready for Production?

**NO** — same blockers + ops checklist from RC3 still required.

---

## Phase progress

| Phase | Status |
|---|---|
| 1 Functional | DONE |
| 2 UX Polish | DONE (fixes applied) |
| 3 Performance | DONE (audit + map lazy-load) |
| 4 Security | DONE (critical fixes applied) |
| 5 Mobile | DONE (audit + table overflow) |
| 6 Accessibility | DONE (audit) |
| 7 SEO | DONE (robots + sitemap) |
| 8 Beta friction | DONE |
| 9 Code quality | DONE |
| 10 Report | DONE |

---

## Phase 1 — Functional checklist

### Authentication

| Item | Result |
|---|---|
| Register | **PASS** |
| Email verification | **PASS** (needs live email) |
| Login | **PASS** |
| Logout | **PASS** |
| Password reset | **PASS** (needs live email) |
| Session persistence | **PASS** |
| Premium detection | **PASS** (status-driven) |
| Free user detection | **PARTIAL** (implicit via `!isPremiumStatus`) |

### Public

| Item | Result |
|---|---|
| Guest Home | **PASS** |
| Property Search | **PASS** (local fallback) |
| Filters | **PASS** |
| Property Detail | **PASS** |
| Images | **PASS** |
| Maps | **PASS** (lazy-loaded) |
| Gallery | **PASS** |
| Responsive layout | **PASS** (code) / **UNKNOWN** (devices) |
| Loading states | **PARTIAL** |
| Error states | **PASS** (global error added) |
| 404 | **PASS** (root `not-found` added) |
| 500 | **PASS** (root `error` added) |

### Premium

| Item | Result |
|---|---|
| Upgrade flow | **PASS** (CTA → `/pricing`) |
| Premium dashboard | **PARTIAL** (shared dashboard) |
| Premium search | **PASS** |
| Premium AI | **PASS** |
| Saved searches | **PARTIAL** (not premium-gated) |
| Favourites | **PARTIAL** (localStorage; not premium) |
| Alerts | **FAIL** (intentionally hidden) |
| Subscription badge | **PASS** |
| Premium navigation | **PARTIAL** |
| PremiumGuard | **PASS** |

### Billing

| Item | Result |
|---|---|
| Checkout | **PASS** |
| Portal | **PASS** |
| Webhook handler | **PASS** |
| Activation | **PASS** |
| Renewal | **PASS** (via subscription.updated) |
| Cancellation | **PASS** |
| past_due | **PASS** |
| payment_failed | **PASS** |
| Downgrade / Upgrade | **PARTIAL** / **PASS** |
| Role + status sync | **PASS** |

### Admin

| Item | Result |
|---|---|
| Admin dashboard | **PASS** (redirect to real `/admin/dashboard`) |
| Imports | **PASS** |
| Import logs | **PARTIAL** |
| Analytics / Users | **FAIL** (hidden; not built) |
| Permissions | **PASS** (JWT app_metadata + profiles.role) |
| Error handling | **PARTIAL** |

### APIs

18 routes under `app/api/` inspected. Shared patterns: auth, rate limit, `jsonError`. Gaps: admin unauth may return 403 not 401; portal missing customer → 500; in-memory rate limit multi-instance.

---

## Phase 2 — UX polish (fixes)

| Change | Files |
|---|---|
| `alert()` → `toast` (sonner) | Import + saved-search UIs |
| Upgrade CTA → `/pricing` | `UpgradePrompt.tsx` |
| Global error + 404 | `app/error.tsx`, `app/not-found.tsx` |
| Hide unfinished admin nav | `AdminSidebar.tsx` |
| Remove dead import Retry/Settings | `ImportTableClient.tsx` |
| Silence amenity stub log | `importScheduler.ts` |

No `TODO`/`FIXME`/`HACK` matches in app source.

---

## Phase 3 — Performance

### Concrete issues (not prematurely optimized)

| Severity | Evidence | Files | Recommended fix | Effort |
|---|---|---|---|---|
| High | Full catalog → client search | `PropertyRepository.getAll`, `PropertySearch` | Paginated search API | M |
| High | Favourites fetch all properties | `favourites/page.tsx` | Fetch by IDs | M |
| High | Heatmaps load full list before gate | `heatmaps/page.tsx` | Server premium check first | M |
| Medium | MapLibre heavy on detail | **FIXED** via `PropertyMapLazy` | — | S |
| Medium | Duplicate property/image reads | property detail | Reuse loaded data | S |

---

## Phase 4 — Security

### Fixed this sprint

| Severity | Issue | Fix |
|---|---|---|
| **Critical** | Admin trusted `user_metadata.role` (client-writable) | `getUserRole` uses **app_metadata only** |
| **High** | Middleware admin JWT-only | Also accepts `profiles.role = admin` |
| **High** | Profile create could inherit JWT role | `ProfileService` always inserts `role: free` |
| **Medium** | Profiles INSERT RLS open | Migration `20260731120000_profiles_insert_harden.sql` |
| **Low** | Missing HSTS | Added in `next.config.ts` |

### Remaining

| Severity | Evidence | Files | Fix | Effort |
|---|---|---|---|---|
| Medium | No CSP | `next.config.ts` | Add Content-Security-Policy | M |
| Medium | In-memory rate limit | `lib/api/rateLimit.ts` | Shared store at scale | M |
| Medium | Heatmap data before PremiumGuard | `heatmaps/page.tsx` | Server requirePremium | M |
| Medium | Image upload uses anon client | `lib/images/storage.ts` | Session client / server action | S |
| Low | Saved-search actions trust RLS only | `save-searches/actions.ts` | requireUser + force userId | S |

**Verified OK:** Stripe webhook signature; AI/billing premium gates; entitlement update RLS; service role not public.

---

## Phase 5 — Mobile

| Severity | Evidence | Fix | Effort |
|---|---|---|---|
| High | Admin fixed `w-72` sidebar | Drawer under `lg` | M |
| Medium | Import table overflow | **FIXED** `overflow-x-auto` | — |
| Medium | Search absolute submit button | Stack on small screens | S |
| Medium | Hero search row | Column on mobile | S |

Header mobile menu: open/close/Escape/outside — **PASS** (code).

---

## Phase 6 — Accessibility

| Severity | Evidence | Fix | Effort |
|---|---|---|---|
| High | Rename/Create dialogs lack dialog ARIA/focus trap | Shared Dialog semantics | M |
| Medium | Register/login placeholder-only labels | Visible labels | S |
| Medium | Shared `Dialog.tsx` incomplete a11y | Escape, aria-modal, close label | S |
| Low | Emoji-only affordances | aria-label | S |

---

## Phase 7 — SEO

| Item | Result |
|---|---|
| Root metadata / OG / Twitter | **PASS** (no OG image asset) |
| robots.txt | **PASS** (added `public/robots.txt`) |
| sitemap.xml | **PARTIAL** (`app/sitemap.ts` — static routes only) |
| Property `generateMetadata` | **FAIL** |
| favicon | **UNKNOWN** / missing from repo tree (metadata references `/favicon.ico`) |

---

## Phase 8 — Beta user friction

Working path (code): register → verify → login → browse → search → pricing checkout → webhook activate → premium features → logout → login → portal cancel → password reset.

| Severity | Friction | Files | Fix | Effort |
|---|---|---|---|---|
| High | Heat map UI is a stub (`HeatMapLayer` → null) | `HeatMapLayer.tsx` | Hide `/heatmaps` or ship map | L |
| Medium | Home “Map View” is placeholder | `MapSection.tsx` | Align nav or ship map | M |
| Medium | Dual saved-search surfaces | Header vs dashboard | Consolidate | M |
| Medium | Free search looks AI-capable | `PropertySearch.tsx` | Clearer free copy | S |
| Low | Terms checkbox has no legal URL | `TermsCheckbox.tsx` | Link T&Cs | S |

---

## Phase 9 — Code quality

| Item | Notes |
|---|---|
| `ImageUpload` | No current importers — keep for admin; do not delete without product call |
| `UpgradeModal` / Banner / Card | Barrel-only — likely dead; leave for now |
| Alerts / Watchlist | Redirect stubs — intentional |
| Amenity import scheduler | No-op stub |

No mass deletion performed.

---

## Known issues (open)

### Critical

None remaining in application code after this sprint (ops env/migration apply still required before launch).

### High

1. **Full property list to browser** — Severity High · Evidence: `getAll` → `PropertySearch` / favourites · Fix: paginate · Effort M  
2. **Heat map feature stub** — Severity High · Evidence: `HeatMapLayer` returns null · Fix: hide nav or implement · Effort L  
3. **Apply insert-harden migration** — Severity High · Evidence: `20260731120000_profiles_insert_harden.sql` · Fix: run on Supabase · Effort S  

### Medium

4. No CSP · `next.config.ts` · Effort M  
5. Admin mobile sidebar · Effort M  
6. Property SEO metadata · Effort M  
7. Dialog accessibility · Effort M  
8. Rate limit not multi-instance · Effort M  

### Low

9. Favicon asset may be missing · Effort S  
10. Terms/Privacy links · Effort S  
11. Dual saved-search UX · Effort M  

---

## Fixes applied in RC4

| Area | Change |
|---|---|
| Security | `getUserRole` ignores `user_metadata`; admin middleware checks profiles; profile insert forces free; INSERT RLS migration authored; HSTS header |
| UX | Global error/404; Upgrade → pricing; toast instead of alert; admin nav trimmed; fake admin overview redirected |
| Performance | PropertyMap lazy client wrapper |
| Mobile | Import table horizontal scroll |
| SEO | `robots.txt`, `sitemap.ts` |
| Nav | Home section links use `/#…` |

---

## Recommended next steps (priority)

1. Apply `20260731120000_profiles_insert_harden.sql` on Supabase  
2. Hide `/heatmaps` from Header until map is real **or** implement map  
3. Paginate home/favourites property fetches before public beta  
4. Provide staging URL → run live smoke suite  
5. Add favicon + OG image assets  
6. CSP + dialog a11y polish  

---

## Verdict

| Question | Answer |
|---|---|
| Ready for Closed Beta? | **YES** (invite-only; document heatmaps stub + ops migrations) |
| Ready for Public Beta? | **NO** |
| Ready for Production? | **NO** |

**Overall Beta Score: 78 / 100**
