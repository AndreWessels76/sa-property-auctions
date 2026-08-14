import "server-only";

import {
  buildHi52Report,
  buildP1DryRunCandidates,
  buildLegacyDryRunCandidates52,
  buildExtractionDryRunCandidates,
  buildBatchDeltaReport,
  clampBatchLimit,
} from "@/lib/intelligence/historicalIntelligence52";
import { HistoricalIntelligence51Service } from "./HistoricalIntelligence51Service";
import { HistoricalSourceCoverage48Service } from "./HistoricalSourceCoverage48Service";
import { LoggerService } from "@/lib/logger";

function enrichCandidatesWithMasters<T extends { observationId: string }>(
  candidates: T[],
  events: Array<{ observationId: string; propertyMasterId?: string | null; auctionEventId?: string | null; source?: { sourceName?: string | null; sourceStatus?: string | null } }>,
) {
  return candidates.map((c) => {
    const event = events.find((e) => e.observationId === c.observationId);
    return {
      ...c,
      propertyMasterId: event?.propertyMasterId ?? (c as { propertyMasterId?: string | null }).propertyMasterId ?? null,
      eventId: event?.auctionEventId ?? (c as { eventId?: string | null }).eventId ?? null,
      source:
        event?.source?.sourceName ??
        event?.source?.sourceStatus ??
        (c as { source?: string | null }).source ??
        null,
    };
  });
}

export class HistoricalIntelligence52Service {
  static async buildReport() {
    const hi51 = await HistoricalIntelligence51Service.buildReport();
    return buildHi52Report(hi51);
  }

  static async adminDashboard() {
    const report = await this.buildReport();
    return { ok: true as const, ...report };
  }

  static async dryRunP1(input: { operator: string; limit?: number }) {
    const limit = clampBatchLimit(input.limit);
    const report = await this.buildReport();
    const hscReport = await HistoricalSourceCoverage48Service.buildDiagnosticReport();
    const candidates = enrichCandidatesWithMasters(
      buildP1DryRunCandidates(report.events, limit),
      hscReport.events,
    );

    return {
      ok: true,
      dryRun: true,
      message: "DRY RUN P1 — NOTHING WRITTEN",
      stage: "A_P1",
      candidates,
      counters: {
        candidates: candidates.length,
        wouldAttempt: candidates.length,
        wouldRetry: 0,
        wouldSkip: 0,
      },
      stages: report.stages,
      before: report.recoverySnapshot,
    };
  }

  static async dryRunLegacy(input: { operator: string; limit?: number }) {
    const limit = clampBatchLimit(input.limit);
    const report = await this.buildReport();
    const hscReport = await HistoricalSourceCoverage48Service.buildDiagnosticReport();
    const candidates = enrichCandidatesWithMasters(
      buildLegacyDryRunCandidates52(report.events, limit),
      hscReport.events,
    );

    return {
      ok: true,
      dryRun: true,
      message: "DRY RUN LEGACY — NOTHING WRITTEN",
      stage: "B_LEGACY",
      candidates,
      legacyRecoveryCandidates: report.legacyRecoveryCandidates,
      before: report.recoverySnapshot,
    };
  }

  static async dryRunExtraction(input: { operator: string; limit?: number }) {
    const limit = clampBatchLimit(input.limit);
    const report = await this.buildReport();
    const hscReport = await HistoricalSourceCoverage48Service.buildDiagnosticReport();
    const candidates = enrichCandidatesWithMasters(
      buildExtractionDryRunCandidates(report.events, limit),
      hscReport.events,
    );

    return {
      ok: true,
      dryRun: true,
      message: "DRY RUN EXTRACTION — NOTHING WRITTEN (no refetch)",
      stage: "C_EXTRACTION",
      candidates,
      missingExtractionCandidates: report.missingExtractionCandidates,
      before: report.recoverySnapshot,
    };
  }

  static async acquireP1Batch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    if (input.dryRun) {
      return this.dryRunP1({ operator: input.operator, limit: input.limit });
    }

    const limit = clampBatchLimit(input.limit);
    const preview = await this.dryRunP1({ operator: input.operator, limit });
    const result = (await HistoricalIntelligence51Service.acquireP1Batch({
      operator: input.operator,
      limit,
      dryRun: false,
    })) as {
      ok?: boolean;
      message?: string;
      acquisition?: { processed?: number };
      beforeAfter?: {
        before: typeof preview.before;
        after: typeof preview.before;
        delta?: { lines: string[]; improved: boolean };
      };
      [key: string]: unknown;
    };

