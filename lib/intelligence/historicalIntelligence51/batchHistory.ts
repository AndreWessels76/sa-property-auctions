import type { EnrichmentRunRow } from "@/lib/repositories/HistoricalEnrichmentRepository";
import type { Hi51BatchHistoryRecord } from "./types";

const SUCCESS_STATUSES = new Set(["COMPLETED", "NO_CHANGE"]);
const FAILED_STATUSES = new Set([
  "FAILED",
  "FETCH_FAILED",
  "SOURCE_UNAVAILABLE",
  "SKIPPED_LICENSE",
]);

function inferAction(runId: string): string {
  if (runId.startsWith("hea43_")) return "acquire_p1";
  if (runId.startsWith("hi51_legacy_")) return "retry_legacy_failures";
  if (runId.startsWith("hi50_extract_") || runId.startsWith("hi51_extract_")) {
    return "extract_snapshots";
  }
  if (runId.startsWith("hsa49_net_")) return "retry_network_failures";
  if (runId.includes("dry")) return "dry_run";
  return "enrichment_batch";
}

export function buildBatchHistory(runs: EnrichmentRunRow[]): Hi51BatchHistoryRecord[] {
  const byRun = new Map<string, EnrichmentRunRow[]>();
  for (const run of runs) {
    if (!run.run_id || run.run_id.includes("dry")) continue;
    const group = byRun.get(run.run_id) ?? [];
    group.push(run);
    byRun.set(run.run_id, group);
  }

  const records: Hi51BatchHistoryRecord[] = [];
  for (const [batchId, rows] of byRun.entries()) {
    const started = rows.map((r) => r.started_at).sort()[0] ?? null;
    const completed =
      rows
        .map((r) => r.completed_at)
        .filter(Boolean)
        .sort()
        .reverse()[0] ?? null;

    records.push({
      batchId,
      action: inferAction(batchId),
      operator: rows[0]?.operator ?? null,
      started,
      completed,
      eventsSelected: rows.length,
      eventsSucceeded: rows.filter((r) => SUCCESS_STATUSES.has(r.status)).length,
      eventsFailed: rows.filter((r) => FAILED_STATUSES.has(r.status)).length,
      snapshotsCreated: rows.filter((r) => Boolean(r.snapshot_id)).length,
      outcomesExtracted: rows.filter((r) => Boolean(r.outcome)).length,
      pricesVerified: rows.filter((r) => r.sale_price != null && r.sale_price > 0).length,
    });
  }

  return records.sort((a, b) => (b.started ?? "").localeCompare(a.started ?? ""));
}

export function countP1ProcessedFromHistory(history: Hi51BatchHistoryRecord[]): number {
  return history
    .filter((b) => b.action === "acquire_p1")
    .reduce((sum, b) => sum + b.eventsSelected, 0);
}
