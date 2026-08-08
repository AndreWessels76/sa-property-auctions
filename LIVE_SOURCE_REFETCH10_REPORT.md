# LIVE SOURCE RE-FETCH & ENRICHMENT ENGINE 1.0 — REPORT

**Date:** 2026-08-08  
**Sprint:** Live Source Re-fetch & Enrichment Engine 1.0  
**Validation:** `npm run typecheck` PASS · `npm run test:refetch` PASS (17) · `npm run test:dd` PASS · `npm run test:ops-quick-actions` PASS · `npm run build` PASS

---

## Final Verdict

**ENRICHMENT READY**

The licensed re-fetch → snapshot → hash → change detection → deterministic DD extraction → conflict → admin review path is implemented and wired into Operations Centre + cron. Live network re-fetch of Bidders Choice listing pages is gated behind licence / `BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH` and was **not** executed in CI evidence (env not enabled) — offline gates and conflict rules are proven.

Not scored **PRODUCTION READY** until: migration applied in production Supabase, and at least one real licensed BC listing refresh is audited end-to-end in the target environment.

---

## Source flow (implemented)

```
Partner → Connector → License Gate → Robots Gate → Fetch Policy
→ HTTP Fetch → Source Snapshot → Content Hash → Change Detection
→ Due Diligence Extraction (existing) → Evidence / Conflicts
→ Verification queue (admin) → Property Master / Auction Event
→ Public Catalogue (upcoming/live only — unchanged)
```

---

## Modules delivered

| Area | Path |
|------|------|
| Types / policy | `lib/acquisition/refetch/types.ts`, `fetchPolicy.ts` |
| License gate | `licenseGate.ts` → `SKIPPED_LICENSE` |
| Robots gate | `robotsGate.ts` → BC `checkRobotsAllowed` → `SKIPPED_ROBOTS` |
| HTTP fetch | `sourceFetcher.ts` (retry/backoff, size/type/host limits) |
| Snapshots | `sourceSnapshotService.ts` (append-only, SHA-256) |
| Change detect | `sourceChangeDetector.ts` (VERIFIED → CONFLICT) |
| Orchestration | `sourceRefetchService.ts` |
| Scheduler | `refetchScheduler.ts` (live/upcoming priority) |
| Rate / locks | `rateLimiter.ts`, `refetchAudit.ts` locks |
| Monitoring | `monitoring.ts` (metrics + alerts) |
| Service | `lib/services/SourceRefetchService.ts` |
| Migration | `supabase/migrations/20260808140000_live_source_refetch_engine.sql` |
| Admin API | `POST/GET /api/admin/operations/source-refetch` |
| Cron | `GET /api/cron/source-refetch` (`CRON_SECRET` → 401) |
| Ops UI | Source Refresh queue + Quick Action **Refresh Upcoming Sources** |

**Reused, not duplicated:** Due Diligence Extraction Engine, connector robots helper, licensing helpers, PropertyService, Partnership licences, Verification / public catalogue rules.

---

## Non-negotiables enforced

| Rule | Behaviour |
|------|-----------|
| Never fabricate | Extraction only from fetched/stored text |
| Never auto-verify | Extraction remains pending / conflict |
| Never auto-publish | No public write path from refetch |
| Never overwrite VERIFIED | `CONFLICT` + `CONFLICT_REVIEW_REQUIRED` |
| 404/403/410 | `SOURCE_UNAVAILABLE` — property retained |
| NO_CHANGE hash | Extraction skipped; no duplicate snapshot |
| Raw HTML | Default off; only if licence/env allows |

---

## Acceptance criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Licensed source can be fetched safely | PASS (gates + fetcher) |
| 2 | Robots respected | PASS (`SKIPPED_ROBOTS`) |
| 3 | License enforced | PASS (`SKIPPED_LICENSE`) |
| 4 | Source content versioned | PASS (append-only snapshots) |
| 5 | Content hashes detect changes | PASS (SHA-256 selftest) |
| 6 | Unchanged skips extraction | PASS |
| 7 | Changed triggers DD extraction | PASS (wired) |
| 8 | Evidence retained | PASS (via DD engine + snapshot meta) |
| 9 | Verified conflicts not overwritten | PASS (selftest 4.164 vs 4.21) |
| 10 | Auction date changes detected | PASS |
| 11 | Document changes detected | PASS |
| 12 | Disappearance ≠ remove property | PASS |
| 13 | Admin manual refresh | PASS (Ops + API) |
| 14 | Batch refresh | PASS (upcoming/partner/connector/all) |
| 15 | Cron auth | PASS (401 without secret in prod) |
| 16 | Audit records | PASS (`source_refetch_runs`, soft-fail) |
| 17 | Public catalogue rules intact | PASS (no public change) |
| 18 | Typecheck | PASS |
| 19 | Build | PASS |
| 20 | Real licensed BC live proof | **PARTIAL** — env-gated; offline path proven |

---

## Ops actions

- **Refresh Upcoming Sources** (Quick Actions) — working handler, loading, toast, audit.
- Per-row **Refresh** in Source Refresh / Enrichment queue.
- Change Review panel routes conflicts to Verification (no silent overwrite).

---

## Security

- Admin API: `PermissionService.requireAdmin`
- Cron: Bearer `CRON_SECRET` (required in production)
- No service-role / secrets in client responses
- Cron response omits raw HTML / source text

---

## Evidence artifacts

- `LIVE_SOURCE_REFETCH_EVIDENCE.json`
- `SOURCE_CHANGE_REPORT.md`
- `SOURCE_HEALTH_REPORT.md`
- `npm run test:refetch`

---

## Recommendations

1. Apply migration `20260808140000_live_source_refetch_engine.sql` in Supabase.
2. Enable `BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH=true` only under active licence + robots policy.
3. Run forced refresh on Guest Farm Haenertsburg + Benoni / Crystal Park and archive audit rows.
4. Schedule Vercel cron → `/api/cron/source-refetch` with secret.
5. Promote verdict to **PRODUCTION READY** after one successful live licensed run with snapshot + hash + extraction audit.
