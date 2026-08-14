# Property Master Identity Review 1.0

**Date:** 2026-08-14  
**Evidence:** `PROPERTY_MASTER_IDENTITY_REVIEW10_LIVE.json`  
**Principle:** Decisions from verified fields only — not title similarity or shared town alone.  
**No backfill rerun. No automatic splits. No production master/event changes in this sprint.**

---

## Production baseline (verified read-only)

| Metric | Value |
|--------|------:|
| Unique Property Masters | **36** |
| Auction Events | **38** |
| Historical listings event-backed | **38/38** |
| Listing fallback | **0** |
| Public historical leaks | **0** |
| Pricing linked | **0** |
| Second-run idempotency | **0 new inserts** |
| Shared masters (2 listings each) | **2** |

---

## Admin review results

### Case 1 — Master `852a132f-ff3c-4ca0-a324-a5dfd4d54ee4`

| Field | Value |
|-------|-------|
| **listing_1** | `f3f47cca-…` — Insolvent Estate Auction: 8.5HA Vacant Land, Louis Trichardt |
| **listing_2** | `b8eb4cb5-…` — Insolvent Estate Auction: Vacant Stand – Louis Trichardt |
| **identity_decision** | **DISTINCT_PROPERTIES_REQUIRES_SPLIT** |
| **confidence** | **high** |
| **recommended_action** | Split listing 2 onto a new Property Master via admin review queue |

#### Case 1 evidence

| Field | Listing 1 (8.5HA land) | Listing 2 (vacant stand) |
|-------|------------------------|--------------------------|
| Fingerprint | `pf_bef9d699_8f8a8c1d` | `pf_92d9ef98_ee62c524` |
| Normalized address | — | **41 Flamboyant Street** |
| Street | — | **41 Flamboyant Street** |
| Town | Louis Trichardt | Louis Trichardt |
| Province | Limpopo | Limpopo |
| Property type | Vacant Land | Vacant Land |
| Erf / portion / farm | — | — |
| Land size (verified) | — | — |
| Title implies extent | **8.5HA** | **Vacant stand** (street address) |
| Source URL | `…/85ha-vacant-land-louis-trichardt/` | `…/vacant-stand-louis-trichardt/` |
| External ID | `bc_…-85ha-vacant-land-…` | `bc_…-vacant-stand-…` |
| Auction date | 2026-09-08 | 2026-09-08 |
| Auction event | `c79111be-…` | `99934215-…` |
| Coordinates | — | — |

**matching_evidence[]**

- town: Louis Trichardt
- province: Limpopo
- propertyType: Vacant Land (both classified vacant — not sufficient alone)
- sourceAgency: Bidders Choice
- connectorId: bidders_choice
- Same auction date (not used as identity proof)

**conflicting_evidence[]**

- **street:** null vs **41 Flamboyant Street** — one listing has a verified street address, the other has none
- **normalizedAddress:** null vs 41 Flamboyant Street
- **fingerprint:** `pf_bef9d699` vs `pf_92d9ef98` — identity engine computed distinct fingerprints
- **sourceUrl / externalListingId:** distinct Bidders Choice listings
- **title/implied extent:** 8.5HA bulk land vs named street vacant stand — materially different physical descriptions
- **No shared erf, farm, portion, or coordinates**

**Decision rationale:** Shared town and agency are weak signals. Listing 2 carries a specific street address; listing 1 describes large hectare vacant land with no street. No erf/farm/coordinate overlap. Fingerprints differ. **Cannot verify same underlying permanent property.**

---

### Case 2 — Master `7eaf47fc-4468-4902-96f5-1ddcf6435f51`

| Field | Value |
|-------|-------|
| **listing_1** | `78e0ab0e-…` — 2x Sectional Title Units, Pretoria |
| **listing_2** | `ec3e90f0-…` — Agricultural Holding Fundus, Pretoria North |
| **identity_decision** | **DISTINCT_PROPERTIES_REQUIRES_SPLIT** |
| **confidence** | **high** |
| **recommended_action** | Split listing 2 onto a new Property Master via admin review queue |

#### Case 2 evidence

| Field | Listing 1 (sectional units) | Listing 2 (agricultural holding) |
|-------|-------------------------------|----------------------------------|
| Fingerprint | `pf_a4fe9fc8_92bff1cc` | `pf_8774c80f_13414b0f` |
| Normalized address | **83 Greef Street, Trevenna** | — |
| Street | **83 Greef Street, Trevenna** | — |
| Town | Pretoria | Pretoria (listing row; title says Pretoria North) |
| Province | Gauteng | Gauteng |
| Property type | **Apartment** (sectional) | **House** (ag holding classification) |
| Bedrooms / bathrooms | **1 / 1** | **5 / 5** |
| Erf / farm / portion | — | — |
| Title | 2x sectional title units | 1HA agricultural holding fundus |
| Source URL | `…/2x-sectional-title-units-pretoria/` | `…/1ha-agricultural-holding-fundus-ah-pretoria-north/` |
| Auction date | 2026-09-08 | 2026-05-05 |
| Verification | verified / upcoming | expired |
| Auction event | `1174ccf7-…` | `e105c520-…` |

