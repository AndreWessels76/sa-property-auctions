import "server-only";

import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import { publicHistoricalRows } from "@/lib/intelligence/historical";
import { classifyObservations } from "@/lib/intelligence/outcomes";
import {
  buildCoverageDashboard,
  dataVersionFromEvents,
  evidenceHashFromScores,
  hi40CacheKey,
  HISTORICAL_INTELLIGENCE40_VERSION,
  HI40_MINIMUM_MARKET_SALES,
  invalidationScopes,
  scoreHistoricalEvidence,
  type HistoricalEvidenceScore,
  type PropertyHistoricalPerformance,
  type ScoredEvent,
} from "@/lib/intelligence/historicalEvidence";
import { pricePerHa, pricePerM2 } from "@/lib/intelligence/comparables/priceMetrics";
import { buildSaleEvidence } from "@/lib/intelligence/comparables/saleEvidence";
import { HistoricalIntelligenceService } from "./HistoricalIntelligenceService";
import { ComparableIntelligenceService } from "./ComparableIntelligenceService";
import { OutcomeIntelligenceService } from "./OutcomeIntelligenceService";
import { HistoricalEnrichmentService } from "./HistoricalEnrichmentService";
import { PricingObservationRepository } from "@/lib/repositories/PricingObservationRepository";
import { OutcomeIntelligenceRepository } from "@/lib/repositories/OutcomeIntelligenceRepository";
import { PropertyRepository } from "@/lib/repositories/PropertyRepository";
import { LoggerService } from "@/lib/logger";

export class HistoricalIntelligence40Service {
  static async loadScoredEvents(): Promise<ScoredEvent[]> {
    const observations = await HistoricalIntelligenceService.loadObservations();
    const historical = publicHistoricalRows(observations);
    const pricingObs = await PricingObservationRepository.listRecent(5000);
    const classifications = classifyObservations(historical, pricingObs);
    const byId = new Map(classifications.map((c) => [c.observationId, c]));

    return historical.map((obs) => {
      const classification = byId.get(obs.observationId)!;
      return {
        observation: obs,
        classification,
        score: scoreHistoricalEvidence(obs, classification, pricingObs),
      };
    });
  }

  static async evidenceForProperty(propertyId: string) {
    const events = await this.loadScoredEvents();
    const related = events.filter(
      (e) =>
        e.observation.listingPropertyId === propertyId ||
        e.score.propertyMasterId ===
          events.find((x) => x.observation.listingPropertyId === propertyId)?.score
            .propertyMasterId,
    );
    return {
      version: HISTORICAL_INTELLIGENCE40_VERSION,
      propertyId,
      events: related.map((e) => e.score),
    };
  }

  static async evidenceOverview() {
    const events = await this.loadScoredEvents();
    const scores = events.map((e) => e.score);
    const latestDate = events.reduce<string | null>((acc, e) => {
      const d = e.observation.auctionDate;
      if (!d) return acc;
      return !acc || d > acc ? d : acc;
    }, null);
    const dataVersion = dataVersionFromEvents(
      events.length,
      latestDate,
      evidenceHashFromScores(scores),
    );
    return {
      version: HISTORICAL_INTELLIGENCE40_VERSION,
      coverage: buildCoverageDashboard(events),
      cacheKey: hi40CacheKey({ scope: "market", scopeId: "global", dataVersion }),
      events: scores.slice(0, 100),
    };
  }

