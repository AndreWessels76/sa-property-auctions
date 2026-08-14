import { BaseRepository } from "./BaseRepository";

function missingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return error.code === "42P01" || msg.includes("does not exist") || msg.includes("schema cache");
}

export type QualityAuditRow = {
  id: string;
  auction_event_id: string | null;
  property_master_id: string | null;
  listing_property_id: string | null;
  review_id: string | null;
  field: string | null;
  old_state: string | null;
  new_state: string;
  decision: string;
  reason: string | null;
  source: string | null;
  actor: string | null;
  quality_version: string;
  evidence: unknown;
  idempotency_key: string | null;
  created_at: string;
};

export class HistoricalEvidenceQualityRepository extends BaseRepository {
  static buildIdempotencyKey(parts: {
    eventId?: string | null;
    field?: string | null;
    decision: string;
    actor: string;
    qualityVersion: string;
  }): string {
    return [
      parts.eventId ?? "",
      parts.field ?? "",
      parts.decision,
      parts.actor,
      parts.qualityVersion,
    ].join("|");
  }

  static async findIdempotent(key: string): Promise<QualityAuditRow | null> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("historical_evidence_quality_audit")
        .select("*")
        .eq("idempotency_key", key)
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        return null;
      }
      return data as QualityAuditRow | null;
    } catch {
      return null;
    }
  }

  static async recordAudit(input: {
    auctionEventId?: string | null;
    propertyMasterId?: string | null;
    listingPropertyId?: string | null;
    reviewId?: string | null;
    field?: string | null;
    oldState?: string | null;
    newState: string;
    decision: string;
    reason?: string | null;
    source?: string | null;
    actor?: string | null;
    qualityVersion: string;
    evidence?: unknown;
    idempotencyKey?: string | null;
  }): Promise<QualityAuditRow | null> {
    if (input.idempotencyKey) {
      const existing = await this.findIdempotent(input.idempotencyKey);
      if (existing) return existing;
    }

    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("historical_evidence_quality_audit")
        .insert({
          auction_event_id: input.auctionEventId ?? null,
          property_master_id: input.propertyMasterId ?? null,
          listing_property_id: input.listingPropertyId ?? null,
          review_id: input.reviewId ?? null,
          field: input.field ?? null,
          old_state: input.oldState ?? null,
          new_state: input.newState,
          decision: input.decision,
          reason: input.reason ?? null,
          source: input.source ?? null,
          actor: input.actor ?? null,
          quality_version: input.qualityVersion,
          evidence: input.evidence ?? null,
          idempotency_key: input.idempotencyKey ?? null,
        })
        .select("*")
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        return null;
      }
      return data as QualityAuditRow | null;
    } catch {
      return null;
    }
  }

  static async listRecent(limit = 50): Promise<QualityAuditRow[]> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("historical_evidence_quality_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        if (missingRelation(error)) return [];
        return [];
      }
      return (data as QualityAuditRow[]) ?? [];
    } catch {
      return [];
    }
  }
}
