import "server-only";

import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import {
  buildHistoricalEnrichmentQueue,
  queueSummary,
  buildEnrichmentFunnel,
  HISTORICAL_DATA_ACQUISITION_VERSION,
  HISTORICAL_DATA_ENRICHMENT41_VERSION,
  HDE41_DEFAULT_DRY_RUN_LIMIT,
  HDE41_DEFAULT_BATCH_LIMIT,
  HDA40_MAX_BATCH_LIMIT,
  type QueuePriority,
} from "@/lib/acquisition/historical";
import { persistOutcomeObservations } from "@/lib/acquisition/outcomes/outcomeService";
import { SourceRefetchService } from "@/lib/services/SourceRefetchService";
import { PropertyRepository } from "@/lib/repositories/PropertyRepository";
import { PropertyMapper } from "@/lib/mappers/PropertyMapper";
import { HistoricalEnrichmentRepository } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { OutcomeIntelligenceRepository } from "@/lib/repositories/OutcomeIntelligenceRepository";
import { HistoricalIntelligence40Service } from "@/lib/services/HistoricalIntelligence40Service";
import { HistoricalIntelligenceService } from "@/lib/services/HistoricalIntelligenceService";
import { publicHistoricalRows } from "@/lib/intelligence/historical";
import { LoggerService } from "@/lib/logger";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

export type EnrichmentScope =
  | "single"
  | "batch"
  | "historical"
  | "partner"
  | "connector";

export type EnrichmentBatchResult = {
  ok: boolean;
  runId: string;
  dryRun?: boolean;
  version?: string;
  processed: number;
  completed: number;
  noChange: number;
  changed: number;
  outcomesExtracted: number;
  salePricesExtracted: number;
  outcomesFound: number;
  salePricesFound: number;
  salePricesVerified: number;
  soldFound: number;
  eligible: number;
  attempted: number;
  fetched: number;
  unchanged: number;
  skippedLicense: number;
  conflicts: number;
  reviewRequired: number;
  skippedNotHistorical: number;
  failed: number;
  unavailable: number;
  results: Array<{
    propertyId: string;
    status: string;
    outcome: string | null;
    salePrice: number | null;
    message: string;
  }>;
  message: string;
  queueSummary?: ReturnType<typeof queueSummary>;
  funnel?: ReturnType<typeof buildEnrichmentFunnel>;
};

export type EnrichmentQueueFilters = {
  connector?: string;
  agency?: string;
  outcomeState?: string;
  priority?: QueuePriority;
  retryFailed?: boolean;
  propertyMasterId?: string;
  auctionEventId?: string;
};

function isVerifiedSalePriceObs(
  outcome: string | null | undefined,
  salePrice: number | null | undefined,
  confidence: string | null | undefined,
): boolean {
  if (outcome !== "SOLD" || salePrice == null) return false;
  const conf = (confidence ?? "").toLowerCase();
  return conf === "high" || conf === "medium";
}

async function latestOutcomeForProperty(propertyId: string) {
  const rows = await OutcomeIntelligenceRepository.listByProperty(propertyId);
  return rows[0] ?? null;
}

function isHistoricalForEnrichment(p: PropertyDTO): boolean {
  if (
    isPubliclyActiveListing({
      verification_state: p.verification_state,
      data_classification: p.data_classification,
      listing_status: p.listing_status,
      status: p.status,
      auction_date: p.auction_date,
    })
  ) {
    return false;
  }
  const vs = (p.verification_state ?? "").toLowerCase();
  return ["expired", "sold", "withdrawn", "verified"].includes(vs);
}

async function getPropertyDto(propertyId: string): Promise<PropertyDTO | null> {
  const row = await PropertyRepository.getById(propertyId);
  if (!row) return null;
  return PropertyMapper.toDTO(row);
}

export class HistoricalEnrichmentService {
  static async buildQueue(filters?: EnrichmentQueueFilters) {
    const observations = await HistoricalIntelligenceService.loadObservations();
    const historical = publicHistoricalRows(observations);
    const persisted = await OutcomeIntelligenceRepository.listRecent(5000);
    const runs = await HistoricalEnrichmentRepository.listRecentRuns(200);
    const reviews = await HistoricalEnrichmentRepository.listOpenReviews(200);
    const queue = buildHistoricalEnrichmentQueue({
      events: historical,
      observations: persisted,
      recentRuns: runs,
      openReviews: reviews,
      filters,
    });
    return {
      version: HISTORICAL_DATA_ENRICHMENT41_VERSION,
      hdaVersion: HISTORICAL_DATA_ACQUISITION_VERSION,
      queue,
      summary: queueSummary(queue),
    };
  }

