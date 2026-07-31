# RC7 — Version 1.0 Product Readiness Review

**Date:** 31 July 2026  
**Environment reviewed:** Production — https://sa-property-auctions.vercel.app  
**Review type:** Customer / investor / business (no code changes)  
**Health:** `/api/health/ready` → `ready` (env, database, stripe OK)  
**Live inventory at review:** **2** properties (Pretoria only)

---

## Executive Summary

SA Property Auctions is a **credible technical SaaS shell** with working auth, Stripe paths, AI Search (premium), search/filter UX, and a polished navy/gold landing narrative. As a **commercial product that must attract, convert, and retain paying users**, production is **not yet convincing**.

Three blockers dominate the customer experience today:

1. **Catalog reality gap** — Marketing claims “10,000+ properties” and “Trusted by 12,000+”, while the live API returns **2 listings**, both Pretoria, **no images**, one with **0 bedrooms**.  
2. **Legal / trust pack not live** — RC6 pages (`/terms`, `/privacy`, `/about`, `/faq`, `/contact`, etc.) return **404** on production (present only in the unpushed local workspace). Paying users cannot read Terms, Privacy, or Refunds on the live site.  
3. **Monetisation opacity** — Pricing shows “Choose Monthly/Yearly” with **no displayed ZAR amounts**, so perceived value and conversion are weakened before Stripe Checkout.

Engineering maturity (RC5–RC6) is ahead of **go-to-market maturity**. The product is suitable for a **controlled, limited public beta** with honest inventory messaging and a deployed legal pack — not for broad paid acquisition or “commercial launch” claims yet.

### Verdict

# READY FOR LIMITED PUBLIC BETA

**Overall score: 62 / 100**

| Lens | Score | Note |
|---|---|---|
| Customer experience | 58 | Journey works; trust & inventory undermine it |
| Business readiness | 55 | Ops docs local; live legal/support incomplete |
| Brand readiness | 64 | Professional look; inflated proof & thin logo |
| Marketing readiness | 48 | Not ad-ready until claims match data |
| Legal readiness (prod) | 35 | RC6 built locally; **404 on production** |
| Operational readiness | 72 | Health/Stripe/auth OK; data ops early |
| Revenue potential | 70 | Clear AI upsell; pricing UI weak |
| Competitive position | 60 | Niche vs portals; execution gap vs promise |

---

## Phase 1 — First Impression

**Score: 6.5 / 10**

| Dimension | Assessment | Evidence |
|---|---|---|
| Landing | Strong hero, search, featured strip | Live `/` |
| Logo | Icon + wordmark (Gavel); no distinctive logo asset | Header/Footer |
| Brand identity | Navy / gold, property-auction vibe | `globals.css` |
| Professional appearance | Generally yes above the fold | Live HTML |
| Colour consistency | Good | Navy/gold system |
| Typography | Inter — competent but generic SaaS | `app/layout.tsx` |
| Visual hierarchy | Clear H1 → search → featured | Hero |
| Trust indicators | Present but **overstated** vs live data | “12,000+”, “10,000+”, partner names |
| Speed | Acceptable on review | Home ~200, health ready |
| Would a first-time visitor trust this? | **Mixed** — looks serious until they see 2 listings, empty images, map “coming soon”, and missing legal pages | Live `/`, API `total=2` |

**Would they trust it?** A sophisticated investor will notice the inventory/social-proof mismatch within one scroll. A casual visitor may trust the hero, then bounce on empty gallery cards.

---

## Phase 2 — Customer Journey

Reviewed against production + product code paths. Premium AI path assumed available when subscribed.

| Step | Score /10 | Findings |
|---|---|---|
| Landing | 7 | Clear promise; dual CTAs both go to `#featured` (no differentiation) |
| Register | 7 | Standard form; Terms checkbox links policies **locally**, but live `/terms`/`/privacy` **404** → broken compliance UX if RC6 not deployed |
| Email verification | 6 | Required (confirm-email flow); friction is normal; no welcome nurture beyond verify |
| Login | 7 | Standard; forgot password present |
| Browse properties | 4 | Only 2 cards; no images; countdown shows **0d 0h 0m** for past auction dates |
| Search (manual) | 6 | Filters work; multi-word free-text weak (known); free users get keyword only |
| AI Search | 7 | Premium-gated; post-RC5.2.2 composition fix is sound; value depends on catalog depth |
| Property detail | 6 | Good layout (value vs auction, saving %); gated AI analytics; thin content/images in live data |
| Upgrade to Premium | 5 | Upgrade CTA copy exists; pricing page lacks amounts |
| Stripe Checkout | 7 | Infra ready (`stripe: ok`); conversion hurt by opaque pricing page |
| Premium dashboard | 5 | Status badges + saved searches — **not** a distinct “premium home” |
| Billing portal | 7 | Profile → Manage subscription path exists |
| Logout | 8 | Standard header logout |

