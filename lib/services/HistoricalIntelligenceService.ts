import "server-only";

import type { AuctionEventRow, PropertyMaster } from "@/lib/identity";
import type { Property } from "@/lib/types/property";
import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import { SubscriptionService } from "@/lib/subscription/SubscriptionService";
import {
  AuctionEventRepository,
  PropertyMasterRepository,
} from "@/lib/repositories/PropertyIdentityRepository";
import { PropertyRepository } from "@/lib/repositories/PropertyRepository";
import { PricingObservationRepository } from "@/lib/repositories/PricingObservationRepository";
import {
  buildHistoricalDataset,
  buildHistoricalIntelligenceReport,
  buildPropertyHistoricalSummary,
  isCurrentCatalogueState,
  type TimeWindow,
  type HistoricalEventObservation,
} from "@/lib/intelligence/historical";
import { exclusionRecords, countByReason } from "@/lib/intelligence/historical/historicalCoverage";
import type { HistoricalListingInput } from "@/lib/intelligence/historical/historicalAggregation";

function asEvents(rows: unknown[]): AuctionEventRow[] {
  return rows.filter(
    (row): row is AuctionEventRow =>
      Boolean(row) && typeof row === "object" && "id" in (row as object),
  );
}

function toListingInput(p: Property): HistoricalListingInput {
  return {
    id: p.id,
    title: p.title,
    property_type: p.property_type,
    listing_status: p.listing_status,
    status: p.status,
    verification_state: p.verification_state,
    data_classification: p.data_classification,
    auction_date: p.auction_date,
    auction_price: p.auction_price,
    reserve_price: p.reserve_price,
    estimated_value: p.estimated_value,
    floor_size: p.floor_size,
    erf_size: p.erf_size,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    province: p.province,
    town: p.town,
    suburb: p.suburb,
    municipality: p.municipality ?? null,
    auction_agency: p.auction_agency,
    source_name: p.source_name,
    source_url: p.source_url,
    property_master_id: p.property_master_id ?? null,
    farm_name: p.farm_name ?? null,
    agricultural_details: p.agricultural_details
      ? {
          totalHectares: p.agricultural_details.totalHectares ?? null,
          farmCategory: p.agricultural_details.farmCategory ?? null,
        }
      : null,
  };
}

function parseWindow(raw: string | null | undefined): TimeWindow {
  const allowed: TimeWindow[] = ["30d", "90d", "6m", "12m", "24m", "36m", "all"];
  if (raw && allowed.includes(raw as TimeWindow)) return raw as TimeWindow;
  return "all";
}

export class HistoricalIntelligenceService {
  static parseWindow = parseWindow;

  static async loadObservations(): Promise<HistoricalEventObservation[]> {
    const [eventsRaw, listings, observations, masters] = await Promise.all([
      AuctionEventRepository.listAll(2000).catch(() => []),
      PropertyRepository.getIntelligenceCorpus(2000).catch(() => []),
      PricingObservationRepository.listRecent(5000).catch(() => []),
      PropertyMasterRepository.listCandidates(500).catch(() => []),
    ]);

    return buildHistoricalDataset({
      events: asEvents(eventsRaw),
      listings: listings.map(toListingInput),
      masters: masters as PropertyMaster[],
      observations,
    });
  }

  static async marketReport(input?: {
    window?: TimeWindow;
    premium?: boolean;
  }) {
    const premium = input?.premium ?? (await SubscriptionService.premium());
    const window: TimeWindow = premium ? (input?.window ?? "all") : "12m";
    const observations = await this.loadObservations();
    const upcomingExcluded = observations.filter((o) =>
      isCurrentCatalogueState(o.state),
    ).length;
    const report = buildHistoricalIntelligenceReport({
      observations,
      window,
      upcomingExcluded,
    });

    if (!premium) {
      return {
        premium: false,
        version: report.version,
        period: report.period,
        periodLabel: report.periodLabel,
        activity: {
          historicalEvents: report.activity.historicalEvents,
          sold: report.activity.sold,
          withdrawn: report.activity.withdrawn,
          cancelled: report.activity.cancelled,
          expired: report.activity.expired,
          unknownOutcome: report.activity.unknownOutcome,
        },
        insufficient: report.insufficient,
        insufficientMessage: report.insufficientMessage,
        note: "Detailed historical pricing, trends, and area statistics are available on Premium.",
      };
    }

    return { premium: true, report };
  }

