import { ImageRepository } from "@/lib/repositories/ImageRepository";
import { VerificationRepository } from "@/lib/repositories/VerificationRepository";
import { resolveAuctionAgency } from "@/lib/auction/agencyDisplay";
import { verifyAddressFields } from "@/lib/data/addressVerification";
import { verifyAuctionFields } from "@/lib/data/auctionVerification";
import { assessDuplicateConfidence } from "@/lib/data/deduplicationStandard";
import {
  buildLifecycleTransition,
  suggestLifecycleFromDates,
} from "@/lib/data/listingLifecycle";
import {
  resolveVerificationStateFromRow,
  scoreMultiDimensionalQuality,
} from "@/lib/data/multiQualityScore";
import type { VerificationState } from "@/lib/data/verificationStates";
import { formatVerificationLabel } from "@/lib/data/verificationStates";
import { listEnabledConnectors } from "@/lib/connectors/sourceRegistry";
import type { Property } from "@/lib/types/property";
import { LoggerService } from "@/lib/logger";
import { refreshPropertyCache } from "@/lib/services/actions";
import { getAcquisitionMetrics } from "@/lib/acquisition/metrics";
import { buildVerificationChecklist } from "@/lib/acquisition/verificationChecklist";
import { createServiceClient } from "@/lib/supabase/admin";

export type VerificationDashboard = {
  stats: {
    total: number;
    byState: Record<string, number>;
    needsVerification: number;
    missingImages: number;
    missingAddress: number;
    expired: number;
    averageOverallQuality: number | null;
  };
  queue: Array<{
    id: string;
    title: string;
    verificationLabel: string;
    verificationState: VerificationState;
    town: string | null;
    province: string | null;
    auctionDate: string | null;
    agency: string | null;
    sourceUrl: string | null;
    hasImages: boolean;
    overallQualityScore: number;
    issues: string[];
  }>;
  duplicateCandidates: Array<{
    aId: string;
    bId: string;
    confidenceScore: number;
    signals: string[];
  }>;
  sourceErrors: string[];
  importLogs: Array<{
    id: string;
    jobId: string | null;
    connectorId: string | null;
    stage: string;
    status: string;
    message: string | null;
    createdAt: string;
  }>;
  connectors: Array<{ id: string; name: string; version: string; enabled: boolean }>;
  qualityVisibleToAdminOnly: true;
  acquisitionMetrics: Awaited<ReturnType<typeof getAcquisitionMetrics>>;
  checklists: Record<string, ReturnType<typeof buildVerificationChecklist>>;
};

