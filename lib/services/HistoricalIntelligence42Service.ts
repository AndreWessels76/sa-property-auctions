import "server-only";

import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import {
  buildResolutionDashboard,
  HISTORICAL_INTELLIGENCE42_VERSION,
  HISTORICAL_RESOLUTION_VERSION,
  resolveHistoricalEvent,
  type HistoricalEventResolution,
  type ResolutionReviewPayload,
} from "@/lib/intelligence/historicalResolution";
import { HistoricalIntelligence40Service } from "./HistoricalIntelligence40Service";
import { HistoricalEnrichmentService } from "./HistoricalEnrichmentService";
import { LoggerService } from "@/lib/logger";
import { OutcomeIntelligenceRepository } from "@/lib/repositories/OutcomeIntelligenceRepository";
import { HistoricalEnrichmentRepository } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { HistoricalResolutionRepository } from "@/lib/repositories/HistoricalResolutionRepository";
import { PropertyRepository } from "@/lib/repositories/PropertyRepository";
import type { AdminResolutionAction } from "@/lib/intelligence/historicalResolution/types";

export type ResolvedEvent = {
  observation: Awaited<ReturnType<typeof HistoricalIntelligence40Service.loadScoredEvents>>[0]["observation"];
  classification: Awaited<ReturnType<typeof HistoricalIntelligence40Service.loadScoredEvents>>[0]["classification"];
  score: Awaited<ReturnType<typeof HistoricalIntelligence40Service.loadScoredEvents>>[0]["score"];
  resolution: HistoricalEventResolution;
};

export class HistoricalIntelligence42Service {
  static async loadResolvedEvents(): Promise<ResolvedEvent[]> {
    const scored = await HistoricalIntelligence40Service.loadScoredEvents();
    const outcomeObs = await OutcomeIntelligenceRepository.listRecent(5000);
    const reviews = await HistoricalEnrichmentRepository.listOpenReviews(500);
    const conflicts = await OutcomeIntelligenceRepository.listOpenConflicts(200);

    const obsByListing = new Map<string, (typeof outcomeObs)[0]>();
    for (const o of outcomeObs) {
      const key = o.listing_property_id ?? o.auction_event_id ?? o.id;
      if (!obsByListing.has(key)) obsByListing.set(key, o);
    }

    const reviewSet = new Set(
      reviews.map((r) => `${r.property_id ?? ""}|${r.auction_event_id ?? ""}`),
    );
    const conflictSet = new Set(
      conflicts.map((c) => `${c.property_master_id ?? ""}|${c.auction_event_id ?? ""}`),
    );

    return scored.map((e) => {
      const obs =
        outcomeObs.find(
          (o) =>
            (e.observation.auctionEventId && o.auction_event_id === e.observation.auctionEventId) ||
            (e.observation.listingPropertyId &&
              o.listing_property_id === e.observation.listingPropertyId),
        ) ?? null;
      const reviewKey = `${e.observation.listingPropertyId ?? ""}|${e.observation.auctionEventId ?? ""}`;
      const conflictKey = `${e.observation.propertyMasterId ?? ""}|${e.observation.auctionEventId ?? ""}`;

      const resolution = resolveHistoricalEvent({
        observation: e.observation,
        classification: e.classification,
        score: e.score,
        outcomeObs: obs,
        openConflict: conflictSet.has(conflictKey) || e.observation.conflict,
        openReview: reviewSet.has(reviewKey),
      });

      return { ...e, resolution };
    });
  }

  static async adminDashboard() {
    const events = await this.loadResolvedEvents();
    const dashboard = buildResolutionDashboard(events.map((e) => e.resolution));
    const audits = await HistoricalResolutionRepository.listRecent(20);
    const safety = await this.publicSafetyCheck();
    return {
      ok: true,
      version: HISTORICAL_INTELLIGENCE42_VERSION,
      resolverVersion: HISTORICAL_RESOLUTION_VERSION,
      dashboard,
      events: events.slice(0, 50).map((e) => ({
        observationId: e.observation.observationId,
        auctionEventId: e.observation.auctionEventId,
        propertyMasterId: e.observation.propertyMasterId,
        listingPropertyId: e.observation.listingPropertyId,
        town: e.observation.town,
        outcome: e.resolution.outcome,
        state: e.resolution.state,
        label: e.resolution.label,
        salePrice: e.resolution.salePrice,
        evidenceQuality: e.resolution.evidenceQuality,
        comparableEligible: e.resolution.comparableEligible,
        recommendedAction: e.resolution.recommendedAction,
      })),
      recentAudits: audits,
      publicSafety: safety,
    };
  }