**Friction / UX gaps**

- No progressive onboarding (“Here’s how auctions work on this site”).  
- Hero CTAs redundant.  
- Stats and partner strip set expectations the catalog cannot meet.  
- Map section is an explicit placeholder.  
- Favourites are device-local (`localStorage`) — sync surprise for multi-device users.  
- Alerts marketed as “real-time”; customer-facing alert inbox maturity is limited vs marketing.

---

## Phase 3 — Value Proposition

| Question | Verdict | Evidence |
|---|---|---|
| What does it do? | **Mostly clear** | Hero: sheriff/bank/public auctions, alerts, below-market deals |
| Who is it for? | **Implied** (investors, buyers, agents via testimonials) — not sharp ICP on home | Testimonials copy |
| Why different? | **Claimed** (AI + aggregation + intelligence) — **not proven** at scale in prod | Why Choose + 2 listings |
| Why pay? | **AI + unlimited** — weakly packaged on Pricing (no price, thin Free vs Premium matrix) | `/pricing`, `plans.ts` |

**Home / Pricing / FAQ / About / CTAs**

- Home sells a national intelligence platform.  
- Pricing sells “unlimited searches, alerts, AI insights” without Free comparison table or ZAR.  
- FAQ / About / Contact exist in codebase (RC6) but **404 in production** — value education missing live.  
- Subscription messaging is feature-list light; Free limits (25 properties / 3 alerts / 5 saved searches) are not surfaced clearly on Pricing.

---

## Phase 4 — Pricing Strategy

| Element | Assessment |
|---|---|
| Free plan | Exists in code with caps; not clearly sold as a funnel on Pricing |
| Premium monthly/yearly | Checkout buttons only |
| Pricing page | **No visible prices** — critical conversion defect |
| Upgrade prompts | Present on AI path for free users |
| Perceived value | Hard to judge without R amount + deep inventory |

**Recommendation**

| Question | Answer |
|---|---|
| Current pricing | **Unknown to the customer** until Stripe Checkout (must publish R amounts + what Free includes) |
| Too high / too low | Cannot certify without listed prices; AI search for serious investors can support mid-market SaaS pricing **once catalog is real** |
| Missing features on page | Free vs Premium comparison, FAQ link, example AI queries, guarantee/cancel clarity |
| Upsell opportunities | AI packs, alerts SMS, investor seats, featured listing boosts (see Phase 11) |

---

## Phase 5 — AI Experience

| Dimension | Score | Notes |
|---|---|---|
| AI Search | 7 | Structured-filter approach is the right product mechanic after RC5.2.2 |
| Wording | 6 | Upgrade CTA clear; limited in-product explanation of what AI did |
| Usefulness | 5→8 | Useful **when listings exist**; with 2 properties, “wow” is limited |
| Search quality | 7 | Depends on extraction + DB; hotfix removed NL+filter AND bug |
| Speed | 6–7 | Acceptable for LLM round-trip; not measured under load here |
| Trustworthiness | 5 | Disclaimers exist in legal draft; live disclaimer page 404; AI can invent filters historically |

**Would users perceive genuine value?**  
**Yes for Premium**, if inventory is dense and AI explains applied filters. **No at current production catalog size** — AI cannot create a market that is not ingested.

---

## Phase 6 — Property Experience

| Area | Score | Evidence |
|---|---|---|
| Cards | 7 design / 3 data | Strong card UI; live cards lack images; one 0-bed |
| Images / gallery | 3 | Live `image=false` for both rows |
| Descriptions | 4 | Sparse live content |
| Detail page | 7 structure | Value vs price, saving, gated analytics |
| Auction info | 5 | Dates/status present; countdown expired → zeros |
| Filters / sorting | 7 | Province, type, price bands, sort options |
| Saved searches | 7 | API-backed save flow |
| Daily investor use? | **Not yet** | Needs volume, freshness, photos, reliable beds/baths, source links |

---

## Phase 7 — Mobile Experience

| Area | Assessment |
|---|---|
| Android / iPhone / Tablet | Responsive shell present; not device-lab tested in this review |
| Navigation | Hamburger ≤ lg; core links available |
| Cards / forms | Stacked layouts should work; dense admin is desktop-first |
| Checkout | Stripe-hosted — generally fine on mobile |
| Dashboard | Simple — OK on phone |
| Touch | Adequate; watch small filter controls |

**Recommended improvements (document only)**

