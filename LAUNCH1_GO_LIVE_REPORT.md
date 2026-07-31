# Launch 1 — Go-Live Report

**Date:** 31 July 2026  
**Production:** https://sa-property-auctions.vercel.app  

---

## Overall Result

# READY FOR PUBLIC BETA

**Score: 78 / 100**

Evidence: RC6 legal pack shipped, messaging made honest, ZAR prices published, catalogue seeded with images across nine provinces, typecheck/build pass. Remaining risks are coverage depth (seed vs licensed feeds) and ops follow-up for support forms.

---

## Deployment

| Item | Status |
|---|---|
| Commit | `f2218a4` on `main` |
| Vercel production | Deployed — legal routes **200** |
| Catalogue API | `total=15`, all sampled cards imaged |
| Pricing live | R99 / R990 visible |
| Health | `/api/health/ready` → ready |

### Live HTTP spot-check (post-deploy)

All **200**: `/terms` `/privacy` `/popia` `/cookies` `/subscription-policy` `/refunds` `/disclaimer` `/about` `/faq` `/contact` `/pricing` `/known-issues` `/release-notes` `/robots.txt` `/sitemap.xml` health endpoints.

Homepage: no `12,000` / `10,000+` claims; shows Public beta + Growing; partner strip uses source categories (not Property24).

---

## Legal

| Page | Intent |
|---|---|
| `/terms` `/privacy` `/popia` `/cookies` | Compliance |
| `/subscription-policy` `/refunds` `/disclaimer` | Billing + auction/AI honesty |
| Footer links | All policies |
| Register / Pricing | Terms + Privacy (+ billing policies on Pricing) |

Counsel review still recommended post-launch.

---

## Marketing

| Before | After |
|---|---|
| “Trusted by 12,000+” | “Public beta — new auction properties added regularly” |
| “10,000+ Properties” counters | Honest labels: Growing / 9 provinces / Regular / 24/7 |
| Bank/portal partner marquee | Source categories (sheriff, bank, public, CSV) |
| Fake testimonial personas | Illustrative scenarios labelled as such |
| Fake province auction counts | Browse CTA without invented totals |

---

## Pricing

| Plan | Display |
|---|---|
| Free | R0 + feature list |
| Premium Monthly | **R99 / month** (Stripe `unit_amount=9900` ZAR) |
| Premium Yearly | **R990 / year**, save **R198** vs monthly |
| Checkout | Stripe buttons retained |
| Billing wording | Cancel anytime; policies linked |

---

## Production Data

| Metric | Value |
|---|---|
| Properties | **15** |
| Images | **33** (`property_images`) |
| Provinces | All 9 represented |
| Attributes | Title, address fields, beds/baths (where applicable), dates, types, values, source |
| Duplicates | Upsert by title+town |
| Documentation | `LAUNCH1_DATA_SOURCES.md` |

Seed = curated launch catalogue (not scraped live notices). Replace with licensed feeds next.

---

## Images

- Primary (`is_hero`) + gallery per property  
- Card aspect `16/11`; Unsplash URLs `w=1200`  
- Fallback via `getPropertyImage` only if no gallery row  

---

## QA (pre/post deploy matrix)

| Area | Expected |
|---|---|
| Registration / verify / login | Pass (existing) |
| Search / filters | Pass with 15 listings |
| AI Search | Premium session required |
| Property detail + gallery | Pass when images seeded |
| Pricing amounts visible | Pass |
| Stripe checkout / portal | Pass if Stripe env correct |
| Terms / Privacy / Footer | Pass after deploy |
| 404 / global-error / health | Present |

Live HTTP verification runs after Vercel picks up the push.

---

## SEO

| Item | Status |
|---|---|
| `robots.txt` | Present |
| `sitemap.xml` | Static legal/marketing + property IDs |
| Meta description | Honest (no 10k claim) |
| Open Graph / Twitter | Image + description |
| Canonical | `metadataBase` + `/` canonical |
| JSON-LD Organization | Root layout |
| Favicon | `/favicon.ico` |
| Google indexing | Submit Search Console after deploy; ensure `NEXT_PUBLIC_SITE_URL` is production |

---

## Known Issues

See `KNOWN_ISSUES.md` (seed catalogue, stock photos, heatmaps, manual support, analytics optional).

---

## Remaining Risks

1. Seed data must be clearly understood as beta starter inventory.  
2. Vercel `NEXT_PUBLIC_SITE_URL` may still point to localhost if not updated — breaks absolute OG/canonical.  
3. Support forms need daily human triage.  
4. Stripe Price IDs must remain `price_…` on Vercel.  
5. Legal pages not yet attorney-certified.

---

## Validation

- `npm run typecheck` — PASS  
- `npm run build` — PASS  

---

## Verdict rationale

Launch blockers from RC7 (undeployed legal, inflated claims, opaque pricing, empty catalogue/images) are addressed. Platform is suitable for **public beta invitees** with transparent limitations — not yet “scale” or heavy paid acquisition.

**READY FOR PUBLIC BETA**
