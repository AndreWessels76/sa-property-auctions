import "server-only";

import { randomUUID } from "crypto";
import {
  assessIdentityMatch,
  computePropertyFingerprint,
  fingerprintInputFromProperty,
} from "@/lib/identity";
import { enrichVerifiedListing } from "@/lib/platform/dataEnrichment";
import type { Property } from "@/lib/types/property";
import { LoggerService } from "@/lib/logger";
import {
  assessLocationQuality,
  assessBackfillEvent,
  buildBackfillAuctionEvent,
  identityDecisionToAuditStatus,
  isAutoAttachDecision,
  resolveBackfillIdentityDecision,
  type BackfillAuditStatus,
  type BackfillRecordResult,
  type BackfillSummary,
} from "@/lib/backfill";
import {
  AuctionEventRepository,
  PropertyMasterRepository,
} from "@/lib/repositories/PropertyIdentityRepository";
import { PropertyRepository } from "@/lib/repositories/PropertyRepository";
import { PricingObservationRepository } from "@/lib/repositories/PricingObservationRepository";
import {
  PropertyHistoryBackfillRepository,
  type BackfillReviewRow,
  type BackfillRunRow,
} from "@/lib/repositories/PropertyHistoryBackfillRepository";
import { PropertyIdentityService } from "./PropertyIdentityService";
import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";

