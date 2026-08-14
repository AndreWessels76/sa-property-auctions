import "server-only";

import { publicHistoricalRows } from "@/lib/intelligence/historical";
import { classifyObservations } from "@/lib/intelligence/outcomes";
import { scoreHistoricalEvidence } from "@/lib/intelligence/historicalEvidence/scoring";
import { hea43QueueSummary } from "@/lib/acquisition/historicalEvidence43/queue43";
import { buildMarketEvidenceSummary } from "@/lib/intelligence/investorIntelligence45/marketEvidence";
import { buildInvestorDashboard46 } from "@/lib/intelligence/investorIntelligence46/dashboard";
import { detectAcquisitionGaps46, countGapsByPriority } from "@/lib/intelligence/investorIntelligence46/acquisitionGaps";
import {
  auditHistoricalEventCoverage,
  deriveProductionVerdict,
  diagnoseConnectivity,
  INVESTOR_INTELLIGENCE47_VERSION,
  II47_P1_BATCH_LIMIT,
  summarizeHistoricalCoverage,
  type LiveEvidenceMetrics,
} from "@/lib/intelligence/investorIntelligence47";
import { HistoricalEvidenceAcquisition43Service } from "./HistoricalEvidenceAcquisition43Service";
import { HistoricalIntelligence40Service } from "./HistoricalIntelligence40Service";
import { HistoricalIntelligenceService } from "./HistoricalIntelligenceService";
import { InvestorIntelligence46Service } from "./InvestorIntelligence46Service";
import { HistoricalEnrichmentRepository } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { OutcomeIntelligenceRepository } from "@/lib/repositories/OutcomeIntelligenceRepository";
import { PricingObservationRepository } from "@/lib/repositories/PricingObservationRepository";
import {
  AuctionEventRepository,
  PropertyMasterRepository,
} from "@/lib/repositories/PropertyIdentityRepository";
import { PropertyRepository } from "@/lib/repositories/PropertyRepository";
import { LoggerService } from "@/lib/logger";

