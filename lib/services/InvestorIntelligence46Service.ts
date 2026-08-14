import "server-only";

import { InvestorIntelligence45Service } from "./InvestorIntelligence45Service";
import { HistoricalIntelligence40Service } from "./HistoricalIntelligence40Service";
import { ComparableIntelligenceService } from "./ComparableIntelligenceService";
import { HistoricalEvidenceQuality44Service } from "./HistoricalEvidenceQuality44Service";
import { PropertyRepository } from "@/lib/repositories/PropertyRepository";
import { PermissionService } from "@/lib/auth";
import { LoggerService } from "@/lib/logger";
import {
  buildAreaIntelligence46,
  buildAgencyIntelligence46,
  buildInvestor46CacheKey,
  buildInvestorDashboard46,
  buildResearchEvidenceSummary,
  buildResearchSnapshot,
  detectAcquisitionGaps46,
  INVESTOR_INTELLIGENCE46_VERSION,
  type AcquisitionGap46,
  type AreaIntelligence46,
  type AgencyIntelligence46,
  type InvestorIntelligence46Result,
} from "@/lib/intelligence/investorIntelligence46";
import { buildResearchInvestorLabels } from "@/lib/intelligence/investorIntelligence47";
import type { BuildContext } from "@/lib/intelligence/investorIntelligence45/types";

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

function propertyContextsFromScored(
  scored: Awaited<ReturnType<typeof HistoricalIntelligence40Service.loadScoredEvents>>,
): BuildContext[] {
  const byListing = new Map<string, BuildContext>();
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
  return [...byListing.values()];
}

export class InvestorIntelligence46Service {
  static async forProperty(propertyId: string): Promise<
    | { ok: false; error: string; status: number }
    | { ok: true; result: InvestorIntelligence46Result }
  > {
    const base = await InvestorIntelligence45Service.forProperty(propertyId);
    if (!base.ok) return base;

    const row = await PropertyRepository.getPublicById(propertyId);
    if (!row) {
      return { ok: false, error: "Property not found", status: 404 };
    }

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
    const rejectedCount = comparablesResult.ok
      ? comparablesResult.comparables.rejectedCandidates.length
      : 0;

    const subjectObs =
      chain.find((e) => e.observation.listingPropertyId === propertyId)?.observation ??
      chain[0]?.observation ??
      null;

    const hasConflict = base.result.marketEvidenceSummary.conflictCount > 0;
    const acquisitionGaps46 = detectAcquisitionGaps46({
      property: row,
      ctx,
      comparableCount: base.result.comparables.length,
      rejectedComparableCount: rejectedCount,
      hasConflict,
      historicalEventCount: chain.length,
    });

    const research = buildResearchSnapshot({
      property: row,
      ctx,
      observation: subjectObs,
      comparables: base.result.comparables,
      rejectedCount,
      verifiedSales: base.result.marketEvidenceSummary.verifiedSalePriceCount,
      areaMedian: base.result.marketPosition.areaMedian,
      comparableMedian: base.result.marketPosition.comparableMedian,
      decisionStatus: base.result.decisionStatus,
      decisionReasons: base.result.decisionReasons,
      acquisitionGaps: acquisitionGaps46,
      hasConflict,
    });

    const evidenceSummary = buildResearchEvidenceSummary(research);
    const investorLabels = buildResearchInvestorLabels(
      research,
      base.result.marketEvidenceSummary.verifiedSalePriceCount,
      base.result.comparables.length,
    );
    const evidenceVersion = String(base.result.marketEvidenceSummary.historicalEventCount);
    const cacheKey46 = buildInvestor46CacheKey(propertyId, evidenceVersion);

    const freeTierLimited = !base.result.premium;

    return {
      ok: true,
      result: {
        ...base.result,
        version46: INVESTOR_INTELLIGENCE46_VERSION,
        cacheKey46,
        research: freeTierLimited
          ? {
              ...research,
              acquisitionGaps: research.acquisitionGaps.slice(0, 3),
              comparables: {
                ...research.comparables,
                rejectionSummary: [],
              },
            }
          : research,
        evidenceSummary: freeTierLimited
          ? {
              ...evidenceSummary,
              recommendedDataAcquisition: evidenceSummary.recommendedDataAcquisition.slice(0, 3),
            }
          : evidenceSummary,
        investorLabels: freeTierLimited ? investorLabels.slice(0, 2) : investorLabels,
        acquisitionGaps46: freeTierLimited
          ? acquisitionGaps46.slice(0, 3)
          : acquisitionGaps46,
        freeTierLimited,
      },
    };
  }

