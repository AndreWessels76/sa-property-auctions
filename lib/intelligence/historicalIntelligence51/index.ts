export {
  HISTORICAL_INTELLIGENCE51_VERSION,
  HI51_DEFAULT_BATCH_LIMIT,
  HI51_MAX_BATCH_LIMIT,
  HI51_P1_BASELINE_CANDIDATES,
  HI51_MINIMUM_MARKET_SALES,
  HI51_MINIMUM_COMPARABLE_SALES,
} from "./config";

export type {
  Hi51RecoverySnapshot,
  Hi51RecoveryDelta,
  Hi51ChainSuccessRates,
  Hi51P1BatchSlot,
  Hi51P1Progress,
  Hi51BatchHistoryRecord,
  Hi51DryRunCandidate,
  Hi51FetchResultsSummary,
  Hi51InvestorEvidenceLabels,
  Hi51IntelligenceReport,
} from "./types";

export { buildRecoverySnapshot, computeRecoveryDelta } from "./recoveryDelta";
export { computeChainSuccessRates } from "./chainSuccessRates";
export { buildBatchHistory, countP1ProcessedFromHistory } from "./batchHistory";
export { computeP1Progress } from "./p1Progress";
export {
  filterLegacyFailureCandidates,
  filterP1NeverAttempted,
  countNeverAttempted,
  buildFetchResultsSummary,
  buildEnhancedDryRunCandidates,
  buildLegacyDryRunCandidates,
} from "./legacyRecovery";
export { buildHi51Report } from "./buildReport";
