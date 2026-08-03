# FIRST VERIFIED LISTING REPORT

**Date:** 2026-08-03  
**Operation:** End-to-end production import — Bidders Choice  
**Verdict:** **FIRST VERIFIED LISTING LIVE**

---

## Executive summary

One real Bidders Choice auction listing completed the full production pipeline:

**Source → Connector → Extract → Normalize → Validate → Deduplicate → Pending Verification → Admin Approve → Verified → Public Website**

Public production evidence confirms the listing is searchable, shows the Verified badge, provenance, agency, and original source link.

---

## Imported property summary

| Field | Value |
|-------|--------|
| Property ID | `3e7ea1ff-f237-4a6c-8b36-23bb34c4136c` |
| Title | Online Auction Guest Farm Haenertsburg Magoebaskloof Limpopo |
| Town | Haenertsburg |
| Province | Limpopo |
| Address | The Viewpoint, Magoebaskloof |
| Type | Farm |
| Beds / Baths | 14 / 14 (as published on source page) |
| Agency | Bidders Choice |
| Auction date | **2026-08-04** (Auction Open; corrected after timezone-safe parse) |
| Auction time | 08:00 |
| External ID | `bc_online-auction-guest-farm-haenertsburg-magoebaskloof-limpopo` |
| Verification | `verified` |
| Classification | `production` |
| Quality score (import) | 61/100 |
| Public URL | https://sa-property-auctions.vercel.app/properties/3e7ea1ff-f237-4a6c-8b36-23bb34c4136c |

---

## Source evidence

| Item | Evidence |
|------|----------|
| Source URL | https://bidderschoice.co.za/property-listings/online-auction-guest-farm-haenertsburg-magoebaskloof-limpopo/ |
| Robots | `User-agent: *` / empty `Disallow` — **allowed** (`robots.txt` fetched 200) |
| Import timestamp | `2026-08-03T07:41:03.084Z` |
| HTML download | 200 OK, **190 499** bytes |
| Job ID | `first_verified_mscx75qy` |

Evidence file: `FIRST_VERIFIED_LISTING_EVIDENCE.json`

---

## Pipeline evidence

| Stage | Status | Evidence |
|-------|--------|----------|
| Discover | success | Explicit listing URL (1) |
| Download | success | Page downloaded after robots allow |
| Extract | success | Title, town, province, beds/baths, agency, images detected |
| Normalize | success | Mapped to property row |
| Validate | success | Mandatory fields present |
| Deduplicate | success | No duplicate — insert |
| Quality score | success | Overall **61** |
| Verification queue | success | Pending `3e7ea1ff-…` |
| Admin approval | success | Set `verified` + `last_verified_at` |
| Public website | success | Live on production API + property page |

Import duration (engine): **~25.0s**  
End-to-end script duration: **~33.7s**

---

## Verification evidence

| Check | Result |
|-------|--------|
| Landed as `pending_verification` | Yes (pre-approval row in evidence JSON) |
| Quality score | 61 (address 55, image 50, auction 65) |
| Source provenance | `source_url` + agency Bidders Choice |
| Approval timestamp | `2026-08-03T07:41:36.497Z` |
| `verification_state` after approve | `verified` |
| `data_classification` | `production` |

---

## Public verification (production)

Probed `https://sa-property-auctions.vercel.app` on 2026-08-03:

| Check | Result |
|-------|--------|
| `/api/properties` includes listing | **HIT** — `verification=verified`, `label=Verified` |
| Agency | Bidders Choice |
| Source URL | Present (bidderschoice.co.za) |
| `isSeedOrDemo` | false |
| Property page HTTP | 200 |
| Verified badge | Present in HTML |
| Listing provenance | Present |
| Agency text | Present |
| Original source link | Present |
| Gallery API | 200 (`/api/gallery/{id}`) |
| AI Search (unauthenticated) | **401** — premium/auth gated (expected; listing is in the verified catalogue for authenticated premium/admin search) |

---

## Image pipeline notes

- Automatic `processImage` uploads failed with **RLS** on `property_images` (anon client) and some **mime** issues for `.webp`.
- Three source gallery URLs were attached via service role (original Bidders Choice CDN URLs — not fabricated).
- **Recommendation:** acquisition image writes must use the service-role client.

---

## Lessons learned

1. **Date parsing** must avoid `Date#toISOString` day-shift — “04 August 2026” initially became `2026-08-03` in UTC+2; corrected to `2026-08-04` from source text.
2. **Town/type extractors** needed BC-specific patterns (`City:`, `Guest Farm`, `Opens …`).
3. **Image import** is the weakest link (RLS + mime) — fix before scaling to 100.
4. **TLS** on this workstation required `NODE_OPTIONS=--use-system-ca` for Node fetch to BC.
5. Pending→public filter may not be live on Vercel until VL1.0 deploy; the verified listing is still correctly labeled Verified.

---

## Recommendations for scaling to 100 listings

1. Fix image pipeline to use `createServiceClient()` for storage + `property_images` inserts.
2. Prefer licensed CSV/feed batches; keep public fetch rate-limited.
3. Deploy VL1.0 public visibility filter so only `verified`/`sold` appear in the catalogue.
4. Add connector extract unit fixtures from real BC HTML snapshots (no live network in CI).
5. Admin bulk-approve only after checklist gates (`readyToApprove`).
6. Enable `BIDDERS_CHOICE_DAILY_SYNC` only after image RLS + licence confirmation.
7. Monitor `import_rejections` and `acquisition_import_reports` daily.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run typecheck` | **PASS** (run with report) |
| `npm run build` | **PASS** (run with report; middleware deprecation warning noted) |

---

## Final verdict

| Option | Selected |
|--------|----------|
| FAIL | No |
| PIPELINE VERIFIED | Partial (pipeline proven) |
| **FIRST VERIFIED LISTING LIVE** | **Yes** |

**Evidence:** production property `3e7ea1ff-f237-4a6c-8b36-23bb34c4136c` is `verification_state=verified`, returned by the public properties API, and the public detail page shows Verified + provenance + Bidders Choice + source link.
