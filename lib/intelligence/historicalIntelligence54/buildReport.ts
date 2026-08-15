import type { Hi53IntelligenceReport } from "@/lib/intelligence/historicalIntelligence53";
import {
  filterMissingExtraction,
  filterP1Eligible,
} from "@/lib/intelligence/historicalIntelligence52";
import {
  rankTownAcquisitionOpportunities,
  summarizePriorityBuckets,
} from "@/lib/intelligence/evidenceCoverage";
import {
  HISTORICAL_INTELLIGENCE54_VERSION,
  HI54_DEFAULT_BATCH_LIMIT,
  HI54_MINIMUM_MARKET_SALES,
  HI54_MINIMUM_COMPARABLE_SALES,
} from "./config";
import {
  buildP1Progress54,
  deriveHi54CampaignStatus,
  deriveHi54Verdict,
} from "./campaign";
import { buildEvidenceFunnel54 } from "./funnel";
import { primaryBottleneck54, rankBottlenecks54 } from "./bottleneck";
import {
  computeCoverageRates,
  countEvidenceQuality,
  parseLeadingInt,
} from "./coverage";
import type {
  Hi54DataCoverageStatus,
  Hi54EngineStatus,
  Hi54IntelligenceReport,
  Hi54SafetyStatus,
} from "./types";

export function deriveHi54EngineStatus(catalogueLeaks: number): Hi54EngineStatus {
  return catalogueLeaks > 0 ? "PRODUCTION_SAFETY_BLOCKED" : "ENGINE_READY";
}

export function deriveHi54DataCoverageStatus(input: {
  verifiedSalePrices: number;
  comparableReady: number;
  marketReadyTowns: number;
}): Hi54DataCoverageStatus {
  if (
    input.verifiedSalePrices >= HI54_MINIMUM_MARKET_SALES &&
    input.comparableReady >= HI54_MINIMUM_COMPARABLE_SALES &&
    input.marketReadyTowns >= 1
  ) {
    return "DATA_COVERAGE_READY";
  }
  return "DATA_COVERAGE_INSUFFICIENT";
}

export function buildHi54Report(hi53: Hi53IntelligenceReport): Hi54IntelligenceReport {
  const cov = hi53.coverage52;
  const neverAttempted = cov.neverAttempted;
  const reviewRequired = hi53.reviewQueue?.length ?? 0;
  const missingExtraction = filterMissingExtraction(hi53.events).length;
  const remainingActionable =
    filterP1Eligible(hi53.events).length +
    cov.retryable +
    missingExtraction +
    (cov.legacyFailures ?? 0);

  const status = deriveHi54CampaignStatus({
    catalogueLeaks: cov.catalogueLeaks,
    historicalEvents: cov.historicalEvents,
    neverAttempted,
    fetchAttempted: hi53.metrics.fetchAttempted,
    verifiedSalePrices: cov.verifiedSalePrices,
    verifiedSold: cov.verifiedSold,
    reviewRequired,
    p4Blocked: cov.permanent,
    remainingActionable,
  });

  const { verdict, reason } = deriveHi54Verdict({
    catalogueLeaks: cov.catalogueLeaks,
    status,
  });

  const p1Progress54 = buildP1Progress54({
    neverAttempted,
    fetchSuccessful: cov.fetchSuccessful,
    fetchFailed: cov.fetchFailed,
    retryable: cov.retryable,
    permanent: cov.permanent,
    reviewRequired,
  });

  const licensedSources = parseLeadingInt(cov.licensedSources);
  const snapshots = parseLeadingInt(cov.snapshots, hi53.metrics.snapshots);
  const extractions = parseLeadingInt(cov.extractions, hi53.metrics.extractionAttempted);
  const outcomeEvidence = parseLeadingInt(cov.outcomeEvidence, hi53.coverage.outcomeEvidence);

  const evidenceFunnel54 = buildEvidenceFunnel54({
    licensedSources,
    fetchAttempted: hi53.metrics.fetchAttempted,
    fetchSuccessful: cov.fetchSuccessful,
    snapshots,
    extractions,
    outcomeEvidence,
    verifiedSold: cov.verifiedSold,
    verifiedSalePrices: cov.verifiedSalePrices,
    comparableReady: cov.comparableReady,
    marketReadyTowns: cov.marketReadyTowns,
  });

  const coverageRates = computeCoverageRates({
    historicalEvents: cov.historicalEvents,
    licensedSources,
    fetchAttempted: hi53.metrics.fetchAttempted,
    snapshots,
    extractions,
    outcomeEvidence,
    verifiedSalePrices: cov.verifiedSalePrices,
  });

  const evidenceQualityCounts = countEvidenceQuality(hi53.events);
  const bottleneckRanked54 = rankBottlenecks54(hi53.events);
  const bottleneck54 = primaryBottleneck54(hi53.events);

  const catalogueSafe = cov.catalogueLeaks === 0;
  const safety: Hi54SafetyStatus = {
    catalogueLeaks: cov.catalogueLeaks,
    catalogueSafe,
    rebuildAllowed: catalogueSafe,
    rebuildStatus: catalogueSafe ? "ALLOWED" : "REBUILD_BLOCKED",
    lastSuccessfulAcquisition: null,
    lastSuccessfulRebuild: null,
  };

  const engineStatus54 = deriveHi54EngineStatus(cov.catalogueLeaks);
  const dataCoverageStatus54 = deriveHi54DataCoverageStatus({
    verifiedSalePrices: cov.verifiedSalePrices,
    comparableReady: cov.comparableReady,
    marketReadyTowns: cov.marketReadyTowns,
  });
  const dataCoverageReady = dataCoverageStatus54 === "DATA_COVERAGE_READY";

  const priorityBuckets54 = summarizePriorityBuckets(hi53.events);
  const townOpportunities54 = rankTownAcquisitionOpportunities(hi53.events).slice(0, 20);

  const nextAdminAction = catalogueSafe
    ? `PRIMARY BOTTLENECK ${bottleneck54.code} ${bottleneck54.count}/${bottleneck54.total} → ${bottleneck54.recommendedAction}`
    : "PUBLIC SAFETY FAILURE — BLOCK REBUILD";

  const summaryLine = `P1 Progress [${p1Progress54.progressBar}] ${p1Progress54.progressLabel} · Remaining: ${p1Progress54.remaining}`;

  return {
    ...hi53,
    version: HISTORICAL_INTELLIGENCE54_VERSION,
    verdict,
    reason,
    engineStatus54,
    dataCoverageStatus54,
    campaign54: {
      status,
      summaryLine,
      dataCoverageReady,
    },
    p1Progress54,
    priorityBuckets54,
    townOpportunities54,
    evidenceFunnel54,
    coverageRates,
    evidenceQualityCounts,
    bottleneck54,
    bottleneckRanked54,
    safety,
    nextAdminAction,
    catalogueSafe,
  };
}

export function renderHi54GapReportMarkdown(input: {
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
    `# Historical Intelligence 5.4 — Gap Report`,
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

export function clampHi54BatchLimit(limit?: number): number {
  const n = limit ?? HI54_DEFAULT_BATCH_LIMIT;
  return Math.min(Math.max(n, 1), HI54_DEFAULT_BATCH_LIMIT);
}

/** Catalogue leak check — rebuild must call this first. */
export function catalogueLeakCheck(leaks: number): {
  ok: boolean;
  rebuildStatus: "ALLOWED" | "REBUILD_BLOCKED";
} {
  if (leaks > 0) return { ok: false, rebuildStatus: "REBUILD_BLOCKED" };
  return { ok: true, rebuildStatus: "ALLOWED" };
}
