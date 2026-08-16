/**
 * HEQ 4.4 — SOLD_WITHOUT_PRICE sale-price audit (existing evidence only).
 *
 * Usage:
 *   $env:NODE_OPTIONS='--use-system-ca'
 *   npx --yes tsx --import ./scripts/shims/register-server-only.mjs scripts/historical-evidence-quality44-sold-without-price-audit.ts
 *
 * Modes:
 *   HEQ44_SOLD_PRICE_EXECUTE=1 — persist pricing from existing snapshots + HEQ audit + rebuild
 *   default — dry analysis only (no writes)
 *
 * Does NOT run P1, Legacy, or live fetch.
 */
import { readFileSync, writeFileSync } from "fs";

const OPERATOR = "heq44-sold-without-price-audit";
const OUT_DIAG = "HISTORICAL_EVIDENCE_QUALITY44_SOLD_WITHOUT_PRICE_DIAGNOSTIC.json";
const OUT_AUDIT = "HISTORICAL_EVIDENCE_QUALITY44_SOLD_WITHOUT_PRICE_AUDIT.json";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && !process.env[m[1]!.trim()]) {
      process.env[m[1]!.trim()] = m[2]!.trim().replace(/^["']|["']$/g, "");
    }
  }
}

function snap(report: {
  coverage52?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  bottleneck56?: unknown;
  safety56?: { catalogueLeaks?: number };
}) {
  const c = report.coverage52 ?? {};
  const m = report.metrics ?? {};
  const bottleneck = report.bottleneck56 as { code?: string; count?: number } | null;
  return {
    historicalEvents: c.historicalEvents ?? m.historicalEvents ?? null,
    fetchAttempted: c.fetchAttempted ?? m.fetchAttempted ?? null,
    fetchSuccessful: c.fetchSuccessful ?? m.successfulFetches ?? null,
    fetchFailed: c.fetchFailed ?? m.failedFetches ?? null,
    snapshots: c.snapshots ?? m.snapshots ?? null,
    extractions: c.extractions ?? m.extractionSuccessful ?? null,
    outcomeEvidence: c.outcomeEvidence ?? m.outcomeObservations ?? null,
    outcomeMissing:
      bottleneck?.code === "OUTCOME_MISSING"
        ? bottleneck.count
        : (m.unknownOutcomes ?? null),
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

async function main() {
  loadEnv();
  const execute = process.env.HEQ44_SOLD_PRICE_EXECUTE === "1";

  const { HistoricalIntelligence56Service } = await import(
    "../lib/services/HistoricalIntelligence56Service"
  );
  const { HistoricalEvidenceQuality44Service } = await import(
    "../lib/services/HistoricalEvidenceQuality44Service"
  );
  const { SourceRefetchService } = await import(
    "../lib/services/SourceRefetchService"
  );
  const { SourceSnapshotService } = await import(
    "../lib/acquisition/refetch/sourceSnapshotService"
  );
  const { extractPricingObservations } = await import(
    "../lib/acquisition/pricing/pricingExtractor"
  );
  const { extractOutcomeFromText } = await import(
    "../lib/acquisition/outcomes/outcomeExtractor"
  );
  const { PricingObservationRepository } = await import(
    "../lib/repositories/PricingObservationRepository"
  );
  const { OutcomeIntelligenceRepository } = await import(
    "../lib/repositories/OutcomeIntelligenceRepository"
  );

  console.log("PHASE 1 — Identify SOLD_WITHOUT_PRICE (live DB)");
  const beforeReport = await HistoricalIntelligence56Service.buildReport();
  const before = snap(beforeReport);
  const leaks = before.catalogueLeaks;
  if (typeof leaks === "number" && leaks > 0) {
    writeFileSync(
      OUT_AUDIT,
      JSON.stringify({ verdict: "PRODUCTION BLOCKED", catalogueLeaks: leaks, before }, null, 2),
    );
    console.error("PRODUCTION BLOCKED — catalogueLeaks > 0");
    process.exit(1);
  }

  const events = (beforeReport.events ?? []) as Array<Record<string, unknown>>;
  const soldWithoutPriceRows = events.filter(
    (e) => String(e.salePrice ?? "") === "SOLD_WITHOUT_PRICE",
  );

  if (soldWithoutPriceRows.length !== 5) {
    console.warn(
      `Expected 5 SOLD_WITHOUT_PRICE, found ${soldWithoutPriceRows.length}`,
    );
  }

  const qualityEvents = await HistoricalEvidenceQuality44Service.loadQualityEvents();
  const outcomeObs = await OutcomeIntelligenceRepository.listRecent(5000);
  const pricingObs = await PricingObservationRepository.listRecent(5000);

  const targets = [];
  for (const row of soldWithoutPriceRows) {
    const auctionEventId = row.auctionEventId as string | null;
    const q = qualityEvents.find(
      (e) =>
        e.observation.auctionEventId === auctionEventId ||
        e.observation.observationId === row.observationId,
    );
    if (!q) continue;

    const listingId = q.observation.listingPropertyId;
    const obs =
      outcomeObs.find(
        (o) =>
          (auctionEventId && o.auction_event_id === auctionEventId) ||
          (listingId && o.listing_property_id === listingId),
      ) ?? null;

    const snapshotId =
      (q.quality.fields.find((f) => f.field === "sale_price")?.snapshot as
        | string
        | null) ??
      obs?.source_snapshot_id ??
      null;

    let snapshot = listingId
      ? await SourceSnapshotService.latestForProperty(listingId)
      : null;
    if (snapshotId && listingId) {
      const all = await SourceSnapshotService.listForProperty(listingId, 50);
      snapshot = all.find((s) => s.id === snapshotId) ?? snapshot;
    }

    const text = snapshot?.source_text ?? "";
    const corpus = {
      title: String(q.observation.town ?? row.propertyLabel ?? ""),
      description: null,
      source_url: q.observation.sourceUrl,
      source_name: q.observation.sourceName,
    };

    const pricingDrafts = text.trim()
      ? extractPricingObservations(corpus, text)
      : [];
    const outcomeDraft = text.trim()
      ? extractOutcomeFromText(text, corpus, {
          verificationState: q.observation.verificationState,
          listingStatus: q.observation.state,
        })
      : null;

    const saleCandidates = pricingDrafts.filter((d) => d.field_name === "sale_price");
    const rejectedCandidates = pricingDrafts.filter((d) =>
      ["guide_price", "reserve_price", "auction_price", "starting_bid", "estimated_value"].includes(
        d.field_name,
      ),
    );

    const existingPricing = pricingObs.filter(
      (p) =>
        (listingId && p.property_id === listingId) ||
        (auctionEventId && p.auction_event_id === auctionEventId),
    );

    targets.push({
      propertyLabel: row.propertyLabel,
      town: q.observation.town,
      auctionEventId,
      listingPropertyId: listingId,
      sourceUrl: q.observation.sourceUrl,
      snapshotId: snapshot?.id ?? snapshotId,
      extractionId: null as string | null,
      currentOutcome: obs?.outcome ?? q.resolution.outcome ?? row.outcome,
      previousSalePrice: obs?.sale_price ?? q.resolution.salePrice ?? null,
      outcomeEvidenceText: obs?.evidence_text ?? null,
      candidateSalePrices: saleCandidates.map((d) => ({
        amount: d.normalized_value,
        currency: d.currency,
        evidence: d.evidence_text,
        status: d.status,
        field: d.field_name,
      })),
      rejectedPrices: rejectedCandidates.map((d) => ({
        field: d.field_name,
        amount: d.normalized_value,
        evidence: d.evidence_text,
      })),
      outcomeDraftSalePrice: outcomeDraft?.sale_price ?? null,
      outcomeDraftEvidence: outcomeDraft?.sale_price_evidence ?? null,
      outcomeDraftOutcome: outcomeDraft?.outcome ?? null,
      existingPricing: existingPricing.map((p) => ({
        field: p.field_name,
        amount: p.normalized_value,
        status: p.status,
      })),
      hasSnapshotText: Boolean(text.trim()),
      textLength: text.length,
      heqSalePrice: q.quality.fields.find((f) => f.field === "sale_price") ?? null,
      heqOverall: q.quality.overallQuality,
      resolutionLabel: q.resolution.label,
    });
  }

  writeFileSync(
    OUT_DIAG,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        before,
        soldWithoutPriceCount: soldWithoutPriceRows.length,
        targets,
        productionWritesExecuted: [],
      },
      null,
      2,
    ),
  );

  console.log(
    JSON.stringify(
      {
        count: targets.length,
        before,
        analysis: targets.map((t) => ({
          label: t.propertyLabel,
          event: t.auctionEventId,
          listing: t.listingPropertyId,
          snap: t.snapshotId,
          hasText: t.hasSnapshotText,
          saleCandidates: t.candidateSalePrices.length,
          outcomeSale: t.outcomeDraftSalePrice,
          rejected: t.rejectedPrices.map((r) => r.field),
        })),
      },
      null,
      2,
    ),
  );

  if (!execute) {
    console.log("Dry analysis complete — set HEQ44_SOLD_PRICE_EXECUTE=1 to persist + audit");
    return;
  }

  if (targets.length === 0) {
    writeFileSync(
      OUT_AUDIT,
      JSON.stringify(
        {
          verdict: "NO EVIDENCE GAIN",
          reason: "No SOLD_WITHOUT_PRICE targets found",
          before,
          after: before,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`PHASE 2 — Re-extract pricing from existing snapshots (${targets.length})`);
  const eventReports = [];
  for (const t of targets) {
    let enrichment: {
      ok: boolean;
      status?: string;
      message?: string;
      extractionRunId?: string | null;
      snapshotId?: string | null;
      fieldsFound?: number;
      error?: string;
    } | null = null;

    if (t.listingPropertyId && t.hasSnapshotText) {
      const enriched = await SourceRefetchService.enrichFromSnapshot({
        propertyId: t.listingPropertyId,
        snapshotId: t.snapshotId,
        operator: OPERATOR,
      });
      enrichment = enriched.ok
        ? {
            ok: true,
            status: "COMPLETED",
            message: "Snapshot re-extraction (no live fetch)",
            extractionRunId: enriched.extractionRunId,
            snapshotId: enriched.snapshotId,
            fieldsFound: enriched.fieldsFound,
          }
        : {
            ok: false,
            status: "FAILED",
            message: enriched.error ?? "enrichFromSnapshot failed",
            error: enriched.error,
          };
    } else {
      enrichment = {
        ok: false,
        status: "SKIPPED_NO_SNAPSHOT_TEXT",
        message:
          "No snapshot text available — cannot audit sale price from existing evidence",
      };
    }

    // Re-load pricing after enrichment (existing evidence path only).
    const pricingAfter = t.listingPropertyId
      ? (await PricingObservationRepository.listRecent(5000)).filter(
          (p) => p.property_id === t.listingPropertyId,
        )
      : [];
    const verifiedSale = pricingAfter.find(
      (p) => p.field_name === "sale_price" && p.status === "verified",
    );
    const extractedSale = pricingAfter.find((p) => p.field_name === "sale_price");

    // HEQ audit trail — never approve_evidence without verified sale_price persistence.
    const heqReview = await HistoricalEvidenceQuality44Service.reviewOne({
      eventId: t.auctionEventId ?? t.listingPropertyId ?? "",
      action: verifiedSale ? "approve_evidence" : "mark_insufficient",
      field: "sale_price",
      operator: OPERATOR,
      reason: verifiedSale
        ? `Verified sale_price persisted from existing snapshot evidence: ${verifiedSale.normalized_value}`
        : "No explicit actual sale price in existing snapshot evidence — remain SOLD_WITHOUT_PRICE",
    });

    const candidateAmount =
      verifiedSale?.normalized_value ??
      extractedSale?.normalized_value ??
      t.candidateSalePrices[0]?.amount ??
      t.outcomeDraftSalePrice ??
      null;

    eventReports.push({
      propertyEvent: t.propertyLabel,
      eventId: t.auctionEventId,
      listingPropertyId: t.listingPropertyId,
      source: t.sourceUrl,
      snapshotId: enrichment?.snapshotId ?? t.snapshotId,
      extractionId: enrichment?.extractionRunId ?? null,
      currentOutcome: t.currentOutcome,
      previousSalePrice: t.previousSalePrice,
      candidatePrice: candidateAmount,
      priceType: verifiedSale
        ? "ACTUAL_SALE_PRICE"
        : extractedSale
          ? "SALE_PRICE_EXTRACTED_UNVERIFIED"
          : t.candidateSalePrices[0]
            ? "ACTUAL_SALE_PRICE_CANDIDATE"
            : t.rejectedPrices[0]
              ? String(t.rejectedPrices[0].field).toUpperCase()
              : "NONE",
      explicitSaleEvidence:
        t.candidateSalePrices[0]?.evidence ??
        t.outcomeDraftEvidence ??
        extractedSale?.evidence_text ??
        null,
      provenance: {
        sourceUrl: t.sourceUrl,
        snapshotId: enrichment?.snapshotId ?? t.snapshotId,
        rejectedNonSalePrices: t.rejectedPrices,
        pricingAfter: pricingAfter.map((p) => ({
          field: p.field_name,
          amount: p.normalized_value,
          status: p.status,
        })),
      },
      enrichment,
      heqReview: {
        ok: heqReview.ok,
        oldQuality: heqReview.oldQuality,
        newQuality: heqReview.newQuality,
        message: heqReview.message,
      },
      heqResult: verifiedSale
        ? "VERIFIED_SALE_PRICE"
        : "SOLD_WITHOUT_PRICE",
      verifiedSalePrice: verifiedSale ? verifiedSale.normalized_value : null,
      quality: heqReview.newQuality ?? t.heqOverall,
      nextAction: verifiedSale
        ? "Include in comparable/market readiness if thresholds met"
        : "Remain SOLD_WITHOUT_PRICE — no explicit transaction price in existing evidence",
      analysisCandidates: t.candidateSalePrices,
      rejectedPrices: t.rejectedPrices,
    });
  }

  console.log("PHASE 3 — HEQ 4.4 quality audit + safe rebuild");
  const audit = await HistoricalEvidenceQuality44Service.runQualityAudit(OPERATOR);
  const rebuild = await HistoricalIntelligence56Service.rebuildIntelligence(OPERATOR);

  const afterReport = await HistoricalIntelligence56Service.buildReport();
  const after = snap(afterReport);

  const verifiedDelta =
    Number(after.verifiedSalePrices ?? 0) - Number(before.verifiedSalePrices ?? 0);
  const soldWithoutDelta =
    Number(after.soldWithoutPrice ?? 0) - Number(before.soldWithoutPrice ?? 0);

  const payload = {
    generatedAt: new Date().toISOString(),
    operator: OPERATOR,
    productionWritesExecuted: [
      "enrichFromSnapshot (existing text only)",
      "HEQ 4.4 reviewOne sale_price",
      "HEQ 4.4 runQualityAudit",
      "HI56 rebuildIntelligence (if catalogueLeaks=0)",
    ],
    productionWritesNotExecuted: ["P1 acquisition", "Legacy retry", "live fetch"],
    before,
    after,
    delta: {
      soldWithoutPrice: soldWithoutDelta,
      verifiedSold:
        Number(after.verifiedSold ?? 0) - Number(before.verifiedSold ?? 0),
      verifiedSalePrices: verifiedDelta,
      comparableReady:
        Number(after.comparableReady ?? 0) - Number(before.comparableReady ?? 0),
      marketReadyTowns:
        Number(after.marketReadyTowns ?? 0) - Number(before.marketReadyTowns ?? 0),
    },
    heqEventsProcessed: eventReports.length,
    evidenceGain: verifiedDelta > 0 ? verifiedDelta : 0,
    audit,
    rebuild: {
      ok: rebuild.ok,
      blocked: "blocked" in rebuild ? rebuild.blocked : false,
      rebuildStatus: "rebuildStatus" in rebuild ? rebuild.rebuildStatus : null,
      catalogueLeaks: "catalogueLeaks" in rebuild ? rebuild.catalogueLeaks : after.catalogueLeaks,
    },
    eventReports,
    bottleneck56: afterReport.bottleneck56,
    coverage52: afterReport.coverage52,
  };

  writeFileSync(OUT_AUDIT, JSON.stringify(payload, null, 2));
  console.log(
    JSON.stringify(
      {
        processed: eventReports.length,
        evidenceGain: payload.evidenceGain,
        before,
        after,
        bottleneck: afterReport.bottleneck56,
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
