import type { Hi50IntelligenceReport } from "@/lib/intelligence/historicalIntelligence50/types";
import type { EnrichmentRunRow } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { buildHi50Report } from "@/lib/intelligence/historicalIntelligence50/buildReport";
import { HISTORICAL_INTELLIGENCE51_VERSION, HI51_P1_BASELINE_CANDIDATES } from "./config";
import { buildRecoverySnapshot } from "./recoveryDelta";
import { computeChainSuccessRates } from "./chainSuccessRates";
import { buildBatchHistory } from "./batchHistory";
import { computeP1Progress } from "./p1Progress";
import {
  buildFetchResultsSummary,
  countNeverAttempted,
  filterLegacyFailureCandidates,
} from "./legacyRecovery";
import type { Hi51IntelligenceReport, Hi51InvestorEvidenceLabels } from "./types";
import type { Hsc48DiagnosticReport } from "@/lib/intelligence/historicalSourceCoverage48/types";

function buildInvestorLabels(report: Hi50IntelligenceReport): Hi51InvestorEvidenceLabels {
  const proven: string[] = [];
  const tested: string[] = [];
  const missing: string[] = [];
  const reviewRequired: string[] = [];

  if (report.coverageDashboard.catalogueLeaks === 0) {
    proven.push("Public catalogue safety — 0 leaks");
  }
  if (report.coverageDashboard.licensedSources) {
    proven.push(`Licensed sources: ${report.coverageDashboard.licensedSources}`);
  }
  if (report.metrics.fetchAttempted > 0) {
    tested.push(`${report.metrics.fetchAttempted} fetch attempts audited`);
  }
  if (report.metrics.verifiedSalePrices === 0) {
    missing.push("No verified sale prices in production");
  }
  if (report.metrics.verifiedSold === 0) {
    missing.push("No verified SOLD outcomes in production");
  }
  if (report.coverageDashboard.neverAttempted > 0) {
    missing.push(`${report.coverageDashboard.neverAttempted} events never fetch-attempted`);
  }
  if (report.metrics.reviewRequired > 0) {
    reviewRequired.push(`${report.metrics.reviewRequired} events require admin review`);
  }
  if (report.metrics.conflicts > 0) {
    reviewRequired.push(`${report.metrics.conflicts} outcome conflicts`);
  }

  tested.push("HI 5.1 controlled recovery engine — batch limit 5, dry-run enforced");
  tested.push("Fetch classifier + legacy failure separation");

  return { proven, tested, missing, reviewRequired };
}

export function buildHi51Report(input: {
  hscReport: Hsc48DiagnosticReport;
  enrichmentRuns: EnrichmentRunRow[];
}): Hi51IntelligenceReport {
  const hi50 = buildHi50Report(input);
  const batchHistory = buildBatchHistory(input.enrichmentRuns);
  const neverAttempted = countNeverAttempted(hi50.events);
  const processedFromBaseline = Math.max(0, HI51_P1_BASELINE_CANDIDATES - neverAttempted);
  const legacyCandidates = filterLegacyFailureCandidates(hi50.events);
  const missingExtraction = hi50.events.filter(
    (e) => e.snapshot && e.extraction === "NOT_RUN",
  ).length;
  const p4Review = hi50.events.filter((e) => e.recoveryPriority === 4).length;

  const recoverySnapshot = buildRecoverySnapshot(
    hi50.metrics,
    hi50.coverage.outcomeEvidence,
  );

  return {
    ...hi50,
    version: HISTORICAL_INTELLIGENCE51_VERSION,
    recoverySnapshot,
    chainSuccessRates: computeChainSuccessRates(hi50.metrics, hi50.coverage.outcomeEvidence),
    p1Progress: computeP1Progress({
      remainingNeverAttempted: neverAttempted,
      processedFromBatches: processedFromBaseline,
    }),
    fetchResults: buildFetchResultsSummary(hi50.events),
    batchHistory: batchHistory.slice(0, 20),
    investorLabels: buildInvestorLabels(hi50),
    legacyRecoveryCandidates: legacyCandidates.length,
    missingExtractionCandidates: missingExtraction,
    p4ReviewCount: p4Review,
  };
}
