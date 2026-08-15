import "server-only";

import { buildAuctionEvidenceDossier } from "@/lib/property/auctionEvidenceDossier";
import { buildAuctionResearchReport } from "@/lib/property/researchReport";
import { buildLifecycleTimeline } from "@/lib/property/lifecycleTimeline";
import { buildDueDiligenceCentre } from "@/lib/property/dueDiligence";
import { buildDocumentLinks } from "@/lib/property/detailExperience";
import { getImages } from "@/lib/images/getImages";
import { getComparableSales } from "@/lib/maps/getComparableSales";
import { PropertyService } from "./PropertyService";
import { AuctionIntelligenceService } from "./AuctionIntelligenceService";
import { ComparableIntelligenceService } from "./ComparableIntelligenceService";
import { HistoricalIntelligenceService } from "./HistoricalIntelligenceService";
import { OutcomeIntelligenceService } from "./OutcomeIntelligenceService";
import { HistoricalIntelligence40Service } from "./HistoricalIntelligence40Service";
import { HistoricalEvidenceQuality44Service } from "./HistoricalEvidenceQuality44Service";
import { InvestorIntelligence46Service } from "./InvestorIntelligence46Service";
import { HistoricalSourceCoverage48Service } from "./HistoricalSourceCoverage48Service";

/**
 * Orchestrates existing intelligence services into the Auction Evidence Dossier.
 * Does not create parallel acquisition/resolution engines.
 */
