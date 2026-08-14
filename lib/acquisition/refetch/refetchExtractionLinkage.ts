import { persistPricingObservations } from "@/lib/acquisition/pricing/pricingService";
import { persistOutcomeObservations } from "@/lib/acquisition/outcomes/outcomeService";
import {
  corpusFromProperty,
  runDueDiligenceExtraction,
  type ExtractionResult,
} from "@/lib/dueDiligence/extraction";
import { DueDiligenceExtractionRepository } from "@/lib/repositories/DueDiligenceExtractionRepository";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { FieldChange } from "./types";
import { LoggerService } from "@/lib/logger";

function completenessBefore(property: PropertyDTO): number {
  const structuredOnly = runDueDiligenceExtraction(
    corpusFromProperty({
      title: property.title,
      description: null,
      features: null,
      viewing_information: null,
      deposit_requirements: null,
      property_type: property.property_type,
      province: property.province,
      town: property.town,
      suburb: property.suburb,
      address: property.address,
      street_address: property.street_address,
      postal_code: property.postal_code,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      garages: property.garages,
      erf_size: property.erf_size,
      floor_size: property.floor_size,
      auction_date: property.auction_date,
      auction_time: property.auction_time,
      auction_venue: property.auction_venue,
      terms_link: property.terms_link,
      brochure_link: property.brochure_link,
      catalogue_link: property.catalogue_link,
      registration_link: property.registration_link,
      source_name: property.source_name,
      source_url: property.source_url,
      verification_state: property.verification_state,
      agricultural_details: property.agricultural_details as Record<
        string,
        unknown
      > | null,
    }),
  );
  return structuredOnly.completeness.overall;
}

export type PersistRefetchExtractionInput = {
  property: PropertyDTO;
  sourcePageText: string;
  operator?: string | null;
  snapshotId?: string | null;
  contentHash?: string | null;
  refetchRunCode?: string | null;
  fieldChanges?: FieldChange[];
};

export type PersistRefetchExtractionResult = {
  extractionRunId: string | null;
  extraction: ExtractionResult;
  fieldsFound: number;
  conflicts: number;
  pricingObservations: number;
  pricingConflicts: number;
  outcomeObservations: number;
  outcomeConflicts: number;
  outcomeReviews: number;
};

/**
 * Persist DD extraction for CONTENT_CHANGED refetch paths only.
 * Idempotent upsert by property_id + source_hash — no duplicate runs for same content.
 */
export async function persistRefetchExtraction(
  input: PersistRefetchExtractionInput,
): Promise<PersistRefetchExtractionResult> {
  const { property, sourcePageText } = input;
  const before = completenessBefore(property);

  const extraction = runDueDiligenceExtraction(
    corpusFromProperty({
      ...property,
      agricultural_details: property.agricultural_details as Record<
        string,
        unknown
      > | null,
      source_page_text: sourcePageText,
    }),
  );

  const resultWithProvenance = {
    ...extraction,
    refetch_provenance: {
      source_snapshot_id: input.snapshotId ?? null,
      content_hash: input.contentHash ?? null,
      refetch_run_code: input.refetchRunCode ?? null,
      field_changes: input.fieldChanges?.slice(0, 50) ?? [],
      persisted_at: new Date().toISOString(),
    },
  };

  const row = await DueDiligenceExtractionRepository.recordRun({
    propertyId: property.id,
    partner: property.source_name,
    sourceUrl: property.source_url,
    sourceHash: extraction.source_hash,
    extractionVersion: extraction.extraction_version,
    fieldsFound: extraction.stats.fields_found,
    fieldsUpdated: extraction.stats.fields_from_text,
    conflicts: extraction.stats.conflicts,
    documentsFound: extraction.stats.documents_found,
    completenessBefore: before,
    completenessAfter: extraction.completeness.overall,
    operator: input.operator ?? "refetch",
    resultJson: resultWithProvenance,
  });

  const pricing = await persistPricingObservations({
    propertyId: property.id,
    corpus: {
      ...property,
      agricultural_details: property.agricultural_details as Record<
        string,
        unknown
      > | null,
      source_page_text: sourcePageText,
      auction_price: property.auction_price,
      reserve_price: property.reserve_price,
      estimated_value: property.estimated_value,
    },
    sourcePageText,
    sourceSnapshotId: input.snapshotId ?? null,
    contentHash: input.contentHash ?? extraction.source_hash,
    extractionRunId: row?.id ?? null,
  });

  const outcome = await persistOutcomeObservations({
    propertyId: property.id,
    corpus: {
      ...property,
      verification_state: property.verification_state,
      listing_status: property.listing_status ?? property.status,
      agricultural_details: property.agricultural_details as Record<
        string,
        unknown
      > | null,
      source_page_text: sourcePageText,
    },
    sourcePageText,
    sourceSnapshotId: input.snapshotId ?? null,
    contentHash: input.contentHash ?? extraction.source_hash,
    operator: input.operator ?? null,
  });

  LoggerService.audit("source.refetch.extraction_persisted", {
    propertyId: property.id,
    extractionRunId: row?.id ?? null,
    sourceHash: extraction.source_hash,
    snapshotId: input.snapshotId,
    refetchRunCode: input.refetchRunCode,
    fieldsFound: extraction.stats.fields_found,
    conflicts: extraction.stats.conflicts,
    pricingObservations: pricing.observationIds.length,
    pricingConflicts: pricing.conflicts,
    outcomeObservation: outcome.observationId,
    outcomeConflicts: outcome.conflicts,
  });

  return {
    extractionRunId: row?.id ?? null,
    extraction,
    fieldsFound: extraction.stats.fields_found,
    conflicts:
      extraction.stats.conflicts + pricing.conflicts + outcome.conflicts,
    pricingObservations: pricing.observationIds.length,
    pricingConflicts: pricing.conflicts,
    outcomeObservations: outcome.observationId ? 1 : 0,
    outcomeConflicts: outcome.conflicts,
    outcomeReviews: outcome.reviews,
  };
}
