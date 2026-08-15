import type { Hi54IntelligenceReport } from "@/lib/intelligence/historicalIntelligence54";
import { catalogueLeakCheck as catalogueLeakCheck54 } from "@/lib/intelligence/historicalIntelligence54";
import { filterMissingExtraction, filterP1Eligible } from "@/lib/intelligence/historicalIntelligence52";
import { HISTORICAL_INTELLIGENCE55_VERSION } from "./config";
import {
  deriveHi55CampaignStatus,
  deriveHi55Verdict,
  isDataCoverageImproving,
  isDataCoverageReady,
} from "./campaign";
import { buildP1Progress55 } from "./p1Progress";
import { buildBatchPlan55, clampHi55BatchLimit } from "./batchPlan";
import { buildRecoveryLanes55 } from "./recovery";
import { buildEvidenceFunnel55 } from "./funnel";
import { primaryBottleneck55, rankBottlenecks55 } from "./bottlenecks";
import { parseLeadingInt } from "./coverage";
import { deriveHi55EventState } from "./states";
import type { Hi55IntelligenceReport, Hi55SafetyStatus } from "./types";

export function buildHi55Report(hi54: Hi54IntelligenceReport): Hi55IntelligenceReport {
  const cov = hi54.coverage52;
  const neverAttempted = cov.neverAttempted;
  const reviewRequired = hi54.reviewQueue?.length ?? 0;
  const missingExtraction = filterMissingExtraction(hi54.events).length;
  const remainingActionable =
    filterP1Eligible(hi54.events).length +
    cov.retryable +
    missingExtraction +
    (cov.legacyFailures ?? 0);

  const status = deriveHi55CampaignStatus({
    catalogueLeaks: cov.catalogueLeaks,
    historicalEvents: cov.historicalEvents,
    neverAttempted,
    fetchAttempted: hi54.metrics.fetchAttempted,
    verifiedSalePrices: cov.verifiedSalePrices,
    verifiedSold: cov.verifiedSold,
    reviewRequired,
    remainingActionable,
  });

  const dataCoverageReady = isDataCoverageReady({
    verifiedSalePrices: cov.verifiedSalePrices,
    comparableReady: cov.comparableReady,
    marketReadyTowns: cov.marketReadyTowns,
  });

  const dataCoverageImproving = isDataCoverageImproving({
    neverAttempted,
    verifiedSalePrices: cov.verifiedSalePrices,
    comparableReady: cov.comparableReady,
    marketReadyTowns: cov.marketReadyTowns,
  });

  const { verdict, reason } = deriveHi55Verdict({
    catalogueLeaks: cov.catalogueLeaks,
    status,
    dataCoverageImproving,
    dataCoverageReady,
  });

  const p1Progress55 = buildP1Progress55({
    neverAttempted,
    fetchSuccessful: cov.fetchSuccessful,
    fetchFailed: cov.fetchFailed,
    retryable: cov.retryable,
    permanent: cov.permanent,
    reviewRequired,
  });

  const batchPlan55 = buildBatchPlan55({ remaining: neverAttempted });
  const recoveryLanes55 = buildRecoveryLanes55(hi54.events);

  const licensedSources = parseLeadingInt(cov.licensedSources);
  const snapshots = parseLeadingInt(cov.snapshots, hi54.metrics.snapshots);
  const extractions = parseLeadingInt(cov.extractions, hi54.metrics.extractionAttempted);
  const outcomeEvidence = parseLeadingInt(cov.outcomeEvidence, hi54.coverage.outcomeEvidence);

  const evidenceFunnel55 = buildEvidenceFunnel55({
    licensedSources,
    fetchAttempted: hi54.metrics.fetchAttempted,
    fetchSuccessful: cov.fetchSuccessful,
    snapshots,
    extractions,
    outcomeEvidence,
    verifiedSold: cov.verifiedSold,
    verifiedSalePrices: cov.verifiedSalePrices,
    comparableReady: cov.comparableReady,
    marketReadyTowns: cov.marketReadyTowns,
  });

  const bottleneckRanked55 = rankBottlenecks55(hi54.events);
  const bottleneck55 = primaryBottleneck55(hi54.events);

  const catalogueSafe = cov.catalogueLeaks === 0;
  const safety55: Hi55SafetyStatus = {
    catalogueLeaks: cov.catalogueLeaks,
    catalogueSafe,
    rebuildAllowed: catalogueSafe,
    rebuildStatus: catalogueSafe ? "ALLOWED" : "REBUILD_BLOCKED",
  };

  const nextAdminAction = catalogueSafe
    ? neverAttempted > 0
      ? `Dry Run P1 (5) → Acquire P1 (5) — ${neverAttempted} never-attempted remaining`
      : recoveryLanes55.legacyUnknownFailures > 0
        ? `Retry Legacy Failures (5) — ${recoveryLanes55.legacyUnknownFailures} legacy failures`
        : recoveryLanes55.snapshotExtractionPending > 0
          ? `Extract Existing Snapshots (5) — ${recoveryLanes55.snapshotExtractionPending} pending`
          : `PRIMARY BOTTLENECK ${bottleneck55.code} → ${bottleneck55.recommendedAction}`
    : "PUBLIC SAFETY FAILURE — BLOCK REBUILD";

  const eventStateSample55 = hi54.events.slice(0, 25).map((e) => ({
    observationId: e.observationId,
    state: deriveHi55EventState(e),
    propertyLabel: e.propertyLabel,
  }));

  const summaryLine = `P1 Progress [${p1Progress55.progressBar}] ${p1Progress55.progressLabel} · Remaining: ${p1Progress55.remaining}`;

  return {
    ...hi54,
    version: HISTORICAL_INTELLIGENCE55_VERSION,
    verdict,
    reason,
    campaign55: {
      status,
      summaryLine,
      dataCoverageImproving,
      dataCoverageReady,
    },
    p1Progress55,
    batchPlan55,
    recoveryLanes55,
    evidenceFunnel55,
    bottleneck55,
    bottleneckRanked55,
    safety55,
    nextAdminAction,
    eventStateSample55,
    catalogueSafe,
  };
}

export function renderHi55GapReportMarkdown(input: {
  generatedAt: string;
  entries: Array<{
    eventId: string | null;
    property: string;
    town: string | null;
    currentState: string;
    nextAction: string;
    group: string;
  }>;
}): string {
  const lines = [
    `# Historical Intelligence 5.5 — Gap Report`,
    ``,
    `Generated: ${input.generatedAt}`,
    ``,
  ];
  const groups = new Map<string, typeof input.entries>();
  for (const e of input.entries) {
    const list = groups.get(e.group) ?? [];
    list.push(e);
    groups.set(e.group, list);
  }
  for (const [group, entries] of groups) {
    lines.push(`## ${group}`, ``);
    for (const e of entries) {
      lines.push(
        `- **${e.property}** (${e.town ?? "—"}) — ${e.currentState} → ${e.nextAction}`,
      );
    }
    lines.push(``);
  }
  return lines.join("\n");
}

export { clampHi55BatchLimit };

export function catalogueLeakCheck(leaks: number): {
  ok: boolean;
  rebuildStatus: "ALLOWED" | "REBUILD_BLOCKED";
} {
  return catalogueLeakCheck54(leaks);
}
