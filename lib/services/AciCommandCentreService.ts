import "server-only";

import {
  ACI_COMMAND_CENTRE_VERSION,
  ACI_MAX_BATCH,
  ACI_POSITIONING,
  buildAciActionQueue,
  buildAciHealth,
  buildBeforeAfterDelta,
  buildCompetitiveScore,
  buildEvidenceTimeline,
  deriveDecisionStatus,
  groupEventsByTown,
  investorWorkflow,
  metricsFromHi56,
  publicationSafety,
  rejectAciUnlimitedLimit,
  type AciMetricsSnapshot,
} from "@/lib/aci/commandCentre";
import {
  ACI_COMMAND_CENTRE_V2_VERSION,
  ACI_COMPARE_MAX,
  ACI_WORKSPACE_PAGE_SIZE,
  buildProductReadiness,
  buildResearchTimelineV2,
  classifyEvidenceBadge,
  classifyOutcomeState,
  classifySalePriceState,
  compareExclusion,
  filterWorkspaceRows,
  marketStatistics,
  paginateRows,
  positioningClaims,
  rankOpportunity,
  salePricePanel,
  type AciWorkspaceFilters,
  type AciWorkspaceRow,
} from "@/lib/aci/productLayer";
import { LoggerService } from "@/lib/logger";
import { HistoricalIntelligence56Service } from "./HistoricalIntelligence56Service";
import { AuctionPartnerResultsIngestionService } from "./AuctionPartnerResultsIngestionService";
import { AuctionEvidenceDossierService } from "./AuctionEvidenceDossierService";
import { HistoricalSourceCoverage48Service } from "./HistoricalSourceCoverage48Service";
import { PropertyRepository } from "@/lib/repositories/PropertyRepository";
import { OutcomeIntelligenceRepository } from "@/lib/repositories/OutcomeIntelligenceRepository";
import { catalogueLeakCheck } from "@/lib/intelligence/historicalIntelligence56";
import type { Hsc48DiagnosticReport } from "@/lib/intelligence/historicalSourceCoverage48/types";
import type { Hsc48EventDiagnostic } from "@/lib/intelligence/historicalSourceCoverage48/types";
import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";
import type { Hi56IntelligenceReport } from "@/lib/intelligence/historicalIntelligence56/types";
import type { AuctionPartnerResultRecord } from "@/lib/partnerships/auctionPartnerResultsFeedContract";
import type { Property } from "@/lib/types/property";

type AciCorpus = {
  report: Hi56IntelligenceReport;
  hsc: Hsc48DiagnosticReport;
  properties: Map<string, Property>;
  loadedAt: number;
};

let corpusCache: AciCorpus | null = null;
const CORPUS_TTL_MS = 60_000;

export type AciActionName =
  | "resolve_evidence"
  | "quality_audit"
  | "dry_run_acquisition"
  | "acquire"
  | "retry"
  | "extract_snapshots"
  | "rebuild"
  | "results_feed_dry_run"
  | "results_feed_execute";

function partnerView(
  status: Awaited<ReturnType<typeof AuctionPartnerResultsIngestionService.buildStatus>>,
) {
  return {
    contractVersion: status.contractVersion,
    partner: status.partnerCode,
    partnerActive: status.partner,
    resultsFeed: status.resultsFeed,
    connectionState: status.connectionState,
    authorisation: status.authorisation,
    ingestion: status.ingestion,
    productionWrite: status.productionWrite,
    url: status.connection.url,
    credentials: status.connection.credentials,
    lastSuccessfulIngestion: status.lastSuccessfulIngestion,
    nextAction: status.nextAction,
    publicFetchAllowed: status.publicFetchAllowed,
    publicFetchIsNotResultsAuthorisation: true as const,
  };
}

function findHscEvent(
  events: Hsc48EventDiagnostic[],
  id: string,
): Hsc48EventDiagnostic | undefined {
  return events.find(
    (e) =>
      e.listingPropertyId === id ||
      e.observationId === id ||
      e.auctionEventId === id ||
      e.propertyMasterId === id,
  );
}

function findHiEvent(events: Hi50EventRow[], id: string): Hi50EventRow | undefined {
  return events.find((e) => e.observationId === id || e.auctionEventId === id);
}

