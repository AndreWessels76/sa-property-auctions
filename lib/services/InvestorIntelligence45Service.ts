import "server-only";

import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import {
  buildAreaIntelligence45,
  buildAgencyIntelligence45,
  buildEvidenceChain,
  buildInvestorCacheKey,
  buildInvestorDashboard45,
  buildInvestorQuestions,
  buildInvestorSnapshot,
  buildMarketEvidenceSummary,
  buildMarketPosition,
  buildPriceEvidenceFields,
  buildTimeSeries,
  deriveDecisionStatus,
  detectAcquisitionGaps,
  detectTownGaps,
  INVESTOR_INTELLIGENCE45_VERSION,
  presentComparables,
  type AcquisitionGap,
  type AreaIntelligence45,
  type BuildContext,
  type InvestorIntelligenceResult,
  type TimeSeriesBucket,
} from "@/lib/intelligence/investorIntelligence45";
import { applyCompareAccess } from "@/lib/intelligence/compareAccess";
import { PropertyRepository } from "@/lib/repositories/PropertyRepository";
import { SubscriptionService } from "@/lib/subscription/SubscriptionService";
import { PermissionService } from "@/lib/auth";
import { LoggerService } from "@/lib/logger";
import { HistoricalIntelligence40Service } from "./HistoricalIntelligence40Service";
import { ComparableIntelligenceService } from "./ComparableIntelligenceService";
import { HistoricalEvidenceQuality44Service } from "./HistoricalEvidenceQuality44Service";

function ctxFromScored(
  scored: Awaited<ReturnType<typeof HistoricalIntelligence40Service.loadScoredEvents>>,
  filter?: (town: string | null, agency: string | null) => boolean,
): BuildContext {
  const filtered = filter
    ? scored.filter((e) => filter(e.observation.town, e.observation.agency))
    : scored;
  return {
    observations: filtered.map((e) => e.observation),
    scoredEvents: filtered.map((e) => ({
      observation: e.observation,
      classification: e.classification,
      score: e.score,
    })),
  };
}

function townContexts(
  scored: Awaited<ReturnType<typeof HistoricalIntelligence40Service.loadScoredEvents>>,
): Map<string, BuildContext> {
  const map = new Map<string, BuildContext>();
  for (const e of scored) {
    const town = e.observation.town?.trim();
    if (!town) continue;
    const existing = map.get(town) ?? { observations: [], scoredEvents: [], town };
    existing.observations.push(e.observation);
    existing.scoredEvents!.push({
      observation: e.observation,
      classification: e.classification,
      score: e.score,
    });
    map.set(town, existing);
  }
  return map;
}

export class InvestorIntelligence45Service {
  static async loadGlobalContext(): Promise<BuildContext> {
    const scored = await HistoricalIntelligence40Service.loadScoredEvents();
    return ctxFromScored(scored);
  }

  static async forProperty(propertyId: string): Promise<
    | { ok: false; error: string; status: number }
    | { ok: true; result: InvestorIntelligenceResult }
  > {
    const row = await PropertyRepository.getPublicById(propertyId);
    if (
      !row ||
      !isPubliclyActiveListing({
        verification_state: row.verification_state,
        data_classification: row.data_classification,
        listing_status: row.listing_status,
        status: row.status,
        auction_date: row.auction_date,
      })
    ) {
      return {
        ok: false,
        error: "Listing is not on the public catalogue (upcoming/live verified only).",
        status: 404,
      };
    }

    const premium = await SubscriptionService.premium();
    const scored = await HistoricalIntelligence40Service.loadScoredEvents();
    const masterId = row.property_master_id ?? null;

    const chain = scored.filter(
      (e) =>
        e.observation.listingPropertyId === propertyId ||
        (masterId && e.observation.propertyMasterId === masterId),
    );

    const ctx: BuildContext = {
      observations: chain.map((e) => e.observation),
      scoredEvents: chain.map((e) => ({
        observation: e.observation,
        classification: e.classification,
        score: e.score,
      })),
      town: row.town,
      agency: row.auction_agency,
    };

    const comparablesResult = await ComparableIntelligenceService.forProperty(propertyId);
    const compRows =
      comparablesResult.ok && premium
        ? comparablesResult.comparables.comparables
        : comparablesResult.ok
          ? applyCompareAccess(comparablesResult.comparables.comparables, false)
          : [];

    const compPrices = compRows
      .map((c) => c.saleEvidence.salePrice)
      .filter((p): p is number => p != null && p > 0);

    const summary = buildMarketEvidenceSummary(ctx);
    const position = buildMarketPosition(ctx, compPrices);
    const comparables = presentComparables(compRows);
    const { status: decisionStatus, reasons: decisionReasons } = deriveDecisionStatus(
      summary,
      position,
      ctx,
      compRows.length,
    );

    const subjectObs =
      chain.find((e) => e.observation.listingPropertyId === propertyId)?.observation ??
      chain[0]?.observation ??
      null;

    const priceEvidence = buildPriceEvidenceFields(row, subjectObs);
    const questions = buildInvestorQuestions({
      summary,
      comparableCount: compRows.length,
      comparableConfidence: comparablesResult.ok
        ? comparablesResult.comparables.confidence
        : "Insufficient data",
      previousAuctionCount: chain.length,
      provenPriceCount: summary.verifiedSalePriceCount,
    });

    const townCtx = ctxFromScored(
      scored,
      (t) => (row.town ? t?.toLowerCase() === row.town.toLowerCase() : false),
    );
    const ts = buildTimeSeries(townCtx, "monthly");
    const trendStatus =
      ts.some((b) => b.trendStatus === "TREND_AVAILABLE")
        ? "TREND_AVAILABLE"
        : "TREND_INSUFFICIENT_DATA";

    const snapshot = buildInvestorSnapshot({
      property: row,
      priceEvidence,
      summary,
      position,
      comparables,
      previousEvents: chain.length,
      outcomes: chain.map((e) => e.classification.outcome),
      evidenceQuality: chain[0]?.score.overallConfidence ?? null,
      trendStatus,
    });

    const evidenceVersion = String(summary.historicalEventCount);
    const cacheKey = buildInvestorCacheKey("property", propertyId, evidenceVersion);

    return {
      ok: true,
      result: {
        version: INVESTOR_INTELLIGENCE45_VERSION,
        cacheKey,
        calculatedAt: new Date().toISOString(),
        propertyId,
        premium,
        decisionStatus,
        decisionReasons,
        marketEvidenceSummary: summary,
        marketPosition: position,
        snapshot,
        questions,
        comparables,
        evidenceChain: buildEvidenceChain(masterId),
        conflicts:
          summary.conflictCount > 0
            ? [`${summary.conflictCount} open conflict(s) on linked evidence`]
            : [],
      },
    };
  }