  static async dryRunBatch(input: EnrichmentQueueFilters & { limit?: number }) {
    const limit = Math.min(
      Math.max(input.limit ?? HDE41_DEFAULT_DRY_RUN_LIMIT, 1),
      HDA40_MAX_BATCH_LIMIT,
    );
    const { queue, summary } = await this.buildQueue(input);
    const selected = queue.slice(0, limit);
    return {
      ok: true,
      dryRun: true,
      runId: `dry_run_${Date.now().toString(36)}`,
      version: HISTORICAL_DATA_ENRICHMENT41_VERSION,
      wouldProcess: selected.length,
      queueSummary: summary,
      candidates: selected.map((q) => ({
        propertyId: q.propertyId,
        auctionEventId: q.auctionEventId,
        priority: q.priority,
        reason: q.reason,
        outcome: q.outcome,
        salePrice: q.salePrice,
        sourceStatus: q.sourceResolution.status,
        sourceUrl: q.sourceResolution.sourceUrl,
      })),
      message: `Dry run — would process ${selected.length} historical event(s)`,
    };
  }
  static async enrichProperty(input: {
    propertyId: string;
    force?: boolean;
    operator?: string | null;
    runId?: string;
    mode?: "refetch" | "snapshot";
  }) {
    const started = Date.now();
    const runId = input.runId ?? `enrich_${Date.now().toString(36)}`;
    const property = await getPropertyDto(input.propertyId);
    if (!property) {
      return {
        ok: false as const,
        propertyId: input.propertyId,
        status: "FAILED",
        outcome: null,
        salePrice: null,
        message: "Property not found",
      };
    }

    if (!isHistoricalForEnrichment(property)) {
      await HistoricalEnrichmentRepository.recordRun({
        runId,
        propertyId: property.id,
        status: "SKIPPED_NOT_HISTORICAL",
        operator: input.operator ?? null,
        meta: { reason: "Upcoming/live listings excluded from historical enrichment" },
      });
      return {
        ok: false as const,
        propertyId: property.id,
        status: "SKIPPED_NOT_HISTORICAL",
        outcome: null,
        salePrice: null,
        message: "Not a historical event — upcoming/live excluded",
      };
    }

    if (input.mode === "snapshot") {
      const enriched = await SourceRefetchService.enrichFromSnapshot({
        propertyId: property.id,
        operator: input.operator ?? "historical_enrichment",
      });
      if (!enriched.ok) {
        await HistoricalEnrichmentRepository.recordRun({
          runId,
          propertyId: property.id,
          sourceUrl: property.source_url,
          status: "SOURCE_UNAVAILABLE",
          operator: input.operator ?? null,
          meta: { error: enriched.error },
        });
        return {
          ok: false as const,
          propertyId: property.id,
          status: "SOURCE_UNAVAILABLE",
          outcome: null,
          salePrice: null,
          message: enriched.error ?? "Snapshot enrichment failed",
        };
      }
      await HistoricalEnrichmentRepository.recordRun({
        runId,
        propertyId: property.id,
        sourceUrl: property.source_url,
        snapshotId: enriched.snapshotId,
        sourceHash: enriched.contentHash,
        status: "COMPLETED",
        operator: input.operator ?? null,
        meta: { extractionRunId: enriched.extractionRunId },
      });
      const obs = await latestOutcomeForProperty(property.id);
      return {
        ok: true as const,
        propertyId: property.id,
        status: "COMPLETED",
        outcome: obs?.outcome ?? null,
        salePrice: obs?.sale_price ?? null,
        message: "Snapshot extraction completed",
      };
    }

    const refetch = await SourceRefetchService.refreshProperty({
      propertyId: property.id,
      force: input.force === true,
      operator: input.operator ?? "historical_enrichment",
    });

    const status =
      refetch.status === "no_change"
        ? "NO_CHANGE"
        : refetch.status === "completed"
          ? refetch.conflicts > 0
            ? "CONFLICT"
            : "COMPLETED"
          : refetch.status === "SKIPPED_LICENSE"
            ? "SKIPPED_LICENSE"
            : refetch.status === "source_unavailable"
              ? "SOURCE_UNAVAILABLE"
              : refetch.status.startsWith("SKIPPED_")
                ? "SOURCE_UNAVAILABLE"
                : "FAILED";

    if (refetch.status === "no_change" && refetch.snapshotId) {
      const snapText = await SourceRefetchService.enrichFromSnapshot({
        propertyId: property.id,
        snapshotId: refetch.snapshotId,
        operator: input.operator ?? "historical_enrichment_no_change",
      });
      if (snapText.ok) {
        /* outcome persisted via linkage if snapshot has text */
      } else {
        const latest = await OutcomeIntelligenceRepository.listByProperty(property.id);
        if (latest.length === 0) {
          await persistOutcomeObservations({
            propertyId: property.id,
            corpus: {
              title: property.title,
              description: property.description,
              source_url: property.source_url,
              source_name: property.source_name,
              verification_state: property.verification_state,
              listing_status: property.listing_status ?? property.status,
            },
            skipBecauseNoChange: true,
          });
        }
      }
    }

    const obs = await latestOutcomeForProperty(property.id);
    const durationMs = Date.now() - started;
    const propertyRow = await PropertyRepository.getById(property.id);

    await HistoricalEnrichmentRepository.recordRun({
      runId,
      propertyId: property.id,
      propertyMasterId: propertyRow?.property_master_id ?? null,
      auctionEventId: null,
      sourceUrl: refetch.sourceUrl,
      snapshotId: refetch.snapshotId,
      sourceHash: refetch.contentHash,
      status,
      outcome: obs?.outcome ?? null,
      salePrice: obs?.sale_price ?? null,
      conflicts: refetch.conflicts,
      reviewRequired: refetch.conflicts > 0,
      operator: input.operator ?? null,
      meta: {
        refetchStatus: refetch.status,
        changeClasses: refetch.changeClasses,
        forced: input.force === true,
        durationMs,
        outcomeObservationId: obs?.id ?? null,
      },
    });

    LoggerService.audit("historical.enrichment.property", {
      propertyId: property.id,
      runId,
      status,
      refetchStatus: refetch.status,
      durationMs,
      outcome: obs?.outcome ?? null,
      salePrice: obs?.sale_price ?? null,
    });

    return {
      ok: status === "COMPLETED" || status === "NO_CHANGE",
      propertyId: property.id,
      status,
      outcome: obs?.outcome ?? null,
      salePrice: obs?.sale_price ?? null,
      message: refetch.message,
    };
  }

