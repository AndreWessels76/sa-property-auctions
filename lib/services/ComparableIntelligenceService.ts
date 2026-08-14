import "server-only";

import type { AuctionEventRow } from "@/lib/identity";
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
  type TimeWindow,
  type HistoricalEventObservation,
} from "@/lib/intelligence/historical";
import { HistoricalIntelligenceService } from "./HistoricalIntelligenceService";
import {
  findComparables,
  buildMarketEvidenceSummary,
  subjectObservationFromDataset,
  buildMarketEvidence,
  filterByTown,
  filterByAgency,
  buildMasterHistory,
  buildPropertyTimeline,
  auctionActivityOnly,
  COMPARABLE_INTELLIGENCE_VERSION,
  type ComparableSearchResult,
  type MarketEvidenceResult,
} from "@/lib/intelligence/comparables";

function asEvents(rows: unknown[]): AuctionEventRow[] {
  return rows.filter(
    (row): row is AuctionEventRow =>
      Boolean(row) && typeof row === "object" && "id" in (row as object),
  );
}

function toListingInput(p: Property) {
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

export class ComparableIntelligenceService {
  static async forProperty(propertyId: string): Promise<
    | { ok: false; error: string; status: number }
    | {
        ok: true;
        premium: boolean;
        comparables: ComparableSearchResult;
        marketEvidence: ReturnType<typeof buildMarketEvidenceSummary>;
        masterHistory: ReturnType<typeof buildMasterHistory>;
        timeline: ReturnType<typeof buildPropertyTimeline>;
        limitations: string[];
      }
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
    const corpus = await HistoricalIntelligenceService.loadObservations();
    const masterId = row.property_master_id ?? null;

    let events: AuctionEventRow[] = [];
    if (masterId) {
      events = asEvents(await AuctionEventRepository.listByMaster(masterId));
    }
    const listingEvents = asEvents(await AuctionEventRepository.listByListing(propertyId));
    const byId = new Map<string, AuctionEventRow>();
    for (const e of [...events, ...listingEvents]) byId.set(e.id, e);

    const pricingObs = await PricingObservationRepository.listByProperty(propertyId);
    const subjectDataset = buildHistoricalDataset({
      events: [...byId.values()],
      listings: [toListingInput(row)],
      observations: pricingObs,
    });

    const subject =
      subjectObservationFromDataset(subjectDataset, propertyId, masterId) ??
      ({
        observationId: `subject:${propertyId}`,
        sourceUnit: "listing_fallback" as const,
        auctionEventId: null,
        propertyMasterId: masterId,
        listingPropertyId: propertyId,
        state: "upcoming" as const,
        outcomeSupplied: false,
        auctionDate: row.auction_date ?? null,
        dateKind: "auction_date" as const,
        agency: row.auction_agency ?? row.source_name ?? null,
        sourceName: row.source_name ?? null,
        sourceUrl: row.source_url ?? null,
        verificationState: row.verification_state ?? null,
        verified: true,
        conflict: false,
        propertyType: row.property_type ?? null,
        propertyTypeStatus: row.property_type ? "known" : "needs_verification",
        marketCategory: "Needs verification",
        agriculturalSubtype: row.agricultural_details?.farmCategory ?? null,
        province: row.province ?? null,
        municipality: row.municipality ?? null,
        town: row.town ?? null,
        suburb: row.suburb ?? null,
        farmName: row.farm_name ?? null,
        floorSizeM2: row.floor_size ?? null,
        hectares: row.agricultural_details?.totalHectares ?? null,
        hectaresApproximate: false,
        bedrooms: row.bedrooms ?? null,
        bathrooms: row.bathrooms ?? null,
        prices: {
          sale_price: null,
          auction_price: row.auction_price ?? null,
          guide_price: null,
          reserve_price: row.reserve_price ?? null,
          estimated_value: row.estimated_value ?? null,
          starting_bid: null,
        },
        exclusionReasons: [],
      } satisfies HistoricalEventObservation);

    const titleMap = new Map<string, string>();
    if (row.title) titleMap.set(propertyId, row.title);

    const comparables = findComparables({
      subject,
      corpus,
      propertyId,
      titleByListingId: titleMap,
      pricingObservations: pricingObs,
      premium,
    });

    const masterHistory = masterId ? buildMasterHistory(corpus, masterId) : [];
    const timeline = premium ? buildPropertyTimeline(subjectDataset) : [];

    return {
      ok: true,
      premium,
      comparables,
      marketEvidence: buildMarketEvidenceSummary(subjectDataset, comparables),
      masterHistory: premium ? masterHistory : [],
      timeline,
      limitations: comparables.limitations,
    };
  }

  static async forArea(town: string, window?: TimeWindow): Promise<{
    premium: boolean;
    marketEvidence: MarketEvidenceResult;
    activity: ReturnType<typeof auctionActivityOnly>;
  }> {
    const premium = await SubscriptionService.premium();
    const corpus = await HistoricalIntelligenceService.loadObservations();
    const scoped = filterByTown(corpus, town);
    const marketEvidence = buildMarketEvidence({
      observations: scoped,
      scope: "area",
      scopeLabel: town,
      window: premium ? window ?? "all" : "12m",
      premium,
    });
    return {
      premium,
      marketEvidence: premium
        ? marketEvidence
        : {
            ...marketEvidence,
            medianSalePrice: {
              ...marketEvidence.medianSalePrice,
              median: null,
              average: null,
              notCalculableReason: "Area pricing history is available on Premium.",
            },
            averageSalePrice: {
              ...marketEvidence.averageSalePrice,
              median: null,
              average: null,
            },
          },
      activity: auctionActivityOnly(scoped),
    };
  }

  static async forAgency(agency: string, window?: TimeWindow) {
    const premium = await SubscriptionService.premium();
    const corpus = await HistoricalIntelligenceService.loadObservations();
    const scoped = filterByAgency(corpus, agency);
    const marketEvidence = buildMarketEvidence({
      observations: scoped,
      scope: "agency",
      scopeLabel: agency,
      window: premium ? window ?? "all" : "12m",
      premium,
    });
    return { premium, marketEvidence, activity: auctionActivityOnly(scoped) };
  }

  static async adminAudit() {
    const corpus = await HistoricalIntelligenceService.loadObservations();
    const hiAudit = await HistoricalIntelligenceService.adminAudit();
    const sold = corpus.filter((o) => o.state === "sold");

    const sampleSubject = corpus.find((o) => o.listingPropertyId && o.verified);
    let sampleComparables: ComparableSearchResult | null = null;
    if (sampleSubject?.listingPropertyId) {
      sampleComparables = findComparables({
        subject: sampleSubject,
        corpus,
        propertyId: sampleSubject.listingPropertyId,
        premium: true,
      });
    }

    return {
      version: COMPARABLE_INTELLIGENCE_VERSION,
      hiAudit,
      counts: {
        propertyMasters: await PropertyMasterRepository.count().catch(() => 0),
        auctionEvents: await AuctionEventRepository.count().catch(() => 0),
        pricingObservations: (await PricingObservationRepository.listRecent(5000)).length,
        verifiedSales: sold.length,
        comparableCandidates: corpus.length,
        comparableMatches: sampleComparables?.comparables.length ?? 0,
        rejectedCandidates: sampleComparables?.rejectedCandidates.length ?? 0,
        insufficientData: sold.length === 0,
      },
      sampleComparables: sampleComparables
        ? {
            subjectId: sampleComparables.subjectPropertyId,
            matches: sampleComparables.comparables.length,
            confidence: sampleComparables.confidence,
            limitations: sampleComparables.limitations,
          }
        : null,
    };
  }
}
