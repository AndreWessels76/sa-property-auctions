import "server-only";

import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import {
  assessEvidenceQuality,
  buildQualityDashboard,
  buildQualityReviewQueue,
  queueSummary,
  HISTORICAL_EVIDENCE_QUALITY44_VERSION,
  type EvidenceQualityAssessment,
  type QualityReviewPayload,
  type QualityReviewAction,
} from "@/lib/intelligence/historicalEvidenceQuality";
import { HistoricalIntelligence42Service } from "./HistoricalIntelligence42Service";
import { HistoricalEvidenceAcquisition43Service } from "./HistoricalEvidenceAcquisition43Service";
import { HistoricalEnrichmentService } from "./HistoricalEnrichmentService";
import { HistoricalIntelligence40Service } from "./HistoricalIntelligence40Service";
import { LoggerService } from "@/lib/logger";
import { OutcomeIntelligenceRepository } from "@/lib/repositories/OutcomeIntelligenceRepository";
import { HistoricalEnrichmentRepository } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { HistoricalEvidenceQualityRepository } from "@/lib/repositories/HistoricalEvidenceQualityRepository";
import { PricingObservationRepository } from "@/lib/repositories/PricingObservationRepository";
import { PropertyRepository } from "@/lib/repositories/PropertyRepository";

export type QualityScoredEvent = Awaited<
  ReturnType<typeof HistoricalIntelligence42Service.loadResolvedEvents>
>[0] & {
  quality: EvidenceQualityAssessment;
};

export class HistoricalEvidenceQuality44Service {
  static async loadQualityEvents(): Promise<QualityScoredEvent[]> {
    const resolved = await HistoricalIntelligence42Service.loadResolvedEvents();
    const outcomeObs = await OutcomeIntelligenceRepository.listRecent(5000);
    const pricingObs = await PricingObservationRepository.listRecent(5000);
    const runs = await HistoricalEnrichmentRepository.listRecentRuns(500);
    const reviews = await HistoricalEnrichmentRepository.listOpenReviews(500);
    const conflicts = await OutcomeIntelligenceRepository.listOpenConflicts(200);

    const reviewSet = new Set(
      reviews.map((r) => `${r.property_id ?? ""}|${r.auction_event_id ?? ""}`),
    );
    const conflictSet = new Set(
      conflicts.map((c) => `${c.property_master_id ?? ""}|${c.auction_event_id ?? ""}`),
    );

    return resolved.map((e) => {
      const obs =
        outcomeObs.find(
          (o) =>
            (e.observation.auctionEventId &&
              o.auction_event_id === e.observation.auctionEventId) ||
            (e.observation.listingPropertyId &&
              o.listing_property_id === e.observation.listingPropertyId),
        ) ?? null;

      const propertyRuns = runs.filter(
        (r) => r.property_id === e.observation.listingPropertyId,
      );

      const reviewKey = `${e.observation.listingPropertyId ?? ""}|${e.observation.auctionEventId ?? ""}`;
      const conflictKey = `${e.observation.propertyMasterId ?? ""}|${e.observation.auctionEventId ?? ""}`;

      const quality = assessEvidenceQuality({
        event: e.observation,
        classification: e.classification,
        score: e.score,
        resolution: e.resolution,
        outcomeObs: obs,
        pricingObs,
        recentRuns: propertyRuns,
        openReview: reviewSet.has(reviewKey),
        openConflict: conflictSet.has(conflictKey) || e.observation.conflict,
      });

      return { ...e, quality };
    });
  }

  static async adminDashboard() {
    const events = await this.loadQualityEvents();
    const assessments = events.map((e) => e.quality);
    const queue = buildQualityReviewQueue(
      assessments,
      events.map((e) => ({
        observationId: e.observation.observationId,
        town: e.observation.town,
      })),
    );
    const dashboard = buildQualityDashboard({
      assessments,
      queue,
      totalHistorical: events.length,
    });
    const audits = await HistoricalEvidenceQualityRepository.listRecent(20);
    const safety = await this.publicSafetyCheck();

    return {
      ok: true,
      version: HISTORICAL_EVIDENCE_QUALITY44_VERSION,
      dashboard,
      queueSummary: queueSummary(queue),
      events: events.slice(0, 50).map((e) => ({
        observationId: e.observation.observationId,
        auctionEventId: e.observation.auctionEventId,
        listingPropertyId: e.observation.listingPropertyId,
        town: e.observation.town,
        overallQuality: e.quality.overallQuality,
        score: e.quality.score,
        outcome: e.resolution.outcome,
        salePrice: e.resolution.salePrice,
        reviewPriority: e.quality.reviewPriority,
        comparableEligible: e.quality.comparableEligible,
        missingEvidence: e.quality.missingEvidence.slice(0, 5),
      })),
      queuePreview: queue.slice(0, 25),
      recentAudits: audits,
      publicSafety: safety,
    };
  }

  static async reviewForEvent(eventId: string): Promise<QualityReviewPayload | null> {
    const base = await HistoricalIntelligence42Service.reviewForEvent(eventId);
    if (!base) return null;

    const events = await this.loadQualityEvents();
    const match =
      events.find((e) => e.observation.auctionEventId === eventId) ??
      events.find((e) => e.observation.listingPropertyId === eventId) ??
      events.find((e) => e.observation.observationId === eventId);
    if (!match) return null;

    return {
      event: base.event,
      classification: base.classification,
      score: base.score,
      resolution: base.resolution,
      quality: match.quality,
      openReviews: base.openReviews,
      openConflicts: base.openConflicts,
    };
  }