  static async enrichBatch(input: EnrichmentQueueFilters & {
    scope: EnrichmentScope;
    propertyId?: string;
    partnerCode?: string;
    limit?: number;
    force?: boolean;
    dryRun?: boolean;
    operator?: string | null;
    mode?: "refetch" | "snapshot";
    rebuild?: boolean;
  }): Promise<EnrichmentBatchResult> {
    const emptyCounters = {
      eligible: 0,
      attempted: 0,
      fetched: 0,
      unchanged: 0,
      skippedLicense: 0,
    };

    if (input.dryRun) {
      const dry = await this.dryRunBatch(input);
      const observations = await HistoricalIntelligenceService.loadObservations();
      const historical = publicHistoricalRows(observations);
      const persisted = await OutcomeIntelligenceRepository.listRecent(5000);
      const runs = await HistoricalEnrichmentRepository.listRecentRuns(500);
      const funnel = buildEnrichmentFunnel({
        events: historical,
        observations: persisted,
        runs,
      });
      return {
        ok: dry.ok,
        runId: dry.runId,
        dryRun: true,
        version: HISTORICAL_DATA_ENRICHMENT41_VERSION,
        processed: dry.wouldProcess,
        completed: 0,
        noChange: 0,
        changed: 0,
        outcomesExtracted: funnel.outcomeExtracted,
        salePricesExtracted: funnel.salePriceFound,
        outcomesFound: funnel.outcomeExtracted,
        salePricesFound: funnel.salePriceFound,
        salePricesVerified: funnel.salePriceVerified,
        soldFound: funnel.soldConfirmed,
        ...emptyCounters,
        eligible: funnel.sourceEligible,
        conflicts: funnel.conflicts,
        reviewRequired: 0,
        skippedNotHistorical: 0,
        failed: 0,
        unavailable: 0,
        results: dry.candidates.map((c) => ({
          propertyId: c.propertyId,
          status: "DRY_RUN",
          outcome: c.outcome,
          salePrice: c.salePrice,
          message: c.reason,
        })),
        message: dry.message,
        queueSummary: dry.queueSummary,
        funnel,
      };
    }

    const runId = `enrich_batch_${Date.now().toString(36)}`;
    const limit = Math.min(
      Math.max(input.limit ?? HDE41_DEFAULT_BATCH_LIMIT, 1),
      HDA40_MAX_BATCH_LIMIT,
    );
    let candidates: string[] = [];
    let eligible = 0;

    if (input.scope === "single") {
      if (!input.propertyId) {
        return {
          ok: false,
          runId,
          version: HISTORICAL_DATA_ENRICHMENT41_VERSION,
          processed: 0,
          completed: 0,
          noChange: 0,
          changed: 0,
          outcomesExtracted: 0,
          salePricesExtracted: 0,
          outcomesFound: 0,
          salePricesFound: 0,
          salePricesVerified: 0,
          soldFound: 0,
          ...emptyCounters,
          conflicts: 0,
          reviewRequired: 0,
          skippedNotHistorical: 0,
          failed: 0,
          unavailable: 0,
          results: [],
          message: "propertyId required for single scope",
        };
      }
      candidates = [input.propertyId];
      eligible = 1;
    } else {
      const { queue } = await this.buildQueue({
        connector: input.connector ?? input.partnerCode,
        agency: input.agency,
        outcomeState: input.outcomeState,
        priority: input.priority,
        retryFailed: input.retryFailed,
        propertyMasterId: input.propertyMasterId,
        auctionEventId: input.auctionEventId,
      });
      eligible = queue.filter((q) => q.sourceResolution.status === "ELIGIBLE").length;
      candidates = queue.slice(0, limit).map((q) => q.propertyId);
    }

    const results: EnrichmentBatchResult["results"] = [];
    let completed = 0;
    let noChange = 0;
    let changed = 0;
    let conflicts = 0;
    let reviewRequired = 0;
    let skippedNotHistorical = 0;
    let failed = 0;
    let unavailable = 0;
    let skippedLicense = 0;
    let fetched = 0;
    let soldFound = 0;
    let salePricesVerified = 0;

    for (const propertyId of candidates) {
      const r = await this.enrichProperty({
        propertyId,
        force: input.force,
        operator: input.operator,
        runId,
        mode: input.mode,
      });
      results.push({
        propertyId: r.propertyId,
        status: r.status,
        outcome: r.outcome,
        salePrice: r.salePrice,
        message: r.message,
      });
      if (r.status === "COMPLETED") {
        completed += 1;
        changed += 1;
        fetched += 1;
      } else if (r.status === "NO_CHANGE") {
        noChange += 1;
        fetched += 1;
      } else if (r.status === "SKIPPED_NOT_HISTORICAL") skippedNotHistorical += 1;
      else if (r.status === "SOURCE_UNAVAILABLE") unavailable += 1;
      else if (r.status === "SKIPPED_LICENSE") skippedLicense += 1;
      else if (r.status === "CONFLICT") {
        conflicts += 1;
        reviewRequired += 1;
        fetched += 1;
        changed += 1;
      } else failed += 1;

      if (r.outcome === "SOLD") soldFound += 1;
      const latestObs = await latestOutcomeForProperty(propertyId);
      if (
        isVerifiedSalePriceObs(
          latestObs?.outcome,
          latestObs?.sale_price,
          latestObs?.sale_price_confidence,
        )
      ) {
        salePricesVerified += 1;
      }
    }

    if (input.rebuild && salePricesVerified > 0) {
      await HistoricalIntelligence40Service.rebuild(input.operator ?? "historical_enrichment_batch");
    }

    const observations = await HistoricalIntelligenceService.loadObservations();
    const historical = publicHistoricalRows(observations);
    const persisted = await OutcomeIntelligenceRepository.listRecent(5000);
    const runs = await HistoricalEnrichmentRepository.listRecentRuns(500);
    const funnel = buildEnrichmentFunnel({
      events: historical,
      observations: persisted,
      runs,
    });
    const outcomesExtracted = funnel.outcomeExtracted;
    const salePricesExtracted = funnel.salePriceFound;
    const { summary } = await this.buildQueue();

    return {
      ok: completed + noChange > 0 || results.length === 0,
      runId,
      version: HISTORICAL_DATA_ENRICHMENT41_VERSION,
      processed: results.length,
      attempted: results.length,
      eligible,
      fetched,
      unchanged: noChange,
      completed,
      noChange,
      changed,
      outcomesExtracted,
      salePricesExtracted,
      outcomesFound: outcomesExtracted,
      salePricesFound: salePricesExtracted,
      salePricesVerified: funnel.salePriceVerified,
      soldFound: funnel.soldConfirmed,
      conflicts,
      reviewRequired,
      skippedNotHistorical,
      failed,
      unavailable,
      skippedLicense,
      results,
      queueSummary: summary,
      funnel,
      message: `Processed ${results.length}: ${completed} completed, ${noChange} no change, ${fetched} fetched, ${conflicts} conflicts, ${unavailable} unavailable, ${skippedLicense} license blocked, ${failed} failed`,
    };
  }

