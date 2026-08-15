import "server-only";

import {
  buildHi51Report,
  buildLegacyDryRunCandidates,
  computeRecoveryDelta,
  filterLegacyFailureCandidates,
  selectP1AcquireTargets,
  HI51_DEFAULT_BATCH_LIMIT,
  HI51_MAX_BATCH_LIMIT,
} from "@/lib/intelligence/historicalIntelligence51";
import { HistoricalEnrichmentRepository } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { HistoricalSourceCoverage48Service } from "./HistoricalSourceCoverage48Service";
import { HistoricalEvidenceAcquisition43Service } from "./HistoricalEvidenceAcquisition43Service";
import { HistoricalIntelligence50Service } from "./HistoricalIntelligence50Service";
import { HistoricalEnrichmentService } from "./HistoricalEnrichmentService";
import { LoggerService } from "@/lib/logger";

export class HistoricalIntelligence51Service {
  static async buildReport() {
    const hscReport = await HistoricalSourceCoverage48Service.buildDiagnosticReport();
    const enrichmentRuns = await HistoricalEnrichmentRepository.listRecentRuns(500);
    return buildHi51Report({ hscReport, enrichmentRuns });
  }

  static async adminDashboard() {
    const report = await this.buildReport();
    return { ok: true, ...report };
  }

  static async dryRunP1(input: { operator: string; limit?: number }) {
    const limit = Math.min(input.limit ?? HI51_DEFAULT_BATCH_LIMIT, HI51_MAX_BATCH_LIMIT);
    const report = await this.buildReport();
    const hscReport = await HistoricalSourceCoverage48Service.buildDiagnosticReport();
    const listingPropertyIdByObservation = new Map(
      hscReport.events.map((e) => [e.observationId, e.listingPropertyId] as const),
    );
    const { selected, skipped } = selectP1AcquireTargets({
      events: report.events,
      limit,
      listingPropertyIdByObservation,
    });
    const enrichedCandidates = selected.map((e) => {
      const event = hscReport.events.find((ev) => ev.observationId === e.observationId);
      return {
        eventId: event?.auctionEventId ?? e.auctionEventId,
        observationId: e.observationId,
        propertyMasterId: event?.propertyMasterId ?? null,
        listingPropertyId: event?.listingPropertyId ?? null,
        propertyLabel: e.propertyLabel,
        town: e.town,
        agency: e.agency,
        source: event?.source.sourceName ?? event?.source.sourceStatus ?? e.sourceStatus,
        sourceUrl: event?.source.sourceUrl ?? e.sourceUrl,
        priority: e.recoveryPriority,
        currentState: e.evidenceState,
        lastAttempt: e.lastAttempt,
        whyEligible: "Licensed source — fetch not attempted (P1 eligible)",
        expectedAction: "Acquire — first licensed source fetch",
      };
    });

    return {
      ok: true,
      dryRun: true,
      writes: false,
      message: "NO PRODUCTION WRITE — DRY RUN — NOTHING WRITTEN",
      candidates: enrichedCandidates,
      skipped,
      counters: {
        candidates: enrichedCandidates.length,
        wouldAttempt: enrichedCandidates.length,
        wouldRetry: 0,
        wouldSkip: skipped.length,
      },
      p1Progress: report.p1Progress,
      before: report.recoverySnapshot,
    };
  }

