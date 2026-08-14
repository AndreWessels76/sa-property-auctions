import "server-only";

import {
  buildHi54Report,
  buildExplicitCampaignDelta54,
  withNeverAttempted54,
  formatAcquireBeforeAfter,
  catalogueLeakCheck,
  clampHi54BatchLimit,
  HISTORICAL_INTELLIGENCE54_VERSION,
} from "@/lib/intelligence/historicalIntelligence54";
import { HistoricalIntelligence53Service } from "./HistoricalIntelligence53Service";
import { HistoricalIntelligence51Service } from "./HistoricalIntelligence51Service";
import { LoggerService } from "@/lib/logger";

export class HistoricalIntelligence54Service {
  static async buildReport() {
    const hi53 = await HistoricalIntelligence53Service.buildReport();
    return buildHi54Report(hi53);
  }

  static async adminDashboard() {
    const report = await this.buildReport();
    return { ok: true as const, ...report };
  }

  static async dryRunP1(input: { operator: string; limit?: number }) {
    const limit = clampHi54BatchLimit(input.limit);
    const report = await this.buildReport();
    const result = await HistoricalIntelligence53Service.dryRunP1({
      operator: input.operator,
      limit,
    });
    return {
      ...result,
      ok: true,
      version: HISTORICAL_INTELLIGENCE54_VERSION,
      campaign54: report.campaign54,
      p1Progress54: report.p1Progress54,
      bottleneck54: report.bottleneck54,
      hi54: report,
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

    const limit = clampHi54BatchLimit(input.limit);
    const beforeReport = await this.buildReport();
    const before = withNeverAttempted54(
      beforeReport.recoverySnapshot,
      beforeReport.coverage52.neverAttempted,
    );

    const result = await HistoricalIntelligence53Service.acquireP1Batch({
      operator: input.operator,
      limit,
      dryRun: false,
    });

    const afterReport = await this.buildReport();
    const after = withNeverAttempted54(
      afterReport.recoverySnapshot,
      afterReport.coverage52.neverAttempted,
    );
    const explicitDelta = buildExplicitCampaignDelta54({ before, after });
    const beforeAfterDisplay = formatAcquireBeforeAfter({
      candidates: limit,
      before,
      after,
    });

    LoggerService.audit("hi54.acquire_p1", {
      operator: input.operator,
      improved: explicitDelta.improved,
      remaining: after.neverAttempted,
    });

    return {
      ...result,
      ok: true,
      message: explicitDelta.improved
        ? `Acquire P1 (${limit}) — evidence metrics improved`
        : `Acquire P1 (${limit}) — no evidence metric improvement (zeros shown in delta)`,
      explicitDelta,
      beforeAfterDisplay,
      campaign54: afterReport.campaign54,
      p1Progress54: afterReport.p1Progress54,
      bottleneck54: afterReport.bottleneck54,
      hi54: afterReport,
    };
  }

  static async retryFailedBatch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    const limit = clampHi54BatchLimit(input.limit);
    const beforeReport = await this.buildReport();
    const before = withNeverAttempted54(
      beforeReport.recoverySnapshot,
      beforeReport.coverage52.neverAttempted,
    );

    const result = await HistoricalIntelligence51Service.retryFailedBatch({
      operator: input.operator,
      limit,
      dryRun: input.dryRun,
    });

    const afterReport = await this.buildReport();
    const after = withNeverAttempted54(
      afterReport.recoverySnapshot,
      afterReport.coverage52.neverAttempted,
    );
    const explicitDelta = buildExplicitCampaignDelta54({ before, after });

    return {
      ...result,
      ok: true,
      explicitDelta,
      campaign54: afterReport.campaign54,
      hi54: afterReport,
    };
  }

  static async retryNetworkFailuresBatch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    const limit = clampHi54BatchLimit(input.limit);
    const beforeReport = await this.buildReport();
    const before = withNeverAttempted54(
      beforeReport.recoverySnapshot,
      beforeReport.coverage52.neverAttempted,
    );

