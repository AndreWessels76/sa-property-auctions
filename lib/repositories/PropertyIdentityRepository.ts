import { BaseRepository } from "./BaseRepository";
import type { PropertyMaster } from "@/lib/identity";
import type { AuctionEventRecord } from "@/lib/identity/auctionEvent";
import type { PropertyHistoryEventInput } from "@/lib/identity/history";
import type { ProvenanceRecord } from "@/lib/identity/provenance";

function isMissingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table")
  );
}

export class PropertyMasterRepository extends BaseRepository {
  static async findByFingerprint(
    fingerprint: string,
  ): Promise<PropertyMaster | null> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("property_masters")
      .select("*")
      .eq("fingerprint", fingerprint)
      .maybeSingle();
    if (error) {
      if (isMissingRelation(error)) return null;
      this.handleError("PropertyMasterRepository.findByFingerprint", error);
    }
    return (data as PropertyMaster) ?? null;
  }

  static async findById(id: string): Promise<PropertyMaster | null> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("property_masters")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      if (isMissingRelation(error)) return null;
      this.handleError("PropertyMasterRepository.findById", error);
    }
    return (data as PropertyMaster) ?? null;
  }

  /** Candidate masters for identity matching (bounded). */
  static async listCandidates(limit = 300): Promise<PropertyMaster[]> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("property_masters")
      .select("*")
      .eq("is_master", true)
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) {
      if (isMissingRelation(error)) return [];
      this.handleError("PropertyMasterRepository.listCandidates", error);
    }
    return (data as PropertyMaster[]) ?? [];
  }

  static async count(): Promise<number> {
    try {
      const db = this.adminDb();
      const { count, error } = await db
        .from("property_masters")
        .select("id", { count: "exact", head: true });
      if (error) {
        if (isMissingRelation(error)) return 0;
        this.handleError("PropertyMasterRepository.count", error);
      }
      return count ?? 0;
    } catch {
      return 0;
    }
  }

  static async insert(
    row: Record<string, unknown>,
  ): Promise<PropertyMaster | null> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("property_masters")
      .insert(row)
      .select("*")
      .maybeSingle();
    if (error) {
      if (isMissingRelation(error)) return null;
      // Unique fingerprint race → fetch existing
      if (error.code === "23505" && typeof row.fingerprint === "string") {
        return this.findByFingerprint(row.fingerprint);
      }
      this.handleError("PropertyMasterRepository.insert", error);
    }
    return (data as PropertyMaster) ?? null;
  }

  static async update(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<PropertyMaster | null> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("property_masters")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      if (isMissingRelation(error)) return null;
      this.handleError("PropertyMasterRepository.update", error);
    }
    return (data as PropertyMaster) ?? null;
  }

  static async linkListing(
    listingPropertyId: string,
    propertyMasterId: string,
  ): Promise<void> {
    const db = this.adminDb();
    const { error } = await db
      .from("properties")
      .update({ property_master_id: propertyMasterId })
      .eq("id", listingPropertyId);
    if (error && !isMissingRelation(error)) {
      // Column may be missing pre-migration
      if ((error.message ?? "").toLowerCase().includes("property_master_id")) {
        return;
      }
      this.handleError("PropertyMasterRepository.linkListing", error);
    }
  }
}

export class AuctionEventRepository extends BaseRepository {
  static async findByExternal(
    connectorId: string,
    externalListingId: string,
  ): Promise<{ id: string; property_master_id: string } | null> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("auction_events")
      .select("id,property_master_id")
      .eq("connector_id", connectorId)
      .eq("external_listing_id", externalListingId)
      .maybeSingle();
    if (error) {
      if (isMissingRelation(error)) return null;
      this.handleError("AuctionEventRepository.findByExternal", error);
    }
    return data as { id: string; property_master_id: string } | null;
  }

  static async upsertEvent(
    event: AuctionEventRecord,
  ): Promise<{ id: string } | null> {
    const db = this.adminDb();
    if (event.connector_id && event.external_listing_id) {
      const existing = await this.findByExternal(
        event.connector_id,
        event.external_listing_id,
      );
      if (existing) {
        const { data, error } = await db
          .from("auction_events")
          .update({
            ...event,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select("id")
          .maybeSingle();
        if (error) {
          if (isMissingRelation(error)) return null;
          this.handleError("AuctionEventRepository.upsertEvent.update", error);
        }
        return data as { id: string } | null;
      }
    }

    const { data, error } = await db
      .from("auction_events")
      .insert({
        ...event,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    if (error) {
      if (isMissingRelation(error)) return null;
      this.handleError("AuctionEventRepository.upsertEvent.insert", error);
    }
    return data as { id: string } | null;
  }

  static async count(): Promise<number> {
    try {
      const db = this.adminDb();
      const { count, error } = await db
        .from("auction_events")
        .select("id", { count: "exact", head: true });
      if (error) {
        if (isMissingRelation(error)) return 0;
        this.handleError("AuctionEventRepository.count", error);
      }
      return count ?? 0;
    } catch {
      return 0;
    }
  }

  static async listByMaster(propertyMasterId: string): Promise<unknown[]> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("auction_events")
      .select("*")
      .eq("property_master_id", propertyMasterId)
      .order("auction_date", { ascending: false });
    if (error) {
      if (isMissingRelation(error)) return [];
      this.handleError("AuctionEventRepository.listByMaster", error);
    }
    return data ?? [];
  }

  static async listAll(limit = 2000): Promise<unknown[]> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("auction_events")
        .select("*")
        .order("auction_date", { ascending: false })
        .limit(limit);
      if (error) {
        if (isMissingRelation(error)) return [];
        this.handleError("AuctionEventRepository.listAll", error);
      }
      return data ?? [];
    } catch {
      return [];
    }
  }

  static async listByListing(listingPropertyId: string): Promise<unknown[]> {
    try {
      const db = this.adminDb();
      const { data, error } = await db
        .from("auction_events")
        .select("*")
        .eq("listing_property_id", listingPropertyId)
        .order("auction_date", { ascending: false });
      if (error) {
        if (isMissingRelation(error)) return [];
        this.handleError("AuctionEventRepository.listByListing", error);
      }
      return data ?? [];
    } catch {
      return [];
    }
  }
}

export class PropertyHistoryRepository extends BaseRepository {
  static async append(events: PropertyHistoryEventInput[]): Promise<number> {
    if (events.length === 0) return 0;
    const db = this.adminDb();
    const { error } = await db.from("property_history_events").insert(events);
    if (error) {
      if (isMissingRelation(error)) return 0;
      this.handleError("PropertyHistoryRepository.append", error);
    }
    return events.length;
  }
}

export class PropertyProvenanceRepository extends BaseRepository {
  static async upsertMany(rows: ProvenanceRecord[]): Promise<number> {
    if (rows.length === 0) return 0;
    const db = this.adminDb();
    const { error } = await db.from("property_field_provenance").upsert(rows, {
      onConflict: "property_master_id,field_name,source_name",
    });
    if (error) {
      if (isMissingRelation(error)) return 0;
      this.handleError("PropertyProvenanceRepository.upsertMany", error);
    }
    return rows.length;
  }
}