export class InvestorIntelligence47Service {
  /**
   * Live evidence report using the same repository/service layer as the application.
   */
  static async buildLiveReport() {
    const envPresent = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    let propertiesCount: number | null = null;
    let eventsCount: number | null = null;
    let propertiesError: string | null = null;
    let eventsError: string | null = null;

    try {
      propertiesCount = (await PropertyRepository.getIntelligenceCorpus(5000)).length;
    } catch (e) {
      propertiesError = e instanceof Error ? e.message : String(e);
    }

    try {
      eventsCount = await AuctionEventRepository.count();
    } catch (e) {
      eventsError = e instanceof Error ? e.message : String(e);
    }

    const connectivity = diagnoseConnectivity({
      envPresent,
      propertiesCount,
      eventsCount,
      propertiesError,
      eventsError,
    });

    if (connectivity.status === "LIVE_DATA_UNAVAILABLE" || connectivity.status === "AUTH_ERROR") {
      const blocked = deriveProductionVerdict({
        connectivity,
        metrics: emptyMetrics(),
        engineTested: true,
      });
      return {
        version: INVESTOR_INTELLIGENCE47_VERSION,
        generatedAt: new Date().toISOString(),
        connectivity,
        metrics: emptyMetrics(),
        coverageSummary: null,
        historicalAudit: [],
        verdict: blocked.verdict,
        reason: blocked.reason,
        provenInProduction: blocked.provenInProduction,
        engineTested: blocked.engineTested,
        dataStillMissing: blocked.dataStillMissing,
        liveDataUnavailable: true,
      };
    }

    const [
      propertyMasters,
      auctionEvents,
      scored,
      pricingObs,
      outcomeObs,
      enrichmentRuns,
      reviews,
      conflicts,
      heaQueue,
      safety,
    ] = await Promise.all([
      PropertyMasterRepository.count(),
      AuctionEventRepository.count(),
      HistoricalIntelligence40Service.loadScoredEvents(),
      PricingObservationRepository.listRecent(5000),
      OutcomeIntelligenceRepository.listRecent(5000),
      HistoricalEnrichmentRepository.listRecentRuns(500),
      HistoricalEnrichmentRepository.listOpenReviews(200),
      OutcomeIntelligenceRepository.listOpenConflicts(200),
      HistoricalEvidenceAcquisition43Service.buildQueue({ priority: 1 }),
      HistoricalEvidenceAcquisition43Service.publicSafetyCheck(),
    ]);

    const historical = publicHistoricalRows(
      await HistoricalIntelligenceService.loadObservations(),
    );
    const classifications = classifyObservations(historical, pricingObs);
    const byId = new Map(classifications.map((c) => [c.observationId, c]));

    const reviewSet = new Set(
      reviews.map((r) => `${r.property_id ?? ""}|${r.auction_event_id ?? ""}`),
    );
    const conflictSet = new Set(
      conflicts.map((c) => `${c.property_master_id ?? ""}|${c.auction_event_id ?? ""}`),
    );

    const historicalAudit = scored.map((e) => {
      const obs =
        outcomeObs.find(
          (o) =>
            (e.observation.auctionEventId &&
              o.auction_event_id === e.observation.auctionEventId) ||
            (e.observation.listingPropertyId &&
              o.listing_property_id === e.observation.listingPropertyId),
        ) ?? null;
      const reviewKey = `${e.observation.listingPropertyId ?? ""}|${e.observation.auctionEventId ?? ""}`;
      const conflictKey = `${e.observation.propertyMasterId ?? ""}|${e.observation.auctionEventId ?? ""}`;
      return auditHistoricalEventCoverage({
        observation: e.observation,
        classification: byId.get(e.observation.observationId) ?? e.classification,
        score: e.score,
        outcomeObs: obs,
        pricingObs,
        enrichmentRuns,
        openReview: reviewSet.has(reviewKey),
        openConflict: conflictSet.has(conflictKey) || e.observation.conflict,
      });
    });

    const coverageSummary = summarizeHistoricalCoverage(historicalAudit);
    const queueAll = await HistoricalEvidenceAcquisition43Service.buildQueue();
    const qs = hea43QueueSummary(queueAll.queue);

    const globalCtx = {
      observations: historical,
      scoredEvents: scored.map((e) => ({
        observation: e.observation,
        classification: e.classification,
        score: e.score,
      })),
    };
    const marketSummary = buildMarketEvidenceSummary(globalCtx);

    const townsWithSales = new Set<string>();
    for (const row of historicalAudit) {
      if (typeof row.salePriceResolution === "number" && row.agency) {
        const town = scored.find((s) => s.observation.observationId === row.observationId)
          ?.observation.town;
        if (town) townsWithSales.add(town.toLowerCase());
      }
    }

    const props = await PropertyRepository.getIntelligenceCorpus(500);
    const allGaps = [];
    const byListing = new Map<string, typeof globalCtx>();
    for (const e of scored) {
      const id = e.observation.listingPropertyId;
      if (!id) continue;
      const existing = byListing.get(id) ?? { observations: [], scoredEvents: [] };
      existing.observations.push(e.observation);
      existing.scoredEvents!.push({
        observation: e.observation,
        classification: e.classification,
        score: e.score,
      });
      byListing.set(id, existing);
    }
    for (const p of props.slice(0, 200)) {
      const ctx = byListing.get(p.id) ?? { observations: [], scoredEvents: [] };
      allGaps.push(
        ...detectAcquisitionGaps46({
          property: p,
          ctx,
          comparableCount: 0,
          rejectedComparableCount: 0,
          hasConflict: ctx.observations.some((o) => o.conflict),
          historicalEventCount: ctx.observations.length,
        }),
      );
    }
    const gapPri = countGapsByPriority(allGaps);

    const metrics: LiveEvidenceMetrics = {
      propertyMasters,
      auctionEvents,
      historicalEvents: historical.length,
      eligibleP1: qs.priority1,
      eligibleP2: qs.priority2,
      eligibleP3: qs.priority3,
      eligibleP4: qs.priority4,
      enrichmentRuns: enrichmentRuns.length,
      successfulFetches: enrichmentRuns.filter(
        (r) => r.status === "COMPLETED" || r.status === "NO_CHANGE",
      ).length,
      noChange: enrichmentRuns.filter((r) => r.status === "NO_CHANGE").length,
      outcomeObservations: outcomeObs.length,
      verifiedSold: coverageSummary.verifiedSold,
      soldWithoutPrice: coverageSummary.soldWithoutPrice,
      verifiedSalePrices: coverageSummary.verifiedSalePrices,
      conflicts: coverageSummary.conflicts,
      reviewRequired: coverageSummary.reviewRequired,
      comparableReady: marketSummary.verifiedSalePriceCount,
      marketReadyTowns: [...townsWithSales].filter((town) => {
        const townSales = historicalAudit.filter(
          (r) =>
            typeof r.salePriceResolution === "number" &&
            scored
              .find((s) => s.observation.observationId === r.observationId)
              ?.observation.town?.toLowerCase() === town,
        ).length;
        return townSales >= 5;
      }).length,
      publicCatalogueLeaks: safety.catalogueLeaks,
      acquisitionGaps: gapPri.total,
    };

    const verdictBlock = deriveProductionVerdict({
      connectivity,
      metrics,
      engineTested: true,
    });

    return {
      version: INVESTOR_INTELLIGENCE47_VERSION,
      generatedAt: new Date().toISOString(),
      connectivity,
      metrics,
      coverageSummary,
      historicalAudit: historicalAudit.slice(0, 50),
      heaQueuePreview: heaQueue.queue.slice(0, 5),
      dashboard46: buildInvestorDashboard46([...byListing.values()]),
      gapPriority: gapPri,
      verdict: verdictBlock.verdict,
      reason: verdictBlock.reason,
      provenInProduction: verdictBlock.provenInProduction,
      engineTested: verdictBlock.engineTested,
      dataStillMissing: verdictBlock.dataStillMissing,
      liveDataUnavailable: false,
    };
  }

