# OPERATIONS CENTRE — LIVE SOURCE REFRESH VISIBILITY FIX 1.0

**Date:** 2026-08-08  
**Route under test:** `/admin/operations`  
**Git HEAD (local & origin/main):** `6168aba7d0cbbb60a17be0070e88240ce0d53f1d`  
**HEAD message:** Ship due diligence extraction engine and fix Operations Quick Actions.

---

## Root Cause

**Cause F — Production (and Git `main`) is running an older commit that never contained the button.**

Evidence:

1. **GitHub `main` Quick Actions** ([raw file](https://raw.githubusercontent.com/AndreWessels76/sa-property-auctions/main/app/admin/operations/components/QuickActions.tsx)) contains only:
   - Run All Imports  
   - Run Sheriff Import  
   - Open Sources  
   - View Analytics  
   — **no** `Refresh Upcoming Sources`.

2. **Local `git show HEAD:…/QuickActions.tsx`** matches that four-button set.

3. **`origin/main` == `HEAD` == `6168aba`**. The Live Source Re-fetch UI/API lived only as **uncommitted / untracked working-tree files** after the prior sprint report. They were **never committed or pushed**, so no deployment could include them.

4. Not a CSS hide, feature flag, role gate, or premium-subscription regression. Admin auth remains `profiles.role = admin` via `PermissionService.requireAdmin()` / `isAdmin()` (role-only; independent of premium).

The previous implementation report claimed the action was shipped; that claim was **incorrect for Production** because the code never reached `main`.

---

## Component map (actual)

| Item | Value |
|------|--------|
| Route | `/admin/operations` |
| Page | `app/admin/operations/page.tsx` → `OperationsPage` |
| Parent | Operations layout via Admin sidebar “Operations” |
| Component | `QuickActions` default export |
| File | `app/admin/operations/components/QuickActions.tsx` |
| Refresh API | `POST /api/admin/operations/source-refetch` (`action: "refresh_upcoming"`) |
| Service | `SourceRefetchService.refreshBatch({ scope: "upcoming" })` |
| Auth | `PermissionService.requireAdmin()` on API (401 unauthenticated / 403 non-admin via existing error mapping) |

---

## Fix

Working-tree changes (ready to commit/deploy):

1. **`QuickActions.tsx`**
   - Visible **Refresh Upcoming Sources** button (no env/role conditional in the UI).
   - Order: Run All Imports → Run Sheriff Import → Open Sources → View Analytics → **Refresh Upcoming Sources**.
   - Live `onClick` → `refreshUpcomingSources()` → `SOURCE_REFETCH_API`.
   - Loading (`Refreshing Sources…`), double-click guard, toasts, success/error states.
   - Result panel with real counts: Attempted, Fetched, No change, Changed, Skipped license/robots, Failed, Conflicts, Extraction runs; explicit empty-eligible message.
   - `data-testid="refresh-upcoming-sources"`.

2. Backend already present locally: `SourceRefetchService`, `/api/admin/operations/source-refetch`, license/robots gates (BC only when licensed / `BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH`).

3. **Regression tests** strengthened in `scripts/ops-quick-actions-selftest.cjs` (label, handler, endpoint, loading/error strings, page wiring, admin≠premium, API/service presence).

No redesign of Operations Centre. Existing Quick Actions retained. Auth/roles/subscriptions unchanged.

---

## Deployment

| Location | Contains button? |
|----------|------------------|
| Local working tree | **Yes** |
| Git HEAD `6168aba` | **No** |
| GitHub `origin/main` `6168aba` | **No** |
| Production (deploys from `main`) | **No** — no evidence of a newer deploy |

**Production does not contain this fix.** Do not claim Production Verified.

To ship: commit all Live Source Re-fetch + Quick Actions visibility changes → push `main` → deploy (Vercel/host) → re-check `/admin/operations` as admin.

---

## Validation

| Check | Result |
|-------|--------|
| Typecheck (`npm run typecheck`) | **PASS** |
| Build (`npm run build`) | **PASS** |
| Ops selftests (`npm run test:ops-quick-actions`) | **PASS** |
| Refetch selftests (`npm run test:refetch`) | **PASS** |

---

## Acceptance (local code)

| Criterion | Status |
|-----------|--------|
| Button in Operations Quick Actions | PASS (working tree) |
| Visible to admin (no premium gate) | PASS (UI unconditional; API `requireAdmin`) |
| Non-admin cannot call API | PASS (`requireAdmin`) |
| Handler + loading + toast + results | PASS |
| Uses `SourceRefetchService` / existing API | PASS |
| Licensing/robots not bypassed | PASS (service gates) |
| Existing Quick Actions preserved | PASS |
| Production UI shows button | **FAIL — not deployed** |

---

## Final Verdict

**FIXED — NOT DEPLOYED**

Local code and tests include a working **Refresh Upcoming Sources** Quick Action. Git `main` / Production still run `6168aba` without it. Commit, push, and deploy are required before Production can show the button.
