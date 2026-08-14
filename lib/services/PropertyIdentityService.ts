import { randomUUID } from "crypto";
import {
  assessIdentityMatch,
  buildAuctionEventFromListing,
  buildHistoryEvent,
  buildProvenanceRecords,
  classificationFromProperty,
  fingerprintInputFromProperty,
  historyEventsFromFieldChanges,
  suggestPropertyLifecycle,
  type IdentityMatchResult,
  type PropertyMaster,
} from "@/lib/identity";
import { enrichVerifiedListing } from "@/lib/platform/dataEnrichment";
import { buildListingQualityProfileFromProperty } from "@/lib/platform/qualityEngine";
import type { Property } from "@/lib/types/property";
import { LoggerService } from "@/lib/logger";
import {
  AuctionEventRepository,
  PropertyHistoryRepository,
  PropertyMasterRepository,
  PropertyProvenanceRepository,
} from "@/lib/repositories/PropertyIdentityRepository";

export type ResolveIdentityResult = {
  master: PropertyMaster | null;
  match: IdentityMatchResult;
  auctionEventId: string | null;
  createdMaster: boolean;
  schemaAvailable: boolean;
};

/**
 * Property Identity Service — resolve/create masters, attach auction events.
 * Soft-fails when identity tables are not yet migrated.
 */
