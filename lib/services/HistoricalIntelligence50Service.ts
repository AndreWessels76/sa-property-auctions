import "server-only";

import {
  buildHi50Report,
  filterSnapshotExtractionCandidates,
  formatDeltaLines,
  HI50_DEFAULT_BATCH_LIMIT,
  HI50_MAX_BATCH_LIMIT,
  HISTORICAL_INTELLIGENCE50_VERSION,
  snapshotMetrics,
} from "@/lib/intelligence/historicalIntelligence50";
import { HistoricalEnrichmentRepository } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { HistoricalSourceCoverage48Service } from "./HistoricalSourceCoverage48Service";
import { HistoricalEnrichmentService } from "./HistoricalEnrichmentService";
import { HistoricalIntelligence42Service } from "./HistoricalIntelligence42Service";
import { HistoricalEvidenceQuality44Service } from "./HistoricalEvidenceQuality44Service";
import { LoggerService } from "@/lib/logger";

export class HistoricalIntelligence50Service {
  static async buildReport() {
    const hscReport = await HistoricalSourceCoverage48Service.buildDiagnosticReport();
    const enrichmentRuns = await HistoricalEnrichmentRepository.listRecentRuns(500);
    return buildHi50Report({ hscReport, enrichmentRuns });
  }

  static async adminDashboard() {
    const report = await this.buildReport();
    return {
      ok: true,
      ...report,
    };
  }

  static async dryRunP1(input: { operator: string; limit?: number }) {
    return HistoricalSourceCoverage48Service.dryRunP1(input);
  }

  static async acquireP1Batch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    const beforeReport = await this.buildReport();
    const before = snapshotMetrics(
      beforeReport.metrics,
      beforeReport.coverage.outcomeEvidence,
    );

    const result = await HistoricalSourceCoverage48Service.acquireP1Batch({
      dryRun: input.dryRun ?? false,
      operator: input.operator,
      limit: input.limit,
    });

    const afterReport = await this.buildReport();
    const after = snapshotMetrics(
      afterReport.metrics,
      afterReport.coverage.outcomeEvidence,
    );

