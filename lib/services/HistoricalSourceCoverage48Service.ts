import "server-only";

import { publicHistoricalRows } from "@/lib/intelligence/historical";
import { classifyObservations } from "@/lib/intelligence/outcomes";
import { buildHea43Queue, hea43QueueSummary } from "@/lib/acquisition/historicalEvidence43/queue43";
import { RefetchAudit } from "@/lib/acquisition/refetch/refetchAudit";
import { detectAcquisitionGaps46, countGapsByPriority } from "@/lib/intelligence/investorIntelligence46/acquisitionGaps";
import { buildMarketEvidenceSummary } from "@/lib/intelligence/investorIntelligence45/marketEvidence";
import {
  HISTORICAL_SOURCE_COVERAGE48_VERSION,
  HSC48_P1_BATCH_LIMIT,
  HSA49_DEFAULT_BATCH_LIMIT,
  HSA49_MAX_BATCH_LIMIT,
  HSA49_VERSION,
  buildEventDiagnostic,
  aggregateEventMetrics,
  buildCoverageFractions,
  stateBreakdown,
  deriveHsc48Verdict,
  computeBeforeAfterDelta,
  diagnoseConnectivityExtended,
  buildSourceHealthMetrics,
  failureBreakdown,
  explainEventGaps,
  groupGapCounts,
  countByPriority,
  buildDryRunPreview,
  buildResearchEvidenceLabels,
  type Hsc48DiagnosticReport,
  type Hsc48Metrics,
} from "@/lib/intelligence/historicalSourceCoverage48";
import { HistoricalEvidenceAcquisition43Service } from "./HistoricalEvidenceAcquisition43Service";
import { HistoricalEvidenceQuality44Service } from "./HistoricalEvidenceQuality44Service";
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
import {
  aggregateFetchReliability,
  filterNetworkRetryEvents,
} from "@/lib/acquisition/historicalFetchReliability49";

