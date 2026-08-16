/**
 * HEQ 4.4 — diagnostic: identify exact SOLD_WITHOUT_PRICE events (read-only).
 */
import { readFileSync, writeFileSync } from "fs";

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
  return {
    historicalEvents: c.historicalEvents ?? m.historicalEvents ?? null,
    fetchAttempted: c.fetchAttempted ?? m.fetchAttempted ?? null,
    fetchSuccessful: c.fetchSuccessful ?? m.successfulFetches ?? null,
    fetchFailed: c.fetchFailed ?? m.failedFetches ?? null,
    snapshots: c.snapshots ?? m.snapshots ?? null,
    extractions: c.extractions ?? m.extractionSuccessful ?? null,
    outcomeEvidence: c.outcomeEvidence ?? m.outcomeObservations ?? null,
    outcomeMissing: m.unknownOutcomes ?? null,
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
  const { HistoricalIntelligence56Service } = await import(
    "../lib/services/HistoricalIntelligence56Service"
  );
  const { HistoricalEvidenceQuality44Service } = await import(
    "../lib/services/HistoricalEvidenceQuality44Service"
  );
  const { OutcomeIntelligenceRepository } = await import(
    "../lib/repositories/OutcomeIntelligenceRepository"
  );
  const { PricingObservationRepository } = await import(
    "../lib/repositories/PricingObservationRepository"
  );
  const { SourceSnapshotService } = await import(
    "../lib/acquisition/refetch/sourceSnapshotService"
  );

  const beforeReport = await HistoricalIntelligence56Service.buildReport();
  const before = snap(beforeReport);
  const events = (beforeReport.events ?? []) as Array<Record<string, unknown>>;

  const soldWithoutPrice = events.filter((e) => {
    const sale = String(e.salePrice ?? "");
    const outcome = String(e.outcome ?? "");
    return (
      sale === "SOLD_WITHOUT_PRICE" ||
      (outcome === "SOLD" && sale !== "VERIFIED")
    );
  });

  const outcomeObs = await OutcomeIntelligenceRepository.listRecent(5000);
  const pricingObs = await PricingObservationRepository.listRecent(5000);
  const qualityEvents = await HistoricalEvidenceQuality44Service.loadQualityEvents();

  const targets = [];
  for (const e of soldWithoutPrice) {
    const listingId = e.listingPropertyId as string | null | undefined;
    const auctionEventId = e.auctionEventId as string | null | undefined;
    const obs =
      outcomeObs.find(
        (o) =>
          (auctionEventId && o.auction_event_id === auctionEventId) ||
          (listingId && o.listing_property_id === listingId),
      ) ?? null;
    const pricing = pricingObs.filter(
      (p) =>
        (listingId && p.property_id === listingId) ||
        (auctionEventId && p.auction_event_id === auctionEventId),
    );
    const snapRow = listingId
      ? await SourceSnapshotService.latestForProperty(listingId)
      : null;
    const q = qualityEvents.find(
      (qe) =>
        qe.observation.auctionEventId === auctionEventId ||
        qe.observation.listingPropertyId === listingId,
    );

    targets.push({
      observationId: e.observationId,
      auctionEventId,
      listingPropertyId: listingId,
      propertyLabel: e.propertyLabel,
      town: e.town,
      sourceUrl: e.sourceUrl,
      outcome: e.outcome,
      salePrice: e.salePrice,
      resolution: e.resolution,
      evidenceState: e.evidenceState,
      outcomeObservation: obs
        ? {
            id: obs.id,
            outcome: obs.outcome,
            sale_price: obs.sale_price,
            evidence_text: obs.evidence_text,
            source_snapshot_id: obs.source_snapshot_id,
            confidence: obs.confidence,
            created_at: obs.created_at,
          }
        : null,
      pricingObservations: pricing.map((p) => ({
        id: p.id,
        field_name: p.field_name,
        amount: p.normalized_value,
        status: p.status,
        evidence_text: p.evidence_text ?? null,
      })),
      snapshot: snapRow
        ? {
            id: snapRow.id,
            content_hash: snapRow.content_hash,
            hasText: Boolean(snapRow.source_text?.trim()),
            textLength: snapRow.source_text?.length ?? 0,
          }
        : null,
      heqSalePriceField: q?.quality.fields.find((f) => f.field === "sale_price") ?? null,
      heqOverall: q?.quality.overallQuality ?? null,
      resolutionSalePrice: q?.resolution.salePrice ?? null,
      resolutionLabel: q?.resolution.label ?? null,
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    productionWrites: "none",
    before,
    soldWithoutPriceCount: soldWithoutPrice.length,
    targets,
  };
  writeFileSync(
    "HISTORICAL_EVIDENCE_QUALITY44_SOLD_WITHOUT_PRICE_DIAGNOSTIC.json",
    JSON.stringify(payload, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        before,
        count: soldWithoutPrice.length,
        targets: targets.map((t) => ({
          label: t.propertyLabel,
          town: t.town,
          event: t.auctionEventId,
          listing: t.listingPropertyId,
          outcome: t.outcomeObservation?.outcome,
          sale: t.outcomeObservation?.sale_price,
          snap: t.snapshot?.id ?? null,
          hasText: t.snapshot?.hasText ?? false,
          pricingFields: t.pricingObservations.map((p) => p.field_name),
        })),
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