export class PropertyIdentityService {
  static async resolveAndAttach(input: {
    listing: Property;
    listingPropertyId: string;
    sourceName?: string;
    connectorId?: string;
    changes?: Array<{ field: string; oldValue?: string | null; newValue?: string | null }>;
  }): Promise<ResolveIdentityResult> {
    const enrichment = enrichVerifiedListing(input.listing);
    const fpInput = fingerprintInputFromProperty({
      ...input.listing,
      farm_name: enrichment.address.farmName,
      farm_number: enrichment.address.farmNumber,
      erf_number: enrichment.address.erfNumber,
      portion_number: enrichment.address.portion,
    });

    let candidates: PropertyMaster[] = [];
    try {
      candidates = await PropertyMasterRepository.listCandidates(300);
    } catch (error) {
      LoggerService.warn("property_identity.candidates_unavailable", {
        error: error instanceof Error ? error.message : "unknown",
      });
      return {
        master: null,
        match: assessIdentityMatch(fpInput, []),
        auctionEventId: null,
        createdMaster: false,
        schemaAvailable: false,
      };
    }

    const match = assessIdentityMatch(
      fpInput,
      candidates.map((c) => ({
        id: c.id,
        fingerprint: c.fingerprint,
        latitude: c.latitude,
        longitude: c.longitude,
        streetAddress: c.street_address,
        farmName: c.farm_name,
        farmNumber: c.farm_number,
        erfNumber: c.erf_number,
        portionNumber: c.portion_number,
        title: c.title,
        town: c.town,
        province: c.province,
        landSizeSqm: c.land_size_sqm != null ? Number(c.land_size_sqm) : null,
        combinedExtent: c.combined_extent,
        primaryImageHash: c.primary_image_hash,
        externalReferences: [],
      })),
    );

    // Also try exact fingerprint lookup (cache path)
    const byFp = await PropertyMasterRepository.findByFingerprint(match.fingerprint);
    let master = byFp;
    let createdMaster = false;

    if (!master && match.recommendLink && match.matchedMasterId) {
      master = await PropertyMasterRepository.findById(match.matchedMasterId);
    }

    const classification = classificationFromProperty(input.listing);
    const quality = buildListingQualityProfileFromProperty(input.listing, true);
    const lifecycle = suggestPropertyLifecycle({
      verificationState: input.listing.verification_state,
      listingStatus: input.listing.listing_status ?? input.listing.status,
      auctionDate: input.listing.auction_date,
      hasMaster: true,
    });

    if (!master) {
      if (match.matchClass === "possible_duplicate") {
        LoggerService.audit("property_identity.possible_duplicate", {
          fingerprint: match.fingerprint,
          confidence: match.confidence,
          signals: match.signals,
          listingId: input.listingPropertyId,
        });
      }

      const id = randomUUID();
      master = await PropertyMasterRepository.insert({
        id,
        fingerprint: match.fingerprint,
        fingerprint_version: 1,
        identity_confidence: match.confidence || 50,
        identity_match_class: match.matchClass === "new" ? "new" : match.matchClass,
        lifecycle_state: lifecycle,
        property_status: "active",
        property_version: 1,
        is_master: true,
        title: input.listing.title,
        street_address: enrichment.address.street,
        suburb: enrichment.address.suburb,
        town: enrichment.address.town ?? input.listing.town,
        province: enrichment.address.province ?? input.listing.province,
        municipality: enrichment.address.municipality,
        ward: null,
        postal_code: enrichment.address.postalCode,
        region: enrichment.gps.region,
        farm_name: enrichment.address.farmName,
        farm_number: enrichment.address.farmNumber,
        erf_number: enrichment.address.erfNumber,
        portion_number: enrichment.address.portion,
        latitude: enrichment.gps.latitude,
        longitude: enrichment.gps.longitude,
        land_size_sqm: enrichment.land.squareMetres,
        combined_extent: enrichment.land.combinedLabel,
        property_type: classification.propertyType,
        classification_confidence: classification.confidence,
        primary_image_url: null,
        primary_image_hash: null,
        verification_state: input.listing.verification_state ?? null,
        data_classification: input.listing.data_classification ?? null,
        overall_data_quality: quality.overallListingQuality,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      createdMaster = Boolean(master);
      if (!master) {
        return {
          master: null,
          match,
          auctionEventId: null,
          createdMaster: false,
          schemaAvailable: false,
        };
      }

      await PropertyHistoryRepository.append([
        buildHistoryEvent({
          property_master_id: master.id,
          listing_property_id: input.listingPropertyId,
          category: "identity",
          field_name: "fingerprint",
          new_value: match.fingerprint,
          source_name: input.sourceName ?? "connector_import",
          confidence: match.confidence,
          meta: { matchClass: match.matchClass, signals: match.signals },
        }),
        buildHistoryEvent({
          property_master_id: master.id,
          listing_property_id: input.listingPropertyId,
          category: "lifecycle",
          field_name: "lifecycle_state",
          new_value: lifecycle,
          source_name: input.sourceName ?? "connector_import",
        }),
      ]);
    } else {
      // Relist / revisit existing master — bump version, never delete history
      const nextVersion = (master.property_version ?? 1) + (createdMaster ? 0 : 1);
      const nextLifecycle =
        master.lifecycle_state === "sold" ||
        master.lifecycle_state === "auction_closed" ||
        master.lifecycle_state === "archived"
          ? "relisted"
          : lifecycle;

      await PropertyMasterRepository.update(master.id, {
        last_seen_at: new Date().toISOString(),
        property_version: nextVersion,
        lifecycle_state: nextLifecycle,
        verification_state: input.listing.verification_state ?? master.verification_state,
        overall_data_quality: quality.overallListingQuality,
        identity_confidence: Math.max(
          Number(master.identity_confidence) || 0,
          match.confidence,
        ),
        identity_match_class: match.matchClass,
        title: input.listing.title ?? master.title,
        town: enrichment.address.town ?? master.town,
        province: enrichment.address.province ?? master.province,
        property_type: classification.propertyType ?? master.property_type,
        classification_confidence: classification.confidence,
        latitude: enrichment.gps.latitude ?? master.latitude,
        longitude: enrichment.gps.longitude ?? master.longitude,
        land_size_sqm: enrichment.land.squareMetres ?? master.land_size_sqm,
        combined_extent: enrichment.land.combinedLabel ?? master.combined_extent,
        farm_name: enrichment.address.farmName ?? master.farm_name,
        farm_number: enrichment.address.farmNumber ?? master.farm_number,
        erf_number: enrichment.address.erfNumber ?? master.erf_number,
        portion_number: enrichment.address.portion ?? master.portion_number,
      });

      if (input.changes?.length) {
        await PropertyHistoryRepository.append(
          historyEventsFromFieldChanges({
            propertyMasterId: master.id,
            listingPropertyId: input.listingPropertyId,
            sourceName: input.sourceName,
            changes: input.changes,
          }),
        );
      }

      if (nextLifecycle === "relisted") {
        await PropertyHistoryRepository.append([
          buildHistoryEvent({
            property_master_id: master.id,
            listing_property_id: input.listingPropertyId,
            category: "lifecycle",
            field_name: "lifecycle_state",
            old_value: master.lifecycle_state,
            new_value: "relisted",
            source_name: input.sourceName ?? "connector_import",
          }),
        ]);
      }

      master = (await PropertyMasterRepository.findById(master.id)) ?? master;
    }

    await PropertyMasterRepository.linkListing(input.listingPropertyId, master.id);

    const event = buildAuctionEventFromListing({
      propertyMasterId: master.id,
      listingPropertyId: input.listingPropertyId,
      externalListingId: input.listing.external_listing_id,
      agency: input.listing.auction_agency ?? input.listing.source_name,
      auctionDate: input.listing.auction_date,
      auctionTime: input.listing.auction_time,
      venue: input.listing.auction_venue,
      reservePrice: input.listing.reserve_price,
      // Never map auction_price → guide_price (Pricing Data Acquisition 1.0 semantics).
      guidePrice: null,
      listingStatus: input.listing.listing_status ?? input.listing.status,
      verificationState: input.listing.verification_state,
      sourceName: input.sourceName ?? input.listing.source_name,
      sourceUrl: input.listing.source_url,
      connectorId: input.connectorId ?? input.listing.connector_id,
      brochureLink: input.listing.brochure_link,
      termsLink: input.listing.terms_link,
      catalogueLink: input.listing.catalogue_link,
      verifiedAt: input.listing.last_verified_at,
    });

    const upserted = await AuctionEventRepository.upsertEvent(event);
    if (upserted) {
      await PropertyHistoryRepository.append([
        buildHistoryEvent({
          property_master_id: master.id,
          auction_event_id: upserted.id,
          listing_property_id: input.listingPropertyId,
          category: "auction",
          field_name: "auction_event",
          new_value: event.status,
          source_name: input.sourceName ?? "connector_import",
          meta: {
            auction_date: event.auction_date,
            agency: event.agency,
          },
        }),
      ]);
    }

    await PropertyProvenanceRepository.upsertMany(
      buildProvenanceRecords({
        propertyMasterId: master.id,
        sourceName: input.sourceName ?? "connector_import",
        sourceUrl: input.listing.source_url,
        verificationDate: input.listing.last_verified_at,
        confidence: match.confidence,
        fields: {
          auction_date: input.listing.auction_date,
          town: enrichment.address.town ?? input.listing.town,
          province: enrichment.address.province ?? input.listing.province,
          street_address: enrichment.address.street,
          property_type: classification.propertyType,
          latitude: enrichment.gps.latitude,
          longitude: enrichment.gps.longitude,
          farm_number: enrichment.address.farmNumber,
          erf_number: enrichment.address.erfNumber,
        },
      }),
    );

    LoggerService.audit("property_identity.resolved", {
      masterId: master.id,
      listingId: input.listingPropertyId,
      fingerprint: match.fingerprint,
      matchClass: match.matchClass,
      confidence: match.confidence,
      createdMaster,
      auctionEventId: upserted?.id ?? null,
    });

    return {
      master,
      match,
      auctionEventId: upserted?.id ?? null,
      createdMaster,
      schemaAvailable: true,
    };
  }
}
