export {
  HISTORICAL_INTELLIGENCE50_VERSION,
  HI50_DEFAULT_BATCH_LIMIT,
  HI50_MAX_BATCH_LIMIT,
  HI50_MINIMUM_MARKET_SALES,
  HI50_MINIMUM_COMPARABLE_SALES,
} from "./config";

export type {
  Hi50EvidenceState,
  Hi50RecoveryPriority,
  Hi50RecoveryAssignment,
  Hi50FailureClassification,
  Hi50RateValue,
  Hi50SuccessRates,
  Hi50Bottleneck,
  Hi50BottleneckReport,
  Hi50EventRow,
  Hi50CoverageDashboard,
  Hi50BeforeAfterSnapshot,
  Hi50DeltaLine,
  Hi50GapEntry,
  Hi50IntelligenceReport,
  Hi50ProductionVerdict,
} from "./types";

export { deriveHi50EvidenceState, stateBreakdownHi50 } from "./evidenceStates";
export { classifyFailureMetadata, countLegacyFailures } from "./legacyFailure";
export {
  assignRecoveryPriority,
  countRecoveryPriority,
  isEligibleForSnapshotExtraction,
  filterSnapshotExtractionCandidates,
} from "./recoveryPriority";
export { computeSuccessRates } from "./successRates";
export { detectBottleneck } from "./bottleneck";
export { snapshotMetrics, formatDeltaLines } from "./beforeAfter";
export { buildGapEntries, renderGapReportMarkdown } from "./gapReport";
export { buildHi50Report, deriveHi50Verdict } from "./buildReport";
