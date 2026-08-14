import "server-only";

import type { AuctionEventRow } from "@/lib/identity";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { AuctionEventRepository } from "@/lib/repositories/PropertyIdentityRepository";
import { PropertyRepository } from "@/lib/repositories/PropertyRepository";
import { PricingObservationRepository } from "@/lib/repositories/PricingObservationRepository";
import { PropertyMapper } from "@/lib/mappers/PropertyMapper";
import { ImageRepository } from "@/lib/repositories";
import { SubscriptionService } from "@/lib/subscription/SubscriptionService";
import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import { overlayPricingFromObservations } from "@/lib/acquisition/pricing/pricingService";
import {
  buildAuctionPriceIntelligence,
  type AuctionPriceIntelligence,
} from "@/lib/intelligence/pricing";

function asAuctionEvents(rows: unknown[]): AuctionEventRow[] {
  return rows.filter(
    (row): row is AuctionEventRow =>
      Boolean(row) && typeof row === "object" && "id" in (row as object),
  );
}

function applyOverlay(
  property: PropertyDTO,
  overlay: ReturnType<typeof overlayPricingFromObservations>,
): PropertyDTO {
  const agri = property.agricultural_details
    ? { ...property.agricultural_details }
    : null;
  if (overlay.total_hectares != null && agri) {
    (agri as { totalHectares?: number | null }).totalHectares =
      agri.totalHectares && agri.totalHectares > 0
        ? agri.totalHectares
        : overlay.total_hectares;
  } else if (overlay.total_hectares != null && !agri) {
    return {
      ...property,
      auction_price: overlay.auction_price,
      reserve_price: overlay.reserve_price,
      estimated_value: overlay.estimated_value,
      floor_size: overlay.floor_size,
      agricultural_details: {
        totalHectares: overlay.total_hectares,
      } as PropertyDTO["agricultural_details"],
    };
  }

  return {
    ...property,
    auction_price: overlay.auction_price,
    reserve_price: overlay.reserve_price,
    estimated_value: overlay.estimated_value,
    floor_size: overlay.floor_size,
    agricultural_details: agri,
  };
}

export class AuctionPriceIntelligenceService {
  /**
   * Build price intelligence for a public catalogue property.
   * Consumes normalized pricing observations when listing fields are empty.
   */
  static async forPublicProperty(
    propertyId: string,
  ): Promise<
    | { ok: true; intelligence: AuctionPriceIntelligence }
    | { ok: false; error: string; status: number }
  > {
    const row = await PropertyRepository.getPublicById(propertyId);
    if (!row) {
      const any = await PropertyRepository.getById(propertyId);
      if (any) {
        return {
          ok: false,
          error:
            "Listing is not on the public catalogue (upcoming/live verified only).",
          status: 404,
        };
      }
      return { ok: false, error: "Property not found", status: 404 };
    }

    if (
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
        error:
          "Listing is not on the public catalogue (upcoming/live verified only).",
        status: 404,
      };
    }

    const heroMap = await ImageRepository.heroMap([propertyId]);
    let property: PropertyDTO = PropertyMapper.toDTO(
      row,
      heroMap.get(propertyId),
    );

    const observations =
      await PricingObservationRepository.listByProperty(propertyId);
    const overlay = overlayPricingFromObservations(property, observations);
    property = applyOverlay(property, overlay);

    const premium = await SubscriptionService.premium();
    const masterId = row.property_master_id ?? null;

    let events: AuctionEventRow[] = [];
    if (premium && masterId) {
      const raw = await AuctionEventRepository.listByMaster(masterId);
      events = asAuctionEvents(raw);
    }

    let explicitGuide: number | null = overlay.guide_price;
    if (events.length > 0 && explicitGuide == null) {
      const forListing = events.find(
        (e) => e.listing_property_id === propertyId,
      );
      if (
        forListing?.guide_price != null &&
        Number.isFinite(forListing.guide_price) &&
        forListing.guide_price > 0 &&
        forListing.guide_price !== property.auction_price
      ) {
        explicitGuide = forListing.guide_price;
      }
    }

    const intelligence = buildAuctionPriceIntelligence({
      property,
      propertyMasterId: masterId,
      auctionEvents: events,
      explicitGuidePrice: explicitGuide,
      premium,
      conflictDetected: overlay.conflictDetected,
    });

    return { ok: true, intelligence };
  }

  /** Build from an already-loaded DTO (detail page). */
  static async fromProperty(
    property: PropertyDTO,
    options?: { propertyMasterId?: string | null },
  ): Promise<AuctionPriceIntelligence> {
    const premium = await SubscriptionService.premium();
    let masterId = options?.propertyMasterId ?? null;

    if (!masterId) {
      const row = await PropertyRepository.getById(property.id);
      masterId = row?.property_master_id ?? null;
    }

    const observations = await PricingObservationRepository.listByProperty(
      property.id,
    );
    const overlay = overlayPricingFromObservations(property, observations);
    const enriched = applyOverlay(property, overlay);

    let events: AuctionEventRow[] = [];
    if (premium && masterId) {
      events = asAuctionEvents(
        await AuctionEventRepository.listByMaster(masterId),
      );
    }

    return buildAuctionPriceIntelligence({
      property: enriched,
      propertyMasterId: masterId,
      auctionEvents: events,
      explicitGuidePrice: overlay.guide_price,
      premium,
      conflictDetected: overlay.conflictDetected,
    });
  }
}
