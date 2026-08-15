export {
  HISTORICAL_INTELLIGENCE54_VERSION,
  HI54_DEFAULT_BATCH_LIMIT,
  HI54_MAX_BATCH_LIMIT,
  HI54_MINIMUM_MARKET_SALES,
  HI54_MINIMUM_COMPARABLE_SALES,
  HI54_P1_BASELINE_CANDIDATES,
} from "./config";

export type {
  Hi54CampaignStatus,
  Hi54EngineStatus,
  Hi54DataCoverageStatus,
  Hi54Verdict,
  Hi54P1Progress,
  Hi54CoverageRates,
  Hi54EvidenceQualityCounts,
  Hi54FunnelStep,
  Hi54Bottleneck,
  Hi54SafetyStatus,
  Hi54IntelligenceReport,
  Hi51RecoverySnapshot,
} from "./types";

export {
  deriveHi54CampaignStatus,
  deriveHi54Verdict,
  buildP1Progress54,
} from "./campaign";
export { buildEvidenceFunnel54 } from "./funnel";
export { rankBottlenecks54, primaryBottleneck54 } from "./bottleneck";
export {
  computeCoverageRates,
  countEvidenceQuality,
  parseLeadingInt,
} from "./coverage";
export {
  buildExplicitCampaignDelta54,
  withNeverAttempted54,
  formatAcquireBeforeAfter,
} from "./delta";
export {
  buildHi54Report,
  renderHi54GapReportMarkdown,
  clampHi54BatchLimit,
  catalogueLeakCheck,
  deriveHi54EngineStatus,
  deriveHi54DataCoverageStatus,
} from "./buildReport";
