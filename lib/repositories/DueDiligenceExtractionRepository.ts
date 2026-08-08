import { BaseRepository } from "./BaseRepository";

function missingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

export type ExtractionRunRow = {
  id: string;
  property_id: string;
  partner: string | null;
  source_url: string | null;
  source_hash: string | null;
  extraction_version: string | null;
  fields_found: number | null;
  fields_updated: number | null;
  conflicts: number | null;
  documents_found: number | null;
  completeness_before: number | null;
  completeness_after: number | null;
  operator: string | null;
  result_json: unknown;
  created_at: string;
};

/**
 * Soft-fail if migration not applied. Idempotent upsert by property + source_hash.
 */
export class DueDiligenceExtractionRepository extends BaseRepository {
  static async recordRun(input: {
    propertyId: string;
    partner?: string | null;
    sourceUrl?: string | null;
    sourceHash: string;
    extractionVersion: string;
    fieldsFound: number;
    fieldsUpdated: number;
    conflicts: number;
    documentsFound: number;
    completenessBefore: number;
    completenessAfter: number;
    operator?: string | null;
    resultJson: unknown;
  }): Promise<ExtractionRunRow | null> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("due_diligence_extraction_runs")
        .upsert(
          {
            property_id: input.propertyId,
            partner: input.partner ?? null,
            source_url: input.sourceUrl ?? null,
            source_hash: input.sourceHash,
            extraction_version: input.extractionVersion,
            fields_found: input.fieldsFound,
            fields_updated: input.fieldsUpdated,
            conflicts: input.conflicts,
            documents_found: input.documentsFound,
            completeness_before: input.completenessBefore,
            completeness_after: input.completenessAfter,
            operator: input.operator ?? null,
            result_json: input.resultJson,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "property_id,source_hash" },
        )
        .select("*")
        .maybeSingle();

      if (error) {
        if (missingRelation(error)) return null;
        this.handleError("DueDiligenceExtractionRepository.recordRun", error);
      }
      return data as ExtractionRunRow | null;
    } catch {
      return null;
    }
  }

  static async listRecent(limit = 50): Promise<ExtractionRunRow[]> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("due_diligence_extraction_runs")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (error) {
        if (missingRelation(error)) return [];
        this.handleError("DueDiligenceExtractionRepository.listRecent", error);
      }
      return (data as ExtractionRunRow[]) ?? [];
    } catch {
      return [];
    }
  }
}
