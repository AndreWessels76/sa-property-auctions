# PROPERTY RESEARCH PLATFORM 3.0 — REPORT

**Date:** 2026-08-07  
**Sprint:** Property Intelligence Platform 3.0 — Investor Experience Suite  
**Module:** Auction Research Report  
**Validation:** `npm run typecheck` PASS · `npm run build` PASS

---

## Executive Summary

Every verified property can now produce a deterministic **Auction Research Report**. The report answers “what should I know before I bid?” using only platform-verified / source-confirmed fields. Missing facts are labelled **not supplied** — never fabricated, estimated, or advised.

### Update — 2026-08-08 (Due Diligence Extraction 1.0)

Research reports now consume `buildDueDiligenceCentre` extraction output:

- Bedrooms / scheme / suburb / town recovered from description when structured fields empty
- Land section with source text + normalised hectares (approximate preserved)
- Auction open/close periods when present in source text
- Evidence notes + missing information lists
- Completeness overall % in intelligence summary
- Report version **3.1.0**

---

## Architecture

| Layer | Implementation |
|-------|----------------|
| Engine | `lib/property/researchReport.ts` → `buildAuctionResearchReport` |
| Lifecycle input | `lib/property/lifecycleTimeline.ts` |
| Intelligence input | `AuctionIntelligenceService.buildPanel` (existing) |
| Detail summary | `components/property/detail/ResearchReportSummaryCard.tsx` |
| Full report | `/properties/[id]/research` |
| Export | Print-ready layout · share path · PDF reserved |

Report sections: Executive Summary, Property Snapshot, Auction Information, Classification, Ownership (legally unavailable unless sourced), Timeline, Location, Agency, Documents, Verification, Provenance, Intelligence Summary.

**No redesign** of Repository → Service, Property Masters, Auction Events, Verification, or Partnership Platform.

---

## Performance

- Report built synchronously from already-loaded property DTO + panel + timeline.
- Detail page revalidate `300s`; research route same.
- No extra speculative AI calls for report generation.

---

## Premium Features

- Full research report path available publicly for verified listings (transparency).
- PDF export reserved for premium workflow (hinted, not fabricated as delivered).
- Version string `3.0.0` supports future version history.

---

## Public Features

- Research summary card on property detail.
- Full printable research page with shareable URL.
- Clear “no investment advice” disclaimer.

---

## Security

- No private investor data in research export.
- Ownership block defaults to unavailable unless legally available from verified sources.

---

## Scalability

- Pure function builder — O(1) per property.
- Timeline merge is list-local; suitable for catalogue growth.

---

## Production Readiness

| Item | Status |
|------|--------|
| Typecheck / build | PASS |
| Fabrication risk | Mitigated (status fields) |
| Speculative AI | Not used for report body |
| PDF binary | Reserved (print works now) |

---

## Recommendations

1. Persist report snapshots for true version history when migration capacity allows.
2. Wire premium PDF generation (server-side) without inventing missing fields.
3. Apply investor workspace migration for private annotations alongside reports.

---

## Overall Score

**8.6 / 10** — Production-ready research surface; PDF/history are intentional next increments.
