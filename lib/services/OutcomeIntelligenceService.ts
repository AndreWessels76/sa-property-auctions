import "server-only";

import { SubscriptionService } from "@/lib/subscription/SubscriptionService";
import {
  publicHistoricalRows,
  type HistoricalEventObservation,
  type TimeWindow,
} from "@/lib/intelligence/historical";
import { HistoricalIntelligenceService } from "./HistoricalIntelligenceService";
import { PricingObservationRepository } from "@/lib/repositories/PricingObservationRepository";
import { OutcomeIntelligenceRepository } from "@/lib/repositories/OutcomeIntelligenceRepository";
import {
  OUTCOME_INTELLIGENCE_VERSION,
  classifyObservations,
  buildMarketPerformanceReport,
  buildPropertyHistoryChain,
  buildMasterPriceChange,
  detectOutcomeConflicts,
  buildMonthlyTimeSeries,
  buildQuarterlyTimeSeries,
  outcomeCacheKey,
  dataVersionFromCorpus,
  type OutcomeClassification,
} from "@/lib/intelligence/outcomes";

function filterTown(rows: HistoricalEventObservation[], town: string) {
  const needle = town.trim().toLowerCase();
  return rows.filter((o) => o.town?.trim().toLowerCase() === needle);
}

function filterAgency(rows: HistoricalEventObservation[], agency: string) {
  const needle = agency.trim().toLowerCase();
  return rows.filter((o) => {
    const a = (o.agency ?? o.sourceName ?? "").trim().toLowerCase();
    return a === needle;
  });
}

export class OutcomeIntelligenceService {
  static async loadCorpus() {
    const observations = await HistoricalIntelligenceService.loadObservations();
    const pricingObs = await PricingObservationRepository.listRecent(5000);
    return { observations, pricingObs };
  }

  static async marketOverview(window?: TimeWindow) {
    const premium = await SubscriptionService.premium();
    const { observations, pricingObs } = await this.loadCorpus();
    const historical = publicHistoricalRows(observations);
    const report = buildMarketPerformanceReport({
      observations: historical,
      scope: "market",
      window: premium ? window ?? "all" : "12m",
      premium,
      pricingObservations: pricingObs,
    });
    const classifications = classifyObservations(historical, pricingObs);
    const conflicts = detectOutcomeConflicts(classifications);
    const latest = historical.reduce<string | null>((acc, r) => {
      if (!r.auctionDate) return acc;
      if (!acc || r.auctionDate > acc) return r.auctionDate;
      return acc;
    }, null);

    return {
      premium,
      version: OUTCOME_INTELLIGENCE_VERSION,
      report,
      conflicts: conflicts.slice(0, 20),
      cacheKey: outcomeCacheKey({
        scope: "market",
        scopeId: "all",
        dataVersion: dataVersionFromCorpus(historical.length, latest),
      }),
    };
  }

  static async forTown(town: string, window?: TimeWindow) {
    const premium = await SubscriptionService.premium();
    const { observations, pricingObs } = await this.loadCorpus();
    const scoped = filterTown(publicHistoricalRows(observations), town);
    const report = buildMarketPerformanceReport({
      observations: scoped,
      scope: `town:${town}`,
      window: premium ? window ?? "all" : "12m",
      premium,
      pricingObservations: pricingObs,
    });
    return { premium, town, report };
  }

  static async timeSeriesForTown(town: string) {
    const premium = await SubscriptionService.premium();
    const { observations, pricingObs } = await this.loadCorpus();
    const scoped = filterTown(publicHistoricalRows(observations), town);
    const classifications = classifyObservations(scoped, pricingObs);
    return {
      premium,
      town,
      monthly: premium ? buildMonthlyTimeSeries(classifications) : [],
      quarterly: premium ? buildQuarterlyTimeSeries(buildMonthlyTimeSeries(classifications)) : [],
    };
  }

  static async forAgency(agency: string, window?: TimeWindow) {
    const premium = await SubscriptionService.premium();
    const { observations, pricingObs } = await this.loadCorpus();
    const scoped = filterAgency(publicHistoricalRows(observations), agency);
    const report = buildMarketPerformanceReport({
      observations: scoped,
      scope: `agency:${agency}`,
      window: premium ? window ?? "all" : "12m",
      premium,
      pricingObservations: pricingObs,
    });
    return { premium, agency, report };
  }

  static async forEventOrProperty(id: string) {
    const { observations, pricingObs } = await this.loadCorpus();
    const match =
      observations.find((o) => o.auctionEventId === id || o.listingPropertyId === id) ??
      observations.find((o) => o.propertyMasterId === id);
    if (!match) {
      return { ok: false as const, error: "Outcome record not found", status: 404 };
    }
    const classifications = classifyObservations([match], pricingObs);
    return { ok: true as const, classification: classifications[0]! };
  }

  static async propertyHistory(propertyId: string, masterId?: string | null) {
    const premium = await SubscriptionService.premium();
    const { observations, pricingObs } = await this.loadCorpus();
    const master =
      masterId ??
      observations.find((o) => o.listingPropertyId === propertyId)?.propertyMasterId ??
      null;
    if (!master) {
      return {
        ok: false as const,
        error: "No Property Master linked",
        status: 404,
      };
    }
    const chain = buildPropertyHistoryChain(master, observations, pricingObs);
    const priceChange = premium
      ? buildMasterPriceChange(
          master,
          classifyObservations(
            publicHistoricalRows(observations).filter((o) => o.propertyMasterId === master),
            pricingObs,
          ),
        )
      : null;
    return { ok: true as const, premium, chain, priceChange };
  }

  static async adminAudit() {
    const { observations, pricingObs } = await this.loadCorpus();
    const historical = publicHistoricalRows(observations);
    const classifications = classifyObservations(historical, pricingObs);
    const conflicts = detectOutcomeConflicts(classifications);
    const dbConflicts = await OutcomeIntelligenceRepository.listOpenConflicts(50);
    const perf = buildMarketPerformanceReport({
      observations: historical,
      scope: "admin",
      pricingObservations: pricingObs,
    });

    return {
      version: OUTCOME_INTELLIGENCE_VERSION,
      eventsScanned: historical.length,
      performance: perf.performance,
      coverage: perf.coverage,
      salePricesFound: classifications.filter((c) => c.salePrice.salePrice != null).length,
      conflictsDetected: conflicts.length,
      conflictsOpen: dbConflicts.length,
      needsReview: conflicts.length + dbConflicts.length,
      persistedObservations: await OutcomeIntelligenceRepository.countObservations(),
      classifications: classifications.slice(0, 50).map(summarizeClassification),
    };
  }

  static async reviewConflict(input: {
    conflictId: string;
    action: "confirm_a" | "confirm_b" | "reject" | "resolve";
    operator: string;
    note?: string;
  }) {
    const statusMap = {
      confirm_a: "confirmed_a",
      confirm_b: "confirmed_b",
      reject: "rejected",
      resolve: "resolved",
    } as const;
    const row = await OutcomeIntelligenceRepository.resolveConflict(input.conflictId, {
      status: statusMap[input.action],
      reviewedBy: input.operator,
      resolutionNote: input.note,
    });
    if (!row) return { ok: false as const, error: "Conflict not found or schema unavailable" };
    return { ok: true as const, conflict: row };
  }
}

function summarizeClassification(c: OutcomeClassification) {
  return {
    observationId: c.observationId,
    outcome: c.outcome,
    confirmed: c.confirmed,
    salePrice: c.salePrice.salePrice,
    conflict: c.salePrice.conflict,
    sourceUrl: c.outcomeEvidence.sourceUrl,
  };
}
