import { BaseRepository } from "./BaseRepository";

function missingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return error.code === "42P01" || msg.includes("does not exist") || msg.includes("schema cache");
}

export type ResolutionAuditRow = {
  id: string;
  auction_event_id: string | null;
  property_master_id: string | null;
  listing_property_id: string | null;
  outcome_observation_id: string | null;
  snapshot_id: string | null;
  old_state: string | null;
  new_state: string;
  resolution_label: string | null;
  evidence: unknown;
  conflict_state: string | null;
  actor: string | null;
  resolver_version: string;
  reason: string | null;
  idempotency_key: string | null;
  created_at: string;
};

export class HistoricalResolutionRepository extends BaseRepository {
  static buildIdempotencyKey(parts: {
    listingPropertyId?: string | null;
    auctionEventId?: string | null;
    sourceHash?: string | null;
    newState: string;
    resolverVersion: string;
  }): string | null {
    if (!parts.listingPropertyId && !parts.auctionEventId) return null;
    return [
      parts.listingPropertyId ?? "",
      parts.auctionEventId ?? "",
      parts.sourceHash ?? "",
      parts.newState,
      parts.resolverVersion,
    ].join("|");
  }

  static async findIdempotent(key: string): Promise<ResolutionAuditRow | null> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("historical_resolution_audit")
        .select("*")
        .eq("idempotency_key", key)
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        return null;
      }
      return data as ResolutionAuditRow | null;
    } catch {
      return null;
    }
  }

  static async recordAudit(input: {
    auctionEventId?: string | null;
    propertyMasterId?: string | null;
    listingPropertyId?: string | null;
    outcomeObservationId?: string | null;
    snapshotId?: string | null;
    oldState?: string | null;
    newState: string;
    resolutionLabel?: string | null;
    evidence?: unknown;
    conflictState?: string | null;
    actor?: string | null;
    resolverVersion: string;
    reason?: string | null;
    idempotencyKey?: string | null;
  }): Promise<ResolutionAuditRow | null> {
    if (input.idempotencyKey) {
      const existing = await this.findIdempotent(input.idempotencyKey);
      if (existing) return existing;
    }

    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("historical_resolution_audit")
        .insert({
          auction_event_id: input.auctionEventId ?? null,
          property_master_id: input.propertyMasterId ?? null,
          listing_property_id: input.listingPropertyId ?? null,
          outcome_observation_id: input.outcomeObservationId ?? null,
          snapshot_id: input.snapshotId ?? null,
          old_state: input.oldState ?? null,
          new_state: input.newState,
          resolution_label: input.resolutionLabel ?? null,
          evidence: input.evidence ?? null,
          conflict_state: input.conflictState ?? null,
          actor: input.actor ?? null,
          resolver_version: input.resolverVersion,
          reason: input.reason ?? null,
          idempotency_key: input.idempotencyKey ?? null,
        })
        .select("*")
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        return null;
      }
      return data as ResolutionAuditRow | null;
    } catch {
      return null;
    }
  }

  static async listRecent(limit = 50): Promise<ResolutionAuditRow[]> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("historical_resolution_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        if (missingRelation(error)) return [];
        return [];
      }
      return (data as ResolutionAuditRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async listByEvent(eventId: string, limit = 20): Promise<ResolutionAuditRow[]> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("historical_resolution_audit")
        .select("*")
        .eq("auction_event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        if (missingRelation(error)) return [];
        return [];
      }
      return (data as ResolutionAuditRow[]) ?? [];
    } catch {
      return [];
    }
  }
}
