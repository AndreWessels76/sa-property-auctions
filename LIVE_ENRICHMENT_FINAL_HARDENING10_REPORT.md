# LIVE ENRICHMENT FINAL HARDENING 1.0

**Date:** 2026-08-13  
**Code:** `forceSemantics.ts` + snapshot URL/hash dedupe + Tests A–F  
**Live evidence:** `LIVE_ENRICHMENT_HARDENING_LIVE.json`  
**Prior changed-content evidence:** `LIVE_ENRICHMENT_CLOSURE_EVIDENCE.json`  
**Operator:** `hardening_live` (local hardened engine against production DB + live Bidders Choice HTTP)

No architecture change. No Property Master / Auction Event redesign. No weakening of verification safety. No fabricated values. `BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH`, `CRON_SECRET`, Stripe, Supabase credentials, and admin roles were not modified.

---

## Root Cause

The previous force path treated `force` as a bypass of **content-hash equality**, not only of **refresh scheduling**.

The old branch was effectively:

```text
if (!force && previousHash === contentHash) → NO_CHANGE
```

So a forced Benoni refresh (`97ae53e8-ecc0-4ad0-bb8f-b52cfa9a03bd`) performed a real HTTP 200, hashed to the same SHA-256 as snapshot `bf6fa956-…`, then still inserted a second identical-content snapshot (`dd1d2159-…`) and re-ran DD extraction.

That was wrong. Same source bytes must never be treated as a change, even when the operator requested a fresh fetch.

The historical duplicate Benoni snapshot row remains (append-only history is not rewritten). New forced fetches must not add another copy.

---

## Fix

`force` now means only:

> Attempt a fresh live fetch regardless of ordinary refresh scheduling / interval / eligibility.

It does **not** mean “pretend the source changed.”

Canonical rule (`lib/acquisition/refetch/forceSemantics.ts`):

```text
same source content
+
same SHA-256 hash
=
NO_CHANGE
```

even when `force === true`.

| Path | HTTP fetch | Same hash | Snapshot | DD extraction | `extraction_run_id` | Audit |
|------|------------|-----------|----------|---------------|---------------------|-------|
| Normal refresh | if eligible | `NO_CHANGE` | none new | none | `null` | recorded |
| Forced refresh | always (after licence/robots) | `NO_CHANGE` | none new; reuse existing id | none | `null` | recorded with `meta.forced = true` |
| Forced refresh | always | different hash → `CONTENT_CHANGED` | new snapshot | persist DD | populated | recorded |

If the URL + hash combination already exists, `SourceSnapshotService.findByUrlAndHash` reuses that snapshot. The refetch **run** is still written for audit (`requested_at` / `forced` / HTTP status / hash / `NO_CHANGE`).

---

## Expired Listings

Haenertsburg and Benoni remain historical. They were **not** restored to `verified`.

| Listing | Property ID | Lifecycle | Auction date | Public catalogue |
|---------|-------------|-----------|--------------|------------------|
| Haenertsburg Guest Farm | `3e7ea1ff-f237-4a6c-8b36-23bb34c4136c` | `expired` | 2026-08-04 | **hidden** |
| Benoni / Crystal Park / The Orchards | `97ae53e8-ecc0-4ad0-bb8f-b52cfa9a03bd` | `expired` | 2026-08-11 | **hidden** |

Rows remain in the database for comparables, market statistics, historical auction analysis, agency history, area intelligence, and lifecycle history.

Public catalogue rule unchanged: show only `upcoming` and `live`; hide `expired`, `completed`, `cancelled`, `withdrawn`.

Regression: **Test D** — past auction date → `expired`; `isPubliclyActiveListing` false; `HISTORICAL_INTELLIGENCE_STATES` includes `expired`; refetch does not write `verification_state`.

---

## Hash Safety

Primary live proof used a currently relevant listing (not expired):