  static async adminDashboard() {
    const report = await this.buildLiveReport();
    return {
      ok: true,
      version: INVESTOR_INTELLIGENCE47_VERSION,
      connectivity: report.connectivity,
      metrics: report.metrics,
      coverageSummary: report.coverageSummary,
      verdict: report.verdict,
      reason: report.reason,
      provenInProduction: report.provenInProduction,
      dataStillMissing: report.dataStillMissing,
      gapPriority: report.gapPriority,
      dashboard46: report.dashboard46,
    };
  }

  /** Controlled P1 batch — reuses HEA 4.3, then rebuilds II 4.6. Idempotent. */
  static async acquireP1Batch(input: {
    dryRun?: boolean;
    operator: string;
    limit?: number;
  }) {
    const limit = input.limit ?? II47_P1_BATCH_LIMIT;
    const acquisition = await HistoricalEvidenceAcquisition43Service.acquireBatch({
      priority: 1,
      limit,
      dryRun: input.dryRun,
      operator: input.operator,
    });

    if (input.dryRun) {
      return {
        ok: true,
        dryRun: true,
        message: acquisition.message,
        acquisition,
        rebuild: null,
      };
    }

    const rebuild = await InvestorIntelligence46Service.rebuildInvestorIntelligence(input.operator);
    LoggerService.audit("ii47.acquire_p1", {
      operator: input.operator,
      processed: acquisition.processed,
      runId: acquisition.runId,
    });

    const report = await this.buildLiveReport();
    return {
      ok: true,
      dryRun: false,
      message: `P1 batch (${limit}) complete — intelligence rebuilt`,
      acquisition,
      rebuild,
      metrics: report.metrics,
      verdict: report.verdict,
    };
  }

  static async rebuildIntelligence(operator: string) {
    const result = await InvestorIntelligence46Service.rebuildInvestorIntelligence(operator);
    const report = await this.buildLiveReport();
    return {
      ok: true,
      message: "Investor intelligence rebuilt from existing evidence",
      result,
      metrics: report.metrics,
      verdict: report.verdict,
    };
  }
}

function emptyMetrics(): LiveEvidenceMetrics {
  return {
    propertyMasters: 0,
    auctionEvents: 0,
    historicalEvents: 0,
    eligibleP1: 0,
    eligibleP2: 0,
    eligibleP3: 0,
    eligibleP4: 0,
    enrichmentRuns: 0,
    successfulFetches: 0,
    noChange: 0,
    outcomeObservations: 0,
    verifiedSold: 0,
    soldWithoutPrice: 0,
    verifiedSalePrices: 0,
    conflicts: 0,
    reviewRequired: 0,
    comparableReady: 0,
    marketReadyTowns: 0,
    publicCatalogueLeaks: 0,
    acquisitionGaps: 0,
  };
}
