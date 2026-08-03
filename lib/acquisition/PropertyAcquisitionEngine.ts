import { randomUUID } from "crypto";
import {
  BiddersChoiceConnector,
  BIDDERS_CHOICE_CONNECTOR_ID,
} from "@/lib/connectors/biddersChoice/BiddersChoiceConnector";
import { ImportPipelineAudit } from "@/lib/imports/ImportPipelineAudit";
import { assessDuplicateConfidence } from "@/lib/data/deduplicationStandard";
import { scoreMultiDimensionalQuality } from "@/lib/data/multiQualityScore";
import {
  normalizePropertyType,
  normalizeProvince,
  validateExtractedListing,
} from "@/lib/acquisition/validateListing";
import {
  detectListingChanges,
  persistListingChanges,
} from "@/lib/acquisition/changeDetection";
import {
  recordImportRejection,
  recordImportReport,
} from "@/lib/acquisition/metrics";
import type {
  AcquisitionRunOptions,
  AcquisitionRunResult,
  AcquisitionStage,
  ExtractedListing,
} from "@/lib/acquisition/types";
import { createServiceClient } from "@/lib/supabase/admin";
import { processImage } from "@/lib/images/processImage";
import { markHeroAsPrimary } from "@/lib/images/markHeroAsPrimary";
import { LoggerService } from "@/lib/logger";
import { refreshPropertyCache } from "@/lib/services/actions";
import type { Property } from "@/lib/types/property";

type StageLog = AcquisitionRunResult["stageLog"][number];

/**
 * Property Acquisition Engine — reference pipeline for verified listings.
 * Stages: discover → download → extract → normalize → validate →
 * deduplicate → quality → verification queue (pending) → (admin) → public.
 */
export class PropertyAcquisitionEngine {
  constructor(private readonly connector = new BiddersChoiceConnector()) {}

