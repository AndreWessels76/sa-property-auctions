# Historical Evidence Acquisition 4.3 — Implementation Report

**Version:** `historical-evidence-acquisition-4.3.0`  
**Date:** 2026-08-14  
**Verdict:** **INSUFFICIENT DATA — ENGINE READY**

---

## 1. Architecture

Historical Evidence Acquisition 4.3 (HEA 4.3) sits **above** existing acquisition infrastructure and **feeds into** Historical Resolution 4.2 (HI 4.2). It does not introduce duplicate property, auction-event, or pricing models.

```
Auction Event
  → HEA 4.3 source discovery (licensed only)
  → licensed source fetch (SourceRefetchService via HistoricalEnrichmentService)
  → snapshot
  → outcome extraction (outcomeExtractor)
  → sale-price extraction (pricingExtractor + HEA salePriceExtractor)
  → evidence validation
  → HI 4.2 resolveHistoricalEvent()
  → verified observation / review / conflict / insufficient data
```

**Module:** `lib/acquisition/historicalEvidence43/`  
**Orchestrator:** `lib/services/HistoricalEvidenceAcquisition43Service.ts`

---

## 2. Source discovery

- **Licensed sources only** — reuses `resolveHistoricalSource()` from HDA 4.0
- Progressive identifier search: auction event ID → source URL → property master → address → date+agency
- **Never** fabricates alternate URLs or uses search-engine snippets
- Candidate scoring in `sourceCandidateScoring.ts` with source hierarchy tiers
- P1–P4 queue in `queue43.ts`:
  - **P1:** exact licensed source URL
  - **P2:** licensed partner + strong identity
  - **P3:** searchable licensed partner source
  - **P4:** weak source discovery

---

## 3. Extraction

- **Outcomes:** delegates to `lib/acquisition/outcomes/outcomeExtractor.ts` — explicit statements only
- **Sale prices:** `salePriceExtractor.ts` — rejects reserve, guide, starting bid, estimated value
- **No inference** of SOLD from expired/closed/removed listings

---

## 4. Resolution integration (HI 4.2)

After fetch/extract, `buildAcquireResult()` calls `resolveHistoricalEvent()` with existing classification and evidence scores. Resolution states: `UNRESOLVED`, `SOURCE_FOUND`, `EXTRACTED`, `VERIFIED`, `CONFLICT`, `REVIEW_REQUIRED`, `INSUFFICIENT_DATA`.

---

## 5. Identity safety

- `identityResolver.ts` wraps HI 4.2 `assessIdentityConfidence`
- Town + agency alone never establishes identity
- Weak identity → `IDENTITY_REVIEW_REQUIRED` before fetch

---

## 6. Pricing safety

- Reserve/guide/starting/estimated values never mapped to sale price
- Conflicting sale prices in source → review required
- Ambiguous price → `SALE_PRICE_REVIEW_REQUIRED` path via HI 4.2

---

## 7. Conflicts

- Reuses `outcomeConflict.ts` and HI 4.2 agreement validator
- Conflicts never auto-resolved — admin review via `/api/admin/intelligence/historical-evidence/review`

---

## 8. Audit

- Runs recorded in `historical_enrichment_runs` with `meta.engine = historical-evidence-acquisition-4.3.0`
- `LoggerService.audit` on acquire_one, batch, review, resolve
- HI 4.2 resolution audit trail unchanged

---