export class HistoricalSourceCoverage48Service {
  static async buildDiagnosticReport(): Promise<Hsc48DiagnosticReport> {
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

    const connectivity = diagnoseConnectivityExtended({
      envPresent,
      propertiesCount,
      eventsCount,
      propertiesError,
      eventsError,
    });

    if (
      connectivity.extendedStatus === "LIVE_DATA_UNAVAILABLE" ||
      connectivity.extendedStatus === "AUTH_ERROR" ||
      connectivity.extendedStatus === "QUERY_ERROR"
    ) {
      const verdictBlock = deriveHsc48Verdict({
        connectivity,
        metrics: emptyMetrics(),
        engineTested: true,
      });
      return {
        version: HISTORICAL_SOURCE_COVERAGE48_VERSION,
        generatedAt: new Date().toISOString(),
        connectivity,
        metrics: emptyMetrics(),
        coverage: {
          total: 0,
          sourceFound: 0,
          sourceLicensed: 0,
          fetchAttempted: 0,
          fetchSuccessful: 0,
          snapshots: 0,
          extractions: 0,
          outcomeEvidence: 0,
          salePriceEvidence: 0,
        },
        events: [],
        stateBreakdown: {},
        verdict: verdictBlock.verdict,
        reason: verdictBlock.reason,
        provenInProduction: verdictBlock.provenInProduction,
        engineTested: verdictBlock.engineTested,
        sourceCoverage: verdictBlock.sourceCoverage,
        dataStillMissing: verdictBlock.dataStillMissing,
        technicalBlockers: verdictBlock.technicalBlockers,
        adminReviewRequired: verdictBlock.adminReviewRequired,
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
      refetchRuns,
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
      RefetchAudit.listRecent(500),
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

    const queueAll = buildHea43Queue({
      events: historical,
      observations: outcomeObs,
      recentRuns: enrichmentRuns,
      openReviews: reviews,
    });
    const qs = hea43QueueSummary(queueAll);
    const queueByProperty = new Map(queueAll.map((q) => [q.propertyId, q]));

    const events = scored.map((e) => {
      const obs =
        outcomeObs.find(
          (o) =>
            (e.observation.auctionEventId &&
              o.auction_event_id === e.observation.auctionEventId) ||
            (e.observation.listingPropertyId &&
              o.listing_property_id === e.observation.listingPropertyId),
        ) ?? null;
      const eventPricing = pricingObs.filter(
        (p) =>
          (e.observation.listingPropertyId &&
            p.property_id === e.observation.listingPropertyId) ||
          (e.observation.auctionEventId &&
            p.auction_event_id === e.observation.auctionEventId),
      );
      const reviewKey = `${e.observation.listingPropertyId ?? ""}|${e.observation.auctionEventId ?? ""}`;
      const conflictKey = `${e.observation.propertyMasterId ?? ""}|${e.observation.auctionEventId ?? ""}`;

      return buildEventDiagnostic({
        event: e.observation,
        classification: byId.get(e.observation.observationId) ?? e.classification,
        score: e.score,
        enrichmentRuns,
        refetchRuns,
        outcomeObs: obs,
        pricingObs: eventPricing,
        queueItem: e.observation.listingPropertyId
          ? queueByProperty.get(e.observation.listingPropertyId) ?? null
          : null,
        openReview: reviewSet.has(reviewKey),
        openConflict: conflictSet.has(conflictKey) || e.observation.conflict,
      });
    });

    const props = await PropertyRepository.getIntelligenceCorpus(500);
    const globalCtx = {
      observations: historical,
      scoredEvents: scored.map((s) => ({
        observation: s.observation,
        classification: s.classification,
        score: s.score,
      })),
    };
    const marketSummary = buildMarketEvidenceSummary(globalCtx);

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

    const townsWithSales = new Set<string>();
    for (const row of events) {
      if (row.salePriceState === "VERIFIED" && row.town) {
        townsWithSales.add(row.town.toLowerCase());
      }
    }

    const metrics = aggregateEventMetrics(events, {
      propertyMasters,
      auctionEvents,
      p1: qs.priority1,
      p2: qs.priority2,
      p3: qs.priority3,
      p4: qs.priority4,
      queueBlocked: events.filter((e) => e.source.sourceStatus === "LICENSE_BLOCKED").length,
      queueUnavailable: events.filter((e) => e.source.sourceStatus === "UNAVAILABLE").length,
      queueCompleted: events.filter((e) => e.primaryState === "READY_FOR_INTELLIGENCE").length,
      enrichmentAttempts: enrichmentRuns.length,
      comparableReady: marketSummary.verifiedSalePriceCount,
      marketReadyTowns: [...townsWithSales].filter((town) => {
        const townSales = events.filter(
          (r) =>
            r.salePriceState === "VERIFIED" &&
            r.town?.toLowerCase() === town,
        ).length;
        return townSales >= 5;
      }).length,
      acquisitionGaps: gapPri.total,
      catalogueLeaks: safety.catalogueLeaks,
    });

    const coverage = buildCoverageFractions(events);
    const breakdown = stateBreakdown(events);

    const priorityCounts = countByPriority(
      events
        .map((e) => e.acquisitionPriority)
        .filter((p): p is NonNullable<typeof p> => p != null),
    );
    const fetchFailures = events
      .filter((e) => e.fetchError && e.fetchError.errorCode !== "NONE")
      .map((e) => e.fetchError!);
    const gapExplanations = events.map((e) =>
      explainEventGaps({ event: e, priority: e.acquisitionPriority! }),
    );
    const sourceHealth = buildSourceHealthMetrics({
      events,
      enrichmentRuns,
      refetchRuns,
    });

    const metricsWith49 = {
      ...metrics,
      p1: priorityCounts.p1,
      p2: priorityCounts.p2,
      p3: priorityCounts.p3,
      p4: priorityCounts.p4,
      p1Eligible: priorityCounts.p1,
      p2Retryable: priorityCounts.p2,
      p3Review: priorityCounts.p3,
      p4Blocked: priorityCounts.p4,
      retryableFailures: events.filter((e) => e.fetchError?.retryable).length,
    };

    const verdictBlock = deriveHsc48Verdict({
      connectivity,
      metrics: metricsWith49,
      engineTested: true,
    });

    return {
      version: HISTORICAL_SOURCE_COVERAGE48_VERSION,
      generatedAt: new Date().toISOString(),
      connectivity,
      metrics: metricsWith49,
      coverage,
      events,
      stateBreakdown: breakdown,
      verdict: verdictBlock.verdict,
      reason: verdictBlock.reason,
      provenInProduction: verdictBlock.provenInProduction,
      engineTested: verdictBlock.engineTested,
      sourceCoverage: verdictBlock.sourceCoverage,
      dataStillMissing: verdictBlock.dataStillMissing,
      technicalBlockers: verdictBlock.technicalBlockers,
      adminReviewRequired: verdictBlock.adminReviewRequired,
      liveDataUnavailable: false,
      sourceHealth,
      failureBreakdown: failureBreakdown(fetchFailures),
      gapGroups: groupGapCounts(gapExplanations),
    };
  }

  static async buildAcquisitionReport49() {
    const report = await this.buildDiagnosticReport();
    return {
      version: HSA49_VERSION,
      hscVersion: HISTORICAL_SOURCE_COVERAGE48_VERSION,
      generatedAt: report.generatedAt,
      connectivity: report.connectivity,
      metrics: report.metrics,
      coverage: report.coverage,
      sourceHealth: report.sourceHealth ?? [],
      failureBreakdown: report.failureBreakdown ?? {},
      gapGroups: report.gapGroups ?? {},
      stateBreakdown: report.stateBreakdown,
      verdict: report.verdict,
      reason: report.reason,
      catalogueLeaks: report.metrics.catalogueLeaks,
    };
  }

  static async adminDashboard() {
    const report = await this.buildDiagnosticReport();
    const fetchReliability = aggregateFetchReliability(report.events);
    return {
      ok: true,
      version: HISTORICAL_SOURCE_COVERAGE48_VERSION,
      hsa49Version: HSA49_VERSION,
      connectivity: report.connectivity,
      metrics: report.metrics,
      fetchReliability,
      coverage: report.coverage,
      stateBreakdown: report.stateBreakdown,
      failureBreakdown: report.failureBreakdown,
      gapGroups: report.gapGroups,
      sourceHealth: report.sourceHealth,
      events: report.events,
      verdict: report.verdict,
      reason: report.reason,
      provenInProduction: report.provenInProduction,
      engineTested: report.engineTested,
      sourceCoverage: report.sourceCoverage,
      dataStillMissing: report.dataStillMissing,
      technicalBlockers: report.technicalBlockers,
      adminReviewRequired: report.adminReviewRequired,
      liveDataUnavailable: report.liveDataUnavailable,
    };
  }

  static async dryRunP1(input: { operator: string; limit?: number }) {
    const report = await this.buildDiagnosticReport();
    const limit = Math.min(
      input.limit ?? HSA49_DEFAULT_BATCH_LIMIT,
      HSA49_MAX_BATCH_LIMIT,
    );
    const { queue } = await HistoricalEvidenceAcquisition43Service.buildQueue({
      priority: 1,
    });
    const eventsByProperty = new Map(
      report.events
        .filter((e) => e.listingPropertyId)
        .map((e) => [e.listingPropertyId!, e]),
    );
    const enrichmentRuns = await HistoricalEnrichmentRepository.listRecentRuns(500);
    const preview = buildDryRunPreview({
      queueItems: queue,
      eventsByProperty,
      enrichmentRuns,
      limit,
    });
    const acquisition = await HistoricalEvidenceAcquisition43Service.acquireBatch({
      priority: 1,
      limit,
      dryRun: true,
      operator: input.operator,
    });
    return {
      ok: true,
      dryRun: true,
      message: "DRY RUN — NOTHING WRITTEN",
      before: report.metrics,
      preview,
      acquisition,
    };
  }

  static async acquireP1Batch(input: {
    dryRun?: boolean;
    operator: string;
    limit?: number;
  }) {
    const limit = Math.min(
      input.limit ?? HSA49_DEFAULT_BATCH_LIMIT,
      HSA49_MAX_BATCH_LIMIT,
    );
    const beforeReport = await this.buildDiagnosticReport();
    const before = beforeReport.metrics;

    if (input.dryRun) {
      return this.dryRunP1({ operator: input.operator, limit });
    }

    const acquisition = await HistoricalEvidenceAcquisition43Service.acquireBatch({
      priority: 1,
      limit,
      dryRun: false,
      operator: input.operator,
    });

    const rebuild = await this.rebuildIntelligence(input.operator);
    const afterReport = await this.buildDiagnosticReport();
    const after = afterReport.metrics;

    LoggerService.audit("hsc48.acquire_p1", {
      operator: input.operator,
      processed: acquisition.processed,
      runId: acquisition.runId,
    });

    return {
      ok: true,
      dryRun: false,
      message: `P1 batch (${limit}) complete — intelligence rebuilt`,
      acquisition,
      rebuild,
      beforeAfter: {
        before,
        after,
        delta: computeBeforeAfterDelta(before, after),
      },
      metrics: after,
      verdict: afterReport.verdict,
    };
  }

  static async rebuildIntelligence(operator: string) {
    const heq = await HistoricalEvidenceQuality44Service.rebuildHistoricalIntelligence(operator);
    const ii46 = await InvestorIntelligence46Service.rebuildInvestorIntelligence(operator);
    const report = await this.buildDiagnosticReport();
    return {
      ok: true,
      message: "HI 4.2, HEQ 4.4, and II 4.6/4.7 rebuilt from existing evidence",
      heq,
      ii46,
      metrics: report.metrics,
      verdict: report.verdict,
    };
  }

  static async refreshDiagnostics() {
    return this.buildDiagnosticReport();
  }

  static async retryFailedBatch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    const limit = Math.min(
      input.limit ?? HSA49_DEFAULT_BATCH_LIMIT,
      HSA49_MAX_BATCH_LIMIT,
    );
    const beforeReport = await this.buildDiagnosticReport();
    const before = beforeReport.metrics;

    if (input.dryRun) {
      const { queue } = await HistoricalEvidenceAcquisition43Service.buildQueue({
        retryFailed: true,
      });
      return {
        ok: true,
        dryRun: true,
        message: "DRY RUN — retry failed candidates only",
        candidates: queue.slice(0, limit).length,
        queue: queue.slice(0, limit),
        before,
      };
    }

    const acquisition = await HistoricalEvidenceAcquisition43Service.acquireBatch({
      retryFailed: true,
      limit,
      dryRun: false,
      operator: input.operator,
      force: true,
    });

    const rebuild = await this.rebuildIntelligence(input.operator);
    const afterReport = await this.buildDiagnosticReport();

    LoggerService.audit("hsa49.retry_failed", {
      operator: input.operator,
      processed: acquisition.processed,
      runId: acquisition.runId,
    });

    return {
      ok: true,
      dryRun: false,
      message: `Retry failed batch (${limit}) complete`,
      acquisition,
      rebuild,
      beforeAfter: {
        before,
        after: afterReport.metrics,
        delta: computeBeforeAfterDelta(before, afterReport.metrics),
      },
      metrics: afterReport.metrics,
      verdict: afterReport.verdict,
    };
  }

  static async retryNetworkFailuresBatch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    const limit = Math.min(
      input.limit ?? HSA49_DEFAULT_BATCH_LIMIT,
      HSA49_MAX_BATCH_LIMIT,
    );
    const beforeReport = await this.buildDiagnosticReport();
    const before = beforeReport.metrics;
    const networkEvents = filterNetworkRetryEvents(beforeReport.events).slice(0, limit);

    if (input.dryRun) {
      return {
        ok: true,
        dryRun: true,
        message: "DRY RUN — TLS/DNS/timeout retry candidates only",
        candidates: networkEvents.length,
        events: networkEvents.map((e) => ({
          propertyId: e.listingPropertyId,
          town: e.town,
          errorCode: e.fetchError?.errorCode,
        })),
        before,
      };
    }

    const runId = `hsa49_net_${Date.now().toString(36)}`;
    const results = [];
    for (const event of networkEvents) {
      if (!event.listingPropertyId) continue;
      results.push(
        await HistoricalEvidenceAcquisition43Service.acquireOne({
          propertyId: event.listingPropertyId,
          force: true,
          dryRun: false,
          operator: input.operator,
          runId,
        }),
      );
    }

    const rebuild = await this.rebuildIntelligence(input.operator);
    const afterReport = await this.buildDiagnosticReport();

    LoggerService.audit("hsa49.retry_network", {
      operator: input.operator,
      processed: results.length,
      runId,
    });

    return {
      ok: true,
      dryRun: false,
      message: `Network failure retry (${results.length}) complete`,
      runId,
      processed: results.length,
      results,
      rebuild,
      beforeAfter: {
        before,
        after: afterReport.metrics,
        delta: computeBeforeAfterDelta(before, afterReport.metrics),
      },
      metrics: afterReport.metrics,
      verdict: afterReport.verdict,
    };
  }

