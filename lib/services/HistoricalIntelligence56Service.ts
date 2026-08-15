import "server-only";

import {
  buildHi56Report,
  clampHi56BatchLimit,
  catalogueLeakCheck,
  buildEvidenceDelta56,
  metricBagFromCoverage,
  buildP1Candidates56,
  buildLegacyCandidates56,
  HISTORICAL_INTELLIGENCE56_VERSION,
} from "@/lib/intelligence/historicalIntelligence56";
import { parseLeadingInt } from "@/lib/intelligence/historicalIntelligence54";
import { HistoricalIntelligence55Service } from "./HistoricalIntelligence55Service";
import { HistoricalIntelligence53Service } from "./HistoricalIntelligence53Service";
import { LoggerService } from "@/lib/logger";

function coverageBag(report: {
  coverage52: {
    neverAttempted: number;
    fetchSuccessful: number;
    fetchFailed: number;
    snapshots: string | number;
    extractions: string | number;
    outcomeEvidence: string | number;
    verifiedSold: number;
    verifiedSalePrices: number;
    comparableReady: number;
    marketReadyTowns: number;
    catalogueLeaks: number;
  };
  metrics: {
    fetchAttempted: number;
    snapshots: number;
    extractionAttempted: number;
  };
  coverage: { outcomeEvidence: number };
}) {
  const cov = report.coverage52;
  return metricBagFromCoverage({
    neverAttempted: cov.neverAttempted,
    fetchAttempted: report.metrics.fetchAttempted,
    fetchSuccessful: cov.fetchSuccessful,
    fetchFailed: cov.fetchFailed,
    snapshots: parseLeadingInt(cov.snapshots, report.metrics.snapshots),
    extractions: parseLeadingInt(cov.extractions, report.metrics.extractionAttempted),
    outcomeEvidence: parseLeadingInt(cov.outcomeEvidence, report.coverage.outcomeEvidence),
    verifiedSold: cov.verifiedSold,
    verifiedSalePrices: cov.verifiedSalePrices,
    comparableReady: cov.comparableReady,
    marketReadyTowns: cov.marketReadyTowns,
    catalogueLeaks: cov.catalogueLeaks,
  });
}

export class HistoricalIntelligence56Service {
  static async buildReport() {
    const hi55 = await HistoricalIntelligence55Service.buildReport();
    return buildHi56Report(hi55);
  }

  static async adminDashboard() {
    const report = await this.buildReport();
    return { ok: true as const, ...report };
  }