  static async reviewForEvent(eventId: string): Promise<ResolutionReviewPayload | null> {
    const events = await this.loadResolvedEvents();
    const match =
      events.find((e) => e.observation.auctionEventId === eventId) ??
      events.find((e) => e.observation.listingPropertyId === eventId) ??
      events.find((e) => e.observation.observationId === eventId);
    if (!match) return null;

    const reviews = await HistoricalEnrichmentRepository.listOpenReviews(100);
    const conflicts = await OutcomeIntelligenceRepository.listOpenConflicts(100);
    const relatedReviews = reviews.filter(
      (r) =>
        r.auction_event_id === match.observation.auctionEventId ||
        r.property_id === match.observation.listingPropertyId,
    );
    const relatedConflicts = conflicts.filter(
      (c) =>
        c.auction_event_id === match.observation.auctionEventId ||
        c.property_master_id === match.observation.propertyMasterId,
    );

    return {
      event: match.observation,
      classification: match.classification,
      score: match.score,
      resolution: match.resolution,
      draft: null,
      openReviews: relatedReviews.map((r) => ({
        id: r.id,
        category: r.category,
        status: r.status,
        evidence_text: r.evidence_text,
      })),
      openConflicts: relatedConflicts.map((c) => ({
        id: c.id,
        claim_a: c.claim_a,
        claim_b: c.claim_b,
        status: c.status,
      })),
    };
  }

  static async evidenceById(id: string) {
    const events = await this.loadResolvedEvents();
    const match =
      events.find((e) => e.observation.observationId === id) ??
      events.find((e) => e.observation.listingPropertyId === id) ??
      events.find((e) => e.observation.auctionEventId === id);
    if (!match) return null;
    return {
      version: HISTORICAL_INTELLIGENCE42_VERSION,
      resolverVersion: HISTORICAL_RESOLUTION_VERSION,
      ...match,
    };
  }

  static async resolveOne(input: {
    eventId: string;
    action: AdminResolutionAction;
    operator: string;
    note?: string;
  }) {
    const review = await this.reviewForEvent(input.eventId);
    if (!review) {
      return { ok: false, message: "Event not found" };
    }

    const oldState = review.resolution.state;
    let newState = oldState;
    let resolutionLabel = review.resolution.label;

    switch (input.action) {
      case "confirm_sold":
        newState = "VERIFIED";
        resolutionLabel = review.resolution.salePrice ? "VERIFIED_SOLD" : "SOLD_WITHOUT_PRICE";
        break;
      case "confirm_not_sold":
        newState = "VERIFIED";
        resolutionLabel = "VERIFIED_OUTCOME";
        break;
      case "confirm_sale_price":
        if (review.resolution.salePrice) {
          newState = "VERIFIED";
          resolutionLabel = "VERIFIED_SOLD";
        }
        break;
      case "reject_evidence":
        newState = "INSUFFICIENT_DATA";
        resolutionLabel = "NOT_SUPPLIED";
        break;
      case "rerun_extraction":
        if (review.event.listingPropertyId) {
          await HistoricalEnrichmentService.enrichProperty({
            propertyId: review.event.listingPropertyId,
            operator: input.operator,
          });
        }
        break;
      default:
        break;
    }

    const audit = await HistoricalResolutionRepository.recordAudit({
      auctionEventId: review.event.auctionEventId,
      propertyMasterId: review.event.propertyMasterId,
      listingPropertyId: review.event.listingPropertyId,
      oldState,
      newState,
      resolutionLabel,
      actor: input.operator,
      resolverVersion: HISTORICAL_RESOLUTION_VERSION,
      reason: input.note ?? input.action,
      evidence: {
        outcome: review.resolution.outcome,
        salePrice: review.resolution.salePrice,
        provenance: review.resolution.provenance,
      },
      idempotencyKey: HistoricalResolutionRepository.buildIdempotencyKey({
        listingPropertyId: review.event.listingPropertyId,
        auctionEventId: review.event.auctionEventId,
        sourceHash: review.resolution.provenance.sourceHash,
        newState,
        resolverVersion: HISTORICAL_RESOLUTION_VERSION,
      }),
    });

    LoggerService.audit("hi42.resolution", {
      eventId: input.eventId,
      action: input.action,
      operator: input.operator,
      oldState,
      newState,
      auditId: audit?.id ?? null,
    });

    return {
      ok: true,
      oldState,
      newState,
      resolutionLabel,
      audit,
      message: `Resolution action ${input.action} recorded`,
    };
  }