    const result = await HistoricalIntelligence51Service.retryNetworkFailuresBatch({
      operator: input.operator,
      limit,
      dryRun: input.dryRun,
    });

    const afterReport = await this.buildReport();
    const after = withNeverAttempted54(
      afterReport.recoverySnapshot,
      afterReport.coverage52.neverAttempted,
    );
    const explicitDelta = buildExplicitCampaignDelta54({ before, after });

    return {
      ...result,
      ok: true,
      explicitDelta,
      campaign54: afterReport.campaign54,
      hi54: afterReport,
    };
  }

  static async extractSnapshotsBatch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    if (input.dryRun) {
      const report = await this.buildReport();
      const result = await HistoricalIntelligence53Service.dryRunExtraction({
        operator: input.operator,
        limit: clampHi54BatchLimit(input.limit),
      });
      return { ...result, ok: true, campaign54: report.campaign54, hi54: report };
    }

    const limit = clampHi54BatchLimit(input.limit);
    const beforeReport = await this.buildReport();
    const before = withNeverAttempted54(
      beforeReport.recoverySnapshot,
      beforeReport.coverage52.neverAttempted,
    );
    const result = await HistoricalIntelligence53Service.extractSnapshotsBatch({
      operator: input.operator,
      limit,
      dryRun: false,
    });
    const afterReport = await this.buildReport();
    const after = withNeverAttempted54(
      afterReport.recoverySnapshot,
      afterReport.coverage52.neverAttempted,
    );
    const explicitDelta = buildExplicitCampaignDelta54({ before, after });

    return {
      ...result,
      ok: true,
      explicitDelta,
      campaign54: afterReport.campaign54,
      hi54: afterReport,
    };
  }

  static async resolveEvidence(input: { operator: string; limit?: number }) {
    const beforeReport = await this.buildReport();
    const before = withNeverAttempted54(
      beforeReport.recoverySnapshot,
      beforeReport.coverage52.neverAttempted,
    );
    const result = await HistoricalIntelligence53Service.resolveEvidence({
      operator: input.operator,
      limit: clampHi54BatchLimit(input.limit),
    });
    const afterReport = await this.buildReport();
    const after = withNeverAttempted54(
      afterReport.recoverySnapshot,
      afterReport.coverage52.neverAttempted,
    );
    const explicitDelta = buildExplicitCampaignDelta54({ before, after });
    return {
      ...result,
      ok: true,
      explicitDelta,
      campaign54: afterReport.campaign54,
      hi54: afterReport,
    };
  }

  static async runQualityAudit(input: { operator: string }) {
    const result = await HistoricalIntelligence53Service.runQualityAudit(input);
    const hi54 = await this.buildReport();
    return { ...result, ok: true, hi54, campaign54: hi54.campaign54 };
  }

  static async rebuildIntelligence(operator: string) {
    const before = await this.buildReport();
    const leakCheck = catalogueLeakCheck(before.safety.catalogueLeaks);
    if (!leakCheck.ok) {
      return {
        ok: false,
        blocked: true,
        rebuildStatus: "REBUILD_BLOCKED" as const,
        message: "REBUILD_BLOCKED — catalogue leaks detected",
        catalogueLeaks: before.safety.catalogueLeaks,
        hi54: before,
      };
    }

    const result = await HistoricalIntelligence53Service.rebuildIntelligence(operator);
    const after = await this.buildReport();

    if (after.safety.catalogueLeaks > 0) {
      return {
        ok: false,
        blocked: true,
        rebuildStatus: "REBUILD_BLOCKED" as const,
        message: "REBUILD_BLOCKED — catalogue leaks after rebuild",
        catalogueLeaks: after.safety.catalogueLeaks,
        result,
        hi54: after,
      };
    }

    return {
      ...result,
      ok: true,
      rebuildStatus: "ALLOWED" as const,
      hi54: after,
      campaign54: after.campaign54,
    };
  }
}
