export {
  HISTORICAL_INTELLIGENCE55_VERSION,
  HI55_DEFAULT_BATCH_LIMIT,
  HI55_MAX_BATCH_LIMIT,
  HI55_MINIMUM_MARKET_SALES,
  HI55_MINIMUM_COMPARABLE_SALES,
  HI55_P1_BASELINE_CANDIDATES,
} from "./config";

export type {
  Hi55CampaignStatus,
  Hi55Verdict,
  Hi55EventState,
  Hi55P1Progress,
  Hi55BatchPlan,
  Hi55BatchPlanStep,
  Hi55RecoveryLanes,
  Hi55FunnelStep,
  Hi55Bottleneck,
  Hi55SafetyStatus,
  Hi55IntelligenceReport,
} from "./types";

export { deriveHi55EventState, countHi55EventStates } from "./states";
export {
  deriveHi55CampaignStatus,
  deriveHi55Verdict,
  isDataCoverageImproving,
  isDataCoverageReady,
} from "./campaign";
export { buildP1Progress55 } from "./p1Progress";
export {
  buildBatchPlan55,
  clampHi55BatchLimit,
  rejectHi55UnlimitedLimit,
} from "./batchPlan";
export { buildRecoveryLanes55 } from "./recovery";
export { buildEvidenceFunnel55 } from "./funnel";
export { rankBottlenecks55, primaryBottleneck55 } from "./bottlenecks";
export { computeCoverageRates, countEvidenceQuality, parseLeadingInt } from "./coverage";
export {
  buildExplicitCampaignDelta55,
  withNeverAttempted55,
  formatAcquireBeforeAfter55,
  formatP1RemainingDelta55,
  snapshotNeverAttempted55,
} from "./deltas";
export {
  buildHi55Report,
  renderHi55GapReportMarkdown,
  catalogueLeakCheck,
} from "./buildReport";