## 9. API

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/admin/intelligence/historical-evidence` | Dashboard |
| GET | `/api/admin/intelligence/historical-evidence?view=queue` | P1–P4 queue |
| POST | `/api/admin/intelligence/historical-evidence` | acquire_one, batch, dry_run, P1/P2, retry_failed |
| GET | `/api/admin/intelligence/historical-evidence/[eventId]` | Event review + queue item |
| POST | `/api/admin/intelligence/historical-evidence/review` | Admin review / HI 4.2 resolve |
| GET | `/api/intelligence/historical/evidence/[id]` | Public evidence (HI 4.2 — reused) |

---

## 10. Admin UI

**Historical Evidence Acquisition 4.3** panel on Operations Centre:
- Counters: FOUND / EXTRACTED / VERIFIED / REVIEW / CONFLICT / NOT_FOUND / FAILED
- Queue preview labelled **proposed — not persisted**
- Dry run, Acquire P1/P2, Retry failed actions

---

## 11. Cron

Extended `/api/cron/historical-enrichment?engine=hea43&limit=5` to run HEA 4.3 P1 batch without competing cron system.

---

## 12. Tests

| Command | Result |
|---------|--------|
| `npm run test:historical-evidence43` | **PASS** (20 cases) |
| `npm run test:historical-intelligence42` | **PASS** |
| `npm run test:historical-intelligence40` | **PASS** |
| `npm run test:historical-data-enrichment41` | **PASS** |
| `npm run test:historical-data-acquisition40` | **PASS** |
| `npm run test:pricing-acquisition` | **PASS** |
| `npm run test:pricing` | **PASS** |
| `npm run test:dd` | **PASS** |
| `npm run test:refetch` | **PASS** |
| `npm run test:investor-intelligence` | **PASS** |
| `npm run test:ops-quick-actions` | **PASS** |
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** |

---

## 13. Live evidence

**Script:** `npm run hea43:live` → `HISTORICAL_EVIDENCE43_LIVE.json`, `HISTORICAL_EVIDENCE43_REPORT.md`

Live run (2026-08-14): **0 verified SOLD, 0 verified sale prices, 0 catalogue leaks** — valid when licensed sources provide no explicit evidence. Verdict: **INSUFFICIENT DATA — EVIDENCE ENGINE HEALTHY**.

---

## 14. Migrations

**No new HEA 4.3 migration.** Reuses:
- `historical_enrichment_runs`
- `auction_outcome_observations`
- HI 4.2 `historical_resolution_audit` (if applied)

Apply pending HI 4.2 migration if not yet in production:
`supabase/migrations/20260814160000_historical_intelligence42_resolution.sql`

---

## 15. Limitations

1. Source discovery currently resolves **exact licensed URLs on auction events** — broader partner archive/API search requires additional licensed connector endpoints
2. **0 verified sale prices in production** reflects genuine source evidence gap, not engine failure
3. HEA 4.3 + HI 4.2 are **uncommitted** locally (along with HI 4.2 from prior sprint)
4. Live DB counts may return null if Supabase tables/migrations are not fully applied in the target environment

---

## 16. Next operational steps

1. **Apply migrations** (HI 3.0 → 3.1 → 4.2) in Supabase production
2. **Run dry run** from Operations Centre: *Dry run (5)* — confirm P1 queue candidates
3. **Run small write batch:** *Acquire P1 (5)* with licensed Bidders Choice sources
4. **Inspect results** in Historical Resolution 4.2 panel — approve/reject evidence as needed
5. **Schedule cron:** `GET /api/cron/historical-enrichment?engine=hea43&limit=5` daily
6. **Commit** HI 4.2 + HEA 4.3 when ready (not done in this sprint per instructions)

---

## 17. Files created / modified

### Created
- `lib/acquisition/historicalEvidence43/` (config, types, sourceDiscovery, historicalSearch, sourceCandidateScoring, identityResolver, outcomeExtractor, salePriceExtractor, evidenceValidator, sourceFetcher, queue43, historicalEvidenceService, historicalEvidenceRepository, index)
- `lib/services/HistoricalEvidenceAcquisition43Service.ts`
- `app/api/admin/intelligence/historical-evidence/route.ts`
- `app/api/admin/intelligence/historical-evidence/[eventId]/route.ts`
- `app/api/admin/intelligence/historical-evidence/review/route.ts`
- `app/admin/operations/components/HistoricalEvidenceAcquisition43Panel.tsx`
- `scripts/historical-evidence-acquisition43-selftest.cjs`
- `scripts/historical-evidence43-live.ts`
- `scripts/historical-evidence43-live.cjs`
- `HISTORICAL_EVIDENCE43_LIVE.json`
- `HISTORICAL_EVIDENCE43_REPORT.md`

### Modified
- `app/admin/operations/page.tsx`
- `app/api/cron/historical-enrichment/route.ts`
- `lib/services/index.ts`
- `package.json`

---

**No fabrication rule enforced throughout.** The platform prefers **INSUFFICIENT DATA** over false certainty.