  static async propertyPerformance(propertyId: string): Promise<PropertyHistoricalPerformance> {
    const events = await this.loadScoredEvents();
    const masterEvents = events.filter(
      (e) => e.observation.listingPropertyId === propertyId,
    );
    const masterId = masterEvents[0]?.score.propertyMasterId ?? null;
    const chain = masterId
      ? events.filter((e) => e.observation.propertyMasterId === masterId)
      : masterEvents;

    const comparables = await ComparableIntelligenceService.forProperty(propertyId).catch(
      () => null,
    );

    const limitations: string[] = [];
    const verifiedSalePrices = chain.filter(
      (e) => e.classification.outcome === "SOLD" && e.classification.salePrice.salePrice != null,
    ).length;

    if (verifiedSalePrices < HI40_MINIMUM_MARKET_SALES) {
      limitations.push("Insufficient verified sales for market statistics");
    }

    const subject = chain.find((e) => e.observation.listingPropertyId === propertyId);
    const saleObsRow = subject?.observation ?? chain[0]?.observation;
    const saleEv = saleObsRow
      ? buildSaleEvidence(saleObsRow)
      : buildSaleEvidence(
          {
            observationId: "none",
            sourceUnit: "listing_fallback",
            auctionEventId: null,
            propertyMasterId: masterId,
            listingPropertyId: propertyId,
            state: "unknown",
            outcomeSupplied: false,
            auctionDate: null,
            dateKind: "not_supplied",
            agency: null,
            sourceName: null,
            sourceUrl: null,
            verificationState: null,
            verified: false,
            conflict: false,
            propertyType: null,
            propertyTypeStatus: "needs_verification",
            marketCategory: "Needs verification",
            agriculturalSubtype: null,
            province: null,
            municipality: null,
            town: null,
            suburb: null,
            farmName: null,
            floorSizeM2: null,
            hectares: null,
            hectaresApproximate: false,
            bedrooms: null,
            bathrooms: null,
            prices: {
              sale_price: null,
              auction_price: null,
              guide_price: null,
              reserve_price: null,
              estimated_value: null,
              starting_bid: null,
            },
            exclusionReasons: [],
          },
        );
    const ppm2 = pricePerM2(saleEv, saleObsRow?.floorSizeM2 ?? null);
    const ppha = pricePerHa(
      saleEv,
      saleObsRow?.hectares ?? null,
      saleObsRow?.hectaresApproximate ?? false,
    );

    const overall =
      chain.length > 0
        ? chain.reduce<HistoricalEvidenceScore["overallConfidence"]>((best, e) => {
            const order = { HIGH: 3, MEDIUM: 2, LOW: 1, INSUFFICIENT: 0 };
            return order[e.score.overallConfidence] > order[best]
              ? e.score.overallConfidence
              : best;
          }, "INSUFFICIENT")
        : "INSUFFICIENT";

    return {
      propertyId,
      propertyMasterId: masterId,
      recordedAuctionEvents: chain.length,
      historicalOutcomes: chain.map((e) => ({
        auctionDate: e.observation.auctionDate,
        outcome: e.classification.outcome,
        salePrice: e.classification.salePrice.salePrice,
        evidenceConfidence: e.score.overallConfidence,
        sourceUrl: e.observation.sourceUrl,
      })),
      verifiedSalePrices,
      pricePerM2: {
        calculable: ppm2.calculable,
        value: ppm2.value,
        reason: ppm2.reason,
      },
      pricePerHa: {
        calculable: ppha.calculable,
        value: ppha.value,
        approximate: ppha.approximate,
        reason: ppha.reason,
      },
      comparableCount: comparables?.ok ? comparables.comparables.comparables.length : 0,
      comparableConfidence: comparables?.ok ? comparables.comparables.confidence : "Insufficient data",
      historicalEvidenceConfidence: overall,
      limitations,
    };
  }

  static async adminCoverage() {
    const events = await this.loadScoredEvents();
    const coverage = buildCoverageDashboard(events);
    const queue = await HistoricalEnrichmentService.buildQueue();
    return {
      ok: true,
      version: HISTORICAL_INTELLIGENCE40_VERSION,
      coverage,
      queueSummary: queue.summary,
      acquisitionGaps: events
        .filter((e) => e.score.acquisitionGaps.length > 0)
        .slice(0, 50)
        .map((e) => ({
          propertyId: e.observation.listingPropertyId,
          gaps: e.score.acquisitionGaps,
          priority: e.score.acquisitionGaps.includes("outcome") ? 1 : 2,
        })),
    };
  }

  static async adminConflicts() {
    const dbConflicts = await OutcomeIntelligenceRepository.listOpenConflicts(100);
    const reviews = await OutcomeIntelligenceRepository.listRecent(5000);
    return {
      ok: true,
      version: HISTORICAL_INTELLIGENCE40_VERSION,
      openConflicts: dbConflicts.length,
      conflicts: dbConflicts,
      persistedObservations: reviews.length,
    };
  }

  static async rebuild(operator: string) {
    const enrichment = await HistoricalEnrichmentService.rebuildIntelligence();
    const events = await this.loadScoredEvents();
    const coverage = buildCoverageDashboard(events);
    const scopes = invalidationScopes({});
    LoggerService.audit("hi40.rebuild", { operator, ...coverage, scopes });
    return {
      ok: true,
      version: HISTORICAL_INTELLIGENCE40_VERSION,
      message: "Historical Intelligence 4.0 corpus rebuilt from persisted evidence",
      enrichment,
      coverage,
      invalidatedScopes: scopes,
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
    return { publicCatalogueLeaks: leaks.length, samples: leaks.slice(0, 5).map((p) => p.id) };
  }
}
