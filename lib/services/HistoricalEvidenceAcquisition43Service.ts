import "server-only";

import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import {
  HISTORICAL_EVIDENCE_ACQUISITION43_VERSION,
  HEA43_DEFAULT_BATCH_LIMIT,
  HEA43_MAX_BATCH_LIMIT,
  buildHea43Queue,
  hea43QueueSummary,
  buildHea43Funnel,
  planAcquisition,
  buildAcquireResult,
  buildDryRunEvidence,
  buildEvidenceObject,
  HistoricalEvidenceRepository,
  type Hea43BatchResult,
  type Hea43AcquireResult,
  type Hea43QueuePriority,
} from "@/lib/acquisition/historicalEvidence43";
import { HistoricalEnrichmentService } from "./HistoricalEnrichmentService";
import { HistoricalIntelligence42Service } from "./HistoricalIntelligence42Service";
import { HistoricalIntelligenceService } from "./HistoricalIntelligenceService";
import { HistoricalIntelligence40Service } from "./HistoricalIntelligence40Service";
import { HistoricalEnrichmentRepository } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { OutcomeIntelligenceRepository } from "@/lib/repositories/OutcomeIntelligenceRepository";
import { PropertyRepository } from "@/lib/repositories/PropertyRepository";
import { publicHistoricalRows } from "@/lib/intelligence/historical";
import { LoggerService } from "@/lib/logger";

export type Hea43QueueFilters = {
  connector?: string;
  agency?: string;
  partner?: string;
  priority?: Hea43QueuePriority;
  retryFailed?: boolean;
  propertyMasterId?: string;
  auctionEventId?: string;
};

export class HistoricalEvidenceAcquisition43Service {
  static async buildQueue(filters?: Hea43QueueFilters) {
    const observations = await HistoricalIntelligenceService.loadObservations();
    const historical = publicHistoricalRows(observations);
    const persisted = await OutcomeIntelligenceRepository.listRecent(5000);
    const runs = await HistoricalEnrichmentRepository.listRecentRuns(200);
    const reviews = await HistoricalEnrichmentRepository.listOpenReviews(200);
    const queue = buildHea43Queue({
      events: historical,
      observations: persisted,
      recentRuns: runs,
      openReviews: reviews,
      filters,
    });
    return {
      version: HISTORICAL_EVIDENCE_ACQUISITION43_VERSION,
      queue,
      summary: hea43QueueSummary(queue),
    };
  }

  static async publicSafetyCheck() {
    const rows = await PropertyRepository.getIntelligenceCorpus(500);
    const leaks = rows.filter((p) =>
      ["expired", "sold", "withdrawn"].includes(p.verification_state ?? "") &&
      isPubliclyActiveListing({
        verification_state: p.verification_state,
        data_classification: p.data_classification,
        listing_status: p.listing_status,
        status: p.status,
        auction_date: p.auction_date,
      }),
    );
    return { catalogueLeaks: leaks.length, ok: leaks.length === 0 };
  }

  static async dashboard() {
    const { queue, summary, version } = await this.buildQueue();
    const resolved = await HistoricalIntelligence42Service.loadResolvedEvents();
    const runs = await HistoricalEvidenceRepository.listRecentRuns(20);
    const safety = await this.publicSafetyCheck();

    const dashboard = {
      eventsRequiringEnrichment: queue.length,
      sourceFound: queue.filter((q) => q.candidates.length > 0).length,
      sourceNotFound: queue.filter((q) => q.candidates.length === 0).length,
      outcomeExtracted: resolved.filter((e) =>
        ["EXTRACTED", "VERIFIED"].includes(e.resolution.state),
      ).length,
      salePriceExtracted: resolved.filter((e) => e.resolution.salePrice != null).length,
      verified: resolved.filter((e) => e.resolution.state === "VERIFIED").length,
      reviewRequired: resolved.filter((e) => e.resolution.state === "REVIEW_REQUIRED").length,
      conflicts: resolved.filter((e) => e.resolution.state === "CONFLICT").length,
      insufficientData: resolved.filter((e) => e.resolution.state === "INSUFFICIENT_DATA").length,
      licenseBlocked: queue.filter((q) => q.candidates.every((c) => !c.licensed)).length,
      fetchFailed: runs.filter((r) => r.status === "FAILED" || r.status === "FETCH_FAILED").length,
    };

    return {
      ok: true,
      version,
      queueSummary: summary,
      dashboard,
      queuePreview: queue.slice(0, 25).map((q) => ({
        priority: q.priority,
        propertyId: q.propertyId,
        auctionEventId: q.auctionEventId,
        town: q.town,
        agency: q.agency,
        reason: q.reason,
        candidateCount: q.candidates.length,
        identityStrength: q.identityStrength,
        sourceUrl: q.sourceUrl,
      })),
      recentRuns: runs.slice(0, 10),
      publicSafety: safety,
    };
  }

