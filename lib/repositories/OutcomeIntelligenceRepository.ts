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
  source_hash: string | null;
  source_timestamp: string | null;
  evidence_text: string | null;
  evidence_type: string | null;
  extraction_method: string | null;
  sale_price: number | null;
  sale_price_confidence: string | null;
  calculation_version: string | null;
  observed_at: string | null;
  idempotency_key: string | null;
  review_category: string | null;
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
  static buildIdempotencyKey(input: {
    property_id: string;
    auction_event_id?: string | null;
    content_hash?: string | null;
    outcome: string;
    version: string;
  }): string | null {
    if (!input.content_hash) return null;
    return [
      input.property_id,
      input.auction_event_id ?? "none",
      input.content_hash,
      input.outcome,
      input.version,
    ].join("|");
  }

  static async findIdempotent(
    key: string,
  ): Promise<OutcomeObservationRow | null> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("auction_outcome_observations")
        .select("*")
        .eq("idempotency_key", key)
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        return null;
      }
      return data as OutcomeObservationRow | null;
    } catch {
      return null;
    }
  }

  static async listByProperty(
    propertyId: string,
  ): Promise<OutcomeObservationRow[]> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("auction_outcome_observations")
        .select("*")
        .eq("listing_property_id", propertyId)
        .order("created_at", { ascending: false });
      if (error) {
        if (missingRelation(error)) return [];
        return [];
      }
      return (data as OutcomeObservationRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async listRecent(limit = 5000): Promise<OutcomeObservationRow[]> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("auction_outcome_observations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        if (missingRelation(error)) return [];
        return [];
      }
      return (data as OutcomeObservationRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async insertObservation(input: {
    property_master_id?: string | null;
    auction_event_id?: string | null;
    listing_property_id: string;
    outcome: string;
    confidence: string;
    evidence_types?: unknown;
    source_url?: string | null;
    source_snapshot_id?: string | null;
    source_hash?: string | null;
    source_timestamp?: string | null;
    evidence_text?: string | null;
    evidence_type?: string | null;
    extraction_method?: string | null;
    sale_price?: number | null;
    sale_price_source?: string | null;
    sale_price_observed_at?: string | null;
    sale_price_confidence?: string | null;
    calculation_version: string;
    idempotency_key?: string | null;
    enrichment_run_id?: string | null;
    observed_at?: string | null;
    review_category?: string | null;
  }): Promise<OutcomeObservationRow | null> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("auction_outcome_observations")
        .insert({
          property_master_id: input.property_master_id ?? null,
          auction_event_id: input.auction_event_id ?? null,
          listing_property_id: input.listing_property_id,
          outcome: input.outcome,
          confidence: input.confidence,
          evidence_types: input.evidence_types ?? null,
          source_url: input.source_url ?? null,
          source_snapshot_id: input.source_snapshot_id ?? null,
          source_hash: input.source_hash ?? null,
          source_timestamp: input.source_timestamp ?? null,
          evidence_text: input.evidence_text ?? null,
          evidence_type: input.evidence_type ?? null,
          extraction_method: input.extraction_method ?? null,
          sale_price: input.sale_price ?? null,
          sale_price_source: input.sale_price_source ?? null,
          sale_price_observed_at: input.sale_price_observed_at ?? null,
          sale_price_confidence: input.sale_price_confidence ?? null,
          calculation_version: input.calculation_version,
          idempotency_key: input.idempotency_key ?? null,
          enrichment_run_id: input.enrichment_run_id ?? null,
          observed_at: input.observed_at ?? null,
          review_category: input.review_category ?? null,
        })
        .select("*")
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        if (error.code === "23505") {
          if (input.idempotency_key) {
            return this.findIdempotent(input.idempotency_key);
          }
          return null;
        }
        this.handleError("OutcomeIntelligenceRepository.insertObservation", error);
      }
      return data as OutcomeObservationRow | null;
    } catch {
      return null;
    }
  }

  static async insertConflict(input: {
    property_master_id?: string | null;
    auction_event_id?: string | null;
    source_a?: string | null;
    source_b?: string | null;
    claim_a: string;
    claim_b: string;
    evidence_a?: string | null;
    evidence_b?: string | null;
  }): Promise<OutcomeConflictRow | null> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("historical_outcome_conflicts")
        .insert({
          property_master_id: input.property_master_id ?? null,
          auction_event_id: input.auction_event_id ?? null,
          source_a: input.source_a ?? null,
          source_b: input.source_b ?? null,
          claim_a: input.claim_a,
          claim_b: input.claim_b,
          evidence_a: input.evidence_a ?? null,
          evidence_b: input.evidence_b ?? null,
          status: "open",
        })
        .select("*")
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        return null;
      }
      return data as OutcomeConflictRow | null;
    } catch {
      return null;
    }
  }

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
