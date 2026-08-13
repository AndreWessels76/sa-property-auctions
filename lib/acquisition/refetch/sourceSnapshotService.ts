import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/admin";
import { LoggerService } from "@/lib/logger";
import type { SourceSnapshotRecord } from "./types";

function missingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

export function sha256Content(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Source snapshot persistence — soft-fail if migration not applied.
 * Never destroys previous rows (append-only history).
 */
export class SourceSnapshotService {
  static async latestForProperty(
    propertyId: string,
  ): Promise<SourceSnapshotRecord | null> {
    try {
      const db = createServiceClient();
      const { data, error } = await db
        .from("source_snapshots")
        .select("*")
        .eq("property_id", propertyId)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        LoggerService.warn("source_snapshot.latest_failed", { error: error.message });
        return null;
      }
      return (data as SourceSnapshotRecord) ?? null;
    } catch {
      return null;
    }
  }

  static async findByUrlAndHash(
    sourceUrl: string,
    contentHash: string,
  ): Promise<SourceSnapshotRecord | null> {
    try {
      const db = createServiceClient();
      const { data, error } = await db
        .from("source_snapshots")
        .select("*")
        .eq("source_url", sourceUrl)
        .eq("content_hash", contentHash)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        return null;
      }
      return (data as SourceSnapshotRecord) ?? null;
    } catch {
      return null;
    }
  }

  static async latestByUrl(sourceUrl: string): Promise<SourceSnapshotRecord | null> {
    try {
      const db = createServiceClient();
      const { data, error } = await db
        .from("source_snapshots")
        .select("*")
        .eq("source_url", sourceUrl)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        return null;
      }
      return (data as SourceSnapshotRecord) ?? null;
    } catch {
      return null;
    }
  }

  static async insert(
    row: Omit<SourceSnapshotRecord, "id">,
  ): Promise<string | null> {
    try {
      const db = createServiceClient();
      const { data, error } = await db
        .from("source_snapshots")
        .insert(row)
        .select("id")
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        LoggerService.warn("source_snapshot.insert_failed", { error: error.message });
        return null;
      }
      return (data as { id: string } | null)?.id ?? null;
    } catch {
      return null;
    }
  }

  static async listForProperty(
    propertyId: string,
    limit = 20,
  ): Promise<SourceSnapshotRecord[]> {
    try {
      const db = createServiceClient();
      const { data, error } = await db
        .from("source_snapshots")
        .select("*")
        .eq("property_id", propertyId)
        .order("fetched_at", { ascending: false })
        .limit(limit);
      if (error) {
        if (missingRelation(error)) return [];
        return [];
      }
      return (data as SourceSnapshotRecord[]) ?? [];
    } catch {
      return [];
    }
  }
}