  static async hde41Dashboard() {
    const base = await this.hda40Dashboard();
    const observations = await HistoricalIntelligenceService.loadObservations();
    const historical = publicHistoricalRows(observations);
    const persisted = await OutcomeIntelligenceRepository.listRecent(5000);
    const runs = await HistoricalEnrichmentRepository.listRecentRuns(500);
    const funnel = buildEnrichmentFunnel({
      events: historical,
      observations: persisted,
      runs,
    });
    const safety = await HistoricalIntelligence40Service.publicSafetyCheck();
    return {
      ...base,
      version: HISTORICAL_DATA_ENRICHMENT41_VERSION,
      hdaVersion: HISTORICAL_DATA_ACQUISITION_VERSION,
      funnel,
      milestones: funnel.milestones,
      publicSafety: safety,
    };
  }

  static async hda40Dashboard() {
    const base = await this.adminDashboard();
    const { queue, summary } = await this.buildQueue();
    const conflicts = await OutcomeIntelligenceRepository.listOpenConflicts(50);
    const persisted = await OutcomeIntelligenceRepository.listRecent(5000);
    return {
      version: HISTORICAL_DATA_ACQUISITION_VERSION,
      ...base,
      queue: queue.slice(0, 20),
      queueSummary: summary,
      outcomeBreakdown: {
        sold: persisted.filter((o) => o.outcome === "SOLD").length,
        passedIn: persisted.filter((o) => o.outcome === "PASSED_IN").length,
        withdrawn: persisted.filter((o) => o.outcome === "WITHDRAWN").length,
        cancelled: persisted.filter((o) => o.outcome === "CANCELLED").length,
        postponed: persisted.filter((o) => o.outcome === "POSTPONED").length,
        unknown: persisted.filter((o) => ["UNKNOWN", "COMPLETED_UNKNOWN"].includes(o.outcome)).length,
      },
      conflictsOpen: conflicts.length,
      conflicts,
    };
  }