export class VerificationService {
  static async getDashboard(): Promise<VerificationDashboard> {
    const [rows, byState, logs] = await Promise.all([
      VerificationRepository.listForVerification({ limit: 200 }),
      VerificationRepository.countByVerificationState(),
      VerificationRepository.recentPipelineEvents(40),
    ]);

    const heroMap = await ImageRepository.heroMap(rows.map((r) => r.id));

    let missingImages = 0;
    let missingAddress = 0;
    let needsVerification = 0;
    let expired = 0;
    let qualitySum = 0;
    let qualityCount = 0;

    const queue = rows.map((property) => {
      const hasImages = heroMap.has(property.id);
      if (!hasImages) missingImages += 1;

      const address = verifyAddressFields({
        street: property.street_address,
        address: property.address,
        suburb: property.suburb,
        town: property.town,
        province: property.province,
        postalCode: property.postal_code,
        latitude: property.latitude,
        longitude: property.longitude,
        municipality: property.municipality,
        region: property.region,
        unavailabilityReason: property.address_unavailability_reason,
      });
      if (!address.complete) missingAddress += 1;

      const state = resolveVerificationStateFromRow(property);
      if (state === "seed" || state === "pending_verification") {
        needsVerification += 1;
      }
      if (state === "expired") expired += 1;

      const agencyResolved = resolveAuctionAgency(property.source);
      const scores = scoreMultiDimensionalQuality({
        ...property,
        verification_state: state,
        hasImages,
        imageQualityScore: heroMap.get(property.id)?.quality_score ?? null,
        auction_agency: property.auction_agency ?? agencyResolved.name,
        agency_website: property.agency_website ?? agencyResolved.website,
        agency_contact: property.agency_contact ?? agencyResolved.contact,
        catalogue_link: property.catalogue_link,
        brochure_link: property.brochure_link,
        terms_link: property.terms_link,
      });

      qualitySum += scores.overallQualityScore;
      qualityCount += 1;

      return {
        id: property.id,
        title: property.title,
        verificationLabel: formatVerificationLabel(state),
        verificationState: state,
        town: property.town,
        province: property.province,
        auctionDate: property.auction_date,
        agency: property.auction_agency ?? agencyResolved.name,
        sourceUrl: property.source_url ?? null,
        hasImages,
        overallQualityScore: scores.overallQualityScore,
        issues: scores.issues.slice(0, 5),
      };
    });

    const duplicateCandidates = this.findDuplicateCandidates(rows).slice(0, 25);

    const sourceErrors: string[] = [];
    for (const property of rows) {
      const auction = verifyAuctionFields({
        auctionAgency: property.auction_agency,
        contactNumber: property.agency_contact,
        website: property.agency_website,
        auctionDate: property.auction_date,
        auctionTime: property.auction_time,
        venue: property.auction_venue,
        terms: property.terms_link,
        catalogue: property.catalogue_link,
        brochure: property.brochure_link,
        sourceDerivedAgency: resolveAuctionAgency(property.source).name,
      });
      if (auction.agencyUnknownDespiteSource) {
        sourceErrors.push(
          `${property.id}: agency present in source string but auction_agency column empty`,
        );
      }
      if (!property.source_url && !property.source_name && !property.source) {
        sourceErrors.push(`${property.id}: missing source provenance`);
      }
    }

    const checklists: Record<string, ReturnType<typeof buildVerificationChecklist>> =
      {};
    for (const row of queue) {
      const property = rows.find((r) => r.id === row.id);
      if (!property) continue;
      checklists[row.id] = buildVerificationChecklist(
        property,
        row.hasImages,
        row.overallQualityScore,
      );
    }

    const acquisitionMetrics = await getAcquisitionMetrics("bidders_choice");

    return {
      stats: {
        total: rows.length,
        byState,
        needsVerification,
        missingImages,
        missingAddress,
        expired,
        averageOverallQuality:
          qualityCount > 0 ? Math.round(qualitySum / qualityCount) : null,
      },
      queue: queue.filter(
        (q) =>
          q.verificationState === "seed" ||
          q.verificationState === "pending_verification" ||
          !q.hasImages ||
          q.issues.length > 0,
      ),
      duplicateCandidates,
      sourceErrors: sourceErrors.slice(0, 40),
      importLogs: logs.map((l) => ({
        id: l.id,
        jobId: l.job_id,
        connectorId: l.connector_id,
        stage: l.stage,
        status: l.status,
        message: l.message,
        createdAt: l.created_at,
      })),
      connectors: listEnabledConnectors().map((c) => ({
        id: c.id,
        name: c.name,
        version: c.connectorVersion,
        enabled: c.enabled,
      })),
      qualityVisibleToAdminOnly: true,
      acquisitionMetrics,
      checklists,
    };
  }

  static findDuplicateCandidates(rows: Property[]) {
    const candidates: Array<{
      aId: string;
      bId: string;
      confidenceScore: number;
      signals: string[];
    }> = [];

    for (let i = 0; i < rows.length; i += 1) {
      for (let j = i + 1; j < rows.length; j += 1) {
        const a = rows[i];
        const b = rows[j];
        const assessment = assessDuplicateConfidence(
          {
            externalListingId: a.external_listing_id,
            address: a.address ?? a.street_address,
            latitude: a.latitude,
            longitude: a.longitude,
            title: a.title,
            auctionDate: a.auction_date,
            agency: a.auction_agency ?? a.source_name ?? a.source,
          },
          {
            externalListingId: b.external_listing_id,
            address: b.address ?? b.street_address,
            latitude: b.latitude,
            longitude: b.longitude,
            title: b.title,
            auctionDate: b.auction_date,
            agency: b.auction_agency ?? b.source_name ?? b.source,
          },
        );
        if (assessment.recommendReview || assessment.recommendMerge) {
          candidates.push({
            aId: a.id,
            bId: b.id,
            confidenceScore: assessment.confidenceScore,
            signals: assessment.signals,
          });
        }
      }
    }

    return candidates.sort((x, y) => y.confidenceScore - x.confidenceScore);
  }