1. Thumb-friendly filter sheet on mobile.  
2. Sticky “Upgrade” after first AI denial.  
3. Larger tap targets on favourite hearts.  
4. Compress hero on short viewports (stats compete with CTA).  
5. Formal QA matrix on real iOS/Android before paid ads.

---

## Phase 8 — Business Readiness

| Area | Prod status | Notes |
|---|---|---|
| Customer support | Weak live | Email copy; Contact page **404**; forms unpushed |
| Documentation | Strong locally | USER/ADMIN/SUPPORT/PUBLIC_BETA guides (RC6) — not customer-visible until deploy |
| Legal pages | **Fail live** | All reviewed legal URLs **404** |
| Privacy / POPIA / Terms / Refunds | Drafted in RC6; **not serving** | Deploy is prerequisite |
| Brand trust | At risk | Inflated stats + partner names + thin catalog |
| Operational maturity | Mid | Health OK; import pipeline exists; coverage early |

---

## Phase 9 — Growth Readiness

| Area | Score | Notes |
|---|---|---|
| SEO basics | 6 | Metadata + robots; sitemap incomplete vs RC6 routes until deploy; **no property URLs** |
| Referral | 3 | No referral program / share cards observed |
| Marketing readiness | 4 | Cannot run performance ads while “10,000+” ≠ 2 listings |
| Organic growth | 4 | Thin indexable inventory |
| Paid ads readiness | **Not ready** | Claim risk + landing→empty funnel |
| Social sharing | 3 | Basic OG; no listing share optimization verified |
| Google indexing | Unknown | Search Console not confirmed; verify after legal deploy |
| Email onboarding | 3 | Verify only; no nurture / activation series |
| Scalability | 7 tech / 4 data | App scales; **data partnerships** are the bottleneck |
| Africa expansion | Premature | Nail SA coverage + compliance first |

---

## Phase 10 — Competitive Review

| Competitor type | Position vs SA Property Auctions |
|---|---|
| Property24 / Private Property | Massive inventory, brand trust, consumer habit — you **do not** win on breadth today |
| MyRoof / general portals | Similar trust gap; auction niche is your wedge |
| Auction-specific platforms | Compete on **freshness, sheriff/bank coverage, alerts, AI triage** |

**Strengths**

- Focused auction ICP narrative  
- AI search as differentiator vs classifieds  
- Modern SaaS stack (auth, Stripe, admin imports)  
- Saving % / estimated value framing on cards  

**Weaknesses**

- Inventory depth and media  
- Trust claim accuracy  
- Legal pack not live  
- Pricing transparency  
- No durable brand mark beyond icon+text  

**USPs (potential)**

1. NL → structured auction search  
2. Cross-source aggregation (sheriff / bank / auctioneer) when feeds are real  
3. Investor workflow (alerts, saved searches, savings intelligence)  

**Market opportunity**

Underserved “auction intelligence” layer on top of fragmented SA notices — **if** data rights and freshness are solved.

---

## Phase 11 — Revenue Opportunities

Prioritised commercially (not for immediate build in RC7):

1. **Transparent Premium pricing** + annual discount callout  
2. **Investor tier** (team seats, more alerts, export CSV)  
3. **Agency / buyer's agent seats**  
4. **Bank / sheriff / auctioneer data partnerships** (rev-share or licensed feeds)  
5. **Featured listings** for auctioneers  
6. **Sponsored placements** (carefully disclosed)  
7. **Data API / research subscriptions** for funds  
8. **SMS/WhatsApp alert add-on**  
9. **Province packs** (pay for deep coverage areas)  
10. **Enterprise white-label** monitoring for institutions  

---

## Critical production defects (confirmed — no code changed in RC7)

These are **product-blocking** for broad public paid launch; implementation is out of scope here but must be prioritised:

| ID | Defect | Evidence |
|---|---|---|
| C1 | Legal/trust pages **404** on production | `/terms`, `/privacy`, `/about`, `/faq`, `/contact`, … → 404; RC6 uncommitted/unpushed |
| C2 | Marketing inventory claims vs reality | Stats 10,000+ / trust 12,000+ vs API `total=2` |
| C3 | Pricing page has **no ZAR amounts** | Live `/pricing` |
| C4 | Listings lack images; incomplete attributes | `image=false`; Family Home `beds=0` |
| C5 | Expired auction countdown shows zeros | Live cards “0d0h0m” |

---

## Top 20 Recommendations

*(Impact × urgency; implement in later sprints — not RC7)*