  static async diagnosticForProperty(propertyId: string) {
    const report = await this.buildDiagnosticReport();
    const event = report.events.find((e) => e.listingPropertyId === propertyId);
    if (!event) return null;
    return {
      event,
      evidence: buildResearchEvidenceLabels(event),
      timeline: event.acquisitionTimeline ?? [],
      fetchState: event.fetchState ?? null,
      stoppingPoint: event.stoppingPoint,
    };
  }
}

function emptyMetrics(): Hsc48Metrics {
  return {
    propertyMasters: 0,
    auctionEvents: 0,
    historicalEvents: 0,
    p1: 0,
    p2: 0,
    p3: 0,
    p4: 0,
    queueBlocked: 0,
    queueUnavailable: 0,
    queueCompleted: 0,
    enrichmentAttempts: 0,
    successfulFetches: 0,
    failedFetches: 0,
    sourceFound: 0,
    sourceLicensed: 0,
    sourceBlocked: 0,
    sourceUnavailable: 0,
    fetchAttempted: 0,
    tlsErrors: 0,
    networkErrors: 0,
    dnsErrors: 0,
    timeouts: 0,
    http403: 0,
    http404: 0,
    http429: 0,
    http5xx: 0,
    snapshots: 0,
    noChange: 0,
    extractionAttempted: 0,
    extractionSuccessful: 0,
    extractionFailed: 0,
    extractionNoEvidence: 0,
    outcomeObservations: 0,
    verifiedSold: 0,
    soldWithoutPrice: 0,
    unknownOutcomes: 0,
    verifiedSalePrices: 0,
    conflicts: 0,
    reviewRequired: 0,
    comparableReady: 0,
    marketReadyTowns: 0,
    acquisitionGaps: 0,
    catalogueLeaks: 0,
  };
}
