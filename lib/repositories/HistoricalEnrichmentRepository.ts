import { BaseRepository } from "./BaseRepository";

function missingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return error.code === "42P01" || msg.includes("does not exist") || msg.includes("schema cache");
}

export type EnrichmentRunRow = {
  id: string;
  run_id: string;
  property_id: string | null;
  property_master_id: string | null;
  auction_event_id: string | null;
  source_url: string | null;
  snapshot_id: string | null;
  source_hash: string | null;
  started_at: string;
  completed_at: string | null;
  status: string;
  outcome: string | null;
  sale_price: number | null;
  conflicts: number;
  review_required: boolean;
  operator: string | null;
  meta: unknown;
  created_at: string;
};

export type EnrichmentReviewRow = {
  id: string;
  category: string;
  property_id: string | null;
  property_master_id: string | null;
  auction_event_id: string | null;
  outcome_observation_id: string | null;
  source_url: string | null;
  snapshot_id: string | null;
  source_hash: string | null;
  evidence_text: string | null;
  extracted_value: string | null;
  normalized_value: string | null;
  confidence: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_note: string | null;
  created_at: string;
};

export class HistoricalEnrichmentRepository extends BaseRepository {
  static async recordRun(input: {
    runId: string;
    propertyId: string;
    propertyMasterId?: string | null;
    auctionEventId?: string | null;
    sourceUrl?: string | null;
    snapshotId?: string | null;
    sourceHash?: string | null;
    status: string;
    outcome?: string | null;
    salePrice?: number | null;
    conflicts?: number;
    reviewRequired?: boolean;
    operator?: string | null;
    meta?: unknown;
  }): Promise<EnrichmentRunRow | null> {
    try {
      const db = this.adminDb();
      const now = new Date().toISOString();
      const { data, error } = await db
        .from("historical_enrichment_runs")
        .insert({
          run_id: input.runId,
          property_id: input.propertyId,
          property_master_id: input.propertyMasterId ?? null,
          auction_event_id: input.auctionEventId ?? null,
          source_url: input.sourceUrl ?? null,
          snapshot_id: input.snapshotId ?? null,
          source_hash: input.sourceHash ?? null,
          started_at: now,
          completed_at: now,
          status: input.status,
          outcome: input.outcome ?? null,
          sale_price: input.salePrice ?? null,
          conflicts: input.conflicts ?? 0,
          review_required: input.reviewRequired ?? false,
          operator: input.operator ?? null,
          meta: input.meta ?? null,
        })
        .select("*")
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        this.handleError("HistoricalEnrichmentRepository.recordRun", error);
      }
      return data as EnrichmentRunRow | null;
    } catch {
      return null;
    }
  }

  static async listRecentRuns(limit = 50): Promise<EnrichmentRunRow[]> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("historical_enrichment_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        if (missingRelation(error)) return [];
        return [];
      }
      return (data as EnrichmentRunRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async insertReview(input: {
    category: string;
    property_id: string;
    property_master_id?: string | null;
    auction_event_id?: string | null;
    outcome_observation_id?: string | null;
    source_url?: string | null;
    snapshot_id?: string | null;
    source_hash?: string | null;
    evidence_text?: string | null;
    extracted_value?: string | null;
    normalized_value?: string | null;
    confidence?: string | null;
  }): Promise<EnrichmentReviewRow | null> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("historical_enrichment_reviews")
        .insert({
          category: input.category,
          property_id: input.property_id,
          property_master_id: input.property_master_id ?? null,
          auction_event_id: input.auction_event_id ?? null,
          outcome_observation_id: input.outcome_observation_id ?? null,
          source_url: input.source_url ?? null,
          snapshot_id: input.snapshot_id ?? null,
          source_hash: input.source_hash ?? null,
          evidence_text: input.evidence_text ?? null,
          extracted_value: input.extracted_value ?? null,
          normalized_value: input.normalized_value ?? null,
          confidence: input.confidence ?? null,
          status: "open",
        })
        .select("*")
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        return null;
      }
      return data as EnrichmentReviewRow | null;
    } catch {
      return null;
    }
  }

  static async listOpenReviews(limit = 100): Promise<EnrichmentReviewRow[]> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("historical_enrichment_reviews")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        if (missingRelation(error)) return [];
        return [];
      }
      return (data as EnrichmentReviewRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async resolveReview(
    id: string,
    input: { status: string; reviewedBy: string; resolutionNote?: string },
  ): Promise<EnrichmentReviewRow | null> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("historical_enrichment_reviews")
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
        return null;
      }
      return data as EnrichmentReviewRow | null;
    } catch {
      return null;
    }
  }

  static async dashboardMetrics(): Promise<{
    runs: number;
    outcomesExtracted: number;
    salePricesExtracted: number;
    noChange: number;
    reviewQueue: number;
  }> {
    try {
      const db = this.adminDb();
      const [runs, reviews, withOutcome, withPrice, noChange] = await Promise.all([
        db.from("historical_enrichment_runs").select("*", { count: "exact", head: true }),
        db
          .from("historical_enrichment_reviews")
          .select("*", { count: "exact", head: true })
          .eq("status", "open"),
        db
          .from("historical_enrichment_runs")
          .select("*", { count: "exact", head: true })
          .not("outcome", "is", null)
          .neq("outcome", "UNKNOWN"),
        db
          .from("historical_enrichment_runs")
          .select("*", { count: "exact", head: true })
          .not("sale_price", "is", null),
        db
          .from("historical_enrichment_runs")
          .select("*", { count: "exact", head: true })
          .eq("status", "NO_CHANGE"),
      ]);
      return {
        runs: runs.count ?? 0,
        outcomesExtracted: withOutcome.count ?? 0,
        salePricesExtracted: withPrice.count ?? 0,
        noChange: noChange.count ?? 0,
        reviewQueue: reviews.count ?? 0,
      };
    } catch {
      return {
        runs: 0,
        outcomesExtracted: 0,
        salePricesExtracted: 0,
        noChange: 0,
        reviewQueue: 0,
      };
    }
  }
}