  static async dryRunP1(input: { operator: string; limit?: number }) {
    const limit = clampHi56BatchLimit(input.limit);
    const report = await this.buildReport();
    const candidates = buildP1Candidates56(report.events, limit);
    const result = await HistoricalIntelligence55Service.dryRunP1({
      operator: input.operator,
      limit,
    });
    return {
      ...result,
      ok: true,
      dryRun: true,
      writes: false,
      message: "NO PRODUCTION WRITE — DRY RUN — NOTHING WRITTEN",
      version: HISTORICAL_INTELLIGENCE56_VERSION,
      candidates56: candidates,
      campaign56: report.campaign56,
      p1Progress56: report.p1Progress56,
      bottleneck56: report.bottleneck56,
      nextCandidates56: report.nextCandidates56,
      hi56: report,
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

    const limit = clampHi56BatchLimit(input.limit);
    const beforeReport = await this.buildReport();
    const before = coverageBag(beforeReport);

    const result = await HistoricalIntelligence55Service.acquireP1Batch({
      operator: input.operator,
      limit,
      dryRun: false,
    });

    const afterReport = await this.buildReport();
    const after = coverageBag(afterReport);
    const evidenceDelta = buildEvidenceDelta56({ before, after, candidates: limit });

    LoggerService.audit("hi56.acquire_p1", {
      operator: input.operator,
      limit,
      evidenceGain: evidenceDelta.evidenceGain,
      bottleneck: afterReport.bottleneck56.code,
    });

    return {
      ...result,
      ok: true,
      message: evidenceDelta.message,
      evidenceDelta,
      explicitDelta: { lines: evidenceDelta.lines, improved: evidenceDelta.improved },
      campaign56: afterReport.campaign56,
      p1Progress56: afterReport.p1Progress56,
      bottleneck56: afterReport.bottleneck56,
      nextCandidates56: afterReport.nextCandidates56,
      hi56: afterReport,
    };
  }

  static async dryRunLegacy(input: { operator: string; limit?: number }) {
    const limit = clampHi56BatchLimit(input.limit);
    const report = await this.buildReport();
    const candidates = buildLegacyCandidates56(report.events, limit);
    const result = await HistoricalIntelligence53Service.dryRunLegacy({
      operator: input.operator,
      limit,
    });
    return {
      ...result,
      ok: true,
      writes: false,
      version: HISTORICAL_INTELLIGENCE56_VERSION,
      candidates56: candidates,
      campaign56: report.campaign56,
      bottleneck56: report.bottleneck56,
      recoveryLanes55: report.recoveryLanes55,
      hi56: report,
    };
  }

  static async retryLegacyFailures(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    if (input.dryRun) {
      return this.dryRunLegacy({ operator: input.operator, limit: input.limit });
    }

    const limit = clampHi56BatchLimit(input.limit);
    const beforeReport = await this.buildReport();
    const before = coverageBag(beforeReport);

    const result = await HistoricalIntelligence55Service.retryLegacyFailures({
      operator: input.operator,
      limit,
      dryRun: false,
    });

    const afterReport = await this.buildReport();
    const after = coverageBag(afterReport);
    const evidenceDelta = buildEvidenceDelta56({ before, after, candidates: limit });

    LoggerService.audit("hi56.retry_legacy", {
      operator: input.operator,
      limit,
      evidenceGain: evidenceDelta.evidenceGain,
    });

    return {
      ...result,
      ok: true,
      message: evidenceDelta.message,
      evidenceDelta,
      explicitDelta: { lines: evidenceDelta.lines, improved: evidenceDelta.improved },
      campaign56: afterReport.campaign56,
      bottleneck56: afterReport.bottleneck56,
      hi56: afterReport,
    };
  }

  static async extractSnapshotsBatch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    const limit = clampHi56BatchLimit(input.limit);
    const beforeReport = await this.buildReport();
    const before = coverageBag(beforeReport);

    const result = await HistoricalIntelligence55Service.extractSnapshotsBatch({
      operator: input.operator,
      limit,
      dryRun: input.dryRun,
    });

    const afterReport = await this.buildReport();
    const after = coverageBag(afterReport);
    const evidenceDelta = input.dryRun
      ? null
      : buildEvidenceDelta56({ before, after, candidates: limit });

    return {
      ...result,
      ok: true,
      writes: input.dryRun ? false : true,
      message: evidenceDelta?.message ?? "Dry run extraction — no writes",
      evidenceDelta,
      campaign56: afterReport.campaign56,
      bottleneck56: afterReport.bottleneck56,
      hi56: afterReport,
    };
  }

  static async resolveEvidence(input: { operator: string; limit?: number }) {
    const result = await HistoricalIntelligence55Service.resolveEvidence({
      operator: input.operator,
      limit: clampHi56BatchLimit(input.limit),
    });
    const hi56 = await this.buildReport();
    return { ...result, ok: true, campaign56: hi56.campaign56, bottleneck56: hi56.bottleneck56, hi56 };
  }

  static async runQualityAudit(input: { operator: string; limit?: number }) {
    const result = await HistoricalIntelligence55Service.runQualityAudit({
      operator: input.operator,
      limit: clampHi56BatchLimit(input.limit),
    });
    const hi56 = await this.buildReport();
    return { ...result, ok: true, campaign56: hi56.campaign56, bottleneck56: hi56.bottleneck56, hi56 };
  }

  static async rebuildIntelligence(operator: string) {
    const before = await this.buildReport();
    const leakCheck = catalogueLeakCheck(before.safety56.catalogueLeaks);
    if (!leakCheck.ok) {
      return {
        ok: false,
        blocked: true,
        rebuildStatus: "REBUILD_BLOCKED" as const,
        message: "PUBLIC_CATALOGUE_SAFETY_BLOCKED — rebuild blocked",
        catalogueLeaks: before.safety56.catalogueLeaks,
        hi56: before,
      };
    }

    const result = await HistoricalIntelligence55Service.rebuildIntelligence(operator);
    const after = await this.buildReport();

    if (after.safety56.catalogueLeaks > 0) {
      return {
        ok: false,
        blocked: true,
        rebuildStatus: "REBUILD_BLOCKED" as const,
        message: "PUBLIC_CATALOGUE_SAFETY_BLOCKED — catalogue leaks after rebuild",
        catalogueLeaks: after.safety56.catalogueLeaks,
        result,
        hi56: after,
      };
    }

    return {
      ...result,
      ok: true,
      rebuildStatus: "ALLOWED" as const,
      hi56: after,
      campaign56: after.campaign56,
      bottleneck56: after.bottleneck56,
    };
  }
}