function rejectionReasons(hsc: Hsc48EventDiagnostic | undefined): string[] {
  if (!hsc) return [];
  const reasons: string[] = [];
  if (!hsc.auctionDate) reasons.push("Missing auction date");
  if (!hsc.town) reasons.push("Missing town/suburb");
  if (
    hsc.source.sourceStatus === "LICENSE_BLOCKED" ||
    hsc.source.sourceStatus === "MISSING" ||
    hsc.source.sourceStatus === "INELIGIBLE"
  ) {
    reasons.push("Invalid source");
  }
  if (hsc.primaryState === "IDENTITY_REVIEW_REQUIRED") reasons.push("Unresolved identity");
  return reasons;
}

function identityStrong(input: {
  town: string | null;
  address: string | null;
  listingPropertyId: string | null;
}): boolean {
  return Boolean(input.town && (input.address || input.listingPropertyId));
}

function buildWorkspaceRow(
  event: Hi50EventRow,
  hsc: Hsc48EventDiagnostic | undefined,
  property: Property | undefined,
): AciWorkspaceRow {
  const listingPropertyId = hsc?.listingPropertyId ?? property?.id ?? null;
  const town = property?.town ?? event.town ?? hsc?.town ?? null;
  const address = property?.address ?? null;
  const outcomeState = classifyOutcomeState({
    outcome: event.outcome,
    salePrice: event.salePrice,
    evidenceState: event.evidenceState,
  });
  const salePriceState = classifySalePriceState({
    salePrice: event.salePrice,
    evidenceState: event.evidenceState,
    outcomeState,
  });
  const evidenceBadge = classifyEvidenceBadge({
    sourceStatus: event.sourceStatus,
    snapshot: event.snapshot,
    saleVerified: salePriceState === "VERIFIED SALE PRICE",
    outcomeState,
  });
  const strong = identityStrong({ town, address, listingPropertyId });
  const decision = deriveDecisionStatus({
    catalogueLeaks: 0,
    outcome: event.outcome,
    salePriceVerified: salePriceState === "VERIFIED SALE PRICE",
    comparableReady: false,
    marketReady: false,
  });
  return {
    id: listingPropertyId || event.auctionEventId || event.observationId,
    observationId: event.observationId,
    listingPropertyId,
    title: property?.title ?? event.propertyLabel,
    address,
    province: property?.province ?? null,
    town,
    suburb: property?.suburb ?? null,
    propertyType: property?.property_type ?? null,
    bedrooms: property?.bedrooms ?? null,
    bathrooms: property?.bathrooms ?? null,
    garages: property?.garages ?? null,
    auctionDate: property?.auction_date ?? event.auctionDate,
    source: hsc?.source.sourceName ?? event.agency,
    sourceUrl: event.sourceUrl ?? hsc?.source.sourceUrl ?? null,
    sourceStatus: event.sourceStatus,
    evidenceState: event.evidenceState,
    evidenceBadge,
    outcome: event.outcome,
    outcomeState,
    salePrice: event.salePrice,
    salePriceState,
    quality: event.evidenceQuality ?? hsc?.evidenceQuality ?? null,
    lastEvidenceUpdate: hsc?.snapshot.observedAt ?? event.lastAttempt ?? hsc?.fetch?.attemptTimestamp ?? null,
    identityStrong: strong,
    opportunity: rankOpportunity({
      identityStrong: strong,
      auctionDate: property?.auction_date ?? event.auctionDate,
      outcomeState,
      salePriceState,
    }),
    decision,
  };
}

export class AciCommandCentreService {
  static async loadCorpus(force = false): Promise<AciCorpus> {
    if (!force && corpusCache && Date.now() - corpusCache.loadedAt < CORPUS_TTL_MS) {
      return corpusCache;
    }
    const [report, hsc] = await Promise.all([
      HistoricalIntelligence56Service.buildReport(),
      HistoricalSourceCoverage48Service.buildDiagnosticReport(),
    ]);
    const listingIds = hsc.events
      .map((e) => e.listingPropertyId)
      .filter((id): id is string => Boolean(id));
    const properties = listingIds.length
      ? (await PropertyRepository.getByIds(listingIds, 1, 100)).data
      : [];
    corpusCache = {
      report,
      hsc,
      properties: new Map(properties.map((p) => [p.id, p])),
      loadedAt: Date.now(),
    };
    return corpusCache;
  }