  static async forArea(town: string, window?: TimeWindow) {
    const premium = await SubscriptionService.premium();
    const observations = await this.loadObservations();
    const needle = town.trim().toLowerCase();
    const scoped = observations.filter(
      (o) => o.town?.trim().toLowerCase() === needle,
    );
    const report = buildHistoricalIntelligenceReport({
      observations: scoped,
      window: premium ? window ?? "all" : "12m",
    });
    if (!premium) {
      return {
        premium: false,
        town,
        activity: report.activity,
        insufficient: report.insufficient,
        insufficientMessage: report.insufficientMessage,
        note: "Area pricing history is available on Premium.",
      };
    }
    return { premium: true, town, report };
  }

  static async forAgency(agency: string, window?: TimeWindow) {
    const premium = await SubscriptionService.premium();
    const observations = await this.loadObservations();
    const needle = agency.trim().toLowerCase();
    const scoped = observations.filter((o) => {
      const a = (o.agency ?? o.sourceName ?? "").trim().toLowerCase();
      return a === needle;
    });
    const report = buildHistoricalIntelligenceReport({
      observations: scoped,
      window: premium ? window ?? "all" : "12m",
    });
    if (!premium) {
      return {
        premium: false,
        agency,
        activity: report.activity,
        note: "Agency historical pricing is available on Premium.",
      };
    }
    return { premium: true, agency, report };
  }

  static async forProperty(propertyId: string) {
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
        ok: false as const,
        error: "Listing is not on the public catalogue (upcoming/live verified only).",
        status: 404,
      };
    }

    const premium = await SubscriptionService.premium();
    const masterId = row.property_master_id ?? null;
    let events: AuctionEventRow[] = [];
    if (masterId) {
      events = asEvents(await AuctionEventRepository.listByMaster(masterId));
    }
    const listingEvents = asEvents(
      await AuctionEventRepository.listByListing(propertyId),
    );
    const byId = new Map<string, AuctionEventRow>();
    for (const e of [...events, ...listingEvents]) byId.set(e.id, e);

    const observationsRows = await PricingObservationRepository.listByProperty(
      propertyId,
    );
    const dataset = buildHistoricalDataset({
      events: [...byId.values()],
      listings: [toListingInput(row)],
      observations: observationsRows,
    });
    const summary = buildPropertyHistoricalSummary(dataset);

    if (!premium) {
      return {
        ok: true as const,
        premium: false,
        summary: {
          historicalEvents: summary.historicalEvents,
          confirmedSales: summary.confirmedSales,
          withdrawn: summary.withdrawn,
          cancelled: summary.cancelled,
          outcomeNotSupplied: summary.outcomeNotSupplied,
        },
        timeline: [],
        insufficientMessage:
          "Historical auction timeline is available on Premium.",
        propertyMasterId: masterId,
      };
    }

    return {
      ok: true as const,
      premium: true,
      summary,
      timeline: summary.timeline,
      insufficientMessage: summary.insufficientMessage,
      propertyMasterId: masterId,
    };
  }

  static async adminAudit() {
    const observations = await this.loadObservations();
    const report = buildHistoricalIntelligenceReport({ observations, window: "all" });
    const exclusions = exclusionRecords(observations);
    const eventBacked = observations.filter((o) => o.sourceUnit === "auction_event");
    const listingFallback = observations.filter((o) => o.sourceUnit === "listing_fallback");
    const requiresReview = observations.filter((o) =>
      o.exclusionReasons.includes("INSUFFICIENT_IDENTITY"),
    );
    return {
      report,
      exclusions: exclusions.slice(0, 200),
      exclusionCounts: countByReason(exclusions),
      sourceUnits: {
        auction_event: eventBacked.length,
        listing_fallback: listingFallback.length,
      },
      historicalCoverage: {
        eventBacked: eventBacked.length,
        listingFallback: listingFallback.length,
        unresolved: requiresReview.length,
        totalObservations: observations.length,
      },
    };
  }
}
