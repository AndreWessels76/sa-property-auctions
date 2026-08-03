import { createServiceClient } from "@/lib/supabase/admin";
import { LoggerService } from "@/lib/logger";

export type AcquisitionMetricsSnapshot = {
  importedToday: number;
  updatedToday: number;
  archivedToday: number;
  rejectedToday: number;
  verificationQueue: number;
  averageImportTimeMs: number | null;
  duplicateRate: number | null;
  successRate: number | null;
  sourceReliability: number | null;
};

function startOfUtcDay(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function recordImportRejection(input: {
  connectorId: string;
  externalListingId?: string | null;
  sourceUrl?: string | null;
  reason: string;
  payload?: Record<string, unknown> | null;
  jobId?: string | null;
}): Promise<void> {
  LoggerService.audit("acquisition.rejection", {
    connectorId: input.connectorId,
    reason: input.reason,
    sourceUrl: input.sourceUrl ?? null,
    externalListingId: input.externalListingId ?? null,
  });
  try {
    const db = createServiceClient();
    const { error } = await db.from("import_rejections").insert({
      connector_id: input.connectorId,
      external_listing_id: input.externalListingId ?? null,
      source_url: input.sourceUrl ?? null,
      reason: input.reason,
      payload: input.payload ?? null,
      job_id: input.jobId ?? null,
    });
    if (error) {
      LoggerService.warn("acquisition.rejection_persist_failed", {
        error: error.message,
      });
    }
  } catch (error) {
    LoggerService.warn("acquisition.rejection_persist_unavailable", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function recordImportReport(input: {
  connectorId: string;
  jobId: string;
  imported: number;
  updated: number;
  rejected: number;
  archived: number;
  duplicates: number;
  durationMs: number;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = createServiceClient();
    await db.from("acquisition_import_reports").insert({
      connector_id: input.connectorId,
      job_id: input.jobId,
      imported: input.imported,
      updated: input.updated,
      rejected: input.rejected,
      archived: input.archived,
      duplicates: input.duplicates,
      duration_ms: input.durationMs,
      meta: input.meta ?? null,
    });
  } catch (error) {
    LoggerService.warn("acquisition.report_persist_unavailable", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function getAcquisitionMetrics(
  connectorId?: string,
): Promise<AcquisitionMetricsSnapshot> {
  const empty: AcquisitionMetricsSnapshot = {
    importedToday: 0,
    updatedToday: 0,
    archivedToday: 0,
    rejectedToday: 0,
    verificationQueue: 0,
    averageImportTimeMs: null,
    duplicateRate: null,
    successRate: null,
    sourceReliability: null,
  };

  try {
    const db = createServiceClient();
    const since = startOfUtcDay();

    let reportsQuery = db
      .from("acquisition_import_reports")
      .select("*")
      .gte("created_at", since);
    if (connectorId) {
      reportsQuery = reportsQuery.eq("connector_id", connectorId);
    }
    const { data: reports } = await reportsQuery;

    let rejectedQuery = db
      .from("import_rejections")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    if (connectorId) {
      rejectedQuery = rejectedQuery.eq("connector_id", connectorId);
    }
    const { count: rejectedToday } = await rejectedQuery;

    const { count: verificationQueue } = await db
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("verification_state", "pending_verification");

    const list = reports ?? [];
    const importedToday = list.reduce((s, r) => s + (r.imported ?? 0), 0);
    const updatedToday = list.reduce((s, r) => s + (r.updated ?? 0), 0);
    const archivedToday = list.reduce((s, r) => s + (r.archived ?? 0), 0);
    const duplicates = list.reduce((s, r) => s + (r.duplicates ?? 0), 0);
    const rejectedFromReports = list.reduce((s, r) => s + (r.rejected ?? 0), 0);
    const durations = list
      .map((r) => r.duration_ms)
      .filter((n): n is number => typeof n === "number" && n > 0);
    const processed =
      importedToday + updatedToday + rejectedFromReports + duplicates;
    const success = importedToday + updatedToday;

    return {
      importedToday,
      updatedToday,
      archivedToday,
      rejectedToday: rejectedToday ?? rejectedFromReports,
      verificationQueue: verificationQueue ?? 0,
      averageImportTimeMs:
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : null,
      duplicateRate:
        processed > 0 ? Math.round((duplicates / processed) * 1000) / 10 : null,
      successRate:
        processed > 0 ? Math.round((success / processed) * 1000) / 10 : null,
      sourceReliability:
        processed > 0
          ? Math.round((success / processed) * 1000) / 10
          : null,
    };
  } catch {
    return empty;
  }
}