  static workspaceRows(corpus: AciCorpus): AciWorkspaceRow[] {
    const byObservation = new Map(corpus.hsc.events.map((e) => [e.observationId, e] as const));
    return corpus.report.events.map((event) => {
      const h = byObservation.get(event.observationId);
      const property = h?.listingPropertyId ? corpus.properties.get(h.listingPropertyId) : undefined;
      return buildWorkspaceRow(event, h, property);
    });
  }

  static async commandSummary() {
    const [corpus, partner] = await Promise.all([
      this.loadCorpus(),
      AuctionPartnerResultsIngestionService.buildStatus("bidders_choice"),
    ]);
    const report = corpus.report;
    const metrics = metricsFromHi56(report, report.metrics.auctionEvents);
    const partnerConnected = partner.resultsFeed === "CONNECTED";
    const partnerAuthorised = partner.authorisation === "AUTHORISED";
    const health = buildAciHealth({
      catalogueLeaks: metrics.catalogueLeaks,
      outcomeMissing: metrics.outcomeMissing,
      verifiedSalePrices: metrics.verifiedSalePrices,
      partnerConnected,
      partnerAuthorised,
    });
    const actions = buildAciActionQueue({
      outcomeMissing: metrics.outcomeMissing,
      soldWithoutPrice: metrics.soldWithoutPrice,
      verifiedSalePrices: metrics.verifiedSalePrices,
      comparableReady: metrics.comparableReady,
      marketReadyTowns: metrics.marketReadyTowns,
      catalogueLeaks: metrics.catalogueLeaks,
      partnerAuthorised,
      partnerConnected,
    });
    const score = buildCompetitiveScore(metrics);
    const safety = publicationSafety(metrics.catalogueLeaks);

    return {
      ok: true as const,
      version: ACI_COMMAND_CENTRE_VERSION,
      generatedAt: new Date().toISOString(),
      engine: {
        version: report.version,
        verdict: report.verdict,
        campaign: report.campaign56.status,
        bottleneck: report.bottleneck56,
        nextAdminAction: report.nextAdminAction,
      },
      health,
      metrics,
      sourceHealth: {
        licensed: report.metrics.sourceLicensed,
        active: report.metrics.sourceFound,
        blocked: report.metrics.sourceBlocked,
        failing: report.metrics.failedFetches,
        stale: report.coverage52.neverAttempted,
        unavailable: report.metrics.sourceUnavailable,
      },
      acquisition: {
        fetchAttempted: metrics.fetchAttempted,
        fetchSuccessful: metrics.fetchSuccessful,
        fetchFailed: metrics.fetchFailed,
        neverAttempted: report.coverage52.neverAttempted,
      },
      partner: partnerView(partner),
      publicSafety: safety,
      funnel: report.evidenceFunnel56,
      actions,
      competitiveScore: score,
      productReadiness: buildProductReadiness(metrics),
      positioning: {
        promise: ACI_POSITIONING,
        claims: positioningClaims(),
      },
      maxBatch: ACI_MAX_BATCH,
      versionV2: ACI_COMMAND_CENTRE_V2_VERSION,
    };
  }

  static async discover() {
    const corpus = await this.loadCorpus();
    const report = corpus.report;
    const byObservation = new Map(corpus.hsc.events.map((e) => [e.observationId, e] as const));
    const hiByObservation = new Map(report.events.map((e) => [e.observationId, e] as const));
    const rows = this.workspaceRows(corpus).map((row) => {
      const h = byObservation.get(row.observationId);
      const hi = hiByObservation.get(row.observationId);
      return {
        id: row.id,
        observationId: row.observationId,
        auctionEventId: hi?.auctionEventId ?? null,
        listingPropertyId: row.listingPropertyId,
        sourceUrl: row.sourceUrl,
        source: row.source,
        sourceStatus: row.sourceStatus,
        province: row.province,
        town: row.town,
        suburb: row.suburb,
        auctionDate: row.auctionDate,
        propertyType: row.propertyType,
        estimatedValue: null as number | null,
        acquisitionPriority: `P${hi?.recoveryPriority ?? 4}`,
        evidenceState: row.evidenceState,
        licenceState: row.sourceStatus,
        importState: rejectionReasons(h).length ? "REJECTED" : "ELIGIBLE",
        rejectionReasons: rejectionReasons(h),
        outcome: row.outcome,
        salePrice: row.salePrice,
        nextAction: hi?.nextAction ?? null,
        evidenceBadge: row.evidenceBadge,
        outcomeState: row.outcomeState,
        salePriceState: row.salePriceState,
        opportunity: row.opportunity,
      };
    });

    return {
      ok: true as const,
      version: ACI_COMMAND_CENTRE_VERSION,
      counts: report.recoveryPriorityCounts ?? { p1: 0, p2: 0, p3: 0, p4: 0 },
      candidates: report.nextCandidates56,
      events: rows,
      note: "Discovery lists existing historical events. Public listing scrape is not treated as sale-price evidence.",
    };
  }