**matching_evidence[]**

- town: Pretoria (listing field — listing 2 title references Pretoria North)
- province: Gauteng
- sourceAgency: Bidders Choice
- connectorId: bidders_choice

**conflicting_evidence[]**

- **propertyType:** Apartment (sectional) vs House (agricultural holding)
- **bedrooms / bathrooms:** 1/1 vs 5/5 — materially incompatible
- **street:** 83 Greef Street, Trevenna vs none
- **fingerprint:** `pf_a4fe9fc8` vs `pf_8774c80f`
- **sourceUrl / externalListingId:** distinct listings
- **auction date:** different events (not identity proof, but confirms separate auction occurrences)
- **No shared erf, farm, coordinates, or address**

**Decision rationale:** Sectional title units at a named Pretoria street address vs a 1HA agricultural holding in Pretoria North are materially incompatible property types and characteristics. No verified identifier overlap. **Distinct physical properties.**

---

## Summary decisions

| Case | Master | Decision | Confidence | Admin action |
|------|--------|----------|------------|--------------|
| 1 | `852a132f-…` | DISTINCT_PROPERTIES_REQUIRES_SPLIT | high | Split listing `b8eb4cb5-…` |
| 2 | `7eaf47fc-…` | DISTINCT_PROPERTIES_REQUIRES_SPLIT | high | Split listing `ec3e90f0-…` |

Neither pair meets the bar for **CORRECT_SAME_PROPERTY** — no shared erf/farm/address/coordinates and fingerprints differ.

---

## Admin review queue (implemented)

Two cases added to `property_history_backfill_reviews` via:

- **API:** `POST /api/admin/intelligence/history-backfill` `{ "action": "seed_shared_master_reviews" }`
- **Ops UI:** “Queue shared-master reviews” button on Property History Backfill panel
- **CLI:** `npx tsx --env-file=.env.local scripts/seed-shared-master-identity-reviews.ts`

Each pending row includes case evidence and requires explicit admin choice:

| Review ID | Case | Listing to review |
|-----------|------|-------------------|
| `9c8fac73-4989-4161-b07d-26042f18006d` | CASE_1 | `b8eb4cb5-…` (Vacant stand, Flamboyant St) |
| `23cacac0-2d2e-43ab-bea7-4024d5906484` | CASE_2 | `ec3e90f0-…` (Agricultural holding, Pretoria North) |

Explicit admin choice required:

| Admin action | API | Effect |
|--------------|-----|--------|
| Confirm same property | `approve_match` | Keeps listing on proposed master |
| Split into separate masters | `create_new_master` | Creates new master with `forceNewMaster` (no auto re-merge) |

**No automatic split** — admin must click after reviewing evidence.

---

## Counter / UI fixes (already shipped in `f0eca58`)

| Counter | Meaning |
|---------|---------|
| `mastersInserted` | New `property_masters` rows |
| `mastersReused` | Existing master linked in-batch |
| `listingsAttached` / `mastersAttached` | Listings linked (insert + reuse) |
| `eventsInserted` | New `auction_events` rows |
| `eventsReused` | Existing event linked |
| `eventsDuplicatesSkipped` | True duplicates only |

False `duplicates_skipped: 38` bug **fixed** — post-identity-attach events no longer counted as duplicates.

Ops panel labels: Masters inserted / reused / listings attached / events inserted / reused.

---

## Production safety checks

| Check | Result |
|-------|--------|
| Backfill rerun | **Not executed** |
| New masters/events from this sprint | **None** (review queue seed only) |
| Public catalogue leaks | **0** |
| HI event-backed coverage | **38/38** |
| Orphan events | **0** |
| Automatic split | **Disabled** — admin-only |

---

## Validation results

All commands run after Identity Review 1.0 code changes:

```
npm run typecheck                          PASS
npm run build                              PASS
npm run test:history-backfill              PASS
npm run test:historical-intelligence       PASS
npm run test:pricing-acquisition           PASS
npm run test:pricing                       PASS
npm run test:dd                            PASS
npm run test:refetch                       PASS
npm run test:investor-intelligence         PASS
npm run test:ops-quick-actions             PASS
```

---

## VERDICT

### **DISTINCT PROPERTIES — ADMIN SPLIT RECOMMENDED (HIGH CONFIDENCE)**

Both shared-master pairs fail verified same-property criteria. Queue the two review listings in admin, then split each via “Split into separate masters” when ready.

**Do not rerun backfill.** Deploy Identity Review 1.0 UI/API, seed queue, and resolve cases manually.

---

## Recommended next steps

1. Deploy Identity Review 1.0
2. Click **Queue shared-master reviews** in Ops Centre (or run seed script)
3. For each case, review evidence → **Split into separate masters**
4. Verify master count becomes **38** unique masters after both splits
5. Confirm HI remains 100% event-backed and public catalogue clean