1. **Deploy RC6** (legal, POPIA, contact, footer, export/delete) to production immediately.  
2. **Align all homepage numbers** with live `total` or remove inflated counters.  
3. **Publish monthly/yearly ZAR prices** on `/pricing` + Free vs Premium table.  
4. **Onboard real feeds** until ≥ hundreds of fresh, imaged listings.  
5. Require images (or honest placeholders) before “Featured”.  
6. Fix data quality gates (beds/baths, status casing already improved).  
7. Soften/remove partner claims without contracts.  
8. Differentiate hero CTAs (e.g. Browse vs How it works / Pricing).  
9. Surface Free limits before checkout.  
10. Build a minimal premium home (AI tips, alert summary).  
11. Explain AI filters applied (“We searched Pretoria · House · 4+ beds”).  
12. Activation email after verify (3 tips + sample search).  
13. Property URLs in sitemap once public.  
14. Formal mobile QA pass.  
15. Counsel review of legal pack post-deploy.  
16. Replace Inter with a more distinctive brand type pairing (design sprint).  
17. Real logo / brand kit.  
18. Referral or “share listing” for organic.  
19. Search Console + privacy-friendly analytics.  
20. Auction date UX: “Auction passed” instead of zero countdown.

---

## Top 10 Quick Wins

| # | Win | Effort | Impact |
|---|---|---|---|
| 1 | Commit + push RC6 → Vercel | Low | Critical trust |
| 2 | Show R prices on Pricing | Low | Conversion |
| 3 | Replace 10k/12k claims with honest copy | Low | Trust |
| 4 | Hide or fix 0-bed / imageless cards | Low–Med | Quality |
| 5 | Free vs Premium comparison blurb | Low | Clarity |
| 6 | “Auction ended” badge | Low | Polish |
| 7 | Link Pricing from upgrade CTA with amount teaser | Low | Conversion |
| 8 | Footer: remove fake phone row / use email only | Low | Honesty |
| 9 | Add 1 How-it-works paragraph on home | Low | Education |
| 10 | Seed 20–50 real CSV listings with photos | Med | Perceived value |

---

## Top 10 Future Features

1. Multi-source live ingestion SLA dashboard  
2. Alert inbox + WhatsApp/SMS  
3. Portfolio / bid tracking notebook  
4. Comparable sales deepening  
5. Agency multi-seat billing  
6. Auctioneer self-serve listing portal  
7. Saved-search email digests  
8. Heatmaps (when data density allows)  
9. Chrome extension “watch this erf”  
10. Cross-border (Africa) only after SA PMF  

---

## Scoring breakdown (100)

| Category | Weight | Score | Weighted |
|---|---|---|---|
| First impression & brand | 10 | 65 | 6.5 |
| End-to-end journey | 15 | 62 | 9.3 |
| Value proposition clarity | 10 | 60 | 6.0 |
| Pricing & conversion | 10 | 45 | 4.5 |
| AI product value | 10 | 60 | 6.0 |
| Property / catalog experience | 15 | 40 | 6.0 |
| Mobile | 5 | 65 | 3.3 |
| Legal & trust (production) | 10 | 35 | 3.5 |
| Ops / support / growth | 10 | 55 | 5.5 |
| Competitive / revenue outlook | 5 | 70 | 3.5 |
| **Total** | **100** | | **≈ 62** |

---

## Certification choice

Choose exactly one:

- NOT READY  
- **READY FOR LIMITED PUBLIC BETA** ← selected  
- READY FOR PUBLIC BETA  
- READY FOR COMMERCIAL LAUNCH  
- READY FOR SCALE  

### Why not “READY FOR PUBLIC BETA”?

RC6 engineering concluded public-beta readiness **in-repo**, but **production does not yet serve** the legal/trust surfaces, and the **live catalog cannot support** the marketed national platform story. Limited beta = invited users / soft launch / honest “early access” positioning while inventory and legal deploy catch up.

### Why not “COMMERCIAL LAUNCH” / “SCALE”?

Paid ads, partner logos, and subscription growth require accurate claims, live policies, priced plans, and daily-usable inventory. Those are not production-true today.

---

## Evidence appendix (production checks)

| Check | Result |
|---|---|
| `/` | 200 |
| `/pricing` | 200 — no ZAR amounts in UI |
| `/login`, `/register` | 200 |
| `/about`, `/faq`, `/terms`, `/privacy`, `/contact`, `/known-issues`, … | **404** |
| `/api/health/ready` | `ready` |
| `/api/properties` | `total=2` (Pretoria); images absent; one 0-bed |
| RC6 workspace | Present locally; **not on `origin/main`** at review time |

---

## Next prioritisation (for a future implementation sprint)

1. **P0:** Deploy RC6 + publish prices + honest homepage metrics.  
2. **P0:** Real data + images (trusted CSV/partners).  
3. **P1:** Free/Premium matrix + AI explainability.  
4. **P1:** Activation email + support inbox process live.  
5. **P2:** Brand polish, SEO property pages, growth loops.

---

**RC7 complete — review only. No application code was modified.**
