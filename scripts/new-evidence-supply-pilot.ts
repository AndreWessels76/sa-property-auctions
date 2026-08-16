/**
 * NEW EVIDENCE SUPPLY PILOT — discover / dry-run / controlled acquire (max 5).
 *
 * Reuses: BiddersChoiceConnector, PropertyAcquisitionEngine, licenseGate,
 * HistoricalEnrichmentService, HistoricalIntelligence56Service.
 *
 * Usage:
 *   $env:NODE_OPTIONS='--use-system-ca'
 *   $env:BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH='true'
 *   npx --yes tsx --import ./scripts/shims/register-server-only.mjs scripts/new-evidence-supply-pilot.ts
 *
 * Modes:
 *   NEW_EVIDENCE_PILOT_EXECUTE=1 — after dry run, acquire ≤5 eligible NEW events
 *   default — dry run only (network discovery/download for ranking; no DB writes)
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";

const OPERATOR = "new-evidence-supply-pilot";
const MAX_ACQUIRE = 5;
const DISCOVER_MAX = 80;
const SCORE_SAMPLE = 60;
const OUT_DRY = "NEW_EVIDENCE_SUPPLY_PILOT_DRYRUN.json";
const OUT_ACQUIRE = "NEW_EVIDENCE_SUPPLY_PILOT_ACQUIRE.json";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && !process.env[m[1]!.trim()]) {
      process.env[m[1]!.trim()] = m[2]!.trim().replace(/^["']|["']$/g, "");
    }
  }
}

function normUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.hostname = u.hostname.replace(/^www\./, "").toLowerCase();
    let path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${u.hostname}${path}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function snapHi56(report: {
  coverage52?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  bottleneck56?: unknown;
  safety56?: { catalogueLeaks?: number };
}) {
  const c = report.coverage52 ?? {};
  const m = report.metrics ?? {};
  const b = report.bottleneck56 as { code?: string; count?: number } | null;
  return {
    historicalEvents: c.historicalEvents ?? m.historicalEvents ?? null,
    fetchAttempted: c.fetchAttempted ?? m.fetchAttempted ?? null,
    fetchSuccessful: c.fetchSuccessful ?? m.successfulFetches ?? null,
    fetchFailed: c.fetchFailed ?? m.failedFetches ?? null,
    snapshots: c.snapshots ?? m.snapshots ?? null,
    extractions: c.extractions ?? m.extractionSuccessful ?? null,
    outcomeEvidence: c.outcomeEvidence ?? m.outcomeObservations ?? null,
    outcomeMissing: b?.code === "OUTCOME_MISSING" ? b.count : m.unknownOutcomes ?? null,
    soldWithoutPrice: c.soldWithoutPrice ?? m.soldWithoutPrice ?? null,
    verifiedSold: c.verifiedSold ?? m.verifiedSold ?? null,
    verifiedSalePrices: c.verifiedSalePrices ?? m.verifiedSalePrices ?? null,
    comparableReady: c.comparableReady ?? m.comparableReady ?? null,
    marketReadyTowns: c.marketReadyTowns ?? m.marketReadyTowns ?? null,
    catalogueLeaks:
      report.safety56?.catalogueLeaks ?? c.catalogueLeaks ?? m.catalogueLeaks ?? null,
    legacyUnknownFailures: c.legacyFailures ?? 0,
    bottleneck56: report.bottleneck56 ?? null,
  };
}

type Eligibility =
  | "ELIGIBLE_NEW_EVIDENCE"
  | "DUPLICATE"
  | "LICENSE_BLOCKED"
  | "SOURCE_UNAVAILABLE"
  | "IDENTITY_AMBIGUOUS"
  | "NO_PRICE_EVIDENCE"
  | "P2_SOLD_WITHOUT_PRICE"
  | "P3_STATUS_ONLY"
  | "P4_CATALOGUE_ONLY";

async function main() {
  loadEnv();
  const execute = process.env.NEW_EVIDENCE_PILOT_EXECUTE === "1";

  const { HistoricalIntelligence56Service } = await import(
    "../lib/services/HistoricalIntelligence56Service"
  );
  const { PartnershipRepository, PartnerLicenceRepository } = await import(
    "../lib/repositories/PartnershipRepository"
  );
  const { classifyBcFetchEligibility } = await import(
    "../lib/acquisition/refetch/licenseGate"
  );
  const { BiddersChoiceConnector } = await import(
    "../lib/connectors/biddersChoice/BiddersChoiceConnector"
  );
  const { extractOutcomeFromText } = await import(
    "../lib/acquisition/outcomes/outcomeExtractor"
  );
  const { extractPricingObservations } = await import(
    "../lib/acquisition/pricing/pricingExtractor"
  );
  const { checkRobotsAllowed } = await import(
    "../lib/connectors/biddersChoice/robots"
  );
  const { createClient } = await import("@supabase/supabase-js");

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const beforeReport = await HistoricalIntelligence56Service.buildReport();
  const before = snapHi56(beforeReport);
  const leaks = before.catalogueLeaks;
  if (typeof leaks === "number" && leaks > 0) {
    writeFileSync(
      OUT_DRY,
      JSON.stringify({ verdict: "PRODUCTION BLOCKED", catalogueLeaks: leaks, before }, null, 2),
    );
    process.exit(1);
  }

  const partner = await PartnershipRepository.getPartnerByCode("bidders_choice");
  const licences = partner?.id
    ? await PartnerLicenceRepository.listByPartner(partner.id)
    : [];
  const livePermission = classifyBcFetchEligibility({
    connectorId: "bidders_choice",
    sourceUrl: "https://bidderschoice.co.za/",
    licence: licences.find((l) => l.status === "active") ?? null,
    envAllowPublicFetch: process.env.BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH === "true",
  });

  const robots = await checkRobotsAllowed("https://www.bidderschoice.co.za", "/");

  console.log("PHASE 1 — Licence + robots");
  console.log(JSON.stringify({ livePermission, robots }, null, 2));

  if (!livePermission.allowed || !robots.allowed) {
    writeFileSync(
      OUT_DRY,
      JSON.stringify(
        {
          verdict: "LICENSE BLOCKED",
          livePermission,
          robots,
          before,
          productionWritesExecuted: [],
        },
        null,
        2,
      ),
    );
    console.error("LICENSE/ROBOTS BLOCKED");
    process.exit(1);
  }

  const { data: existingProps } = await db
    .from("properties")
    .select("id, source_url, title, town, verification_state")
    .not("source_url", "is", null)
    .limit(1000);
  const existingNorm = new Map<string, { id: string; url: string | null }>();
  for (const p of existingProps ?? []) {
    if (p.source_url) existingNorm.set(normUrl(p.source_url), { id: p.id, url: p.source_url });
  }

  const { count: eventCountBefore } = await db
    .from("auction_events")
    .select("*", { count: "exact", head: true });

  console.log("PHASE 2 — Discover BC listing URLs");
  const connector = new BiddersChoiceConnector();
  let discovered = await connector.discover(DISCOVER_MAX);

  // Fallback: existing verified25 index pagination when sitemaps return empty.
  if (discovered.length === 0) {
    console.log("Sitemap empty — falling back to /property-listings/ pagination");
    const found = new Set<string>();
    const bases = [
      "https://www.bidderschoice.co.za",
      "https://bidderschoice.co.za",
    ];
    for (const base of bases) {
      for (let page = 1; page <= 12; page++) {
        const indexUrl =
          page === 1
            ? `${base}/property-listings/`
            : `${base}/property-listings/page/${page}/`;
        try {
          const res = await fetch(indexUrl, {
            headers: {
              "User-Agent":
                "SAPropertyAuctionsBot/1.0 (+https://sa-property-auctions.vercel.app; verified-listings)",
              Accept: "text/html",
            },
            signal: AbortSignal.timeout(25_000),
          });
          if (!res.ok) continue;
          const html = await res.text();
          for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
            try {
              const abs = new URL(m[1]!, indexUrl).toString();
              if (!connector.looksLikeListingUrl(abs)) continue;
              const path = new URL(abs).pathname.toLowerCase();
              if (!path.includes("/property-listings/")) continue;
              if (/\/property-listings\/(page|feed|category|tag)(\/|$)/i.test(path)) {
                continue;
              }
              if (path.endsWith("/property-listings") || path.endsWith("/property-listings/")) {
                continue;
              }
              found.add(abs.split("#")[0]!);
            } catch {
              /* skip bad href */
            }
          }
        } catch {
          /* page fetch soft-fail */
        }
      }
      if (found.size > 0) break;
    }
    const now = new Date().toISOString();
    discovered = [...found].slice(0, DISCOVER_MAX).map((sourceUrl) => ({
      sourceUrl,
      discoveredAt: now,
    }));
  }

  const newUrls = discovered
    .map((c) => c.sourceUrl)
    .filter((u) => !existingNorm.has(normUrl(u)));

  console.log(
    JSON.stringify(
      { discovered: discovered.length, alreadyInDb: discovered.length - newUrls.length, newUrls: newUrls.length },
      null,
      2,
    ),
  );

  console.log(`PHASE 3 — Score up to ${SCORE_SAMPLE} NEW URLs (download only, no DB write)`);
  const scored = [];
  for (const url of newUrls.slice(0, SCORE_SAMPLE)) {
    const { html, broken } = await connector.downloadListing(url);
    if (broken || !html) {
      scored.push({
        url,
        eligibility: "SOURCE_UNAVAILABLE" as Eligibility,
        priority: 4,
        httpOk: false,
        newEvent: true,
        existingEvidence: false,
        expectedEvidenceType: null,
        expectedPriceAvailability: false,
        blockReason: "Download failed / broken page",
        contentHash: null,
        outcome: null,
        salePrice: null,
        rejectedPrices: [] as Array<{ field: string; amount: number | null }>,
        soldLanguage: false,
        title: null,
      });
      continue;
    }

    const text = htmlToText(html);
    const contentHash = sha256(text);
    const extracted = connector.extract(html, url);
    const corpus = {
      title: extracted.title ?? "",
      description: extracted.description ?? null,
      source_url: url,
      source_name: "Bidders Choice",
    };
    const outcomeDraft = extractOutcomeFromText(text, corpus, {
      verificationState: null,
      listingStatus: extracted.listingStatus ?? null,
    });
    const pricingDrafts = extractPricingObservations(corpus, text);
    const saleCandidates = pricingDrafts.filter((d) => d.field_name === "sale_price");
    const rejected = pricingDrafts
      .filter((d) =>
        ["guide_price", "reserve_price", "auction_price", "starting_bid", "estimated_value"].includes(
          d.field_name,
        ),
      )
      .map((d) => ({ field: d.field_name, amount: d.normalized_value }));

    const soldLanguage =
      outcomeDraft?.outcome === "SOLD" ||
      /\bSOLD\b/i.test(text) ||
      /\bsold\s+for\b/i.test(text);
    const hasPrice = saleCandidates.length > 0 || outcomeDraft?.sale_price != null;

    let eligibility: Eligibility;
    let priority: number;
    let expectedEvidenceType: string | null;
    let blockReason: string | null = null;

    if (hasPrice && soldLanguage) {
      eligibility = "ELIGIBLE_NEW_EVIDENCE";
      priority = 1;
      expectedEvidenceType = "P1_SOLD_WITH_PRICE";
    } else if (soldLanguage && outcomeDraft?.outcome === "SOLD") {
      eligibility = "P2_SOLD_WITHOUT_PRICE";
      priority = 2;
      expectedEvidenceType = "P2_SOLD_WITHOUT_PRICE";
      blockReason = "SOLD language present but no explicit transaction price";
    } else if (soldLanguage || outcomeDraft?.outcome) {
      eligibility = "P3_STATUS_ONLY";
      priority = 3;
      expectedEvidenceType = "P3_OUTCOME_STATUS";
      blockReason = "Weak/ambiguous outcome signals; no verified sale price";
    } else {
      eligibility = "P4_CATALOGUE_ONLY";
      priority = 4;
      expectedEvidenceType = "P4_LISTING";
      blockReason = "Catalogue/listing only — no outcome evidence";
    }

    scored.push({
      url,
      eligibility,
      priority,
      httpOk: true,
      newEvent: true,
      existingEvidence: false,
      expectedEvidenceType,
      expectedPriceAvailability: hasPrice,
      blockReason,
      contentHash,
      outcome: outcomeDraft?.outcome ?? null,
      salePrice: saleCandidates[0]?.normalized_value ?? outcomeDraft?.sale_price ?? null,
      saleEvidence:
        saleCandidates[0]?.evidence_text ?? outcomeDraft?.sale_price_evidence ?? null,
      rejectedPrices: rejected,
      soldLanguage,
      title: extracted.title ?? null,
      town: extracted.town ?? null,
      auctionDate: extracted.auctionDate ?? null,
    });
  }

  scored.sort((a, b) => a.priority - b.priority || (b.salePrice ? 1 : 0) - (a.salePrice ? 1 : 0));

  const eligibleAcquire = scored
    .filter(
      (s) =>
        s.eligibility === "ELIGIBLE_NEW_EVIDENCE" ||
        s.eligibility === "P2_SOLD_WITHOUT_PRICE",
    )
    .slice(0, MAX_ACQUIRE);

  const dryPayload = {
    generatedAt: new Date().toISOString(),
    operator: OPERATOR,
    productionWritesExecuted: [] as string[],
    livePermission,
    robots,
    before,
    auctionEventsBefore: eventCountBefore,
    discovery: {
      discovered: discovered.length,
      newUrls: newUrls.length,
      scored: scored.length,
    },
    candidates: scored,
    selectedForAcquire: eligibleAcquire,
    note:
      "Dry run downloaded pages for ranking only. Production writes require NEW_EVIDENCE_PILOT_EXECUTE=1.",
  };
  writeFileSync(OUT_DRY, JSON.stringify(dryPayload, null, 2));
  console.log(
    JSON.stringify(
      {
        scored: scored.length,
        p1: scored.filter((s) => s.priority === 1).length,
        p2: scored.filter((s) => s.priority === 2).length,
        p3: scored.filter((s) => s.priority === 3).length,
        p4: scored.filter((s) => s.priority === 4).length,
        selected: eligibleAcquire.map((s) => ({
          url: s.url,
          eligibility: s.eligibility,
          outcome: s.outcome,
          salePrice: s.salePrice,
        })),
      },
      null,
      2,
    ),
  );

  if (!execute) {
    console.log("Dry run complete — set NEW_EVIDENCE_PILOT_EXECUTE=1 to acquire ≤5");
    return;
  }

  if (eligibleAcquire.length === 0) {
    writeFileSync(
      OUT_ACQUIRE,
      JSON.stringify(
        {
          verdict: "NO EVIDENCE GAIN",
          reason: "No P1/P2 eligible NEW candidates with outcome evidence",
          before,
          after: before,
          dryRun: dryPayload,
          productionWritesExecuted: [],
        },
        null,
        2,
      ),
    );
    console.log("No eligible candidates — stop");
    return;
  }

  console.log(`PHASE 4 — Acquire ${eligibleAcquire.length} NEW events (max ${MAX_ACQUIRE})`);
  const { PropertyAcquisitionEngine } = await import(
    "../lib/acquisition/PropertyAcquisitionEngine"
  );
  const { HistoricalEnrichmentService } = await import(
    "../lib/services/HistoricalEnrichmentService"
  );

  const engine = new PropertyAcquisitionEngine();
  const acquireResult = await engine.run({
    listingUrls: eligibleAcquire.map((c) => c.url),
    allowPublicFetch: true,
    maxListings: MAX_ACQUIRE,
    jobId: `pilot_${Date.now().toString(36)}`,
  });

  // Enrich newly imported properties that match our URLs (outcome/price from page text).
  const { data: afterProps } = await db
    .from("properties")
    .select("id, source_url, title, town, verification_state, listing_status")
    .in(
      "source_url",
      eligibleAcquire.flatMap((c) => {
        const n = normUrl(c.url);
        return [c.url, c.url.replace("://www.", "://"), c.url.replace("://", "://www.")];
      }),
    )
    .limit(20);

  const eventReports = [];
  for (const cand of eligibleAcquire) {
    const prop =
      (afterProps ?? []).find((p) => p.source_url && normUrl(p.source_url) === normUrl(cand.url)) ??
      null;
    let enrichment: Record<string, unknown> | null = null;
    if (prop?.id) {
      const enr = await HistoricalEnrichmentService.enrichProperty({
        propertyId: prop.id,
        operator: OPERATOR,
        force: true,
      });
      enrichment = {
        ok: enr.ok,
        status: enr.status,
        outcome: enr.outcome,
        salePrice: enr.salePrice,
        message: enr.message,
      };
    }
    eventReports.push({
      propertyEvent: cand.title ?? cand.town,
      eventId: null,
      propertyId: prop?.id ?? null,
      source: "Bidders Choice",
      sourceUrl: cand.url,
      licenceState: livePermission.state,
      newEvidence: Boolean(prop?.id),
      duplicate: false,
      fetchState: enrichment?.status ?? acquireResult.errors?.[0] ?? "imported_or_pending",
      httpStatus: cand.httpOk ? 200 : null,
      snapshotId: null,
      contentHash: cand.contentHash,
      extraction: prop ? "ACQUIRED" : "NOT_PERSISTED",
      outcome: enrichment?.outcome ?? cand.outcome,
      salePrice: enrichment?.salePrice ?? cand.salePrice,
      priceType: cand.salePrice != null ? "ACTUAL_SALE_PRICE_CANDIDATE" : "NONE",
      provenance: {
        sourceUrl: cand.url,
        contentHash: cand.contentHash,
        saleEvidence: cand.saleEvidence ?? null,
      },
      heqResult: null,
      resolution: enrichment?.outcome ?? cand.eligibility,
      evidenceQuality: null,
      nextAction:
        enrichment?.salePrice != null
          ? "Quality audit / dossier review"
          : enrichment?.outcome === "SOLD"
            ? "Remain SOLD_WITHOUT_PRICE until explicit price appears"
            : "Review import / verification queue",
      dryRank: cand,
      enrichment,
    });
  }

  // Safe rebuild if catalogue leaks = 0
  const rebuild = await HistoricalIntelligence56Service.rebuildIntelligence(OPERATOR);
  const afterReport = await HistoricalIntelligence56Service.buildReport();
  const after = snapHi56(afterReport);
  const { count: eventCountAfter } = await db
    .from("auction_events")
    .select("*", { count: "exact", head: true });

  const newVerifiedPrices =
    Number(after.verifiedSalePrices ?? 0) - Number(before.verifiedSalePrices ?? 0);
  const newVerifiedSold =
    Number(after.verifiedSold ?? 0) - Number(before.verifiedSold ?? 0);
  const newOutcomes =
    Number(String(after.outcomeEvidence).split("/")[0] ?? 0) -
    Number(String(before.outcomeEvidence).split("/")[0] ?? 0);

  let verdict = "NO EVIDENCE GAIN";
  if (newVerifiedPrices > 0) verdict = "VERIFIED PRICE GAIN";
  else if (newVerifiedSold > 0 || newOutcomes > 0 || eventReports.some((e) => e.newEvidence))
    verdict = "EVIDENCE GAIN";
  if (
    (newVerifiedPrices > 0 || newOutcomes > 0) &&
    Number(after.verifiedSalePrices ?? 0) < 5
  ) {
    verdict = "INSUFFICIENT DATA — ENGINE READY";
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    operator: OPERATOR,
    verdict,
    productionWritesExecuted: [
      "PropertyAcquisitionEngine.run (≤5 NEW listing URLs)",
      "HistoricalEnrichmentService.enrichProperty (force, existing path)",
      "HI56 rebuildIntelligence (catalogueLeaks=0)",
    ],
    productionWritesNotExecuted: ["P1 historical", "Legacy retry", "HEQ sale-price loop"],
    before,
    after,
    auctionEventsBefore: eventCountBefore,
    auctionEventsAfter: eventCountAfter,
    acquireResult: {
      imported: acquireResult.imported,
      updated: acquireResult.updated,
      rejected: acquireResult.rejected,
      duplicates: acquireResult.duplicates,
      errors: acquireResult.errors,
    },
    selected: eligibleAcquire,
    eventReports,
    rebuild: {
      ok: rebuild.ok,
      blocked: "blocked" in rebuild ? rebuild.blocked : false,
      catalogueLeaks:
        "catalogueLeaks" in rebuild ? rebuild.catalogueLeaks : after.catalogueLeaks,
    },
    funnel: {
      sourcesDiscovered: discovered.length,
      eligibleNewUrls: newUrls.length,
      scored: scored.length,
      p1: scored.filter((s) => s.priority === 1).length,
      p2: scored.filter((s) => s.priority === 2).length,
      acquired: eligibleAcquire.length,
      imported: acquireResult.imported,
      newOutcomes,
      newVerifiedSold,
      newVerifiedSalePrices: newVerifiedPrices,
      comparableReady: after.comparableReady,
      marketReadyTowns: after.marketReadyTowns,
    },
    commercialSignal: {
      canProduceSalePriceEvidence: scored.some((s) => s.priority === 1) ? "YES" : "NO",
      canProduceRepeatedly: scored.filter((s) => s.priority === 1).length >= 2 ? "YES" : "UNKNOWN",
      partnerAccessRequired:
        scored.some((s) => s.priority === 1)
          ? "NO"
          : "YES — listing pages lack explicit transaction prices; partner result feed likely required",
    },
  };

  writeFileSync(OUT_ACQUIRE, JSON.stringify(payload, null, 2));
  console.log(
    JSON.stringify(
      {
        verdict,
        acquired: eligibleAcquire.length,
        imported: acquireResult.imported,
        before,
        after,
        funnel: payload.funnel,
        commercialSignal: payload.commercialSignal,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