  static async resolveBatch(input: {
    limit?: number;
    operator: string;
    action?: AdminResolutionAction;
  }) {
    const limit = input.limit ?? 10;
    const events = await this.loadResolvedEvents();
    const outcomeObs = await OutcomeIntelligenceRepository.listRecent(5000);
    const provenOutcomeByListing = new Set(
      outcomeObs
        .filter(
          (o) =>
            o.listing_property_id &&
            o.outcome &&
            !["UNKNOWN", "COMPLETED_UNKNOWN", "EXPIRED"].includes(o.outcome),
        )
        .map((o) => o.listing_property_id as string),
    );

    // Existing HI 4.2 queue first.
    const queue = events.filter(
      (e) =>
        e.resolution.state === "EXTRACTED" || e.resolution.state === "REVIEW_REQUIRED",
    );

    // When the admin queue is empty, resolve OUTCOME_MISSING / INSUFFICIENT_DATA
    // from existing snapshots only (no live fetch) — same path Ops maps to
    // "Resolve Evidence" for the OUTCOME_MISSING bottleneck.
    const insufficient = events.filter((e) => {
      const listingId = e.observation.listingPropertyId;
      if (!listingId) return false;
      if (e.resolution.state !== "INSUFFICIENT_DATA" && e.resolution.state !== "UNRESOLVED") {
        return false;
      }
      return !provenOutcomeByListing.has(listingId);
    });

    const ranked = [...queue, ...insufficient].slice(0, limit);

    const results = [];
    for (const c of ranked) {
      const listingId = c.observation.listingPropertyId;
      let enrichment: Awaited<
        ReturnType<typeof HistoricalEnrichmentService.enrichProperty>
      > | null = null;

      // Prefer existing snapshot text → DD + outcome persistence (no live fetch).
      if (listingId && input.action !== "confirm_sold" && input.action !== "confirm_not_sold") {
        enrichment = await HistoricalEnrichmentService.enrichProperty({
          propertyId: listingId,
          mode: "snapshot",
          operator: input.operator,
        });
      }

      const id =
        c.observation.auctionEventId ??
        c.observation.listingPropertyId ??
        c.observation.observationId;
      const r = await this.resolveOne({
        eventId: id,
        action: input.action ?? "resolve_one",
        operator: input.operator,
      });
      results.push({
        ...r,
        enrichment: enrichment
          ? {
              ok: enrichment.ok,
              status: enrichment.status,
              outcome: enrichment.outcome,
              salePrice: enrichment.salePrice,
              message: enrichment.message,
            }
          : null,
      });
    }

    return {
      ok: true,
      processed: results.length,
      results,
      message: `Batch resolution attempted for ${results.length} event(s)`,
    };
  }

  static async publicSafetyCheck() {
    const rows = await PropertyRepository.getAll();
    const leaks = (rows ?? []).filter((p) =>
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

  static async rebuild(operator: string) {
    const hi40 = await HistoricalIntelligence40Service.rebuild(operator);
    const events = await this.loadResolvedEvents();
    const dashboard = buildResolutionDashboard(events.map((e) => e.resolution));
    LoggerService.audit("hi42.rebuild", { operator, dashboard });
    return {
      ok: true,
      version: HISTORICAL_INTELLIGENCE42_VERSION,
      dashboard,
      hi40,
    };
  }
}
