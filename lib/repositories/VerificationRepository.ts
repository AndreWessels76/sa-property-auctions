import { BaseRepository } from "@/lib/repositories/BaseRepository";
import type { Property } from "@/lib/types/property";
import type { VerificationState } from "@/lib/data/verificationStates";
import { LoggerService } from "@/lib/logger";

export type VerificationQueueFilters = {
  needsVerification?: boolean;
  missingImages?: boolean;
  missingAddress?: boolean;
  expired?: boolean;
  verificationState?: VerificationState;
  limit?: number;
};

export type VerificationUpdate = {
  verification_state?: VerificationState;
  data_classification?: string;
  last_verified_at?: string | null;
  status?: string;
  listing_status?: string;
  status_changed_at?: string;
  status_change_reason?: string;
  status_source_event?: string;
  address_unavailability_reason?: string | null;
  completeness_score?: number;
  verification_score?: number;
  image_score?: number;
  address_score?: number;
  auction_score?: number;
  source_trust_score?: number;
  data_quality_score?: number;
  provenance_notes?: string | null;
};

export class VerificationRepository extends BaseRepository {
  static async listForVerification(
    filters: VerificationQueueFilters = {},
  ): Promise<Property[]> {
    const db = this.adminDb();
    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);

    let query = db
      .from("properties")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (filters.verificationState) {
      query = query.eq("verification_state", filters.verificationState);
    } else if (filters.needsVerification) {
      query = query.in("verification_state", [
        "seed",
        "pending_verification",
      ]);
    }

    if (filters.expired) {
      query = query.or(
        "verification_state.eq.expired,status.ilike.expired,listing_status.ilike.expired",
      );
    }

    const { data, error } = await query;
    if (error) {
      this.handleError("VerificationRepository.listForVerification", error);
    }

    let rows = (data as Property[]) ?? [];

    if (filters.missingAddress) {
      rows = rows.filter(
        (p) =>
          !p.address?.trim() &&
          !p.street_address?.trim() &&
          !p.suburb?.trim(),
      );
    }

    return rows;
  }

  static async updateVerification(
    id: string,
    patch: VerificationUpdate,
  ): Promise<Property> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("properties")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      this.handleError("VerificationRepository.updateVerification", error);
    }
    if (!data) {
      throw new Error(`Property not found: ${id}`);
    }

    LoggerService.audit("verification.update", { id, patch });
    return data as Property;
  }

  static async countByVerificationState(): Promise<Record<string, number>> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("properties")
      .select("verification_state,data_classification,source");

    if (error) {
      this.handleError("VerificationRepository.countByVerificationState", error);
    }

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const key =
        (row as { verification_state?: string | null }).verification_state ||
        (row as { data_classification?: string | null }).data_classification ||
        "unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }

  static async recentPipelineEvents(limit = 50): Promise<
    Array<{
      id: string;
      job_id: string | null;
      connector_id: string | null;
      stage: string;
      status: string;
      message: string | null;
      created_at: string;
    }>
  > {
    const db = this.adminDb();
    const { data, error } = await db
      .from("import_pipeline_events")
      .select("id,job_id,connector_id,stage,status,message,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      LoggerService.warn("verification.pipeline_events_unavailable", {
        error: error.message,
      });
      return [];
    }
    return (data as Array<{
      id: string;
      job_id: string | null;
      connector_id: string | null;
      stage: string;
      status: string;
      message: string | null;
      created_at: string;
    }>) ?? [];
  }
}