export class AuctionEvidenceDossierService {
  static async forProperty(propertyId: string) {
    const property = await PropertyService.getProperty(propertyId);
    if (!property) {
      return { ok: false as const, error: "Property not found", status: 404 as const };
    }

    let images: Awaited<ReturnType<typeof getImages>> = [];
    try {
      images = await getImages(property.id);
    } catch {
      images = [];
    }

    let mapComps: Awaited<ReturnType<typeof getComparableSales>> = [];
    try {
      mapComps = await getComparableSales(property.id);
    } catch {
      mapComps = [];
    }

    const hasImages = images.some((i) => Boolean(i.image_url?.trim()));
    const hasDocuments = buildDocumentLinks(property).length > 0;
    const timeline = buildLifecycleTimeline({ property, hasImages, hasDocuments });
    const intelligence = await AuctionIntelligenceService.buildPanel({
      property,
      hasImages,
      comparableCount: mapComps.length,
    });
    const dueDiligence = buildDueDiligenceCentre(property);
    const report = buildAuctionResearchReport({
      property,
      timeline,
      intelligence,
      comparableCount: mapComps.length,
      dueDiligence,
    });

    let hiComparables: Awaited<
      ReturnType<typeof ComparableIntelligenceService.forProperty>
    > | null = null;
    let hiHistorical: Awaited<
      ReturnType<typeof HistoricalIntelligenceService.forProperty>
    > | null = null;
    let outcomeHistory: Awaited<
      ReturnType<typeof OutcomeIntelligenceService.propertyHistory>
    > | null = null;
    let hiPerformance: Awaited<
      ReturnType<typeof HistoricalIntelligence40Service.propertyPerformance>
    > | null = null;
    let evidenceQuality: Awaited<
      ReturnType<typeof HistoricalEvidenceQuality44Service.forProperty>
    > | null = null;
    let investor46: Awaited<
      ReturnType<typeof InvestorIntelligence46Service.forProperty>
    > | null = null;
    let acquisitionDiagnostic: Awaited<
      ReturnType<typeof HistoricalSourceCoverage48Service.diagnosticForProperty>
    > | null = null;

    try {
      hiComparables = await ComparableIntelligenceService.forProperty(property.id);
      hiHistorical = await HistoricalIntelligenceService.forProperty(property.id);
      outcomeHistory = await OutcomeIntelligenceService.propertyHistory(
        property.id,
        hiHistorical?.propertyMasterId ?? null,
      );
      hiPerformance = await HistoricalIntelligence40Service.propertyPerformance(property.id);
      evidenceQuality = await HistoricalEvidenceQuality44Service.forProperty(property.id);
      investor46 = await InvestorIntelligence46Service.forProperty(property.id);
      acquisitionDiagnostic =
        await HistoricalSourceCoverage48Service.diagnosticForProperty(property.id);
    } catch {
      // Dossier remains available with research fields even if intelligence corpus is thin.
    }

    const timelineEvents =
      outcomeHistory?.ok
        ? outcomeHistory.chain.events.map((ev) => ({
            auctionEventId: ev.auctionEventId,
            auctionDate: ev.auctionDate,
            outcome: ev.outcome,
            salePrice: ev.salePrice,
            sourceUrl: ev.sourceUrl,
            confidence: ev.outcomeEvidence.confidence,
          }))
        : [];

    const dossier = buildAuctionEvidenceDossier({
      propertyId: property.id,
      propertyTitle: property.title,
      propertyMasterId: hiHistorical?.propertyMasterId ?? null,
      researchFields: [
        ...report.propertySnapshot,
        ...report.auctionInformation,
        ...report.locationOverview,
        ...report.agencyInformation,
      ],
      timelineEvents,
      evidenceQuality: evidenceQuality?.ok
        ? {
            overallQuality: evidenceQuality.overallQuality,
            outcomeStatus: evidenceQuality.outcome?.status ?? null,
            outcomeValue:
              evidenceQuality.outcome?.value != null
                ? String(evidenceQuality.outcome.value)
                : null,
            salePriceStatus: evidenceQuality.salePrice?.status ?? null,
            salePriceValue:
              typeof evidenceQuality.salePrice?.value === "number"
                ? evidenceQuality.salePrice.value
                : null,
            conflicts: evidenceQuality.conflicts ?? [],
            missingEvidence: evidenceQuality.missingEvidence ?? [],
            sourceTier: evidenceQuality.source?.sourceTier ?? null,
          }
        : null,
      investor: investor46?.ok
        ? {
            whatWeKnow: investor46.result.evidenceSummary.whatWeKnow,
            whatWeDoNotKnow: investor46.result.evidenceSummary.whatWeDoNotKnow,
            whatNeedsVerification: investor46.result.evidenceSummary.whatNeedsVerification,
            decisionStatus: investor46.result.decisionStatus,
            acquisitionHints: investor46.result.acquisitionGaps46.map(
              (g) => `${g.gapCode} → ${g.recommendedExistingQueue}`,
            ),
          }
        : null,
      acquisition: acquisitionDiagnostic
        ? {
            stoppingPoint: acquisitionDiagnostic.stoppingPoint,
            proven: acquisitionDiagnostic.evidence.proven,
            tested: acquisitionDiagnostic.evidence.tested,
            missing: acquisitionDiagnostic.evidence.missing,
            reviewRequired: acquisitionDiagnostic.evidence.reviewRequired,
          }
        : null,
      historicalSummary: hiHistorical?.ok
        ? {
            historicalEvents: hiHistorical.summary.historicalEvents,
            confirmedSales: hiHistorical.summary.confirmedSales,
          }
        : null,
      performance: hiPerformance
        ? {
            verifiedSalePrices: hiPerformance.verifiedSalePrices,
            comparableCount: hiPerformance.comparableCount,
            comparableConfidence: hiPerformance.comparableConfidence,
          }
        : hiComparables?.ok
          ? {
              verifiedSalePrices: 0,
              comparableCount: hiComparables.comparables.comparables.length,
              comparableConfidence: hiComparables.comparables.confidence,
            }
          : null,
    });

    return {
      ok: true as const,
      property,
      report,
      dossier,
      hiComparables,
      hiHistorical,
      outcomeHistory,
      hiPerformance,
      evidenceQuality,
      investor46,
      acquisitionDiagnostic,
      intelligence,
      dueDiligence,
    };
  }
}
