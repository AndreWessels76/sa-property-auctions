/**
 * Run metadata persistence for HEA 4.3 (reuses historical_enrichment_runs).
 */

import { HistoricalEnrichmentRepository } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { HISTORICAL_EVIDENCE_ACQUISITION43_VERSION } from "./config";

export class HistoricalEvidenceRepository {
  static async recordAcquisitionRun(input: {
    runId: string;
    propertyId: string;
    propertyMasterId?: string | null;
    auctionEventId?: string | null;
    status: string;
    sourceUrl?: string | null;
    snapshotId?: string | null;
    sourceHash?: string | null;
    outcome?: string | null;
    salePrice?: number | null;
    operator?: string | null;
    meta?: Record<string, unknown>;
  }) {
    return HistoricalEnrichmentRepository.recordRun({
      runId: input.runId,
      propertyId: input.propertyId,
      propertyMasterId: input.propertyMasterId ?? null,
      auctionEventId: input.auctionEventId ?? null,
      sourceUrl: input.sourceUrl ?? null,
      snapshotId: input.snapshotId ?? null,
      sourceHash: input.sourceHash ?? null,
      status: input.status,
      outcome: input.outcome ?? null,
      salePrice: input.salePrice ?? null,
      operator: input.operator ?? null,
      meta: {
        engine: HISTORICAL_EVIDENCE_ACQUISITION43_VERSION,
        ...input.meta,
      },
    });
  }

  static async listRecentRuns(limit = 50) {
    const rows = await HistoricalEnrichmentRepository.listRecentRuns(limit);
    return rows.filter(
      (r) =>
        r.meta &&
        typeof r.meta === "object" &&
        (r.meta as Record<string, unknown>).engine ===
          HISTORICAL_EVIDENCE_ACQUISITION43_VERSION,
    );
  }
}