    const afterReport = await this.buildReport();
    const before = result.beforeAfter?.before ?? preview.before;
    const after = result.beforeAfter?.after ?? afterReport.recoverySnapshot;
    const delta = result.beforeAfter?.delta;
    const batchDelta = buildBatchDeltaReport({
      before,
      after,
      candidates: preview.candidates.length,
      attempted: result.acquisition?.processed ?? preview.candidates.length,
      lines: delta?.lines ?? [],
      improved: delta?.improved ?? false,
    });

    LoggerService.audit("hi52.acquire_p1", {
      operator: input.operator,
      attempted: batchDelta.attempted,
      improved: batchDelta.improved,
    });

    return {
      ...result,
      ok: true,
      message: batchDelta.improved
        ? `P1 batch complete — ${batchDelta.lines.join(", ")}`
        : "P1 batch complete — no evidence metric change",
      batchDelta,
      hi52: afterReport,
    };
  }

  static async retryLegacyFailuresBatch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    if (input.dryRun) {
      return this.dryRunLegacy({ operator: input.operator, limit: input.limit });
    }

    const limit = clampBatchLimit(input.limit);
    const preview = await this.dryRunLegacy({ operator: input.operator, limit });
    const result = (await HistoricalIntelligence51Service.retryLegacyFailuresBatch({
      operator: input.operator,
      limit,
      dryRun: false,
    })) as {
      ok?: boolean;
      message?: string;
      processed?: number;
      beforeAfter?: {
        before: typeof preview.before;
        after: typeof preview.before;
        delta?: { lines: string[]; improved: boolean };
      };
      [key: string]: unknown;
    };
    const afterReport = await this.buildReport();
    const before = result.beforeAfter?.before ?? preview.before;
    const after = result.beforeAfter?.after ?? afterReport.recoverySnapshot;
    const delta = result.beforeAfter?.delta;
    const batchDelta = buildBatchDeltaReport({
      before,
      after,
      candidates: preview.candidates.length,
      attempted: result.processed ?? preview.candidates.length,
      lines: delta?.lines ?? [],
      improved: delta?.improved ?? false,
    });

    return {
      ...result,
      ok: true,
      batchDelta,
      hi52: afterReport,
    };
  }

  static async extractSnapshotsBatch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    if (input.dryRun) {
      return this.dryRunExtraction({ operator: input.operator, limit: input.limit });
    }

    const limit = clampBatchLimit(input.limit);
    const preview = await this.dryRunExtraction({ operator: input.operator, limit });
    const result = (await HistoricalIntelligence51Service.extractSnapshotsBatch({
      operator: input.operator,
      limit,
      dryRun: false,
    })) as {
      ok?: boolean;
      message?: string;
      processed?: number;
      beforeAfter?: {
        before: typeof preview.before;
        after: typeof preview.before;
        delta?: { lines: string[]; improved: boolean };
      };
      [key: string]: unknown;
    };
    const afterReport = await this.buildReport();
    const before = result.beforeAfter?.before ?? preview.before;
    const after = result.beforeAfter?.after ?? afterReport.recoverySnapshot;
    const delta = result.beforeAfter?.delta;
    const batchDelta = buildBatchDeltaReport({
      before,
      after,
      candidates: preview.candidates.length,
      attempted: result.processed ?? preview.candidates.length,
      lines: delta?.lines ?? [],
      improved: delta?.improved ?? false,
    });

    return {
      ...result,
      ok: true,
      batchDelta,
      hi52: afterReport,
    };
  }

  static async resolveEvidence(input: { operator: string; limit?: number }) {
    const result = await HistoricalIntelligence51Service.resolveEvidence({
      ...input,
      limit: clampBatchLimit(input.limit),
    });
    const hi52 = await this.buildReport();
    return { ...result, ok: true, hi52 };
  }

  static async runQualityAudit(input: { operator: string }) {
    const result = await HistoricalIntelligence51Service.runQualityAudit(input);
    const hi52 = await this.buildReport();
    return { ...result, ok: true, hi52 };
  }

  static async rebuildIntelligence(operator: string) {
    const result = await HistoricalIntelligence51Service.rebuildIntelligence(operator);
    const hi52 = await this.buildReport();
    return { ...result, ok: true, hi52 };
  }
}