  static async dryRunLegacyFailures(input: { operator: string; limit?: number }) {
    const limit = Math.min(input.limit ?? HI51_DEFAULT_BATCH_LIMIT, HI51_MAX_BATCH_LIMIT);
    const report = await this.buildReport();
    const hscReport = await HistoricalSourceCoverage48Service.buildDiagnosticReport();
    const candidates = buildLegacyDryRunCandidates(report.events, limit).map((c) => {
      const event = hscReport.events.find((e) => e.observationId === c.observationId);
      return {
        ...c,
        eventId: event?.auctionEventId ?? c.eventId,
        propertyMasterId: event?.propertyMasterId ?? null,
        httpStatus: event?.fetch?.httpStatus ?? null,
        failureClassification: "LEGACY_UNKNOWN_FAILURE",
      };
    });

    return {
      ok: true,
      dryRun: true,
      message: "DRY RUN — legacy failure retry preview only",
      candidates,
      legacyRecoveryCandidates: report.legacyRecoveryCandidates,
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

    const limit = Math.min(input.limit ?? HI51_DEFAULT_BATCH_LIMIT, HI51_MAX_BATCH_LIMIT);
    const beforeReport = await this.buildReport();
    const before = beforeReport.recoverySnapshot;
    const hscReport = await HistoricalSourceCoverage48Service.buildDiagnosticReport();
    const listingPropertyIdByObservation = new Map(
      hscReport.events.map((e) => [e.observationId, e.listingPropertyId] as const),
    );

    // Same selection as Dry Run P1 — never-attempted licensed sources via HEA acquireOne.
    // Do NOT use HEA priority-1 exact-URL queue (often already fetched → NO_CHANGE / no gain).
    const { selected, skipped } = selectP1AcquireTargets({
      events: beforeReport.events,
      limit,
      listingPropertyIdByObservation,
    });

    const runId = `hi51_p1_${Date.now().toString(36)}`;
    const results = [];
    for (const row of selected) {
      const hscEvent = hscReport.events.find((e) => e.observationId === row.observationId);
      const propertyId = hscEvent?.listingPropertyId;
      if (!propertyId) continue;
      results.push(
        await HistoricalEvidenceAcquisition43Service.acquireOne({
          propertyId,
          force: false,
          dryRun: false,
          operator: input.operator,
          runId,
        }),
      );
    }

    const rebuild = await HistoricalSourceCoverage48Service.rebuildIntelligence(input.operator);
    const afterReport = await this.buildReport();
    const after = afterReport.recoverySnapshot;
    const delta = computeRecoveryDelta(before, after);

    LoggerService.audit("hi51.acquire_p1", {
      operator: input.operator,
      processed: results.length,
      skipped: skipped.length,
      runId,
      improved: delta.improved,
      target: "P1_NEVER_ATTEMPTED",
    });

    return {
      ok: true,
      dryRun: false,
      message: delta.improved
        ? `P1 batch complete — ${delta.lines.join(", ")}`
        : "P1 batch complete — NO EVIDENCE GAIN",
      runId,
      processed: results.length,
      skipped,
      results,
      acquisition: {
        processed: results.length,
        runId,
        results,
      },
      rebuild,
      beforeAfter: { before, after, delta },
      hi51: afterReport,
    };
  }

  static async retryLegacyFailuresBatch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    const limit = Math.min(input.limit ?? HI51_DEFAULT_BATCH_LIMIT, HI51_MAX_BATCH_LIMIT);

    if (input.dryRun) {
      return this.dryRunLegacyFailures({ operator: input.operator, limit });
    }

    const beforeReport = await this.buildReport();
    const before = beforeReport.recoverySnapshot;
    const hscReport = await HistoricalSourceCoverage48Service.buildDiagnosticReport();
    const legacyEvents = filterLegacyFailureCandidates(beforeReport.events);
    const selected = legacyEvents.slice(0, limit);

    const runId = `hi51_legacy_${Date.now().toString(36)}`;
    const results = [];
    for (const row of selected) {
      const hscEvent = hscReport.events.find((e) => e.observationId === row.observationId);
      if (!hscEvent?.listingPropertyId) continue;
      results.push(
        await HistoricalEvidenceAcquisition43Service.acquireOne({
          propertyId: hscEvent.listingPropertyId,
          force: true,
          dryRun: false,
          operator: input.operator,
          runId,
        }),
      );
    }

    const rebuild = await HistoricalSourceCoverage48Service.rebuildIntelligence(input.operator);
    const afterReport = await this.buildReport();
    const after = afterReport.recoverySnapshot;
    const delta = computeRecoveryDelta(before, after);

    LoggerService.audit("hi51.retry_legacy", {
      operator: input.operator,
      processed: results.length,
      runId,
    });

    return {
      ok: true,
      dryRun: false,
      message: delta.improved
        ? `Legacy retry batch (${results.length}) — ${delta.lines.join(", ")}`
        : `Legacy retry batch (${results.length}) — no evidence metric change`,
      runId,
      processed: results.length,
      results,
      rebuild,
      beforeAfter: { before, after, delta },
      hi51: afterReport,
    };
  }

  static async extractSnapshotsBatch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    const beforeReport = await this.buildReport();
    const before = beforeReport.recoverySnapshot;
    const result = await HistoricalIntelligence50Service.extractSnapshotsBatch({
      ...input,
      limit: input.limit ?? HI51_DEFAULT_BATCH_LIMIT,
    });
    const afterReport = await this.buildReport();
    const after = afterReport.recoverySnapshot;
    const delta = computeRecoveryDelta(before, after);
    return {
      ...result,
      beforeAfter: { before, after, delta },
      hi51: afterReport,
    };
  }

  static async retryFailedBatch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    const beforeReport = await this.buildReport();
    const before = beforeReport.recoverySnapshot;
    const result = await HistoricalIntelligence50Service.retryFailedBatch(input);
    const afterReport = await this.buildReport();
    const after = afterReport.recoverySnapshot;
    return {
      ...result,
      beforeAfter: { before, after, delta: computeRecoveryDelta(before, after) },
      hi51: afterReport,
    };
  }

  static async retryNetworkFailuresBatch(input: {
    operator: string;
    limit?: number;
    dryRun?: boolean;
  }) {
    const beforeReport = await this.buildReport();
    const before = beforeReport.recoverySnapshot;
    const result = await HistoricalIntelligence50Service.retryNetworkFailuresBatch(input);
    const afterReport = await this.buildReport();
    const after = afterReport.recoverySnapshot;
    return {
      ...result,
      beforeAfter: { before, after, delta: computeRecoveryDelta(before, after) },
      hi51: afterReport,
    };
  }

  static async resolveEvidence(input: { operator: string; limit?: number }) {
    const beforeReport = await this.buildReport();
    const before = beforeReport.recoverySnapshot;
    const result = await HistoricalIntelligence50Service.resolveEvidence(input);
    const afterReport = await this.buildReport();
    const after = afterReport.recoverySnapshot;
    return {
      ...result,
      beforeAfter: { before, after, delta: computeRecoveryDelta(before, after) },
      hi51: afterReport,
    };
  }

  static async runQualityAudit(input: { operator: string }) {
    const beforeReport = await this.buildReport();
    const before = beforeReport.recoverySnapshot;
    const result = await HistoricalIntelligence50Service.runQualityAudit(input);
    const afterReport = await this.buildReport();
    const after = afterReport.recoverySnapshot;
    return {
      ...result,
      beforeAfter: { before, after, delta: computeRecoveryDelta(before, after) },
      hi51: afterReport,
    };
  }

  static async rebuildIntelligence(operator: string) {
    const beforeReport = await this.buildReport();
    const before = beforeReport.recoverySnapshot;
    const result = await HistoricalIntelligence50Service.rebuildIntelligence(operator);
    const afterReport = await this.buildReport();
    const after = afterReport.recoverySnapshot;
    return {
      ...result,
      beforeAfter: { before, after, delta: computeRecoveryDelta(before, after) },
      hi51: afterReport,
    };
  }
}