type Counters = {
  recordsScanned: number;
  mastersCreated: number;
  mastersProposed: number;
  mastersMatched: number;
  masterReview: number;
  masterSkipped: number;
  eventsCreated: number;
  eventsProposed: number;
  eventsMatched: number;
  eventReview: number;
  eventSkipped: number;
  duplicatesSkipped: number;
  mastersInserted: number;
  mastersReused: number;
  eventsInserted: number;
  eventsReused: number;
  eventsDuplicatesSkipped: number;
  identityConflicts: number;
  insufficientEvidence: number;
  pricingLinked: number;
  locationReview: number;
  sourceBreakdown: Record<string, number>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function persistedUuid(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return UUID_RE.test(value) ? value : null;
}

function bumpSource(map: Record<string, number>, source: string | null | undefined) {
  const key = source?.trim() || "unknown";
  map[key] = (map[key] ?? 0) + 1;
}

function emptyCounters(): Counters {
  return {
    recordsScanned: 0,
    mastersCreated: 0,
    mastersProposed: 0,
    mastersMatched: 0,
    masterReview: 0,
    masterSkipped: 0,
    eventsCreated: 0,
    eventsProposed: 0,
    eventsMatched: 0,
    eventReview: 0,
    eventSkipped: 0,
    duplicatesSkipped: 0,
    mastersInserted: 0,
    mastersReused: 0,
    eventsInserted: 0,
    eventsReused: 0,
    eventsDuplicatesSkipped: 0,
    identityConflicts: 0,
    insufficientEvidence: 0,
    pricingLinked: 0,
    locationReview: 0,
    sourceBreakdown: {},
  };
}

/**
 * Property History Backfill & Auction Event Reconstruction Engine 1.0.
 * Reuses Property Identity Engine — never fabricates outcomes or prices.
 */
export class PropertyHistoryBackfillService {
  static async preview(input?: { limit?: number }): Promise<BackfillSummary> {
    return this.runBatch({
      dryRun: true,
      runKind: "preview",
      limit: input?.limit ?? 200,
    });
  }

  static async backfill(input?: {
    limit?: number;
    dryRun?: boolean;
  }): Promise<BackfillSummary> {
    return this.runBatch({
      dryRun: input?.dryRun ?? false,
      runKind: "backfill",
      limit: input?.limit ?? 200,
    });
  }

  static async audit(runId?: string) {
    const runs = runId
      ? [(await PropertyHistoryBackfillRepository.getRun(runId))].filter(Boolean)
      : await PropertyHistoryBackfillRepository.listRuns(10);

    const latest = runs[0] as BackfillRunRow | undefined;
    const items = latest ? await PropertyHistoryBackfillRepository.listItemsByRun(latest.id) : [];
    const reviews = await PropertyHistoryBackfillRepository.listPendingReviews(100);

    const [masterCount, eventCount, obsCount] = await Promise.all([
      PropertyMasterRepository.count().catch(() => 0),
      AuctionEventRepository.count().catch(() => 0),
      PricingObservationRepository.listRecent(5000).then((r) => r.length).catch(() => 0),
    ]);

    return {
      runs,
      latest,
      items,
      reviews,
      database: {
        property_masters: masterCount,
        auction_events: eventCount,
        pricing_observations: obsCount,
      },
      pendingReviewCount: reviews.length,
    };
  }

  static async listReviews(): Promise<BackfillReviewRow[]> {
    return PropertyHistoryBackfillRepository.listPendingReviews(100);
  }

  static async approveReview(input: {
    reviewId: string;
    action: "approve_match" | "reject_match" | "create_new_master" | "approve_event" | "reject_event";
    operator?: string;
    note?: string;
  }) {
    const review = (
      await PropertyHistoryBackfillRepository.listPendingReviews(500)
    ).find((r) => r.id === input.reviewId);
    if (!review) {
      return { ok: false as const, error: "Review not found or already resolved." };
    }

    const property = await PropertyRepository.getById(review.listing_property_id);
    if (!property) {
      return { ok: false as const, error: "Listing not found." };
    }

    if (input.action === "reject_match" || input.action === "reject_event") {
      await PropertyHistoryBackfillRepository.resolveReview(review.id, {
        status: "rejected",
        resolvedBy: input.operator ?? "admin",
        resolutionNote: input.note,
      });
      return { ok: true as const, action: input.action };
    }

    if (input.action === "create_new_master") {
      const result = await PropertyIdentityService.resolveAndAttach({
        listing: property,
        listingPropertyId: property.id,
        sourceName: property.source_name ?? "backfill_review",
        connectorId: property.connector_id ?? undefined,
      });
      await PropertyHistoryBackfillRepository.resolveReview(review.id, {
        status: "new_master",
        resolvedBy: input.operator ?? "admin",
        resolutionNote: input.note,
      });
      return { ok: true as const, result };
    }

    if (input.action === "approve_match" && review.proposed_master_id) {
      await PropertyMasterRepository.linkListing(
        review.listing_property_id,
        review.proposed_master_id,
      );
      const eventResult = await this.reconstructEventForListing(
        property,
        review.proposed_master_id,
        false,
      );
      await PropertyHistoryBackfillRepository.resolveReview(review.id, {
        status: "approved",
        resolvedBy: input.operator ?? "admin",
        resolutionNote: input.note,
      });
      return { ok: true as const, eventResult };
    }

    if (input.action === "approve_event") {
      const masterId =
        review.proposed_master_id ?? property.property_master_id ?? null;
      if (!masterId) {
        return { ok: false as const, error: "No Property Master to attach event." };
      }
      const eventResult = await this.reconstructEventForListing(property, masterId, false);
      await PropertyHistoryBackfillRepository.resolveReview(review.id, {
        status: "approved",
        resolvedBy: input.operator ?? "admin",
        resolutionNote: input.note,
      });
      return { ok: true as const, eventResult };
    }

    return { ok: false as const, error: "Unknown or incomplete review action." };
  }

  private static async runBatch(input: {
    dryRun: boolean;
    runKind: "preview" | "backfill" | "retry";
    limit: number;
  }): Promise<BackfillSummary> {
    const counters = emptyCounters();
    const run = await PropertyHistoryBackfillRepository.createRun({
      runKind: input.runKind,
      dryRun: input.dryRun,
      batchLimit: input.limit,
    });

    const runId = run?.id ?? randomUUID();
    const schemaAvailable = Boolean(run);

    try {
      const candidates = await PropertyRepository.listBackfillCandidates(input.limit);
      const masters = await PropertyMasterRepository.listCandidates(500);

      for (const listing of candidates) {
        counters.recordsScanned += 1;
        bumpSource(counters.sourceBreakdown, listing.source_name);

        const record = await this.processListing({
          listing,
          masters,
          dryRun: input.dryRun,
          runId,
          schemaAvailable,
        });

        this.applyRecordCounters(counters, record);

        if (schemaAvailable && run) {
          for (const status of record.auditStatuses) {
            await PropertyHistoryBackfillRepository.insertItem({
              run_id: runId,
              listing_property_id: listing.id,
              property_master_id: persistedUuid(record.propertyMasterId),
              auction_event_id: persistedUuid(record.auctionEventId),
              identity_decision: record.identity.decision,
              audit_status: status,
              confidence: record.identity.confidence,
              event_fingerprint: record.event.eventFingerprint,
              matching_signals: record.identity.signals,
              evidence: {
                dryRun: record.dryRun,
                masterPersisted: record.masterPersisted,
                eventPersisted: record.eventPersisted,
                masterProposed: record.masterProposed,
                eventProposed: record.eventProposed,
                identityNotes: record.identity.notes,
                eventNotes: record.event.notes,
                eventStatus: record.event.status,
              },
              source_name: listing.source_name,
              source_url: listing.source_url,
            });
          }

          if (
            record.identity.decision === "MATCH_REVIEW" ||
            record.identity.decision === "IDENTITY_REVIEW_REQUIRED"
          ) {
            await PropertyHistoryBackfillRepository.upsertReview({
              run_id: runId,
              listing_property_id: listing.id,
              review_kind: "identity",
              proposed_master_id: record.identity.matchedMasterId,
              identity_decision: record.identity.decision,
              confidence: record.identity.confidence,
              matching_signals: record.identity.signals,
              conflict_reason: record.identity.notes.join("; "),
              evidence: { fingerprint: record.identity.fingerprint },
            });
          }

          if (record.event.auditStatus === "EVENT_REVIEW") {
            await PropertyHistoryBackfillRepository.upsertReview({
              run_id: runId,
              listing_property_id: listing.id,
              review_kind: "event",
              proposed_master_id: record.propertyMasterId,
              proposed_event_fingerprint: record.event.eventFingerprint,
              conflict_reason: record.event.notes.join("; "),
              evidence: { status: record.event.status },
            });
          }
        }
      }

      if (run) {
        await PropertyHistoryBackfillRepository.updateRun(runId, {
          status: "completed",
          completed_at: new Date().toISOString(),
          records_scanned: counters.recordsScanned,
          masters_created: input.dryRun ? 0 : counters.mastersInserted,
          masters_matched: counters.mastersMatched,
          master_review: counters.masterReview,
          master_skipped: counters.masterSkipped,
          events_created: input.dryRun ? 0 : counters.eventsInserted,
          events_matched: counters.eventsMatched,
          event_review: counters.eventReview,
          event_skipped: counters.eventSkipped,
          duplicates_skipped: counters.eventsDuplicatesSkipped,
          identity_conflicts: counters.identityConflicts,
          insufficient_evidence: counters.insufficientEvidence,
          pricing_linked: counters.pricingLinked,
          location_review: counters.locationReview,
          meta: input.dryRun
            ? {
                masters_proposed: counters.mastersProposed,
                events_proposed: counters.eventsProposed,
              }
            : {
                masters_inserted: counters.mastersInserted,
                masters_reused: counters.mastersReused,
                masters_attached: counters.mastersCreated,
                events_inserted: counters.eventsInserted,
                events_reused: counters.eventsReused,
                events_attached: counters.eventsCreated,
                events_duplicates_skipped: counters.eventsDuplicatesSkipped,
              },
        });
      }

      LoggerService.audit("property_history_backfill.completed", {
        runId,
        dryRun: input.dryRun,
        ...counters,
      });

      return {
        runId,
        dryRun: input.dryRun,
        schemaAvailable,
        ...counters,
        duplicatesSkipped: counters.eventsDuplicatesSkipped,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backfill failed";
      if (run) {
        await PropertyHistoryBackfillRepository.updateRun(runId, {
          status: "failed",
          error_message: message,
          completed_at: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  private static applyRecordCounters(counters: Counters, record: BackfillRecordResult) {
    const id = record.identity.decision;

    if (record.dryRun) {
      if (record.masterProposed) counters.mastersProposed += 1;
      if (record.eventProposed) counters.eventsProposed += 1;
    } else {
      if (record.masterPersisted) counters.mastersCreated += 1;
      if (record.masterInserted) counters.mastersInserted += 1;
      if (record.masterReused) counters.mastersReused += 1;
      if (record.eventPersisted) counters.eventsCreated += 1;
      if (record.eventInserted) counters.eventsInserted += 1;
      if (record.eventReused) counters.eventsReused += 1;
      if (record.eventDuplicateSkipped) counters.eventsDuplicatesSkipped += 1;
    }

    counters.duplicatesSkipped = counters.eventsDuplicatesSkipped;

    if (
      id === "MATCH_CONFIRMED" ||
      id === "MATCH_HIGH_CONFIDENCE" ||
      id === "ALREADY_LINKED"
    ) {
      counters.mastersMatched += 1;
    }
    if (id === "MATCH_REVIEW" || id === "IDENTITY_REVIEW_REQUIRED") {
      counters.masterReview += 1;
    }
    if (id === "INSUFFICIENT_EVIDENCE" || id === "MATCH_REJECTED") {
      counters.insufficientEvidence += 1;
      counters.masterSkipped += 1;
    }

    if (record.event.auditStatus === "EVENT_MATCHED") {
      counters.eventsMatched += 1;
    }
    if (record.event.auditStatus === "EVENT_REVIEW") counters.eventReview += 1;
    if (record.event.auditStatus === "EVENT_SKIPPED") counters.eventSkipped += 1;

    if (!record.dryRun) counters.pricingLinked += record.pricingLinked;

    if (record.identity.notes.some((n) => n.includes("Location"))) {
      counters.locationReview += 1;
    }
  }

  private static async processListing(input: {
    listing: Property;
    masters: Awaited<ReturnType<typeof PropertyMasterRepository.listCandidates>>;
    dryRun: boolean;
    runId: string;
    schemaAvailable: boolean;
  }): Promise<BackfillRecordResult> {
    const { listing, masters, dryRun } = input;
    const enrichment = enrichVerifiedListing(listing);
    const fpInput = fingerprintInputFromProperty({
      ...listing,
      farm_name: enrichment.address.farmName,
      farm_number: enrichment.address.farmNumber,
      erf_number: enrichment.address.erfNumber,
      portion_number: enrichment.address.portion,
    });
    const fp = computePropertyFingerprint(fpInput);
    const location = assessLocationQuality({
      town: enrichment.address.town ?? listing.town,
      suburb: enrichment.address.suburb,
      province: enrichment.address.province ?? listing.province,
      farmName: enrichment.address.farmName,
      erfNumber: enrichment.address.erfNumber,
      streetAddress: enrichment.address.street,
      latitude: enrichment.gps.latitude,
      longitude: enrichment.gps.longitude,
    });

    const match = assessIdentityMatch(
      fpInput,
      masters.map((c) => ({
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

    const identity = resolveBackfillIdentityDecision({
      match,
      signalCount: fp.signalCount,
      alreadyLinked: Boolean(listing.property_master_id),
      locationFlags: location.flags,
    });

    const auditStatuses: BackfillAuditStatus[] = [];
    let propertyMasterId = listing.property_master_id ?? null;
    let auctionEventId: string | null = null;
    let pricingLinked = 0;
    let createdMaster = false;
    let masterPersisted = false;
    let eventPersisted = false;
    let masterProposed = false;
    let eventProposed = false;
    let masterInserted = false;
    let masterReused = false;
    let eventInserted = false;
    let eventReused = false;
    let eventDuplicateSkipped = false;

    if (isAutoAttachDecision(identity.decision) && !dryRun) {
      if (listing.property_master_id) {
        propertyMasterId = listing.property_master_id;
        masterPersisted = true;
        masterReused = true;
        auditStatuses.push("MASTER_MATCHED");
      } else {
        const attached = await PropertyIdentityService.resolveAndAttach({
          listing,
          listingPropertyId: listing.id,
          sourceName: listing.source_name ?? "history_backfill",
          connectorId: listing.connector_id ?? undefined,
        });
        propertyMasterId = attached.master?.id ?? null;
        createdMaster = attached.createdMaster;
        auctionEventId = attached.auctionEventId;
        masterPersisted = Boolean(attached.master?.id && attached.schemaAvailable);
        masterInserted = Boolean(createdMaster && masterPersisted);
        masterReused = Boolean(masterPersisted && !createdMaster);
        if (auctionEventId) {
          eventPersisted = true;
          eventInserted = true;
        }
        auditStatuses.push(
          identityDecisionToAuditStatus(identity.decision, createdMaster),
        );
        if (auctionEventId) {
          auditStatuses.push("EVENT_MATCHED");
        }
      }
    } else if (isAutoAttachDecision(identity.decision) && dryRun) {
      masterProposed = true;
      auditStatuses.push(
        identityDecisionToAuditStatus(identity.decision, identity.decision === "NEW_MASTER"),
      );
    } else {
      auditStatuses.push(identityDecisionToAuditStatus(identity.decision, false));
      if (identity.decision === "MATCH_REVIEW" || identity.decision === "IDENTITY_REVIEW_REQUIRED") {
        auditStatuses.push("MASTER_REVIEW");
      }
    }

    let eventAssessment = assessBackfillEvent({
      propertyMasterId: propertyMasterId ?? "unknown",
      listingPropertyId: listing.id,
      externalListingId: listing.external_listing_id,
      connectorId: listing.connector_id,
      agency: listing.auction_agency ?? listing.source_name,
      auctionDate: listing.auction_date,
      sourceUrl: listing.source_url,
      existingEventId: null,
      listingStatus: listing.listing_status,
      status: listing.status,
      verificationState: listing.verification_state,
      venue: listing.auction_venue,
      title: listing.title,
      description: listing.description,
    });

    if (auctionEventId) {
      eventReused = !eventInserted;
      eventAssessment = {
        ...eventAssessment,
        isDuplicate: false,
        existingEventId: auctionEventId,
        auditStatus: eventInserted ? "EVENT_CREATED" : "EVENT_MATCHED",
      };
    } else if ((propertyMasterId || masterProposed) && !auctionEventId) {
      const existing =
        listing.connector_id && listing.external_listing_id
          ? await AuctionEventRepository.findByExternal(
              listing.connector_id,
              listing.external_listing_id,
            )
          : null;

      eventAssessment = assessBackfillEvent({
        propertyMasterId: propertyMasterId ?? "unknown",
        listingPropertyId: listing.id,
        externalListingId: listing.external_listing_id,
        connectorId: listing.connector_id,
        agency: listing.auction_agency ?? listing.source_name,
        auctionDate: listing.auction_date,
        sourceUrl: listing.source_url,
        existingEventId: existing?.id ?? null,
        listingStatus: listing.listing_status,
        status: listing.status,
        verificationState: listing.verification_state,
        venue: listing.auction_venue,
        title: listing.title,
        description: listing.description,
      });

      if (eventAssessment.isDuplicate) {
        auditStatuses.push("DUPLICATE_EVENT");
        auctionEventId = eventAssessment.existingEventId;
        eventPersisted = Boolean(auctionEventId);
        eventReused = true;
        eventDuplicateSkipped = true;
      } else if (eventAssessment.canCreate && isAutoAttachDecision(identity.decision)) {
        auditStatuses.push(eventAssessment.auditStatus);
        if (dryRun) {
          eventProposed = true;
        } else if (propertyMasterId) {
          const event = buildBackfillAuctionEvent({
            propertyMasterId,
            listingPropertyId: listing.id,
            externalListingId: listing.external_listing_id,
            agency: listing.auction_agency ?? listing.source_name,
            auctionDate: listing.auction_date,
            auctionTime: listing.auction_time,
            venue: listing.auction_venue,
            reservePrice: listing.reserve_price,
            listingStatus: listing.listing_status,
            status: listing.status,
            verificationState: listing.verification_state,
            sourceName: listing.source_name,
            sourceUrl: listing.source_url,
            connectorId: listing.connector_id,
            brochureLink: listing.brochure_link,
            termsLink: listing.terms_link,
            catalogueLink: listing.catalogue_link,
            verifiedAt: listing.last_verified_at,
            title: listing.title,
            description: listing.description,
          });
          const upserted = await AuctionEventRepository.upsertEvent(event);
          auctionEventId = upserted?.id ?? null;
          eventPersisted = Boolean(upserted?.id);
          eventInserted = Boolean(upserted?.id);
          if (auctionEventId) {
            pricingLinked = await PricingObservationRepository.linkToMasterAndEvent({
              propertyId: listing.id,
              propertyMasterId,
              auctionEventId,
            });
          }
        }
      } else if (!isAutoAttachDecision(identity.decision)) {
        auditStatuses.push("EVENT_SKIPPED");
      }
    }

    if (propertyMasterId && auctionEventId && !dryRun && pricingLinked === 0) {
      pricingLinked = await PricingObservationRepository.linkToMasterAndEvent({
        propertyId: listing.id,
        propertyMasterId,
        auctionEventId,
      });
    }

    return {
      listingPropertyId: listing.id,
      propertyMasterId: persistedUuid(propertyMasterId),
      auctionEventId: persistedUuid(auctionEventId),
      identity,
      event: eventAssessment,
      auditStatuses,
      pricingLinked,
      skipped: !isAutoAttachDecision(identity.decision),
      dryRun,
      masterPersisted,
      eventPersisted,
      masterProposed,
      eventProposed,
      masterInserted,
      masterReused,
      eventInserted,
      eventReused,
      eventDuplicateSkipped,
    };
  }

  private static async reconstructEventForListing(
    listing: Property,
    propertyMasterId: string,
    dryRun: boolean,
  ) {
    const existing =
      listing.connector_id && listing.external_listing_id
        ? await AuctionEventRepository.findByExternal(
            listing.connector_id,
            listing.external_listing_id,
          )
        : null;
    if (existing) {
      return { eventId: existing.id, duplicate: true };
    }
    if (dryRun) return { eventId: null, dryRun: true };

    const event = buildBackfillAuctionEvent({
      propertyMasterId,
      listingPropertyId: listing.id,
      externalListingId: listing.external_listing_id,
      agency: listing.auction_agency ?? listing.source_name,
      auctionDate: listing.auction_date,
      auctionTime: listing.auction_time,
      venue: listing.auction_venue,
      reservePrice: listing.reserve_price,
      listingStatus: listing.listing_status,
      status: listing.status,
      verificationState: listing.verification_state,
      sourceName: listing.source_name,
      sourceUrl: listing.source_url,
      connectorId: listing.connector_id,
      verifiedAt: listing.last_verified_at,
      title: listing.title,
      description: listing.description,
    });
    const upserted = await AuctionEventRepository.upsertEvent(event);
    if (upserted?.id) {
      await PricingObservationRepository.linkToMasterAndEvent({
        propertyId: listing.id,
        propertyMasterId,
        auctionEventId: upserted.id,
      });
    }
    return { eventId: upserted?.id ?? null, duplicate: false };
  }

  static async publicCatalogueSafetyCheck() {
    const all = await PropertyRepository.getAll();
    const publicCount = all.filter((p) =>
      isPubliclyActiveListing({
        verification_state: p.verification_state,
        data_classification: p.data_classification,
        listing_status: p.listing_status,
        status: p.status,
        auction_date: p.auction_date,
      }),
    ).length;
    const historicalLeaks = all.filter(
      (p) =>
        (p.verification_state === "expired" ||
          p.verification_state === "sold" ||
          p.verification_state === "withdrawn") &&
        isPubliclyActiveListing({
          verification_state: p.verification_state,
          data_classification: p.data_classification,
          listing_status: p.listing_status,
          status: p.status,
          auction_date: p.auction_date,
        }),
    ).length;

    return {
      totalListings: all.length,
      publicCatalogueCount: publicCount,
      historicalLeaks,
      clean: historicalLeaks === 0,
    };
  }
}
