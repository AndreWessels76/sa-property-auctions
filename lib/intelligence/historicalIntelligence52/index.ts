export {
  HISTORICAL_INTELLIGENCE52_VERSION,
  HI52_DEFAULT_BATCH_LIMIT,
  HI52_MAX_BATCH_LIMIT,
  HI52_MINIMUM_MARKET_SALES,
  HI52_MINIMUM_COMPARABLE_SALES,
  HI52_P1_BASELINE_CANDIDATES,
} from "./config";

export type {
  Hi52ExecutionState,
  Hi52StageId,
  Hi52StageSummary,
  Hi52BottleneckRank,
  Hi52CoverageDashboard,
  Hi52BatchDeltaReport,
  Hi52DryRunCandidate,
  Hi52EvidenceLabels,
  Hi52IntelligenceReport,
  Hi52Verdict,
} from "./types";

export { deriveHi52ExecutionState, countExecutionStates } from "./executionState";
export {
  filterP1Eligible,
  filterLegacyEligible,
  filterMissingExtraction,
  buildStageSummaries,
} from "./stages";
export { rankBottlenecks, primaryBottleneck } from "./bottleneck";
export {
  buildCoverage52,
  clampBatchLimit,
  buildP1DryRunCandidates,
  buildLegacyDryRunCandidates52,
  buildExtractionDryRunCandidates,
  buildBatchDeltaReport,
} from "./candidates";
export { deriveHi52Verdict, buildEvidenceLabels, nextAdminActionFromReport } from "./verdict";
export { buildHi52Report, renderHi52GapReportMarkdown } from "./buildReport";
