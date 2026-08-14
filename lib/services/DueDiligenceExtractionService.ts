import "server-only";

import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import {
  corpusFromProperty,
  runDueDiligenceExtraction,
  type ExtractionResult,
} from "@/lib/dueDiligence/extraction";
import { DueDiligenceExtractionRepository } from "@/lib/repositories/DueDiligenceExtractionRepository";
import { PropertyService } from "@/lib/services/PropertyService";
import { LoggerService } from "@/lib/logger";
import { buildDueDiligenceCentre } from "@/lib/property/dueDiligence";

export type BatchExtractionReport = {
  processed: number;
  updated: number;
  new_fields: number;
  conflicts: number;
  errors: number;
  documents_found: number;
  fields_still_missing: string[];
  results: Array<{
    propertyId: string;
    title: string | null;
    source: string | null;
    fields_found: number;
    documents_found: number;
    conflicts: number;
    completeness_before: number;
    completeness_after: number;
    status: "ok" | "error";
    error?: string;
  }>;
};

function completenessBefore(property: PropertyDTO): number {
  // Structured-only baseline (no text extraction)
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

export class DueDiligenceExtractionService {
  static extractProperty(property: PropertyDTO): ExtractionResult {
    return runDueDiligenceExtraction(
      corpusFromProperty({
        ...property,
        agricultural_details: property.agricultural_details as Record<
          string,
          unknown
        > | null,
      }),
    );
  }

  static async runForProperty(
    propertyId: string,
    operator: string | null = "system",
  ) {
    const property = await PropertyService.getProperty(propertyId);
    if (!property) {
      return { ok: false as const, error: "Property not found" };
    }

    const before = completenessBefore(property);
    const result = this.extractProperty(property);
    const centre = buildDueDiligenceCentre(property);

    await DueDiligenceExtractionRepository.recordRun({
      propertyId: property.id,
      partner: property.source_name,
      sourceUrl: property.source_url,
      sourceHash: result.source_hash,
      extractionVersion: result.extraction_version,
      fieldsFound: result.stats.fields_found,
      fieldsUpdated: result.stats.fields_from_text,
      conflicts: result.stats.conflicts,
      documentsFound: result.stats.documents_found,
      completenessBefore: before,
      completenessAfter: result.completeness.overall,
      operator,
      resultJson: result,
    });

    const { persistPricingObservations } = await import(
      "@/lib/acquisition/pricing/pricingService"
    );
    await persistPricingObservations({
      propertyId: property.id,
      corpus: {
        ...property,
        agricultural_details: property.agricultural_details as Record<
          string,
          unknown
        > | null,
        auction_price: property.auction_price,
        reserve_price: property.reserve_price,
        estimated_value: property.estimated_value,
      },
      contentHash: result.source_hash,
    });

    LoggerService.audit("due_diligence.extraction.run", {
      propertyId: property.id,
      fieldsFound: result.stats.fields_found,
      conflicts: result.stats.conflicts,
      completenessAfter: result.completeness.overall,
    });

    return {
      ok: true as const,
      property,
      result,
      centre,
      completeness_before: before,
      completeness_after: result.completeness.overall,
    };
  }

  static async runBatch(opts?: {
    limit?: number;
    operator?: string | null;
  }): Promise<BatchExtractionReport> {
    const properties = await PropertyService.getProperties();
    const limit = opts?.limit ?? properties.length;
    const slice = properties.slice(0, limit);

    const report: BatchExtractionReport = {
      processed: 0,
      updated: 0,
      new_fields: 0,
      conflicts: 0,
      errors: 0,
      documents_found: 0,
      fields_still_missing: [],
      results: [],
    };

    const missingAgg = new Set<string>();

    for (const property of slice) {
      report.processed += 1;
      try {
        const before = completenessBefore(property);
        const result = this.extractProperty(property);
        await DueDiligenceExtractionRepository.recordRun({
          propertyId: property.id,
          partner: property.source_name,
          sourceUrl: property.source_url,
          sourceHash: result.source_hash,
          extractionVersion: result.extraction_version,
          fieldsFound: result.stats.fields_found,
          fieldsUpdated: result.stats.fields_from_text,
          conflicts: result.stats.conflicts,
          documentsFound: result.stats.documents_found,
          completenessBefore: before,
          completenessAfter: result.completeness.overall,
          operator: opts?.operator ?? "batch",
          resultJson: result,
        });

        if (result.stats.fields_from_text > 0) report.updated += 1;
        report.new_fields += result.stats.fields_from_text;
        report.conflicts += result.stats.conflicts;
        report.documents_found += result.stats.documents_found;
        for (const m of result.stats.missing_key_fields) missingAgg.add(m);

        report.results.push({
          propertyId: property.id,
          title: property.title,
          source: property.source_name,
          fields_found: result.stats.fields_found,
          documents_found: result.stats.documents_found,
          conflicts: result.stats.conflicts,
          completeness_before: before,
          completeness_after: result.completeness.overall,
          status: "ok",
        });
      } catch (err) {
        report.errors += 1;
        report.results.push({
          propertyId: property.id,
          title: property.title,
          source: property.source_name,
          fields_found: 0,
          documents_found: 0,
          conflicts: 0,
          completeness_before: 0,
          completeness_after: 0,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    report.fields_still_missing = [...missingAgg].sort();
    return report;
  }

  static listRecentRuns(limit = 50) {
    return DueDiligenceExtractionRepository.listRecent(limit);
  }
}