  static async evidenceById(id: string) {
    const base = await HistoricalIntelligence42Service.evidenceById(id);
    if (!base) return null;

    const events = await this.loadQualityEvents();
    const match =
      events.find((e) => e.observation.observationId === id) ??
      events.find((e) => e.observation.listingPropertyId === id) ??
      events.find((e) => e.observation.auctionEventId === id);
    if (!match) return { ...base, qualityVersion: HISTORICAL_EVIDENCE_QUALITY44_VERSION };

    return {
      ...base,
      qualityVersion: HISTORICAL_EVIDENCE_QUALITY44_VERSION,
      quality: match.quality,
    };
  }

  static async forProperty(propertyId: string) {
    const events = await this.loadQualityEvents();
    const related = events.filter(
      (e) => e.observation.listingPropertyId === propertyId,
    );
    if (related.length === 0) return null;

    const primary = related[0]!;
    return {
      ok: true,
      version: HISTORICAL_EVIDENCE_QUALITY44_VERSION,
      propertyId,
      overallQuality: primary.quality.overallQuality,
      score: primary.quality.score,
      outcome: primary.quality.fields.find((f) => f.field === "auction_outcome"),
      salePrice: primary.quality.fields.find((f) => f.field === "sale_price"),
      identity: primary.quality.fields.find((f) => f.field === "identity"),
      source: primary.quality.sourceQuality,
      conflicts: primary.quality.conflicts,
      missingEvidence: primary.quality.missingEvidence,
      evidenceChain: primary.quality.evidenceChain,
      events: related.map((e) => ({
        auctionEventId: e.observation.auctionEventId,
        overallQuality: e.quality.overallQuality,
        outcome: e.resolution.outcome,
        salePrice: e.resolution.salePrice,
      })),
    };
  }

  static async reviewOne(input: {
    eventId: string;
    action: QualityReviewAction;
    field?: string;
    operator: string;
    reason?: string;
    reviewId?: string;
  }) {
    const review = await this.reviewForEvent(input.eventId);
    if (!review) return { ok: false, message: "Event not found" };

    const oldQuality = review.quality.overallQuality;
    let newQuality = oldQuality;
    let decision = input.action;

    switch (input.action) {
      case "approve_evidence":
        newQuality = "HIGH";
        if (input.reviewId) {
          await HistoricalEnrichmentRepository.resolveReview(input.reviewId, {
            status: "approved",
            reviewedBy: input.operator,
            resolutionNote: input.reason,
          });
        }
        break;
      case "reject_evidence":
        newQuality = "INSUFFICIENT_DATA";
        if (input.reviewId) {
          await HistoricalEnrichmentRepository.resolveReview(input.reviewId, {
            status: "rejected",
            reviewedBy: input.operator,
            resolutionNote: input.reason,
          });
        }
        break;
      case "mark_insufficient":
        newQuality = "INSUFFICIENT_DATA";
        break;
      case "resolve_conflict":
        newQuality = "REVIEW_REQUIRED";
        break;
      case "request_reacquisition":
        if (review.event.listingPropertyId) {
          await HistoricalEvidenceAcquisition43Service.acquireOne({
            propertyId: review.event.listingPropertyId,
            operator: input.operator,
            force: true,
          });
        }
        break;
      default:
        break;
    }

    const idempotencyKey = HistoricalEvidenceQualityRepository.buildIdempotencyKey({
      eventId: input.eventId,
      field: input.field ?? null,
      decision,
      actor: input.operator,
      qualityVersion: HISTORICAL_EVIDENCE_QUALITY44_VERSION,
    });

    const audit = await HistoricalEvidenceQualityRepository.recordAudit({
      auctionEventId: review.event.auctionEventId,
      propertyMasterId: review.event.propertyMasterId,
      listingPropertyId: review.event.listingPropertyId,
      reviewId: input.reviewId ?? null,
      field: input.field ?? null,
      oldState: oldQuality,
      newState: newQuality,
      decision,
      reason: input.reason ?? input.action,
      source: review.event.sourceUrl,
      actor: input.operator,
      qualityVersion: HISTORICAL_EVIDENCE_QUALITY44_VERSION,
      evidence: { quality: review.quality, resolution: review.resolution },
      idempotencyKey,
    });

    LoggerService.audit("heq44.review", {
      eventId: input.eventId,
      action: input.action,
      operator: input.operator,
      oldQuality,
      newQuality,
      auditId: audit?.id ?? null,
    });

    return {
      ok: true,
      oldQuality,
      newQuality,
      audit,
      message: `Quality review ${input.action} recorded`,
    };
  }

  static async runQualityAudit(operator: string) {
    const events = await this.loadQualityEvents();
    LoggerService.audit("heq44.quality_audit", {
      operator,
      total: events.length,
      reviewRequired: events.filter((e) => e.quality.reviewRequired).length,
    });
    return {
      ok: true,
      audited: events.length,
      message: `Quality audit completed for ${events.length} historical event(s)`,
    };
  }

  static async refreshP1Evidence(operator: string, limit = 5) {
    const result = await HistoricalEvidenceAcquisition43Service.acquireBatch({
      priority: 1,
      limit,
      operator,
    });
    return {
      ok: result.ok,
      processed: result.processed,
      message: result.message,
    };
  }

  static async rebuildHistoricalIntelligence(operator: string) {
    const hi42 = await HistoricalIntelligence42Service.rebuild(operator);
    const dashboard = await this.adminDashboard();
    return {
      ok: true,
      hi42,
      dashboard: dashboard.dashboard,
      message: "Historical intelligence rebuilt with quality assessment",
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
}
