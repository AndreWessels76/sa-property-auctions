import "server-only";

import {
  buildHi55Report,
  clampHi55BatchLimit,
  catalogueLeakCheck,
  withNeverAttempted55,
  buildExplicitCampaignDelta55,
  formatAcquireBeforeAfter55,
  formatP1RemainingDelta55,
  HISTORICAL_INTELLIGENCE55_VERSION,
} from "@/lib/intelligence/historicalIntelligence55";
import { HistoricalIntelligence54Service } from "./HistoricalIntelligence54Service";
import { LoggerService } from "@/lib/logger";

export class HistoricalIntelligence55Service {
  static async buildReport() {
    const hi54 = await HistoricalIntelligence54Service.buildReport();
    return buildHi55Report(hi54);
  }

  static async adminDashboard() {
    const report = await this.buildReport();
    return { ok: true as const, ...report };
  }

  static async dryRunP1(input: { operator: string; limit?: number }) {
    const limit = clampHi55BatchLimit(input.limit);
    const report = await this.buildReport();
    const result = await HistoricalIntelligence54Service.dryRunP1({
      operator: input.operator,
      limit,
    });
    return {
      ...result,
      ok: true,
      version: HISTORICAL_INTELLIGENCE55_VERSION,
      campaign55: report.campaign55,
      p1Progress55: report.p1Progress55,
      batchPlan55: report.batchPlan55,
      bottleneck55: report.bottleneck55,
      recoveryLanes55: report.recoveryLanes55,
      hi55: report,
      writes: false,
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

    const limit = clampHi55BatchLimit(input.limit);
    const beforeReport = await this.buildReport();
    const beforeRemaining = beforeReport.coverage52.neverAttempted;
    const before = withNeverAttempted55(
      beforeReport.recoverySnapshot,
      beforeRemaining,
    );

    const result = await HistoricalIntelligence54Service.acquireP1Batch({
      operator: input.operator,
      limit,
      dryRun: false,
    });

    const afterReport = await this.buildReport();
    const afterRemaining = afterReport.coverage52.neverAttempted;
    const after = withNeverAttempted55(
      afterReport.recoverySnapshot,
      afterRemaining,
    );
    const explicitDelta = buildExplicitCampaignDelta55({ before, after });
    const beforeAfterDisplay = formatAcquireBeforeAfter55({
      candidates: limit,
      before,
      after,
    });
    const p1RemainingLines = formatP1RemainingDelta55({
      beforeRemaining,
      afterRemaining,
      attempted: limit,
      successful: Math.max(0, after.fetchSuccessful - before.fetchSuccessful),
      failed: Math.max(0, after.fetchFailed - before.fetchFailed),
    });

    LoggerService.audit("hi55.acquire_p1", {
      operator: input.operator,
      limit,
      beforeRemaining,
      afterRemaining,
      improved: explicitDelta.improved,
    });

    return {
      ...result,
      ok: true,
      message: explicitDelta.improved
        ? `Acquire P1 (${limit}) — evidence metrics improved`
        : `Acquire P1 (${limit}) — no evidence metric improvement (zeros shown in delta)`,
      explicitDelta,
      beforeAfterDisplay,
      p1RemainingLines,
      campaign55: afterReport.campaign55,
      p1Progress55: afterReport.p1Progress55,
      batchPlan55: afterReport.batchPlan55,
      bottleneck55: afterReport.bottleneck55,
      hi55: afterReport,
    };
  }

  static async extractSnapshotsBatch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    const limit = clampHi55BatchLimit(input.limit);
    const result = await HistoricalIntelligence54Service.extractSnapshotsBatch({
      operator: input.operator,
      limit,
      dryRun: input.dryRun,
    });
    const hi55 = await this.buildReport();
    return {
      ...result,
      ok: true,
      campaign55: hi55.campaign55,
      hi55,
    };
  }

  static async retryLegacyFailures(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    const limit = clampHi55BatchLimit(input.limit);
    const beforeReport = await this.buildReport();
    const before = withNeverAttempted55(
      beforeReport.recoverySnapshot,
      beforeReport.coverage52.neverAttempted,
    );

    const result = await HistoricalIntelligence54Service.retryFailedBatch({
      operator: input.operator,
      limit,
      dryRun: input.dryRun,
    });

    const afterReport = await this.buildReport();
    const after = withNeverAttempted55(
      afterReport.recoverySnapshot,
      afterReport.coverage52.neverAttempted,
    );
    const explicitDelta = buildExplicitCampaignDelta55({ before, after });

    LoggerService.audit("hi55.retry_legacy", {
      operator: input.operator,
      limit,
      legacyBefore: beforeReport.recoveryLanes55.legacyUnknownFailures,
      legacyAfter: afterReport.recoveryLanes55.legacyUnknownFailures,
    });

    return {
      ...result,
      ok: true,
      explicitDelta,
      campaign55: afterReport.campaign55,
      recoveryLanes55: afterReport.recoveryLanes55,
      hi55: afterReport,
    };
  }

  static async resolveEvidence(input: { operator: string; limit?: number }) {
    const result = await HistoricalIntelligence54Service.resolveEvidence({
      operator: input.operator,
      limit: clampHi55BatchLimit(input.limit),
    });
    const hi55 = await this.buildReport();
    return { ...result, ok: true, campaign55: hi55.campaign55, hi55 };
  }

  static async runQualityAudit(input: { operator: string; limit?: number }) {
    const result = await HistoricalIntelligence54Service.runQualityAudit({
      operator: input.operator,
    });
    const hi55 = await this.buildReport();
    return {
      ...result,
      ok: true,
      limit: clampHi55BatchLimit(input.limit),
      campaign55: hi55.campaign55,
      hi55,
    };
  }

  static async rebuildIntelligence(operator: string) {
    const before = await this.buildReport();
    const leakCheck = catalogueLeakCheck(before.safety55.catalogueLeaks);
    if (!leakCheck.ok) {
      return {
        ok: false,
        blocked: true,
        rebuildStatus: "REBUILD_BLOCKED" as const,
        message:
          "Rebuild blocked because public catalogue safety validation failed.",
        catalogueLeaks: before.safety55.catalogueLeaks,
        hi55: before,
      };
    }

    const result = await HistoricalIntelligence54Service.rebuildIntelligence(operator);
    const after = await this.buildReport();

    if (after.safety55.catalogueLeaks > 0) {
      return {
        ok: false,
        blocked: true,
        rebuildStatus: "REBUILD_BLOCKED" as const,
        message:
          "Rebuild blocked because public catalogue safety validation failed.",
        catalogueLeaks: after.safety55.catalogueLeaks,
        result,
        hi55: after,
      };
    }

    return {
      ...result,
      ok: true,
      rebuildStatus: "ALLOWED" as const,
      hi55: after,
      campaign55: after.campaign55,
    };
  }
}