  static async acquireOne(input: {
    propertyId: string;
    force?: boolean;
    dryRun?: boolean;
    operator?: string | null;
    runId?: string;
  }): Promise<Hea43AcquireResult> {
    const runId = input.runId ?? `hea43_${Date.now().toString(36)}`;
    const scored = await HistoricalIntelligence40Service.loadScoredEvents();
    const match = scored.find((e) => e.observation.listingPropertyId === input.propertyId);
    if (!match) {
      return {
        ok: false,
        dryRun: input.dryRun === true,
        propertyId: input.propertyId,
        auctionEventId: null,
        state: "INSUFFICIENT_DATA",
        outcome: null,
        salePrice: null,
        resolutionState: null,
        message: "Historical event not found for property",
        candidates: [],
        evidence: null,
      };
    }

    const runs = await HistoricalEnrichmentRepository.listRecentRuns(50);
    const reviews = await HistoricalEnrichmentRepository.listOpenReviews(50);
    const lastRun =
      runs.find((r) => r.property_id === input.propertyId) ?? null;
    const openReview = reviews.some(
      (r) =>
        r.status === "open" &&
        (r.property_id === input.propertyId ||
          r.auction_event_id === match.observation.auctionEventId),
    );

    const plan = planAcquisition({
      event: match.observation,
      dryRun: input.dryRun === true,
      lastRunStatus: lastRun?.status ?? null,
      hasOpenReview: openReview,
    });

    if (input.dryRun) {
      return buildAcquireResult({
        propertyId: input.propertyId,
        auctionEventId: match.observation.auctionEventId,
        dryRun: true,
        outcome: match.classification.outcome,
        salePrice: match.classification.salePrice.salePrice,
        message: "DRY RUN — NOTHING WRITTEN",
        candidates: plan.discovery.candidates,
        evidence: buildDryRunEvidence(match.observation, plan.discovery.candidates),
        event: match.observation,
        classification: match.classification,
        score: match.score,
        openReview,
      });
    }

    if (plan.identityReviewRequired) {
      return buildAcquireResult({
        propertyId: input.propertyId,
        auctionEventId: match.observation.auctionEventId,
        dryRun: false,
        enrichmentStatus: "REVIEW_REQUIRED",
        outcome: null,
        salePrice: null,
        message: "IDENTITY_REVIEW_REQUIRED — weak identity match",
        candidates: plan.discovery.candidates,
        evidence: null,
        event: match.observation,
        classification: match.classification,
        score: match.score,
        openReview: true,
      });
    }

    if (!plan.fetchPlan.willFetch) {
      const state =
        plan.fetchPlan.reason.includes("License") ? "LICENSE_BLOCKED" : "SOURCE_NOT_FOUND";
      await HistoricalEvidenceRepository.recordAcquisitionRun({
        runId,
        propertyId: input.propertyId,
        propertyMasterId: match.observation.propertyMasterId,
        auctionEventId: match.observation.auctionEventId,
        status: state,
        sourceUrl: match.observation.sourceUrl,
        operator: input.operator ?? null,
      });
      return buildAcquireResult({
        propertyId: input.propertyId,
        auctionEventId: match.observation.auctionEventId,
        dryRun: false,
        enrichmentStatus: state,
        outcome: null,
        salePrice: null,
        message: plan.fetchPlan.reason,
        candidates: plan.discovery.candidates,
        evidence: null,
        event: match.observation,
        classification: match.classification,
        score: match.score,
      });
    }

    const enrich = await HistoricalEnrichmentService.enrichProperty({
      propertyId: input.propertyId,
      force: input.force,
      operator: input.operator ?? "hea43",
      runId,
    });

    const obsRows = await OutcomeIntelligenceRepository.listByProperty(input.propertyId);
    const outcomeObs = obsRows[0] ?? null;
    const evidence = buildEvidenceObject({
      eventId: match.observation.auctionEventId,
      propertyMasterId: match.observation.propertyMasterId,
      listingPropertyId: input.propertyId,
      sourceUrl: match.observation.sourceUrl,
      sourceSnapshotId: lastRun?.snapshot_id ?? null,
      sourceType: plan.discovery.candidates[0]?.sourceType ?? null,
      evidenceText: outcomeObs?.evidence_text ?? null,
      extractedOutcome: enrich.outcome,
      extractedSalePrice: enrich.salePrice,
      confidence: outcomeObs?.confidence ?? null,
      identityConfidence: match.observation.propertyMasterId ? "HIGH" : "MEDIUM",
    });

    await HistoricalEvidenceRepository.recordAcquisitionRun({
      runId,
      propertyId: input.propertyId,
      propertyMasterId: match.observation.propertyMasterId,
      auctionEventId: match.observation.auctionEventId,
      status: enrich.status,
      sourceUrl: match.observation.sourceUrl,
      outcome: enrich.outcome,
      salePrice: enrich.salePrice,
      operator: input.operator ?? null,
      meta: { resolutionPending: true },
    });

    LoggerService.audit("historical.evidence43.acquire", {
      propertyId: input.propertyId,
      runId,
      status: enrich.status,
      outcome: enrich.outcome,
      salePrice: enrich.salePrice,
    });

    const conflicts = await OutcomeIntelligenceRepository.listOpenConflicts(50);
    const openConflict = conflicts.some(
      (c) =>
        c.auction_event_id === match.observation.auctionEventId ||
        c.property_master_id === match.observation.propertyMasterId,
    );

    return buildAcquireResult({
      propertyId: input.propertyId,
      auctionEventId: match.observation.auctionEventId,
      dryRun: false,
      enrichmentStatus: enrich.status,
      outcome: enrich.outcome,
      salePrice: enrich.salePrice,
      message: enrich.message,
      candidates: plan.discovery.candidates,
      evidence,
      event: match.observation,
      outcomeObs,
      classification: match.classification,
      score: match.score,
      openConflict,
      openReview,
    });
  }