  static async workspace(filters: AciWorkspaceFilters = {}, page = 1, pageSize = ACI_WORKSPACE_PAGE_SIZE) {
    const corpus = await this.loadCorpus();
    const all = filterWorkspaceRows(this.workspaceRows(corpus), filters);
    const paged = paginateRows(all, page, pageSize);
    const towns = [...new Set(all.map((r) => r.town).filter((v): v is string => Boolean(v)))].sort();
    const provinces = [...new Set(all.map((r) => r.province).filter((v): v is string => Boolean(v)))].sort();
    const types = [...new Set(all.map((r) => r.propertyType).filter((v): v is string => Boolean(v)))].sort();
    return {
      ok: true as const,
      version: ACI_COMMAND_CENTRE_V2_VERSION,
      filters,
      facets: { towns, provinces, types },
      ...paged,
    };
  }

  static async opportunities() {
    const corpus = await this.loadCorpus();
    const rows = this.workspaceRows(corpus);
    const grouped = {
      "HIGH PRIORITY": rows.filter((r) => r.opportunity === "HIGH PRIORITY"),
      RESEARCH: rows.filter((r) => r.opportunity === "RESEARCH"),
      WAITING: rows.filter((r) => r.opportunity === "WAITING"),
      COMPLETE: rows.filter((r) => r.opportunity === "COMPLETE"),
    };
    return {
      ok: true as const,
      version: ACI_COMMAND_CENTRE_V2_VERSION,
      note: "Research-priority ranking only — not an investment recommendation.",
      counts: {
        highPriority: grouped["HIGH PRIORITY"].length,
        research: grouped.RESEARCH.length,
        waiting: grouped.WAITING.length,
        complete: grouped.COMPLETE.length,
      },
      grouped,
    };
  }

