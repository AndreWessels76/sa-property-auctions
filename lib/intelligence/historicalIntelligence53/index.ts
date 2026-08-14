export {
  HISTORICAL_INTELLIGENCE53_VERSION,
  HI53_DEFAULT_BATCH_LIMIT,
  HI53_MAX_BATCH_LIMIT,
  HI53_MINIMUM_MARKET_SALES,
  HI53_MINIMUM_COMPARABLE_SALES,
} from "./config";

export type {
  Hi53CampaignStatus,
  Hi53FunnelStep,
  Hi53CampaignProgress,
  Hi53P1CampaignStats,
  Hi53BatchPlanSlot,
  Hi53MetricChange,
  Hi53ExplicitDelta,
  Hi53ReviewItem,
  Hi53Bottleneck,
  Hi53ReportLabels,
  Hi53IntelligenceReport,
} from "./types";

export {
  deriveCampaignStatus,
  buildCampaignProgress,
  buildP1CampaignStats,
  buildBatchPlan,
} from "./campaign";
export { buildEvidenceFunnel, renderFunnelText } from "./funnel";
export { buildExplicitCampaignDelta, withNeverAttempted } from "./delta";
export { rankBottlenecks53, primaryBottleneck53 } from "./bottleneck";
export { buildReviewQueue } from "./reviewQueue";
export { buildHi53Report, buildReportLabels, renderHi53GapReportMarkdown } from "./buildReport";