**Online Auction 20 Bed Guest Lodge Rosettenville Johannesburg**  
Property `8125134b-387c-42dd-923a-c6f01826277f`  
Source: `https://bidderschoice.co.za/property-listings/online-auction-20-bedroom-guest-lodge-rosettenville-johannesburg/`  
Auction date: **2026-08-18**  
State: `verified` / `upcoming`  
Public catalogue: **visible**

Two consecutive **forced** live fetches:

| | First | Second |
|--|-------|--------|
| Run | `rf_39d8b5e0-9` | `rf_85beab64-7` |
| HTTP | **200** | **200** |
| `forced` | `true` | `true` |
| SHA-256 | `33ae0053a63405166c61b9859389b3afb6853cc7ea1f8a9486ae038e73018e5e` | identical |
| Change | **NO_CHANGE** | **NO_CHANGE** |
| Snapshot | `61cb217e-66b1-4e0f-9a3a-cecc99637efb` (reused) | same id reused |
| `extraction_run_id` | `null` | `null` |
| Conflicts | 0 | 0 |

After both runs: **1** snapshot for this listing, **0** duplicate hashes, no new DD run.

Forced identical content therefore produces `NO_CHANGE` without duplicate content snapshots. Force-fetch itself remains available.

Tests **A** (normal unchanged) and **B** (forced unchanged) cover the same rule in the selftest.

---

## Changed Content

This hardening run did not invent a source change. The live Rosettenville page hashed identically, so extraction was correctly skipped.

Genuinely changed content was already proven on production:

**Louis Trichardt 8.5Ha** (`f3f47cca-73c8-420c-9144-146b0f4c9aba`)

| Link | ID |
|------|-----|
| Refetch run | `fa629e8a-8436-4ff2-b60a-225a53ace411` / `rf_c751e80d-0` |
| Snapshot | `bcd9d752-c762-4be8-895f-70a7292aeef6` |
| SHA-256 | `ae2890667eba5c0c3197ca85c14652bcc5c39b1655905f8d105c71fee5bb01a9` |
| Change | **CONTENT_CHANGED** |
| DD extraction | **`6d1e3231-4b59-46a9-9c07-3d7620669b4d`** |
| Fields | 18 |
| Conflicts | 0 |

Chain:

```text
CONTENT_CHANGED → source snapshot → DD extraction run → fields/evidence → extraction_run_id on refetch audit
```

**Test C** — forced different hash → `CONTENT_CHANGED` → snapshot + DD + `extraction_run_id` wiring.

`NO_CHANGE` still persists the refetch audit only.

---

## Verification Safety

Rosettenville after forced refresh:

- `verification_state` still **`verified`**
- `last_verified_at` still **2026-08-03T10:13:13.752+00:00** (not overwritten)
- conflicts **0** (source hash unchanged, so no field diffs)

When a verified field *would* change, `classifyFieldChange` records **CONFLICT** / `CONFLICT_REVIEW_REQUIRED`. Verified values are not auto-replaced. New source evidence is retained. Never auto-verify. Never auto-approve. Never replace historical provenance.

**Test E** — verified `land_size_ha` 4.164 vs extracted 4.21 → `CONFLICT`; previous value protected.

---

## Identity Safety

Refetch does not create Property Masters or Auction Events.

| Listing | `property_master_id` | Auction events |
|---------|----------------------|----------------|
| Rosettenville (live proof) | `null` | 0 |
| Haenertsburg | `null` | 0 |
| Benoni | `null` | 0 |

**Test F** — refetch services do not reference `property_masters`, `auction_events`, or `PropertyIdentity`.

---

## Validation

| Check | Result |
|-------|--------|
| Typecheck (`npm run typecheck`) | **PASS** |
| Build (`npm run build`) | **PASS** |
| Refetch tests (`npm run test:refetch`) including Tests A–F | **PASS** |
| DD tests (`npm run test:dd`) | **PASS** |
| Ops tests (`npm run test:ops-quick-actions`) | **PASS** |

Force-refresh semantics are covered by Tests A–C inside `npm run test:refetch` (`decideChangeFromContentHash` ignores `force`; service no longer uses `if (!input.force && previousHash === contentHash)`).

---

## Final Verdict

**PRODUCTION READY**
