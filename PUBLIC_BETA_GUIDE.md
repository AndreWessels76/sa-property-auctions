# Public Beta Guide — SA Property Auctions

**Audience:** Founders / launch owners  
**Version:** Launch 1 (31 July 2026)

## What public beta means

Invited / soft public beta: legal pages live, honest marketing, transparent ZAR pricing, starter catalogue across nine provinces, POPIA self-serve, and email support.

## Launch 1 checklist

1. Confirm Vercel production env (`NEXT_PUBLIC_SITE_URL` = production URL, Supabase, Stripe **price_** IDs, service role).  
2. Confirm `/api/health/ready` returns ready.  
3. Confirm legal footer links return **200** (`/terms` … `/disclaimer`).  
4. Confirm Pricing shows **R99/month** and **R990/year**.  
5. Confirm homepage does **not** claim unverifiable user/listing counts.  
6. Confirm catalogue ≥ 15 listings with images (`/api/properties`).  
7. Spot-check Profile → Export / Delete.  
8. Confirm Contact + Privacy Requests forms return a reference.  
9. Monitor support/privacy audit logs daily.  
10. Replace seed catalogue with licensed feeds per `DATA_PIPELINE_AUDIT.md` / `LAUNCH1_DATA_SOURCES.md`.

## Product surfaces

| Surface | URL |
|---|---|
| Browse | `/` |
| Pricing | `/pricing` (R99 / R990) |
| Auth | `/login`, `/register` |
| Profile / rights | `/profile` |
| Legal | `/terms`, `/privacy`, `/popia`, `/cookies`, `/subscription-policy`, `/refunds`, `/disclaimer` |
| Trust | `/about`, `/faq`, `/contact`, `/privacy-requests`, `/known-issues`, `/release-notes` |

## Pricing (Stripe-aligned)

| Plan | Price |
|---|---|
| Free | R0 |
| Premium Monthly | R99 / month |
| Premium Yearly | R990 / year (save R198 vs 12× monthly) |

## Out of scope

- Heatmaps (coming soon)  
- Full phone support  
- Guaranteed complete national coverage  
- Claiming partner brands without contracts  

## Related docs

- `LAUNCH1_RELEASE.md`, `LAUNCH1_GO_LIVE_REPORT.md`, `LAUNCH1_DATA_SOURCES.md`  
- `USER_GUIDE.md`, `ADMIN_GUIDE.md`, `SUPPORT_GUIDE.md`, `KNOWN_ISSUES.md`
