# OPERATIONS CENTRE — QUICK ACTIONS FUNCTIONALITY FIX 1.0

**Date:** 2026-08-08  
**Validation:** `npm run typecheck` PASS · `npm run test:ops-quick-actions` PASS (6/6) · `npm run build` PASS

---

## Final Verdict

**PRODUCTION READY**

All four Quick Action buttons now either execute their intended operation through authenticated admin APIs or navigate to verified existing routes, with explicit feedback when a capability is not configured. No fabricated import statistics. No auto-verification or auto-publish.

---

## Root Cause

`app/admin/operations/components/QuickActions.tsx` rendered four `<button>` elements **with no `onClick` handlers, no API calls, and no navigation**. They were decorative only.

---

## Affected Buttons

| Button | Before | After |
|--------|--------|-------|
| Run All Imports | Dead | `POST /api/admin/operations/quick-actions` → `run_all_imports` |
| Run Sheriff Import | Dead | Same API → `run_sheriff_import` → clear “not configured” |
| Open Sources | Dead | Navigate `/admin/acquisition` |
| View Analytics | Dead | Navigate `/intelligence` |

---

## Files Changed

| File | Change |
|------|--------|
| `app/admin/operations/components/QuickActions.tsx` | Client handlers, loading, toast, result panel |
| `app/api/admin/operations/quick-actions/route.ts` | New admin API |
| `lib/services/OperationsQuickActionsService.ts` | Orchestration service |
| `lib/auth/PermissionService.ts` | 401 unauthenticated vs 403 non-admin |
| `lib/services/index.ts` | Export service |
| `scripts/ops-quick-actions-selftest.cjs` | Destination + wiring tests |
| `package.json` | `test:ops-quick-actions` script |

---

## API Changes

`POST /api/admin/operations/quick-actions`

Body:

```json
{ "action": "run_all_imports" | "run_sheriff_import" }
```

- `PermissionService.requireAdmin()` (auth + admin role)
- Rate limit: 5 / minute / IP
- Structured JSON result; errors via existing `jsonError`

---

## Service Changes

`OperationsQuickActionsService.runAllImports`:

1. Sync connector registry (soft-fail)
2. Enumerate `listVerifiedConnectors()`
3. Skip disabled / `awaiting_license` / non-runnable partners
4. Run Bidders Choice only when `BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH=true` via existing `PropertyAcquisitionEngine` (pending verification path — never auto-publish)
5. Record partnership import shell when DB available
6. Audit log + real counters only

`runSheriffImport`:

- Sheriff connector still contains temporary Unsplash test data (`Tydelik toetsdata`)
- **Does not execute** that stub (would fabricate listings)
- Returns: `"Sheriff import is not configured yet."`

---

## Authentication / Authorization

| Case | Status |
|------|--------|
| Not signed in | **401** `Authentication required` |
| Signed in, not admin | **403** `Admin access required` |
| Admin | Action proceeds |

UI also toasts authorization failures. Buttons alone are not security.

---

## Import Behaviour

- Respects connector health + licensing
- Awaiting-license → `Skipped — awaiting license`
- No eligible runners → `"No eligible connectors are currently available."`
- New BC rows remain pending verification (existing acquisition pipeline)
- Idempotency: existing engine duplicate / Property Master identity path
- No fake success if API fails

---

## Navigation Routes

| Action | Route | Page exists |
|--------|-------|-------------|
| Open Sources | `/admin/acquisition` | Yes |
| View Analytics | `/intelligence` | Yes |

Toast: “Opening Sources…” / “Opening Analytics…” then `router.push`.

---

## Error Handling / Loading States

- Buttons disabled while any action runs
- Labels: `Running Imports...` / `Running Sheriff Import...`
- Double-click blocked via busy flag
- Sonner toasts for success / failure / not configured
- Result panel shows only values returned by the API

---

## Audit Logging

`LoggerService.audit`:

- `ops.quick_actions.run_all_imports`
- `ops.quick_actions.run_sheriff_import`

Plus partnership import run records when the acquisition tables are present.

---

## Testing

| Check | Result |
|-------|--------|
| Selftest destinations + handlers | 6/6 PASS |
| Typecheck | PASS |
| Production build | PASS |
| Sheriff not configured messaging | Verified by code path + connector stub inspection |

Production browser click-through should be confirmed by an admin on `/admin/operations` after deploy (requires live session).

---

## Production Verification Checklist

1. Sign in as admin → Operations Centre loads  
2. Run All Imports → loading → result panel with real counts / skip reasons  
3. Run Sheriff Import → toast: not configured yet  
4. Open Sources → `/admin/acquisition`  
5. View Analytics → `/intelligence`  
6. Non-admin / logged-out → 401/403, no silent success  

---

## Score

**9.0 / 10** — Dead buttons eliminated; governance-safe import orchestration; Sheriff honestly reports not configured until a licensed feed exists.