  static async setVerificationState(
    propertyId: string,
    next: VerificationState,
    reason: string,
  ): Promise<Property> {
    const allowed: VerificationState[] = [
      "seed",
      "pending_verification",
      "verified",
      "expired",
      "withdrawn",
      "sold",
      "archived",
    ];
    if (!allowed.includes(next)) {
      throw new Error(`Invalid verification state: ${next}`);
    }

    // Never mark verified without a verification timestamp — operator must confirm source.
    const now = new Date().toISOString();
    // Archived listings stay out of public catalogue; do not reclassify as demo seed.
    const dataClassification =
      next === "verified"
        ? "production"
        : next === "seed"
          ? "seed"
          : next === "archived"
            ? "needs_verification"
            : "needs_verification";

    const updated = await VerificationRepository.updateVerification(propertyId, {
      verification_state: next,
      data_classification: dataClassification,
      last_verified_at: next === "verified" ? now : undefined,
      status_changed_at: now,
      status_change_reason: reason,
      status_source_event: "admin_verification",
      provenance_notes:
        next === "verified"
          ? `Verified by admin (${reason})`
          : `Verification state set to ${formatVerificationLabel(next)}: ${reason}`,
    });

    await refreshPropertyCache();
    LoggerService.audit("verification.state_set", {
      propertyId,
      next,
      reason,
    });
    return updated;
  }

  static async rejectListing(
    propertyId: string,
    reason: string,
  ): Promise<Property> {
    const updated = await VerificationRepository.updateVerification(propertyId, {
      verification_state: "archived",
      data_classification: "needs_verification",
      status_changed_at: new Date().toISOString(),
      status_change_reason: reason,
      status_source_event: "admin_reject",
      provenance_notes: `Rejected: ${reason}`,
    });
    try {
      const db = createServiceClient();
      await db
        .from("properties")
        .update({ rejection_reason: reason })
        .eq("id", propertyId);
    } catch {
      /* column may be absent until migration */
    }
    await refreshPropertyCache();
    LoggerService.audit("verification.reject", { propertyId, reason });
    return updated;
  }

  static async mergeDuplicate(
    keepId: string,
    archiveId: string,
    reason: string,
  ): Promise<{ kept: Property; archived: Property }> {
    if (keepId === archiveId) {
      throw new Error("Cannot merge a listing into itself");
    }
    const archived = await this.setVerificationState(
      archiveId,
      "archived",
      `Merged into ${keepId}: ${reason}`,
    );
    const kept = await VerificationRepository.updateVerification(keepId, {
      status_changed_at: new Date().toISOString(),
      status_change_reason: `Absorbed duplicate ${archiveId}`,
      status_source_event: "admin_merge",
      provenance_notes: `Kept after merge of duplicate ${archiveId}: ${reason}`,
    });
    await refreshPropertyCache();
    LoggerService.audit("verification.merge", {
      keepId,
      archiveId,
      reason,
    });
    return { kept, archived };
  }

  static async applySuggestedLifecycle(property: Property): Promise<Property | null> {
    const suggested = suggestLifecycleFromDates({
      auctionDate: property.auction_date,
      currentStatus: property.listing_status ?? property.status,
    });
    if (!suggested) return null;

    const transition = buildLifecycleTransition({
      currentStatus: property.listing_status ?? property.status,
      nextStatus: suggested,
      reason: "Automatic lifecycle suggestion from auction date",
      sourceEvent: "scheduled_lifecycle",
    });
    if ("error" in transition) return null;

    return VerificationRepository.updateVerification(property.id, {
      status: transition.to,
      listing_status: transition.to,
      status_changed_at: transition.statusChangedAt,
      status_change_reason: transition.reason,
      status_source_event: transition.sourceEvent,
      verification_state:
        transition.to === "sold"
          ? "sold"
          : transition.to === "withdrawn"
            ? "withdrawn"
            : transition.to === "expired"
              ? "expired"
              : transition.to === "archived"
                ? "archived"
                : undefined,
    });
  }

  static async recalculateScores(property: Property): Promise<Property> {
    const heroMap = await ImageRepository.heroMap([property.id]);
    const hasImages = heroMap.has(property.id);
    const agency = resolveAuctionAgency(property.source);
    const state = resolveVerificationStateFromRow(property);
    const scores = scoreMultiDimensionalQuality({
      ...property,
      verification_state: state,
      hasImages,
      imageQualityScore: heroMap.get(property.id)?.quality_score ?? null,
      auction_agency: property.auction_agency ?? agency.name,
      agency_website: property.agency_website ?? agency.website,
      agency_contact: property.agency_contact ?? agency.contact,
    });

    return VerificationRepository.updateVerification(property.id, {
      completeness_score: scores.completenessScore,
      verification_score: scores.verificationScore,
      image_score: scores.imageScore,
      address_score: scores.addressScore,
      auction_score: scores.auctionScore,
      source_trust_score: scores.sourceTrustScore,
      data_quality_score: scores.overallQualityScore,
    });
  }
}