  static async research(id: string) {
    const corpus = await this.loadCorpus();
    const report = corpus.report;
    const hscEvent = findHscEvent(corpus.hsc.events, id);
    const hiEvent =
      findHiEvent(report.events, id) ??
      (hscEvent ? findHiEvent(report.events, hscEvent.observationId) : undefined);

    const listingId = hscEvent?.listingPropertyId ?? id;
    const property =
      (listingId ? corpus.properties.get(listingId) : undefined) ??
      (await PropertyRepository.getById(listingId));
    const dossier = property
      ? await AuctionEvidenceDossierService.forProperty(property.id)
      : null;

    if (!hiEvent && !hscEvent && !property) {
      return { ok: false as const, error: "Event or property not found", status: 404 as const };
    }

    const event = hiEvent ?? {
      observationId: hscEvent?.observationId ?? id,
      auctionEventId: hscEvent?.auctionEventId ?? null,
      propertyLabel: property?.title ?? hscEvent?.propertyLabel ?? id,
      town: property?.town ?? hscEvent?.town ?? null,
      agency: property?.auction_agency ?? hscEvent?.agency ?? null,
      auctionDate: property?.auction_date ?? hscEvent?.auctionDate ?? null,
      sourceUrl: property?.source_url ?? hscEvent?.source.sourceUrl ?? null,
      sourceStatus: hscEvent?.source.sourceStatus ?? "UNKNOWN",
      recoveryPriority: 4 as const,
      evidenceState: "INSUFFICIENT_DATA" as const,
      fetchState: hscEvent?.fetchState ?? null,
      httpStatus: hscEvent?.fetch?.httpStatus ?? null,
      errorCode: null,
      failureClassification: "NONE" as const,
      retryable: false,
      snapshot: hscEvent?.snapshot.exists ?? false,
      extraction: hscEvent?.extraction.state ?? "MISSING",
      outcome: hscEvent?.outcomeState ?? "UNKNOWN",
      salePrice: hscEvent?.salePriceState ?? "MISSING",
      resolution: hscEvent?.resolutionState ?? null,
      evidenceQuality: hscEvent?.evidenceQuality ?? null,
      lastAttempt: hscEvent?.fetch?.attemptTimestamp ?? null,
      attemptNumber: hscEvent?.fetch?.attemptNumber ?? 0,
      nextAction: hscEvent?.nextAction ?? "INSUFFICIENT DATA",
    };

    const saleVerified =
      (event.salePrice ?? "").toUpperCase().includes("VERIFIED") ||
      event.evidenceState === "SALE_PRICE_FOUND";
    const comparableReady = report.coverage52.comparableReady > 0 && saleVerified;
    const decision = deriveDecisionStatus({
      catalogueLeaks: report.safety56.catalogueLeaks,
      outcome: event.outcome,
      salePriceVerified: saleVerified,
      comparableReady,
      marketReady: report.coverage52.marketReadyTowns > 0,
    });

    const outcomeState = classifyOutcomeState({
      outcome: event.outcome,
      salePrice: event.salePrice,
      evidenceState: event.evidenceState,
    });
    const salePriceState = classifySalePriceState({
      salePrice: event.salePrice,
      evidenceState: event.evidenceState,
      outcomeState,
    });
    const evidenceBadge = classifyEvidenceBadge({
      sourceStatus: event.sourceStatus,
      snapshot: event.snapshot,
      saleVerified,
      outcomeState,
    });

    return {
      ok: true as const,
      version: ACI_COMMAND_CENTRE_V2_VERSION,
      card: {
        title: property?.title ?? event.propertyLabel,
        address: property?.address ?? null,
        town: property?.town ?? event.town,
        suburb: property?.suburb ?? null,
        propertyType: property?.property_type ?? null,
        bedrooms: property?.bedrooms ?? null,
        bathrooms: property?.bathrooms ?? null,
        garages: property?.garages ?? null,
        auctionDate: property?.auction_date ?? event.auctionDate,
        source: event.agency ?? hscEvent?.source.sourceName ?? null,
        auctionStatus: property?.listing_status ?? property?.status ?? event.outcome,
        sourceProvenance: event.sourceUrl ?? hscEvent?.source.sourceUrl ?? null,
        evidenceBadge,
        outcomeState,
        salePriceState,
        quality: event.evidenceQuality,
      },
      identity: {
        property: property?.title ?? event.propertyLabel,
        address: property?.address ?? null,
        town: property?.town ?? event.town,
        suburb: property?.suburb ?? null,
        province: property?.province ?? null,
        source: event.agency ?? hscEvent?.source.sourceName ?? null,
        sourceUrl: event.sourceUrl,
        auctionDate: property?.auction_date ?? event.auctionDate,
        listingPropertyId: property?.id ?? hscEvent?.listingPropertyId ?? null,
        observationId: event.observationId,
        auctionEventId: event.auctionEventId,
        snapshotId: hscEvent?.snapshot.snapshotId ?? null,
        extractionId: hscEvent?.extraction.extractionRunId ?? null,
        bedrooms: property?.bedrooms ?? null,
        bathrooms: property?.bathrooms ?? null,
        garages: property?.garages ?? null,
        propertyType: property?.property_type ?? null,
      },
      evidence: {
        fetchState: event.fetchState,
        snapshot: event.snapshot ? "PRESENT" : "MISSING",
        extraction: event.extraction,
        outcome: event.outcome || "UNKNOWN",
        salePrice: saleVerified ? "VERIFIED" : "NOT VERIFIED",
        salePriceDisplay: saleVerified
          ? "VERIFIED SALE PRICE"
          : "SALE PRICE NOT VERIFIED",
        resolution: event.resolution ?? "UNKNOWN",
        evidenceQuality: event.evidenceQuality ?? "INSUFFICIENT_DATA",
        badge: evidenceBadge,
      },
      provenance: {
        outcome: {
          value: event.outcome || "UNKNOWN",
          source: hscEvent?.source.sourceName ?? event.agency,
          snapshotId: hscEvent?.snapshot.snapshotId ?? null,
          observationId: event.observationId,
          extractionId: hscEvent?.extraction.extractionRunId ?? null,
          timestamp: hscEvent?.snapshot.observedAt ?? event.lastAttempt,
          classification: hscEvent?.salePriceState ?? event.salePrice,
          confidence: event.evidenceQuality,
          sourceText: hscEvent?.source.sourceUrl ?? event.sourceUrl,
        },
        salePrice: {
          verified: saleVerified,
          display: saleVerified ? "VERIFIED SALE PRICE" : "SALE PRICE NOT VERIFIED",
        },
      },
      inspector: {
        source: hscEvent?.source.sourceName ?? event.agency,
        sourceUrl: event.sourceUrl ?? hscEvent?.source.sourceUrl ?? null,
        snapshotId: hscEvent?.snapshot.snapshotId ?? null,
        extractionId: hscEvent?.extraction.extractionRunId ?? null,
        observationType: "historical_event",
        observationId: event.observationId,
        rawClassification: event.outcome,
        resolvedClassification: outcomeState,
        confidence: event.evidenceQuality,
        createdAt: hscEvent?.snapshot.observedAt ?? event.lastAttempt,
        secrets: { url: event.sourceUrl ? "PRESENT" : "MISSING", credentials: "MISSING" },
      },
      salePricePanel: salePricePanel({
        salePriceState,
        verifiedAmount: null,
        source: hscEvent?.source.sourceName ?? event.agency,
        timestamp: hscEvent?.snapshot.observedAt ?? event.lastAttempt,
        snapshotId: hscEvent?.snapshot.snapshotId ?? null,
      }),
      timeline: buildEvidenceTimeline(event),
      timelineV2: buildResearchTimelineV2({
        discoveredAt: property?.imported_at ?? property?.created_at ?? null,
        sourceName: event.agency ?? hscEvent?.source.sourceName ?? null,
        sourceUrl: event.sourceUrl ?? hscEvent?.source.sourceUrl ?? null,
        sourceStatus: event.sourceStatus,
        auctionDate: property?.auction_date ?? event.auctionDate,
        fetchState: event.fetchState,
        fetchTimestamp: event.lastAttempt ?? hscEvent?.fetch?.attemptTimestamp ?? null,
        snapshot: event.snapshot,
        snapshotId: hscEvent?.snapshot.snapshotId ?? null,
        snapshotAt: hscEvent?.snapshot.observedAt ?? null,
        extraction: event.extraction,
        extractionId: hscEvent?.extraction.extractionRunId ?? null,
        outcome: event.outcome,
        salePrice: event.salePrice,
        saleVerified,
        hasDossier: Boolean(dossier?.ok),
      }),
      decision: {
        evidence: saleVerified ? "HIGH" : event.outcome ? "LOW" : "INSUFFICIENT_DATA",
        outcomeCertainty: outcomeState,
        salePrice: salePriceState,
        comparableAvailability: comparableReady ? "READY" : "NONE",
        marketConfidence:
          report.coverage52.marketReadyTowns > 0 ? "READY" : "INSUFFICIENT_DATA",
        dueDiligence: dossier?.ok ? dossier.dueDiligence?.completeness ?? null : null,
        status: decision,
        disclaimer: "Workflow state only — not financial advice.",
      },
      workflow: investorWorkflow({
        discovered: true,
        researched: Boolean(hscEvent || hiEvent),
        outcome: event.outcome,
        salePriceVerified: saleVerified,
        comparableCount: report.coverage52.comparableReady,
      }),
      dossier: dossier?.ok ? dossier.dossier : null,
      catalogueLeaks: report.safety56.catalogueLeaks,
    };
  }