  static async acquireBatch(input: Hea43QueueFilters & {
    limit?: number;
    force?: boolean;
    dryRun?: boolean;
    operator?: string | null;
    priority?: Hea43QueuePriority;
  }): Promise<Hea43BatchResult> {
    const limit = Math.min(
      Math.max(input.limit ?? HEA43_DEFAULT_BATCH_LIMIT, 1),
      HEA43_MAX_BATCH_LIMIT,
    );
    const runId = input.dryRun
      ? `hea43_dry_${Date.now().toString(36)}`
      : `hea43_${Date.now().toString(36)}`;
    const { queue } = await this.buildQueue(input);
    const selected = queue.slice(0, limit);
    const results: Hea43AcquireResult[] = [];

    for (const item of selected) {
      results.push(
        await this.acquireOne({
          propertyId: item.propertyId,
          force: input.force,
          dryRun: input.dryRun,
          operator: input.operator,
          runId,
        }),
      );
    }

    const funnel = buildHea43Funnel({ queue: selected, results });

    return {
      ok: true,
      runId,
      dryRun: input.dryRun === true,
      version: HISTORICAL_EVIDENCE_ACQUISITION43_VERSION,
      processed: results.length,
      funnel,
      results,
      message: input.dryRun
        ? `DRY RUN — NOTHING WRITTEN — would process ${results.length} event(s)`
        : `Processed ${results.length} historical evidence acquisition run(s)`,
    };
  }
}