    return {
      ...result,
      beforeAfter: {
        before,
        after,
        deltaLines: formatDeltaLines(before, after),
      },
      hi50: afterReport,
    };
  }

  static async retryFailedBatch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    const beforeReport = await this.buildReport();
    const before = snapshotMetrics(
      beforeReport.metrics,
      beforeReport.coverage.outcomeEvidence,
    );
    const result = await HistoricalSourceCoverage48Service.retryFailedBatch(input);
    const afterReport = await this.buildReport();
    const after = snapshotMetrics(
      afterReport.metrics,
      afterReport.coverage.outcomeEvidence,
    );
    return {
      ...result,
      beforeAfter: {
        before,
        after,
        deltaLines: formatDeltaLines(before, after),
      },
      hi50: afterReport,
    };
  }

  static async retryNetworkFailuresBatch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    const beforeReport = await this.buildReport();
    const before = snapshotMetrics(
      beforeReport.metrics,
      beforeReport.coverage.outcomeEvidence,
    );
    const result =
      await HistoricalSourceCoverage48Service.retryNetworkFailuresBatch(input);
    const afterReport = await this.buildReport();
    const after = snapshotMetrics(
      afterReport.metrics,
      afterReport.coverage.outcomeEvidence,
    );
    return {
      ...result,
      beforeAfter: {
        before,
        after,
        deltaLines: formatDeltaLines(before, after),
      },
      hi50: afterReport,
    };
  }

  static async extractSnapshotsBatch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    const limit = Math.min(
      input.limit ?? HI50_DEFAULT_BATCH_LIMIT,
      HI50_MAX_BATCH_LIMIT,
    );
    const beforeReport = await this.buildReport();
    const before = snapshotMetrics(
      beforeReport.metrics,
      beforeReport.coverage.outcomeEvidence,
    );
    const hscReport = await HistoricalSourceCoverage48Service.buildDiagnosticReport();
    const extractionCandidates = filterSnapshotExtractionCandidates(
      hscReport.events,
    ).slice(0, limit);

    if (input.dryRun) {
      return {
        ok: true,
        dryRun: true,
        message: "DRY RUN — extract existing snapshots only",
        candidates: extractionCandidates.length,
        events: extractionCandidates.map((e) => ({
          propertyId: e.listingPropertyId,
          propertyLabel: e.propertyLabel,
          snapshotId: e.snapshot.snapshotId,
        })),
        before,
      };
    }

    const runId = `hi50_extract_${Date.now().toString(36)}`;
    const results = [];
    for (const event of extractionCandidates) {
      if (!event.listingPropertyId) continue;
      const enriched = await HistoricalEnrichmentService.enrichProperty({
        propertyId: event.listingPropertyId,
        mode: "snapshot",
        operator: input.operator,
        runId,
      });
      results.push({
        propertyId: event.listingPropertyId,
        ok: enriched.ok,
        status: enriched.status,
        outcome: enriched.outcome,
        salePrice: enriched.salePrice,
      });
    }

    const rebuild = await HistoricalSourceCoverage48Service.rebuildIntelligence(
      input.operator,
    );
    const afterReport = await this.buildReport();
    const after = snapshotMetrics(
      afterReport.metrics,
      afterReport.coverage.outcomeEvidence,
    );

    LoggerService.audit("hi50.extract_snapshots", {
      operator: input.operator,
      processed: results.length,
      runId,
    });

    return {
      ok: true,
      dryRun: false,
      message: `Snapshot extraction batch (${results.length}) complete`,
      runId,
      processed: results.length,
      results,
      rebuild,
      beforeAfter: {
        before,
        after,
        deltaLines: formatDeltaLines(before, after),
      },
      hi50: afterReport,
    };
  }

  static async resolveEvidence(input: { operator: string; limit?: number }) {
    const limit = Math.min(
      input.limit ?? HI50_DEFAULT_BATCH_LIMIT,
      HI50_MAX_BATCH_LIMIT,
    );
    const beforeReport = await this.buildReport();
    const before = snapshotMetrics(
      beforeReport.metrics,
      beforeReport.coverage.outcomeEvidence,
    );
    const resolution = await HistoricalIntelligence42Service.resolveBatch({
      operator: input.operator,
      limit,
    });
    const rebuild = await HistoricalSourceCoverage48Service.rebuildIntelligence(
      input.operator,
    );
    const afterReport = await this.buildReport();
    const after = snapshotMetrics(
      afterReport.metrics,
      afterReport.coverage.outcomeEvidence,
    );
    return {
      ok: true,
      message: "HI 4.2 resolution batch complete",
      resolution,
      rebuild,
      beforeAfter: {
        before,
        after,
        deltaLines: formatDeltaLines(before, after),
      },
      hi50: afterReport,
    };
  }

  static async runQualityAudit(input: { operator: string }) {
    const beforeReport = await this.buildReport();
    const before = snapshotMetrics(
      beforeReport.metrics,
      beforeReport.coverage.outcomeEvidence,
    );
    const audit = await HistoricalEvidenceQuality44Service.runQualityAudit(
      input.operator,
    );
    const afterReport = await this.buildReport();
    const after = snapshotMetrics(
      afterReport.metrics,
      afterReport.coverage.outcomeEvidence,
    );
    return {
      ok: true,
      message: "HEQ 4.4 quality audit complete",
      audit,
      beforeAfter: {
        before,
        after,
        deltaLines: formatDeltaLines(before, after),
      },
      hi50: afterReport,
    };
  }

  static async rebuildIntelligence(operator: string) {
    const beforeReport = await this.buildReport();
    const before = snapshotMetrics(
      beforeReport.metrics,
      beforeReport.coverage.outcomeEvidence,
    );
    const rebuild = await HistoricalSourceCoverage48Service.rebuildIntelligence(
      operator,
    );
    const afterReport = await this.buildReport();
    const after = snapshotMetrics(
      afterReport.metrics,
      afterReport.coverage.outcomeEvidence,
    );
    return {
      ok: true,
      rebuild,
      beforeAfter: {
        before,
        after,
        deltaLines: formatDeltaLines(before, after),
      },
      hi50: afterReport,
    };
  }
}
