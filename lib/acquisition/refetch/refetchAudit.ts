import { createServiceClient } from "@/lib/supabase/admin";
import { LoggerService } from "@/lib/logger";
import type { ChangeClass, RefetchStatus } from "./types";

function missingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

export type RefetchRunRow = {
  run_code: string;
  property_id?: string | null;
  partner_code?: string | null;
  connector_id?: string | null;
  source_url?: string | null;
  operator?: string | null;
  status: RefetchStatus | string;
  http_status?: number | null;
  content_hash?: string | null;
  previous_hash?: string | null;
  changed?: boolean;
  change_classes?: ChangeClass[] | string[];
  fields_changed?: number;
  conflicts?: number;
  extraction_run_id?: string | null;
  error?: string | null;
  started_at?: string;
  completed_at?: string | null;
  duration_ms?: number | null;
  meta?: Record<string, unknown>;
};

export class RefetchAudit {
  static async recordRun(row: RefetchRunRow): Promise<string | null> {
    try {
      const db = createServiceClient();
      const { data, error } = await db
        .from("source_refetch_runs")
        .upsert(
          {
            ...row,
            completed_at: row.completed_at ?? new Date().toISOString(),
          },
          { onConflict: "run_code" },
        )
        .select("id")
        .maybeSingle();
      if (error) {
        if (missingRelation(error)) return null;
        LoggerService.warn("refetch.audit_failed", { error: error.message });
        return null;
      }
      return (data as { id: string } | null)?.id ?? null;
    } catch {
      return null;
    }
  }

  static async listRecent(limit = 40): Promise<RefetchRunRow[]> {
    try {
      const db = createServiceClient();
      const { data, error } = await db
        .from("source_refetch_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(limit);
      if (error) {
        if (missingRelation(error)) return [];
        return [];
      }
      return (data as RefetchRunRow[]) ?? [];
    } catch {
      return [];
    }
  }

  /** Soft lock to prevent concurrent fetches of the same URL. */
  static async acquireLock(
    lockKey: string,
    runCode: string,
    ttlMs = 120_000,
  ): Promise<boolean> {
    try {
      const db = createServiceClient();
      const now = new Date();
      const expires = new Date(now.getTime() + ttlMs).toISOString();
      // Clear expired
      await db
        .from("source_refetch_locks")
        .delete()
        .lt("expires_at", now.toISOString());

      const { error } = await db.from("source_refetch_locks").insert({
        lock_key: lockKey,
        run_code: runCode,
        locked_at: now.toISOString(),
        expires_at: expires,
      });
      if (error) {
        if (missingRelation(error)) return true; // no lock table — proceed
        return false; // unique violation = locked
      }
      return true;
    } catch {
      return true;
    }
  }

  static async releaseLock(lockKey: string): Promise<void> {
    try {
      const db = createServiceClient();
      await db.from("source_refetch_locks").delete().eq("lock_key", lockKey);
    } catch {
      /* ignore */
    }
  }
}