  async run(options: AcquisitionRunOptions = {}): Promise<AcquisitionRunResult> {
    const started = Date.now();
    const jobId =
      options.jobId ??
      `acq_${BIDDERS_CHOICE_CONNECTOR_ID}_${Date.now().toString(36)}`;
    const stageLog: StageLog[] = [];
    const errors: string[] = [];
    let imported = 0;
    let updated = 0;
    let rejected = 0;
    let archived = 0;
    let duplicates = 0;

    const log = async (
      stage: AcquisitionStage,
      status: "started" | "success" | "skipped" | "failed",
      message: string,
    ) => {
      stageLog.push({ stage, status, message });
      await ImportPipelineAudit.record({
        jobId,
        connectorId: BIDDERS_CHOICE_CONNECTOR_ID,
        stage,
        status,
        message,
      });
    };

    await log("discover", "started", "Starting Bidders Choice acquisition");

    const extracted: ExtractedListing[] = [];

    // Licensed payloads first (preferred production path)
    if (options.licensedPayloads?.length) {
      extracted.push(...options.licensedPayloads);
      await log(
        "discover",
        "success",
        `Loaded ${options.licensedPayloads.length} licensed payloads`,
      );
    }

    const allowFetch = options.allowPublicFetch === true;
    const max = options.maxListings ?? 40;

    let candidates = (options.listingUrls ?? []).map((sourceUrl) => ({
      sourceUrl,
      discoveredAt: new Date().toISOString(),
    }));

    if (allowFetch && candidates.length === 0 && extracted.length === 0) {
      try {
        candidates = await this.connector.discover(max);
        await log(
          "discover",
          "success",
          `Discovered ${candidates.length} candidate URLs`,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : "discover failed";
        errors.push(msg);
        await log("discover", "failed", msg);
      }
    } else if (!allowFetch && candidates.length === 0 && extracted.length === 0) {
      await log(
        "discover",
        "skipped",
        "No licensed payloads or listing URLs — public fetch disabled (set allowPublicFetch or provide URLs/CSV)",
      );
    } else {
      await log(
        "discover",
        "success",
        `Using ${candidates.length} explicit URLs + ${extracted.length} licensed rows`,
      );
    }

    if (allowFetch || candidates.length > 0) {
      for (const candidate of candidates.slice(0, max)) {
        await log("download", "started", `Download ${candidate.sourceUrl}`);
        const { html, broken } = await this.connector.downloadListing(
          candidate.sourceUrl,
        );
        if (broken || !html) {
          rejected += 1;
          await recordImportRejection({
            connectorId: BIDDERS_CHOICE_CONNECTOR_ID,
            sourceUrl: candidate.sourceUrl,
            reason: "Broken property page",
            jobId,
          });
          await log("download", "failed", `Broken page ${candidate.sourceUrl}`);
          continue;
        }
        await log("download", "success", `Downloaded ${candidate.sourceUrl}`);
        await log("extract", "started", `Extract ${candidate.sourceUrl}`);
        const listing = this.connector.extract(html, candidate.sourceUrl);
        const validation = validateExtractedListing(listing, {
          pageBroken: false,
        });
        if (!validation.ok) {
          rejected += 1;
          await recordImportRejection({
            connectorId: BIDDERS_CHOICE_CONNECTOR_ID,
            externalListingId: listing.externalListingId,
            sourceUrl: listing.sourceUrl,
            reason: validation.reason,
            payload: { title: listing.title },
            jobId,
          });
          await log("validate", "failed", validation.reason);
          continue;
        }
        extracted.push(listing);
        await log("extract", "success", `Extracted ${listing.externalListingId}`);
      }
    }

    const db = createServiceClient();

    for (const listing of extracted) {
      try {
        await log("normalize", "started", listing.externalListingId);
        const normalized = this.normalize(listing);
        await log("normalize", "success", listing.externalListingId);

        await log("validate", "started", listing.externalListingId);
        const validation = validateExtractedListing(listing);
        if (!validation.ok) {
          rejected += 1;
          await recordImportRejection({
            connectorId: BIDDERS_CHOICE_CONNECTOR_ID,
            externalListingId: listing.externalListingId,
            sourceUrl: listing.sourceUrl,
            reason: validation.reason,
            jobId,
          });
          await log("validate", "failed", validation.reason);
          continue;
        }
        await log("validate", "success", listing.externalListingId);

        await log("deduplicate", "started", listing.externalListingId);
        const existing = await this.findExisting(db, listing);
        if (existing) {
          duplicates += 1;
          const changes = detectListingChanges(existing, normalized);
          const merged = {
            ...normalized,
            id: existing.id,
            verification_state:
              existing.verification_state === "verified"
                ? "pending_verification"
                : existing.verification_state ?? "pending_verification",
            data_classification: "needs_verification",
            updated_at: new Date().toISOString(),
          };
          // Re-verify on material change — never auto-keep verified without admin
          if (changes.length > 0) {
            merged.verification_state = "pending_verification";
            merged.last_verified_at = null;
          }

          const { error } = await db
            .from("properties")
            .update(merged)
            .eq("id", existing.id);
          if (error) throw new Error(error.message);

          await persistListingChanges({
            propertyId: existing.id,
            connectorId: BIDDERS_CHOICE_CONNECTOR_ID,
            externalListingId: listing.externalListingId,
            jobId,
            changes,
          });

          await this.importImages(existing.id, listing.imageUrls);
          updated += 1;
          await log(
            "deduplicate",
            "success",
            `Merged duplicate ${listing.externalListingId} (${changes.length} changes)`,
          );
          await log("verification_queue", "success", `Queued update ${existing.id}`);
          continue;
        }
        await log("deduplicate", "success", "No duplicate — insert pending");

        const scores = scoreMultiDimensionalQuality({
          ...normalized,
          verification_state: "pending_verification",
          hasImages: listing.imageUrls.length > 0,
        });

        await log(
          "quality_score",
          "success",
          `Overall ${scores.overallQualityScore}`,
        );

        const id = randomUUID();
        const row = {
          id,
          ...normalized,
          verification_state: "pending_verification",
          data_classification: "needs_verification",
          completeness_score: scores.completenessScore,
          verification_score: scores.verificationScore,
          image_score: scores.imageScore,
          address_score: scores.addressScore,
          auction_score: scores.auctionScore,
          source_trust_score: scores.sourceTrustScore,
          data_quality_score: scores.overallQualityScore,
          connector_id: BIDDERS_CHOICE_CONNECTOR_ID,
          connector_version: this.connector.version,
          import_method: options.licensedPayloads?.length
            ? "licensed_feed"
            : options.listingUrls?.length
              ? "manual"
              : allowFetch
                ? "licensed_feed"
                : "manual",
          imported_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          provenance_notes:
            "Imported via Bidders Choice connector — Pending Verification. Not public until admin approval.",
        };

        // Remove non-column helper
        const { imageUrls: _images, ...insertRow } = row as typeof row & {
          imageUrls?: string[];
        };

        const { error } = await db.from("properties").insert(insertRow);
        if (error) throw new Error(error.message);

        await this.importImages(id, listing.imageUrls);
        imported += 1;
        await log("verification_queue", "success", `Pending verification ${id}`);
        await log(
          "admin_approval",
          "skipped",
          "Awaiting admin approval — not published",
        );
        await log(
          "public_website",
          "skipped",
          "Hidden from public until verified",
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : "import failed";
        errors.push(`${listing.externalListingId}: ${msg}`);
        rejected += 1;
        await recordImportRejection({
          connectorId: BIDDERS_CHOICE_CONNECTOR_ID,
          externalListingId: listing.externalListingId,
          sourceUrl: listing.sourceUrl,
          reason: msg,
          jobId,
        });
      }
    }

    // Change detection: mark missing previously-known BC listings as withdrawn candidates (log only)
    if (allowFetch && extracted.length > 0) {
      archived += await this.flagRemovedListings(
        db,
        extracted.map((e) => e.externalListingId),
        jobId,
      );
    }

    const durationMs = Date.now() - started;
    await recordImportReport({
      connectorId: BIDDERS_CHOICE_CONNECTOR_ID,
      jobId,
      imported,
      updated,
      rejected,
      archived,
      duplicates,
      durationMs,
      meta: { errors, stages: stageLog.length },
    });

    try {
      await refreshPropertyCache();
    } catch (error) {
      LoggerService.warn("acquisition.cache_refresh_skipped", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
    LoggerService.audit("acquisition.run.complete", {
      jobId,
      imported,
      updated,
      rejected,
      duplicates,
      durationMs,
    });

    return {
      jobId,
      connectorId: BIDDERS_CHOICE_CONNECTOR_ID,
      imported,
      updated,
      rejected,
      archived,
      duplicates,
      errors,
      durationMs,
      stageLog,
    };
  }

  private normalize(listing: ExtractedListing): Partial<Property> & {
    title: string;
    town: string;
    province: string;
    property_type: string;
    auction_date: string;
    bedrooms: number;
    bathrooms: number;
    garages: number;
    estimated_value: number;
    auction_price: number;
    status: string;
    imageUrls: string[];
  } {
    const province = normalizeProvince(listing.province);
    if (!province) {
      throw new Error("Cannot normalize listing without a valid province from source");
    }
    const town = listing.town?.trim() || listing.suburb?.trim();
    if (!town) {
      throw new Error("Cannot normalize listing without town/suburb from source");
    }
    return {
      title: listing.title!.trim(),
      description: listing.description,
      address: listing.streetAddress,
      street_address: listing.streetAddress,
      suburb: listing.suburb,
      town,
      province,
      postal_code: listing.postalCode,
      latitude: listing.latitude,
      longitude: listing.longitude,
      property_type: normalizePropertyType(listing.propertyType) || "Other",
      bedrooms: listing.bedrooms ?? 0,
      bathrooms: listing.bathrooms ?? 0,
      garages: listing.garages ?? 0,
      erf_size: listing.landSize,
      floor_size: listing.buildingSize,
      estimated_value: listing.estimatedValue ?? 0,
      auction_price: listing.auctionPrice ?? 0,
      auction_date: listing.auctionDate!,
      auction_time: listing.auctionTime,
      auction_venue: listing.auctionVenue,
      auction_agency: listing.auctionAgency,
      agency_contact: listing.agencyContact,
      agency_website: listing.agencyWebsite,
      source: `Bidders Choice · ${listing.sourceUrl}`,
      source_name: "Bidders Choice",
      source_url: listing.sourceUrl,
      external_listing_id: listing.externalListingId,
      listing_status: listing.listingStatus || "upcoming",
      status: listing.listingStatus || "upcoming",
      terms_link: listing.termsLink,
      brochure_link: listing.brochureLink,
      catalogue_link: listing.brochureLink,
      features: listing.features,
      viewing_information: listing.viewingInformation,
      deposit_requirements: listing.depositRequirements,
      registration_link: listing.registrationLink,
      source_content_hash: listing.contentHash,
      imageUrls: listing.imageUrls,
    };
  }

  private async findExisting(
    db: ReturnType<typeof createServiceClient>,
    listing: ExtractedListing,
  ): Promise<Property | null> {
    const { data: byExternal } = await db
      .from("properties")
      .select("*")
      .eq("external_listing_id", listing.externalListingId)
      .maybeSingle();
    if (byExternal) return byExternal as Property;

    const { data: candidates } = await db
      .from("properties")
      .select("*")
      .eq("connector_id", BIDDERS_CHOICE_CONNECTOR_ID)
      .limit(200);

    for (const existing of candidates ?? []) {
      const assessment = assessDuplicateConfidence(
        {
          externalListingId: listing.externalListingId,
          address: listing.streetAddress,
          latitude: listing.latitude,
          longitude: listing.longitude,
          title: listing.title,
          auctionDate: listing.auctionDate,
          agency: listing.auctionAgency,
        },
        {
          externalListingId: existing.external_listing_id,
          address: existing.address ?? existing.street_address,
          latitude: existing.latitude,
          longitude: existing.longitude,
          title: existing.title,
          auctionDate: existing.auction_date,
          agency: existing.auction_agency ?? existing.source_name,
        },
      );
      if (assessment.recommendMerge) return existing as Property;
    }
    return null;
  }

  private async importImages(propertyId: string, urls: string[]) {
    let imported = 0;
    let failed = 0;
    for (const url of urls.slice(0, 15)) {
      try {
        await processImage(propertyId, url, "Bidders Choice");
        imported += 1;
      } catch (error) {
        failed += 1;
        LoggerService.warn("acquisition.image_failed", {
          propertyId,
          url,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }
    if (urls.length > 0) {
      LoggerService.info("acquisition.images_summary", {
        propertyId,
        sourceCount: urls.length,
        imported,
        failed,
      });
      if (imported === 0) {
        LoggerService.error("acquisition.images_all_failed", {
          propertyId,
          sourceCount: urls.length,
        });
      } else {
        try {
          await markHeroAsPrimary(propertyId);
        } catch (error) {
          LoggerService.warn("acquisition.hero_mark_failed", {
            propertyId,
            error: error instanceof Error ? error.message : "unknown",
          });
        }
      }
    }
  }

  private async flagRemovedListings(
    db: ReturnType<typeof createServiceClient>,
    seenExternalIds: string[],
    jobId: string,
  ): Promise<number> {
    const { data } = await db
      .from("properties")
      .select("id,external_listing_id,verification_state")
      .eq("connector_id", BIDDERS_CHOICE_CONNECTOR_ID)
      .not("verification_state", "in", "(archived,sold,withdrawn)");

    let archived = 0;
    const seen = new Set(seenExternalIds);
    for (const row of data ?? []) {
      const ext = row.external_listing_id as string | null;
      if (!ext || seen.has(ext)) continue;
      await persistListingChanges({
        propertyId: row.id,
        connectorId: BIDDERS_CHOICE_CONNECTOR_ID,
        externalListingId: ext,
        jobId,
        changes: [
          {
            changeType: "removed_listing",
            fieldName: "presence",
            oldValue: "present",
            newValue: "missing_from_source_scan",
          },
        ],
      });
      archived += 1;
    }
    return archived;
  }
}
