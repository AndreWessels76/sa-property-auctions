import { BaseRepository } from "./BaseRepository";

function missingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return error.code === "42P01" || msg.includes("does not exist") || msg.includes("schema cache");
}

export type OutcomeObservationRow = {
  id: string;
  property_master_id: string | null;
  auction_event_id: string | null;
  listing_property_id: string | null;
  outcome: string;
  confidence: string;
  evidence_types: unknown;
  source_url: string | null;
  source_snapshot_id: string | null;
  source_timestamp: string | null;
  evidence_text: string | null;
  extraction_method: string | null;
  sale_price: number | null;
  created_at: string;
};

export type OutcomeConflictRow = {
  id: string;
  property_master_id: string | null;
  auction_event_id: string | null;
  source_a: string | null;
  source_b: string | null;
  claim_a: string;
  claim_b: string;
  evidence_a: string | null;
  evidence_b: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_note: string | null;
  created_at: string;
};

export class OutcomeIntelligenceRepository extends BaseRepository {
  static async listOpenConflicts(limit = 100): Promise<OutcomeConflictRow[]> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("historical_outcome_conflicts")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        if (missingRelation(error)) return [];
        this.handleError("OutcomeIntelligenceRepository.listOpenConflicts", error);
      }
      return (data as OutcomeConflictRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async resolveConflict(
    id: string,
    input: {
      status: string;
      reviewedBy: string;
      resolutionNote?: string;
    },
  ): Promise<OutcomeConflictRow | null> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("historical_outcome_conflicts")
        .update({
          status: input.status,
          reviewed_by: input.reviewedBy,
          reviewed_at: new Date().toISOString(),
          resolution_note: input.resolutionNote ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        this.handleError("OutcomeIntelligenceRepository.resolveConflict", error);
      }
      return data as OutcomeConflictRow | null;
    } catch {
      return null;
    }
  }

  static async countObservations(): Promise<number> {
    try {
      const db = this.adminDb();
      const { count, error } = await db
        .from("auction_outcome_observations")
        .select("*", { count: "exact", head: true });
      if (error) {
        if (missingRelation(error)) return 0;
        return 0;
      }
      return count ?? 0;
    } catch {
      return 0;
    }
  }
}
