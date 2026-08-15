import type { Hi55IntelligenceReport } from "@/lib/intelligence/historicalIntelligence55";
import { catalogueLeakCheck as catalogueLeakCheck55 } from "@/lib/intelligence/historicalIntelligence55";
import { filterMissingExtraction, filterP1Eligible } from "@/lib/intelligence/historicalIntelligence52";
import { parseLeadingInt } from "@/lib/intelligence/historicalIntelligence54";
import { HISTORICAL_INTELLIGENCE56_VERSION } from "./config";
import {
  buildP1Progress56,
  deriveHi56CampaignStatus,
  deriveHi56Verdict,
  isDataCoverageImproving56,
  isDataCoverageReady56,
} from "./campaign";
import { primaryBottleneck56, rankBottlenecks56 } from "./bottlenecks";
import { buildNextCandidates56 } from "./candidates";
import { buildEvidenceFunnel56, clampHi56BatchLimit } from "./deltas";
import type { Hi56IntelligenceReport, Hi56SafetyStatus } from "./types";

export function buildHi56Report(hi55: Hi55IntelligenceReport): Hi56IntelligenceReport {
  const cov = hi55.coverage52;
  const neverAttempted = cov.neverAttempted;
  const reviewRequired = hi55.reviewQueue?.length ?? 0;
  const missingExtraction = filterMissingExtraction(hi55.events).length;
  const remainingActionable =
    filterP1Eligible(hi55.events).length +
    cov.retryable +
    missingExtraction +
    (cov.legacyFailures ?? 0);

  const status = deriveHi56CampaignStatus({
    catalogueLeaks: cov.catalogueLeaks,
    historicalEvents: cov.historicalEvents,
    neverAttempted,
    fetchAttempted: hi55.metrics.fetchAttempted,
    verifiedSalePrices: cov.verifiedSalePrices,
    verifiedSold: cov.verifiedSold,
    reviewRequired,
    remainingActionable,
  });

  const dataCoverageReady = isDataCoverageReady56({
    verifiedSalePrices: cov.verifiedSalePrices,
    comparableReady: cov.comparableReady,
    marketReadyTowns: cov.marketReadyTowns,
  });

  const dataCoverageImproving = isDataCoverageImproving56({
    neverAttempted,
    verifiedSalePrices: cov.verifiedSalePrices,
    comparableReady: cov.comparableReady,
    marketReadyTowns: cov.marketReadyTowns,
  });

  const { verdict, reason } = deriveHi56Verdict({
    catalogueLeaks: cov.catalogueLeaks,
    status,
    dataCoverageImproving,
    dataCoverageReady,
  });

  const p1Progress56 = buildP1Progress56({
    neverAttempted,
    fetchSuccessful: cov.fetchSuccessful,
    fetchFailed: cov.fetchFailed,
    permanent: cov.permanent,
  });

  const licensedSources = parseLeadingInt(cov.licensedSources);
  const snapshots = parseLeadingInt(cov.snapshots, hi55.metrics.snapshots);
  const extractions = parseLeadingInt(cov.extractions, hi55.metrics.extractionAttempted);
  const outcomeEvidence = parseLeadingInt(cov.outcomeEvidence, hi55.coverage.outcomeEvidence);

  const evidenceFunnel56 = buildEvidenceFunnel56({
    licensedSources,
    fetchAttempted: hi55.metrics.fetchAttempted,
    fetchSuccessful: cov.fetchSuccessful,
    snapshots,
    extractions,
    outcomeEvidence,
    verifiedSold: cov.verifiedSold,
    verifiedSalePrices: cov.verifiedSalePrices,
    comparableReady: cov.comparableReady,
    marketReadyTowns: cov.marketReadyTowns,
  });

  const bottleneckRanked56 = rankBottlenecks56(hi55.events);
  const bottleneck56 = primaryBottleneck56(hi55.events);
  const nextCandidates56 = buildNextCandidates56(hi55.events, 5);

  const catalogueSafe = cov.catalogueLeaks === 0;
  const safety56: Hi56SafetyStatus = {
    catalogueLeaks: cov.catalogueLeaks,
    catalogueSafe,
    rebuildAllowed: catalogueSafe,
    rebuildStatus: catalogueSafe ? "ALLOWED" : "REBUILD_BLOCKED",
  };

  const nextAdminAction = !catalogueSafe
    ? "PUBLIC_CATALOGUE_SAFETY_BLOCKED — BLOCK REBUILD"
    : `${bottleneck56.code} ${bottleneck56.count}/${bottleneck56.total} → ${bottleneck56.recommendedAction}`;

  return {
    ...hi55,
    version: HISTORICAL_INTELLIGENCE56_VERSION,
    verdict,
    reason,
    campaign56: {
      status,
      summaryLine: `P1 Progress [${p1Progress56.progressBar}] ${p1Progress56.progressLabel} · ${p1Progress56.progressPercent}% · Remaining: ${p1Progress56.remaining}`,
      dataCoverageImproving,
      dataCoverageReady,
    },
    p1Progress56,
    evidenceFunnel56,
    bottleneck56,
    bottleneckRanked56,
    nextCandidates56,
    safety56,
    nextAdminAction,
    catalogueSafe,
  };
}

export function renderHi56GapReportMarkdown(input: {
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
    `# Historical Intelligence 5.6 — Gap Report`,
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

export { clampHi56BatchLimit };

export function catalogueLeakCheck(leaks: number): {
  ok: boolean;
  rebuildStatus: "ALLOWED" | "REBUILD_BLOCKED";
} {
  return catalogueLeakCheck55(leaks);
}