  static async forArea(town: string): Promise<AreaIntelligence46> {
    const scored = await HistoricalIntelligence40Service.loadScoredEvents();
    const ctx = ctxFromScored(scored, (t) => t?.toLowerCase() === town.toLowerCase());
    return buildAreaIntelligence46({ ...ctx, town }, town);
  }

  static async forAgency(agency: string): Promise<AgencyIntelligence46> {
    const scored = await HistoricalIntelligence40Service.loadScoredEvents();
    const ctx = ctxFromScored(
      scored,
      (_t, a) => a?.toLowerCase() === agency.toLowerCase(),
    );
    return buildAgencyIntelligence46({ ...ctx, agency }, agency);
  }

  static async listGaps(): Promise<AcquisitionGap46[]> {
    const scored = await HistoricalIntelligence40Service.loadScoredEvents();
    const contexts = propertyContextsFromScored(scored);
    const gaps: AcquisitionGap46[] = [];
    for (const ctx of contexts) {
      const listingId = ctx.observations[0]?.listingPropertyId;
      if (!listingId) continue;
      const row = await PropertyRepository.getById(listingId).catch(() => null);
      if (!row) continue;
      const summary = ctx.scoredEvents?.length ?? 0;
      gaps.push(
        ...detectAcquisitionGaps46({
          property: row,
          ctx,
          comparableCount: 0,
          rejectedComparableCount: 0,
          hasConflict: ctx.observations.some((o) => o.conflict),
          historicalEventCount: summary,
        }),
      );
    }
    const seen = new Set<string>();
    return gaps.filter((g) => {
      const key = `${g.gapCode}|${g.town}|${g.agency}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  static async adminDashboard() {
    const scored = await HistoricalIntelligence40Service.loadScoredEvents();
    const contexts = propertyContextsFromScored(scored);
    const dashboard46 = buildInvestorDashboard46(contexts);
    const dashboard45 = await InvestorIntelligence45Service.adminDashboard();
    const gaps = await this.listGaps();
    const safety = await HistoricalEvidenceQuality44Service.publicSafetyCheck();

    return {
      ok: true,
      version: INVESTOR_INTELLIGENCE46_VERSION,
      version45: dashboard45.version,
      dashboard: dashboard46,
      dashboard45: dashboard45.dashboard,
      gapsPreview: gaps.slice(0, 20),
      publicSafety: safety,
    };
  }

  static async refreshCoverage(operator: string) {
    const scored = await HistoricalIntelligence40Service.loadScoredEvents();
    const contexts = propertyContextsFromScored(scored);
    const dashboard = buildInvestorDashboard46(contexts);
    LoggerService.audit("ii46.refresh_coverage", { operator, dashboard });
    return {
      ok: true,
      message: "Evidence coverage rebuilt from existing data.",
      dashboard,
    };
  }

  static async rebuildInvestorIntelligence(operator: string) {
    const result = await InvestorIntelligence45Service.rebuildInvestorIntelligence(operator);
    const coverage = await this.refreshCoverage(operator);
    return {
      ok: true,
      message: "Investor intelligence 4.6 rebuilt from existing evidence.",
      result,
      coverage: coverage.dashboard,
      version: INVESTOR_INTELLIGENCE46_VERSION,
    };
  }

  static async refreshAcquisitionGaps(operator: string) {
    const gaps = await this.listGaps();
    LoggerService.audit("ii46.gap_queue", { operator, gapCount: gaps.length });
    return {
      ok: true,
      message: "Acquisition gaps refreshed — routes to existing HEA/HDA queues.",
      gaps: gaps.slice(0, 50),
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
