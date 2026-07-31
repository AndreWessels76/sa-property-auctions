# Known Issues — Public Beta (Launch 1)

Mirrored on `/known-issues`.

| ID | Issue | Impact | Mitigation |
|---|---|---|---|
| KI-1 | Manual multi-word free-text search can miss titles | Low–medium | Use filters or Premium AI Search |
| KI-2 | Heatmaps not available | Low | `/coming-soon` |
| KI-3 | Support/privacy forms require manual ops follow-up | Medium | Daily log/email triage |
| KI-4 | Catalogue is a curated launch seed, not full live national feeds | Medium | Replace via licensed imports (`LAUNCH1_DATA_SOURCES.md`) |
| KI-5 | Gallery photos are Unsplash stock for seed rows | Low–medium | Swap when provider images available |
| KI-6 | In-memory rate limits are per-instance | Low | Acceptable for beta scale |
| KI-7 | Analytics (GA/Sentry/etc.) not wired by default | Low | Optional post-launch |
| KI-8 | `NEXT_PUBLIC_SITE_URL` must be production URL on Vercel for correct canonical/OG | Medium | Set in Vercel env |

Update this file when issues are fixed or newly confirmed.
