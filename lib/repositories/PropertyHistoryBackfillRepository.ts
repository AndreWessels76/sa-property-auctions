import { BaseRepository } from "./BaseRepository";
import type {
  BackfillAuditStatus,
  BackfillReviewKind,
  BackfillReviewStatus,
  BackfillRunKind,
  BackfillRunStatus,
} from "@/lib/backfill/types";

function missingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

export type BackfillRunRow = {
  id: string;
  run_kind: BackfillRunKind;
  dry_run: boolean;
  status: BackfillRunStatus;
  batch_limit: number;
  records_scanned: number;
  masters_created: number;
  masters_matched: number;
  master_review: number;
  master_skipped: number;
  events_created: number;
  events_matched: number;
  event_review: number;
  event_skipped: number;
  duplicates_skipped: number;
  identity_conflicts: number;
  insufficient_evidence: number;
  pricing_linked: number;
  location_review: number;
  meta: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BackfillItemRow = {
  id: string;
  run_id: string;
  listing_property_id: string;
  property_master_id: string | null;
  auction_event_id: string | null;
  identity_decision: string | null;
  event_decision: string | null;
  audit_status: BackfillAuditStatus;
  confidence: number | null;
  event_fingerprint: string | null;
  matching_signals: unknown;
  evidence: unknown;
  source_name: string | null;
  source_url: string | null;
  created_at: string;
};

export type BackfillReviewRow = {
  id: string;
  run_id: string | null;
  listing_property_id: string;
  review_kind: BackfillReviewKind;
  status: BackfillReviewStatus;
  proposed_master_id: string | null;
  proposed_event_fingerprint: string | null;
  identity_decision: string | null;
  confidence: number | null;
  matching_signals: unknown;
  conflict_reason: string | null;
  evidence: unknown;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
};

export class PropertyHistoryBackfillRepository extends BaseRepository {
  static schemaAvailable(): boolean {
    try {
      const db = this.adminDb();
      return Boolean(db);
    } catch {
      return false;
    }
  }

  static async createRun(input: {
    runKind: BackfillRunKind;
    dryRun: boolean;
    batchLimit: number;
    meta?: Record<string, unknown>;
  }): Promise<BackfillRunRow | null> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("property_history_backfill_runs")
        .insert({
          run_kind: input.runKind,
          dry_run: input.dryRun,
          batch_limit: input.batchLimit,
          status: "running",
          meta: input.meta ?? null,
        })
        .select("*")
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        this.handleError("PropertyHistoryBackfillRepository.createRun", error);
      }
      return data as BackfillRunRow;
    } catch {
      return null;
    }
  }

  static async updateRun(
    id: string,
    patch: Partial<BackfillRunRow>,
  ): Promise<BackfillRunRow | null> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("property_history_backfill_runs")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        this.handleError("PropertyHistoryBackfillRepository.updateRun", error);
      }
      return data as BackfillRunRow;
    } catch {
      return null;
    }
  }

  static async getRun(id: string): Promise<BackfillRunRow | null> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("property_history_backfill_runs")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        this.handleError("PropertyHistoryBackfillRepository.getRun", error);
      }
      return data as BackfillRunRow | null;
    } catch {
      return null;
    }
  }

  static async listRuns(limit = 20): Promise<BackfillRunRow[]> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("property_history_backfill_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(limit);
      if (error) {
        if (missingRelation(error)) return [];
        this.handleError("PropertyHistoryBackfillRepository.listRuns", error);
      }
      return (data as BackfillRunRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async insertItem(row: {
    run_id: string;
    listing_property_id: string;
    property_master_id?: string | null;
    auction_event_id?: string | null;
    identity_decision?: string | null;
    event_decision?: string | null;
    audit_status: BackfillAuditStatus;
    confidence?: number | null;
    event_fingerprint?: string | null;
    matching_signals?: unknown;
    evidence?: unknown;
    source_name?: string | null;
    source_url?: string | null;
  }): Promise<BackfillItemRow | null> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("property_history_backfill_items")
        .insert(row)
        .select("*")
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        this.handleError("PropertyHistoryBackfillRepository.insertItem", error);
      }
      return data as BackfillItemRow;
    } catch {
      return null;
    }
  }

  static async listItemsByRun(runId: string, limit = 500): Promise<BackfillItemRow[]> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("property_history_backfill_items")
        .select("*")
        .eq("run_id", runId)
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) {
        if (missingRelation(error)) return [];
        this.handleError("PropertyHistoryBackfillRepository.listItemsByRun", error);
      }
      return (data as BackfillItemRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async upsertReview(row: {
    run_id?: string | null;
    listing_property_id: string;
    review_kind: BackfillReviewKind;
    proposed_master_id?: string | null;
    proposed_event_fingerprint?: string | null;
    identity_decision?: string | null;
    confidence?: number | null;
    matching_signals?: unknown;
    conflict_reason?: string | null;
    evidence?: unknown;
  }): Promise<BackfillReviewRow | null> {
    try {
      const db = this.adminDb();
      const { data: existing } = await db
        .from("property_history_backfill_reviews")
        .select("*")
        .eq("listing_property_id", row.listing_property_id)
        .eq("review_kind", row.review_kind)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) {
        const { data, error } = await db
          .from("property_history_backfill_reviews")
          .update({
            ...row,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select("*")
          .maybeSingle();
        if (error) {
          if (missingRelation(error)) return null;
          this.handleError("PropertyHistoryBackfillRepository.upsertReview.update", error);
        }
        return data as BackfillReviewRow;
      }

      const { data, error } = await db
        .from("property_history_backfill_reviews")
        .insert({
          ...row,
          status: "pending",
        })
        .select("*")
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        this.handleError("PropertyHistoryBackfillRepository.upsertReview.insert", error);
      }
      return data as BackfillReviewRow;
    } catch {
      return null;
    }
  }

  static async listPendingReviews(limit = 100): Promise<BackfillReviewRow[]> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("property_history_backfill_reviews")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        if (missingRelation(error)) return [];
        this.handleError("PropertyHistoryBackfillRepository.listPendingReviews", error);
      }
      return (data as BackfillReviewRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async resolveReview(
    id: string,
    input: {
      status: BackfillReviewStatus;
      resolvedBy: string;
      resolutionNote?: string | null;
    },
  ): Promise<BackfillReviewRow | null> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("property_history_backfill_reviews")
        .update({
          status: input.status,
          resolved_by: input.resolvedBy,
          resolved_at: new Date().toISOString(),
          resolution_note: input.resolutionNote ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        this.handleError("PropertyHistoryBackfillRepository.resolveReview", error);
      }
      return data as BackfillReviewRow;
    } catch {
      return null;
    }
  }

  static async countReviews(status?: BackfillReviewStatus): Promise<number> {
    try {
      const db = this.adminDb();
      let q = db
        .from("property_history_backfill_reviews")
        .select("id", { count: "exact", head: true });
      if (status) q = q.eq("status", status);
      const { count, error } = await q;
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
