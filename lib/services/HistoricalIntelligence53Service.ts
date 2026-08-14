import "server-only";

import {
  buildHi53Report,
  buildExplicitCampaignDelta,
  withNeverAttempted,
  HI53_DEFAULT_BATCH_LIMIT,
  HI53_MAX_BATCH_LIMIT,
} from "@/lib/intelligence/historicalIntelligence53";
import { HistoricalIntelligence52Service } from "./HistoricalIntelligence52Service";
import { LoggerService } from "@/lib/logger";

function clampLimit(limit?: number): number {
  const n = limit ?? HI53_DEFAULT_BATCH_LIMIT;
  return Math.min(Math.max(n, 1), HI53_MAX_BATCH_LIMIT);
}

export class HistoricalIntelligence53Service {
  static async buildReport() {
    const hi52 = await HistoricalIntelligence52Service.buildReport();
    return buildHi53Report(hi52);
  }

  static async adminDashboard() {
    const report = await this.buildReport();
    return { ok: true as const, ...report };
  }

  static async dryRunP1(input: { operator: string; limit?: number }) {
    const limit = clampLimit(input.limit);
    const report = await this.buildReport();
    const result = await HistoricalIntelligence52Service.dryRunP1({
      operator: input.operator,
      limit,
    });
    return {
      ...result,
      ok: true,
      campaign: report.campaign,
      batchPlan: report.batchPlan,
      hi53: report,
    };
  }

  static async dryRunLegacy(input: { operator: string; limit?: number }) {
    const limit = clampLimit(input.limit);
    const report = await this.buildReport();
    const result = await HistoricalIntelligence52Service.dryRunLegacy({
      operator: input.operator,
      limit,
    });
    return { ...result, ok: true, campaign: report.campaign, hi53: report };
  }

  static async dryRunExtraction(input: { operator: string; limit?: number }) {
    const limit = clampLimit(input.limit);
    const report = await this.buildReport();
    const result = await HistoricalIntelligence52Service.dryRunExtraction({
      operator: input.operator,
      limit,
    });
    return { ...result, ok: true, campaign: report.campaign, hi53: report };
  }

  static async acquireP1Batch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    if (input.dryRun) {
      return this.dryRunP1({ operator: input.operator, limit: input.limit });
    }

    const limit = clampLimit(input.limit);
    const beforeReport = await this.buildReport();
    const before = withNeverAttempted(
      beforeReport.recoverySnapshot,
      beforeReport.coverage52.neverAttempted,
    );

    const result = await HistoricalIntelligence52Service.acquireP1Batch({
      operator: input.operator,
      limit,
      dryRun: false,
    });

    const afterReport = await this.buildReport();
    const after = withNeverAttempted(
      afterReport.recoverySnapshot,
      afterReport.coverage52.neverAttempted,
    );
    const explicitDelta = buildExplicitCampaignDelta({ before, after });

    LoggerService.audit("hi53.acquire_p1", {
      operator: input.operator,
      improved: explicitDelta.improved,
      remaining: after.neverAttempted,
    });

    return {
      ...result,
      ok: true,
      message: explicitDelta.improved
        ? `P1 campaign batch — ${explicitDelta.lines.filter((l) => !l.includes("(0)")).slice(0, 4).join("; ")}`
        : "P1 campaign batch — no evidence metric improvement (zeros shown in delta)",
      explicitDelta,
      campaign: afterReport.campaign,
      hi53: afterReport,
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

    const limit = clampLimit(input.limit);
    const beforeReport = await this.buildReport();
    const before = withNeverAttempted(
      beforeReport.recoverySnapshot,
      beforeReport.coverage52.neverAttempted,
    );
    const result = await HistoricalIntelligence52Service.retryLegacyFailuresBatch({
      operator: input.operator,
      limit,
      dryRun: false,
    });
    const afterReport = await this.buildReport();
    const after = withNeverAttempted(
      afterReport.recoverySnapshot,
      afterReport.coverage52.neverAttempted,
    );
    const explicitDelta = buildExplicitCampaignDelta({ before, after });

    return {
      ...result,
      ok: true,
      explicitDelta,
      campaign: afterReport.campaign,
      hi53: afterReport,
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

    const limit = clampLimit(input.limit);
    const beforeReport = await this.buildReport();
    const before = withNeverAttempted(
      beforeReport.recoverySnapshot,
      beforeReport.coverage52.neverAttempted,
    );
    const result = await HistoricalIntelligence52Service.extractSnapshotsBatch({
      operator: input.operator,
      limit,
      dryRun: false,
    });
    const afterReport = await this.buildReport();
    const after = withNeverAttempted(
      afterReport.recoverySnapshot,
      afterReport.coverage52.neverAttempted,
    );
    const explicitDelta = buildExplicitCampaignDelta({ before, after });

    return {
      ...result,
      ok: true,
      explicitDelta,
      campaign: afterReport.campaign,
      hi53: afterReport,
    };
  }

  static async resolveEvidence(input: { operator: string; limit?: number }) {
    const result = await HistoricalIntelligence52Service.resolveEvidence({
      ...input,
      limit: clampLimit(input.limit),
    });
    const hi53 = await this.buildReport();
    return { ...result, ok: true, hi53, campaign: hi53.campaign };
  }

  static async runQualityAudit(input: { operator: string }) {
    const result = await HistoricalIntelligence52Service.runQualityAudit(input);
    const hi53 = await this.buildReport();
    return { ...result, ok: true, hi53, campaign: hi53.campaign };
  }

  static async rebuildIntelligence(operator: string) {
    const before = await this.buildReport();
    if (!before.catalogueSafe) {
      return {
        ok: false,
        blocked: true,
        message: "PUBLIC SAFETY FAILURE — BLOCK REBUILD",
        catalogueLeaks: before.coverage52.catalogueLeaks,
        hi53: before,
      };
    }

    const result = await HistoricalIntelligence52Service.rebuildIntelligence(operator);
    const after = await this.buildReport();

    if (!after.catalogueSafe) {
      return {
        ok: false,
        blocked: true,
        message: "PUBLIC SAFETY FAILURE — catalogue leaks detected after rebuild",
        catalogueLeaks: after.coverage52.catalogueLeaks,
        result,
        hi53: after,
      };
    }

    return { ...result, ok: true, hi53: after, campaign: after.campaign };
  }
}