  static async compare(ids: string[]) {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, ACI_COMPARE_MAX);
    const corpus = await this.loadCorpus();
    const report = corpus.report;
    const extra = unique.filter((id) => !corpus.properties.has(id));
    const extraProps = extra.length ? (await PropertyRepository.getByIds(extra, 1, 100)).data : [];
    const byId = new Map([...corpus.properties, ...extraProps.map((p) => [p.id, p] as const)]);

    const rows = unique.map((id) => {
      const property = byId.get(id);
      const hscEvent = findHscEvent(corpus.hsc.events, id);
      const hiEvent =
        findHiEvent(report.events, id) ??
        (hscEvent ? findHiEvent(report.events, hscEvent.observationId) : undefined);
      const outcomeState = classifyOutcomeState({
        outcome: hiEvent?.outcome ?? hscEvent?.outcomeState ?? null,
        salePrice: hiEvent?.salePrice ?? hscEvent?.salePriceState ?? null,
        evidenceState: hiEvent?.evidenceState,
      });
      const salePriceState = classifySalePriceState({
        salePrice: hiEvent?.salePrice ?? hscEvent?.salePriceState ?? null,
        evidenceState: hiEvent?.evidenceState,
        outcomeState,
      });
      const exclusion = compareExclusion(salePriceState);
      return {
        id,
        title: property?.title ?? hiEvent?.propertyLabel ?? hscEvent?.propertyLabel ?? id,
        town: property?.town ?? hiEvent?.town ?? hscEvent?.town ?? null,
        suburb: property?.suburb ?? null,
        location: [property?.suburb, property?.town ?? hiEvent?.town, property?.province]
          .filter(Boolean)
          .join(", "),
        propertyType: property?.property_type ?? null,
        auctionDate: property?.auction_date ?? hiEvent?.auctionDate ?? hscEvent?.auctionDate,
        outcome: hiEvent?.outcome ?? hscEvent?.outcomeState ?? "UNKNOWN",
        outcomeState,
        verifiedSalePrice: exclusion.label,
        includedInCalculations: exclusion.included,
        estimatedValueShownAsSalePrice: false,
        evidenceQuality: hiEvent?.evidenceQuality ?? hscEvent?.evidenceQuality ?? "INSUFFICIENT_DATA",
        provenance: hscEvent?.source.sourceUrl ?? hiEvent?.sourceUrl ?? null,
        comparableReady: false,
        marketReady: report.coverage52.marketReadyTowns > 0,
        ddFindings: property?.verification_state ?? null,
      };
    });

