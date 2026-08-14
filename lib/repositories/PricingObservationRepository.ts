/**
 * PricingObservationRepository — soft-fail if migration not applied.
 * Append-only with idempotent upsert key.
 */

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

export type PricingObservationRow = {
  id: string;
  property_id: string | null;
  property_master_id: string | null;
  auction_event_id: string | null;
  source_id: string | null;
  source_snapshot_id: string | null;
  extraction_run_id: string | null;
  field_name: string;
  raw_value: string | null;
  normalized_value: number | null;
  currency: string | null;
  is_approximate: boolean;
  is_range: boolean;
  min_value: number | null;
  max_value: number | null;
  status: string;
  evidence_text: string | null;
  source_name: string | null;
  source_url: string | null;
  parser_version: string;
  extraction_method: string | null;
  conversion_method: string | null;
  content_hash: string | null;
  idempotency_key: string | null;
  notes: string | null;
  extracted_at: string;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PricingConflictRow = {
  id: string;
  property_id: string | null;
  field_name: string;
  old_observation_id: string | null;
  new_observation_id: string | null;
  old_value: number | null;
  new_value: number | null;
  old_source: string | null;
  new_source: string | null;
  old_evidence: string | null;
  new_evidence: string | null;
  status: string;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export class PricingObservationRepository extends BaseRepository {
  static buildIdempotencyKey(input: {
    property_id: string;
    field_name: string;
    content_hash?: string | null;
    parser_version: string;
    normalized_value?: number | null;
    min_value?: number | null;
    max_value?: number | null;
  }): string | null {
    if (!input.content_hash) return null;
    const nv = input.normalized_value ?? "";
    const min = input.min_value ?? "";
    const max = input.max_value ?? "";
    return [
      input.property_id,
      input.field_name,
      input.content_hash,
      input.parser_version,
      String(nv),
      String(min),
      String(max),
    ].join("|");
  }

  static async listByProperty(
    propertyId: string,
  ): Promise<PricingObservationRow[]> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("pricing_observations")
        .select("*")
        .eq("property_id", propertyId)
        .order("extracted_at", { ascending: false });
      if (error) {
        if (missingRelation(error)) return [];
        this.handleError("PricingObservationRepository.listByProperty", error);
      }
      return (data as PricingObservationRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async listRecent(limit = 5000): Promise<PricingObservationRow[]> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("pricing_observations")
        .select("*")
        .order("extracted_at", { ascending: false })
        .limit(limit);
      if (error) {
        if (missingRelation(error)) return [];
        this.handleError("PricingObservationRepository.listRecent", error);
      }
      return (data as PricingObservationRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async listOpenConflicts(limit = 50): Promise<PricingConflictRow[]> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("pricing_conflicts")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        if (missingRelation(error)) return [];
        this.handleError("PricingObservationRepository.listOpenConflicts", error);
      }
      return (data as PricingConflictRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async insertObservation(row: {
    property_id: string;
    property_master_id?: string | null;
    auction_event_id?: string | null;
    source_id?: string | null;
    source_snapshot_id?: string | null;
    extraction_run_id?: string | null;
    field_name: string;
    raw_value?: string | null;
    normalized_value?: number | null;
    currency?: string | null;
    is_approximate?: boolean;
    is_range?: boolean;
    min_value?: number | null;
    max_value?: number | null;
    status: string;
    evidence_text?: string | null;
    source_name?: string | null;
    source_url?: string | null;
    parser_version: string;
    extraction_method?: string | null;
    conversion_method?: string | null;
    content_hash?: string | null;
    notes?: string | null;
    extracted_at?: string;
  }): Promise<PricingObservationRow | null> {
    try {
      const idempotency_key = this.buildIdempotencyKey(row);
      const existing = await this.findIdempotent(row);
      if (existing) return existing;

      const db = this.adminDb();
      const payload = {
        ...row,
        idempotency_key,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await db
        .from("pricing_observations")
        .insert(payload)
        .select("*")
        .maybeSingle();

      if (error) {
        if (missingRelation(error)) return null;
        if (error.code === "23505") {
          return this.findIdempotent(row);
        }
        this.handleError("PricingObservationRepository.insertObservation", error);
      }
      return data as PricingObservationRow | null;
    } catch {
      return null;
    }
  }

  static async findIdempotent(row: {
    property_id: string;
    field_name: string;
    content_hash?: string | null;
    parser_version: string;
    normalized_value?: number | null;
    min_value?: number | null;
    max_value?: number | null;
  }): Promise<PricingObservationRow | null> {
    try {
      const db = this.adminDb();
      const key = this.buildIdempotencyKey(row);
      if (key) {
        const byKey = await db
          .from("pricing_observations")
          .select("*")
          .eq("idempotency_key", key)
          .maybeSingle();
        if (!byKey.error && byKey.data) {
          return byKey.data as PricingObservationRow;
        }
        if (byKey.error && missingRelation(byKey.error)) return null;
      }

      let q = db
        .from("pricing_observations")
        .select("*")
        .eq("property_id", row.property_id)
        .eq("field_name", row.field_name)
        .eq("parser_version", row.parser_version)
        .limit(1);

      if (row.content_hash) q = q.eq("content_hash", row.content_hash);
      if (row.normalized_value != null) {
        q = q.eq("normalized_value", row.normalized_value);
      } else {
        q = q.is("normalized_value", null);
      }

      const { data, error } = await q.maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        return null;
      }
      return data as PricingObservationRow | null;
    } catch {
      return null;
    }
  }

  static async insertConflict(row: {
    property_id: string;
    field_name: string;
    old_observation_id?: string | null;
    new_observation_id?: string | null;
    old_value?: number | null;
    new_value?: number | null;
    old_source?: string | null;
    new_source?: string | null;
    old_evidence?: string | null;
    new_evidence?: string | null;
  }): Promise<PricingConflictRow | null> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("pricing_conflicts")
        .insert({
          ...row,
          status: "open",
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        this.handleError("PricingObservationRepository.insertConflict", error);
      }
      return data as PricingConflictRow | null;
    } catch {
      return null;
    }
  }

  static async updateObservationStatus(
    id: string,
    status: string,
    opts?: { verifiedBy?: string | null; notes?: string | null },
  ): Promise<PricingObservationRow | null> {
    try {
      const db = this.adminDb();
      const patch: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
        notes: opts?.notes ?? null,
      };
      if (status === "verified") {
        patch.verified_at = new Date().toISOString();
        patch.verified_by = opts?.verifiedBy ?? "admin";
      }
      const { data, error } = await db
        .from("pricing_observations")
        .update(patch)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        this.handleError("PricingObservationRepository.updateObservationStatus", error);
      }
      return data as PricingObservationRow | null;
    } catch {
      return null;
    }
  }

  static async resolveConflict(
    id: string,
    status: string,
    resolvedBy: string,
    note?: string | null,
  ): Promise<PricingConflictRow | null> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("pricing_conflicts")
        .update({
          status,
          resolved_by: resolvedBy,
          resolution_note: note ?? null,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        this.handleError("PricingObservationRepository.resolveConflict", error);
      }
      return data as PricingConflictRow | null;
    } catch {
      return null;
    }
  }

  /** Link existing observations to master + event without changing price semantics. */
  static async linkToMasterAndEvent(input: {
    propertyId: string;
    propertyMasterId: string;
    auctionEventId: string;
  }): Promise<number> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("pricing_observations")
        .update({
          property_master_id: input.propertyMasterId,
          auction_event_id: input.auctionEventId,
          updated_at: new Date().toISOString(),
        })
        .eq("property_id", input.propertyId)
        .is("auction_event_id", null)
        .select("id");
      if (error) {
        if (missingRelation(error)) return 0;
        this.handleError("PricingObservationRepository.linkToMasterAndEvent", error);
      }
      return data?.length ?? 0;
    } catch {
      return 0;
    }
  }

  /** Coverage aggregates from real observations + property counts. */
  static async coverageMetrics(): Promise<{
    available: boolean;
    observations: number;
    byField: Record<string, number>;
    openConflicts: number;
  }> {
    try {
      const db = this.adminDb();
      const { data, error, count } = await db
        .from("pricing_observations")
        .select("field_name,status", { count: "exact" })
        .limit(5000);
      if (error) {
        if (missingRelation(error)) {
          return { available: false, observations: 0, byField: {}, openConflicts: 0 };
        }
        this.handleError("PricingObservationRepository.coverageMetrics", error);
      }
      const byField: Record<string, number> = {};
      for (const row of data ?? []) {
        const f = (row as { field_name: string }).field_name;
        byField[f] = (byField[f] ?? 0) + 1;
      }
      const conflicts = await this.listOpenConflicts(1);
      const { count: conflictCount } = await db
        .from("pricing_conflicts")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");
      return {
        available: true,
        observations: count ?? (data?.length ?? 0),
        byField,
        openConflicts: conflictCount ?? conflicts.length,
      };
    } catch {
      return { available: false, observations: 0, byField: {}, openConflicts: 0 };
    }
  }
}
