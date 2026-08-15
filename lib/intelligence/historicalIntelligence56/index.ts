export {
  HISTORICAL_INTELLIGENCE56_VERSION,
  HI56_DEFAULT_BATCH_LIMIT,
  HI56_MAX_BATCH_LIMIT,
  HI56_MINIMUM_MARKET_SALES,
  HI56_MINIMUM_COMPARABLE_SALES,
  HI56_P1_BASELINE_CANDIDATES,
} from "./config";

export type {
  Hi56CampaignStatus,
  Hi56Verdict,
  Hi56BottleneckCode,
  Hi56Bottleneck,
  Hi56Candidate,
  Hi56P1Progress,
  Hi56FunnelStep,
  Hi56SafetyStatus,
  Hi56IntelligenceReport,
  Hi56EvidenceDelta,
} from "./types";

export { rankBottlenecks56, primaryBottleneck56 } from "./bottlenecks";
export {
  buildNextCandidates56,
  buildP1Candidates56,
  buildLegacyCandidates56,
} from "./candidates";
export {
  buildP1Progress56,
  deriveHi56CampaignStatus,
  deriveHi56Verdict,
  isDataCoverageImproving56,
  isDataCoverageReady56,
} from "./campaign";
export {
  clampHi56BatchLimit,
  rejectHi56UnlimitedLimit,
  buildEvidenceFunnel56,
  buildEvidenceDelta56,
  metricBagFromCoverage,
} from "./deltas";
export {
  buildHi56Report,
  renderHi56GapReportMarkdown,
  catalogueLeakCheck,
} from "./buildReport";