  static async rebuildIntelligence() {
    const observations = await HistoricalIntelligenceService.loadObservations();
    const historical = publicHistoricalRows(observations);
    const persisted = await OutcomeIntelligenceRepository.listRecent(5000);
    const verifiedOutcomes = persisted.filter(
      (o) => !["UNKNOWN", "COMPLETED_UNKNOWN"].includes(o.outcome),
    ).length;
    const verifiedSalePrices = persisted.filter((o) => o.sale_price != null).length;
    return {
      ok: true,
      historicalEvents: historical.length,
      verifiedOutcomes,
      verifiedSalePrices,
      message: `Intelligence corpus refreshed — ${historical.length} historical events, ${verifiedOutcomes} verified outcomes, ${verifiedSalePrices} verified sale prices`,
    };
  }

  static async rebuildIntelligenceFull(operator?: string) {
    return HistoricalIntelligence40Service.rebuild(
      operator ?? "historical_enrichment_rebuild",
    );
  }

  static async adminDashboard() {
    const observations = await HistoricalIntelligenceService.loadObservations();
    const historical = publicHistoricalRows(observations);
    const persisted = await OutcomeIntelligenceRepository.listRecent(5000);
    const metrics = await HistoricalEnrichmentRepository.dashboardMetrics();
    const reviews = await HistoricalEnrichmentRepository.listOpenReviews(50);
    const runs = await HistoricalEnrichmentRepository.listRecentRuns(20);

    const verifiedOutcomes = persisted.filter((o) => o.outcome !== "UNKNOWN").length;
    const verifiedSalePrices = persisted.filter((o) => o.sale_price != null).length;

    return {
      historicalEvents: historical.length,
      outcomeVerified: verifiedOutcomes,
      outcomeUnknown: historical.length - verifiedOutcomes,
      salePriceVerified: verifiedSalePrices,
      salePriceMissing: verifiedOutcomes - verifiedSalePrices,
      outcomeCoveragePct:
        historical.length > 0
          ? Math.round((verifiedOutcomes / historical.length) * 100)
          : null,
      salePriceCoveragePct:
        verifiedOutcomes > 0
          ? Math.round((verifiedSalePrices / verifiedOutcomes) * 100)
          : null,
      enrichment: metrics,
      reviewQueue: reviews,
      recentRuns: runs,
    };
  }
}
