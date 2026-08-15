import type { Hi54IntelligenceReport } from "@/lib/intelligence/historicalIntelligence54";
import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";

export type Hi55CampaignStatus =
  | "CAMPAIGN_NOT_STARTED"
  | "CAMPAIGN_IN_PROGRESS"
  | "CAMPAIGN_BLOCKED"
  | "CAMPAIGN_AWAITING_REVIEW"
  | "CAMPAIGN_DATA_COVERED"
  | "CAMPAIGN_COMPLETE";

export type Hi55Verdict =
  | "PRODUCTION SAFETY BLOCKED"
  | "CAMPAIGN IN PROGRESS"
  | "DATA COVERAGE IMPROVING"
  | "ENGINE READY / DATA COVERAGE INSUFFICIENT"
  | "DATA COVERAGE READY"
  | "CAMPAIGN COMPLETE";

export type Hi55EventState =
  | "FETCH_NOT_ATTEMPTED"
  | "FETCH_ELIGIBLE"
  | "FETCH_IN_PROGRESS"
  | "FETCH_SUCCESS"
  | "FETCH_FAILED"
  | "SNAPSHOT_AVAILABLE"
  | "EXTRACTION_REQUIRED"
  | "EXTRACTED"
  | "OUTCOME_OBSERVED"
  | "VERIFIED_SOLD"
  | "SOLD_WITHOUT_PRICE"
  | "PRICE_VERIFIED"
  | "CONFLICT"
  | "REVIEW_REQUIRED"
  | "INSUFFICIENT_DATA"
  | "LEGACY_UNKNOWN_FAILURE";

export type Hi55P1Progress = {
  originalP1: number;
  processed: number;
  remaining: number;
  blocked: number;
  successful: number;
  failed: number;
  retryable: number;
  reviewRequired: number;
  progressBar: string;
  progressLabel: string;
};

export type Hi55BatchPlanStep = {
  batchNumber: number;
  plannedSize: number;
  cumulativeProcessed: number;
  remainingAfter: number;
};

export type Hi55BatchPlan = {
  remaining: number;
  batchSize: number;
  batchesRequired: number;
  steps: Hi55BatchPlanStep[];
  note: string;
};

export type Hi55RecoveryLanes = {
  neverAttempted: number;
  legacyUnknownFailures: number;
  retryableFailures: number;
  snapshotExtractionPending: number;
  note: string;
};

export type Hi55FunnelStep = {
  key: string;
  label: string;
  value: number;
};

export type Hi55Bottleneck = {
  code: string;
  count: number;
  total: number;
  percentage: number;
  recommendedAction: string;
};

export type Hi55SafetyStatus = {
  catalogueLeaks: number;
  catalogueSafe: boolean;
  rebuildAllowed: boolean;
  rebuildStatus: "ALLOWED" | "REBUILD_BLOCKED";
};

export type Hi55IntelligenceReport = Omit<Hi54IntelligenceReport, "version" | "verdict"> & {
  version: string;
  verdict: Hi55Verdict;
  campaign55: {
    status: Hi55CampaignStatus;
    summaryLine: string;
    dataCoverageImproving: boolean;
    dataCoverageReady: boolean;
  };
  p1Progress55: Hi55P1Progress;
  batchPlan55: Hi55BatchPlan;
  recoveryLanes55: Hi55RecoveryLanes;
  evidenceFunnel55: Hi55FunnelStep[];
  bottleneck55: Hi55Bottleneck;
  bottleneckRanked55: Hi55Bottleneck[];
  safety55: Hi55SafetyStatus;
  nextAdminAction: string;
  eventStateSample55: Array<{
    observationId: string;
    state: Hi55EventState;
    propertyLabel: string;
  }>;
};

export type { Hi50EventRow };