  static async forArea(town: string): Promise<AreaIntelligence45> {
    const scored = await HistoricalIntelligence40Service.loadScoredEvents();
    const ctx = ctxFromScored(scored, (t) => t?.toLowerCase() === town.toLowerCase());
    return buildAreaIntelligence45({ ...ctx, town }, town);
  }

  static async forAgency(agency: string): Promise<ReturnType<typeof buildAgencyIntelligence45>> {
    const scored = await HistoricalIntelligence40Service.loadScoredEvents();
    const ctx = ctxFromScored(
      scored,
      (_t, a) => a?.toLowerCase() === agency.toLowerCase(),
    );
    return buildAgencyIntelligence45({ ...ctx, agency }, agency);
  }

  static async forTownTimeSeries(
    town: string,
    kind: "monthly" | "quarterly" | "yearly" = "monthly",
  ): Promise<TimeSeriesBucket[]> {
    const scored = await HistoricalIntelligence40Service.loadScoredEvents();
    const ctx = ctxFromScored(scored, (t) => t?.toLowerCase() === town.toLowerCase());
    return buildTimeSeries({ ...ctx, town }, kind);
  }

  static async adminDashboard() {
    const scored = await HistoricalIntelligence40Service.loadScoredEvents();
    const globalCtx = ctxFromScored(scored);
    const towns = townContexts(scored);
    const dashboard = buildInvestorDashboard45(globalCtx, towns);
    const gaps = detectTownGaps(towns);
    const safety = await HistoricalEvidenceQuality44Service.publicSafetyCheck();

    return {
      ok: true,
      version: INVESTOR_INTELLIGENCE45_VERSION,
      dashboard,
      gapsPreview: gaps.slice(0, 20),
      publicSafety: safety,
    };
  }

  static async listGaps(): Promise<AcquisitionGap[]> {
    const scored = await HistoricalIntelligence40Service.loadScoredEvents();
    return detectTownGaps(townContexts(scored));
  }

  static async runMarketIntelligenceAudit(operator: string) {
    const dashboard = await this.adminDashboard();
    LoggerService.audit("ii45.market_audit", { operator, dashboard: dashboard.dashboard });
    return {
      ok: true,
      message: "Market intelligence audit complete (read-only).",
      dashboard: dashboard.dashboard,
      publicSafety: dashboard.publicSafety,
    };
  }

  static async rebuildInvestorIntelligence(operator: string) {
    const scored = await HistoricalIntelligence40Service.loadScoredEvents();
    const summary = buildMarketEvidenceSummary(ctxFromScored(scored));
    LoggerService.audit("ii45.rebuild", {
      operator,
      events: summary.historicalEventCount,
      verifiedSalePrices: summary.verifiedSalePriceCount,
    });
    return {
      ok: true,
      message: "Investor intelligence rebuilt from existing evidence (no acquisition).",
      summary,
      version: INVESTOR_INTELLIGENCE45_VERSION,
    };
  }

  static async refreshInsufficientDataQueue(operator: string) {
    const gaps = await this.listGaps();
    LoggerService.audit("ii45.gap_queue", { operator, gapCount: gaps.length });
    return {
      ok: true,
      message: "Insufficient data queue refreshed — routes to HDA/HEA acquisition.",
      gaps: gaps.slice(0, 50),
      note: "Reuse Historical Evidence Acquisition 4.3 queue — no duplicate queue created.",
    };
  }

  static async publicSafetyCheck() {
    return HistoricalEvidenceQuality44Service.publicSafetyCheck();
  }

  static async isAdminBypass(): Promise<boolean> {
    try {
      await PermissionService.requireAdmin();
      return true;
    } catch {
      return false;
    }
  }
}
