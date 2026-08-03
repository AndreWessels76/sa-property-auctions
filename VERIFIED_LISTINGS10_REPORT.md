# VERIFIED LISTINGS 1.0 — REPORT

**Date:** 2026-08-02  
**Focus:** Bidders Choice reference connector + Property Acquisition Engine  
**Validation:** `npm run typecheck` **PASS** · `npm run build` **PASS** (middleware→proxy deprecation warning noted, not ignored)

---

## Verdict

**CONNECTOR READY**

Overall score: **78 / 100**

Not **VERIFIED LISTINGS READY** until at least one real licensed/robots-checked import is admin-approved and visible as Verified on production.

---

## Architecture

```
BiddersChoiceConnector → PropertyAcquisitionEngine → pending_verification
        → Admin Verification (approve/reject/merge)
        → Public PropertyService (verified/sold only)
```

Evidence: `lib/connectors/biddersChoice/*`, `lib/acquisition/*`, `lib/data/publicListingPolicy.ts`, `PropertyRepository.search` filter.

Repository → Service → UI preserved. No auth/billing/AI Search redesign.

---

## Import Pipeline

Stages implemented and audited: discover, download, extract, normalize, validate, deduplicate, quality_score, verification_queue, admin_approval, public_website.

Rejections stored (`import_rejections`). Never silent discard.

---

## Connector Review

| Item | Status | Evidence |
|------|--------|----------|
| BiddersChoiceConnector | Done | discover/download/extract/robots |
| Licensed/CSV/manual path | Done | `licensedRows` / `listingUrls` |
| Public fetch gated | Done | robots.txt + `allowPublicFetch` |
| Replaceable blueprint | Done | docs + registry |
| Live listings imported in this sprint | Not claimed | Requires operator run + migration |

---

## Verification Review

- Imports always `pending_verification`
- Public hides pending/seed (`PUBLIC_VERIFICATION_STATES`)
- Admin Approve / Reject / Archive / Merge + checklist + metrics
- Verified badge on public cards/detail

---

## Deduplication

External ID + confidence signals (`deduplicationStandard`). Merge updates existing; never dual-insert on high confidence.

---

## Quality Review

Multi-dimensional scores on import; admin-only visibility retained.

---

## Performance

Per-run caps (`maxListings`). Image import best-effort with warn logs. Cron sync disabled by default (`BIDDERS_CHOICE_DAILY_SYNC`).

---

## Security

- Acquisition + verification APIs require admin
- Cron requires bearer secret in production
- Public fetch refused if robots unreachable/disallow
- No fabricated provinces/towns (validation rejects)

---

## Operational Readiness

| Ready | Not yet |
|-------|---------|
| Connector + engine code | Production migration apply |
| Admin workflow | First licensed batch import |
| Public hide pending | First Verified public listing |
| Optional daily sync flags | Confirmed partner licence letter |

---

## Known Risks

1. Sitemap fetch may fail (observed 500 from edge fetch tooling) — use explicit URLs/CSV.
2. HTML extraction is heuristic — missing fields reject or stay null.
3. Public catalogue may be empty until approvals (by design).
4. New SQL migration must be applied on Supabase.
5. Material updates re-queue verified listings to pending (re-approval required).

---

## Recommendations

1. Apply `20260802120000_verified_listings_acquisition.sql`.
2. Import a small licensed CSV or explicit listing URL set via admin API.
3. Approve one listing end-to-end; confirm public Verified badge + source link.
4. Enable `BIDDERS_CHOICE_DAILY_SYNC` only after licence + robots confirmation.
5. Clone connector package for High Street next.

---

## Scorecard

| Area | Score |
|------|------:|
| Architecture | 88 |
| Connector | 80 |
| Pipeline | 82 |
| Verification | 85 |
| Dedup | 78 |
| Quality | 80 |
| Public policy | 90 |
| Ops/live data | 45 |
| Docs | 88 |
| **Overall** | **78** |

---

## Final verdict options

| Verdict | Fit |
|---------|-----|
| NOT READY | No |
| **CONNECTOR READY** | **Yes** |
| VERIFIED LISTINGS READY | No — awaiting first verified public inventory from live import + approval |