    return {
      ok: true as const,
      version: ACI_COMMAND_CENTRE_V2_VERSION,
      comparableThreshold: 3,
      compareMax: ACI_COMPARE_MAX,
      note: "Comparison calculations use verified sale prices only. Unverified properties are excluded.",
      rows,
    };
  }

  static async market() {
    const corpus = await this.loadCorpus();
    const report = corpus.report;
    const towns = groupEventsByTown(report.events);
    const observations = await OutcomeIntelligenceRepository.listRecent(2000);
    const townByListing = new Map(
      [...corpus.properties.values()].map((p) => [p.id, p.town] as const),
    );
    const verifiedByTown = new Map<string, number[]>();
    const verifiedPrices: number[] = [];
    for (const o of observations) {
      const verified =
        o.sale_price != null &&
        o.sale_price > 0 &&
        (o.sale_price_confidence ?? "").toLowerCase().includes("verif");
      if (!verified || o.sale_price == null) continue;
      verifiedPrices.push(o.sale_price);
      const town = (o.listing_property_id && townByListing.get(o.listing_property_id)) || "UNKNOWN";
      const list = verifiedByTown.get(town) ?? [];
      list.push(o.sale_price);
      verifiedByTown.set(town, list);
    }
    const overall = marketStatistics({
      verifiedPrices,
      town: "ALL",
    });
    const townStats = towns.map((town) => ({
      ...town,
      statistics: marketStatistics({
        verifiedPrices: verifiedByTown.get(town.town) ?? [],
        town: town.town,
      }),
    }));
    return {
      ok: true as const,
      version: ACI_COMMAND_CENTRE_V2_VERSION,
      threshold: 5,
      verifiedSalePrices: report.coverage52.verifiedSalePrices,
      marketReadyTowns: report.coverage52.marketReadyTowns,
      overall,
      towns: townStats,
      note: overall.note,
    };
  }

  static async dossier(id: string) {
    const result = await AuctionEvidenceDossierService.forProperty(id);
    if (!result.ok) return result;
    const report = await this.loadCorpus();
    const safety = publicationSafety(report.report.safety56.catalogueLeaks);
    return {
      ok: true as const,
      version: ACI_COMMAND_CENTRE_VERSION,
      dossier: result.dossier,
      property: {
        id: result.property.id,
        title: result.property.title,
        address: result.property.address,
        town: result.property.town,
        suburb: result.property.suburb,
        province: result.property.province,
        source: result.property.source_name ?? result.property.source,
        auctionDate: result.property.auction_date,
      },
      dueDiligence: result.dueDiligence,
      evidenceQuality: result.evidenceQuality,
      investor46: result.investor46?.ok ? result.investor46.result : null,
      acquisition: result.acquisitionDiagnostic,
      publicationSafety: safety,
      evidenceCompleteness: result.dueDiligence?.completeness ?? null,
      executive: {
        property: result.property.title,
        auction: result.property.auction_date,
        outcome: result.dossier.outcomeLabel,
        salePrice: result.dossier.salePrice.value,
        salePriceStatus: result.dossier.salePrice.status,
        evidenceQuality: result.evidenceQuality?.ok ? result.evidenceQuality.overallQuality : "INSUFFICIENT_DATA",
        provenanceStatus: result.dossier.provenanceSummary.catalogueSafe ? "CATALOGUE SAFE" : "REVIEW",
        unknowns: result.dossier.investorView.whatIsUnknown,
        decision: deriveDecisionStatus({
          catalogueLeaks: report.report.safety56.catalogueLeaks,
          outcome: result.dossier.outcomeLabel,
          salePriceVerified: result.dossier.salePrice.status === "PROVEN",
          comparableReady: !result.dossier.comparables.insufficient,
          marketReady: !result.dossier.market.insufficient,
        }),
        disclaimer: "Workflow state only — not financial advice.",
      },
    };
  }

  static async runAction(input: {
    operator: string;
    action: AciActionName;
    limit?: number;
    confirm?: boolean;
    records?: AuctionPartnerResultRecord[];
  }) {
    const limitCheck = rejectAciUnlimitedLimit(input.limit);
    if (!limitCheck.ok) {
      return { ok: false as const, error: limitCheck.reason, status: 400 as const };
    }
    const limit = limitCheck.limit;

    if (!input.confirm && input.action !== "dry_run_acquisition" && input.action !== "results_feed_dry_run") {
      return {
        ok: false as const,
        error: "Explicit confirmation required before production writes",
        status: 400 as const,
      };
    }

    const beforeReport = await HistoricalIntelligence56Service.buildReport();
    const before = metricsFromHi56(beforeReport, beforeReport.metrics.auctionEvents);

    if (input.action === "rebuild" && before.catalogueLeaks > 0) {
      const leak = catalogueLeakCheck(before.catalogueLeaks);
      return {
        ok: false as const,
        blocked: true,
        error: "PUBLIC CATALOGUE BLOCKED",
        catalogueLeaks: before.catalogueLeaks,
        leak,
        status: 409 as const,
      };
    }

    let result: unknown;
    let writes = false;
    switch (input.action) {
      case "resolve_evidence":
        result = await HistoricalIntelligence56Service.resolveEvidence({
          operator: input.operator,
          limit,
        });
        writes = true;
        break;
      case "quality_audit":
        result = await HistoricalIntelligence56Service.runQualityAudit({
          operator: input.operator,
          limit,
        });
        writes = true;
        break;
      case "dry_run_acquisition":
        result = await HistoricalIntelligence56Service.dryRunP1({
          operator: input.operator,
          limit,
        });
        writes = false;
        break;
      case "acquire":
        result = await HistoricalIntelligence56Service.acquireP1Batch({
          operator: input.operator,
          limit,
          dryRun: false,
        });
        writes = true;
        break;
      case "retry":
        result = await HistoricalIntelligence56Service.retryLegacyFailures({
          operator: input.operator,
          limit,
        });
        writes = true;
        break;
      case "extract_snapshots":
        result = await HistoricalIntelligence56Service.extractSnapshotsBatch({
          operator: input.operator,
          limit,
          dryRun: false,
        });
        writes = true;
        break;
      case "rebuild":
        result = await HistoricalIntelligence56Service.rebuildIntelligence(input.operator);
        writes = true;
        break;
      case "results_feed_dry_run":
        result = await AuctionPartnerResultsIngestionService.ingestBatch({
          operator: input.operator,
          dryRun: true,
          records: Array.isArray(input.records) ? input.records : [],
          limit,
        });
        writes = false;
        break;
      case "results_feed_execute":
        result = await AuctionPartnerResultsIngestionService.ingestBatch({
          operator: input.operator,
          execute: true,
          dryRun: false,
          records: Array.isArray(input.records) ? input.records : [],
          limit,
        });
        writes = true;
        break;
      default:
        return { ok: false as const, error: "Unknown action", status: 400 as const };
    }

    const afterReport = await HistoricalIntelligence56Service.buildReport();
    corpusCache = null;
    const after = metricsFromHi56(afterReport, afterReport.metrics.auctionEvents);
    const delta = buildBeforeAfterDelta(before, after);

    LoggerService.audit("aci.action", {
      operator: input.operator,
      action: input.action,
      limit,
      recordsSelected: Array.isArray(input.records) ? input.records.length : limit,
      maximumAllowed: ACI_MAX_BATCH,
      writes,
      before,
      after,
    });

    return {
      ok: true as const,
      version: ACI_COMMAND_CENTRE_VERSION,
      action: input.action,
      limit,
      writes,
      before,
      after,
      delta,
      result,
    };
  }
}
