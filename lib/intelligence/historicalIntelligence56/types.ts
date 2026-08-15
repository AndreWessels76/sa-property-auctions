import type { Hi55IntelligenceReport } from "@/lib/intelligence/historicalIntelligence55";

export type Hi56CampaignStatus =
  | "CAMPAIGN_NOT_STARTED"
  | "CAMPAIGN_IN_PROGRESS"
  | "CAMPAIGN_BLOCKED"
  | "CAMPAIGN_AWAITING_REVIEW"
  | "CAMPAIGN_DATA_COVERED"
  | "CAMPAIGN_COMPLETE";

export type Hi56Verdict =
  | "PRODUCTION SAFETY BLOCKED"
  | "PUBLIC_CATALOGUE_SAFETY_BLOCKED"
  | "CAMPAIGN IN PROGRESS"
  | "DATA COVERAGE IMPROVING"
  | "ENGINE READY / DATA COVERAGE INSUFFICIENT"
  | "DATA COVERAGE READY"
  | "CAMPAIGN COMPLETE"
  | "NO EVIDENCE GAIN";

export type Hi56BottleneckCode =
  | "FETCH_NOT_ATTEMPTED"
  | "LEGACY_UNKNOWN_FAILURE"
  | "MISSING_EXTRACTION"
  | "OUTCOME_MISSING"
  | "SALE_PRICE_MISSING"
  | "IDENTITY_REVIEW_REQUIRED"
  | "CONFLICT"
  | "QUALITY_REVIEW"
  | "NO_DATA";

export type Hi56Bottleneck = {
  code: Hi56BottleneckCode;
  count: number;
  total: number;
  percentage: number;
  recommendedAction: string;
};

export type Hi56Candidate = {
  observationId: string;
  auctionEventId: string | null;
  propertyLabel: string;
  town: string | null;
  sourceStatus: string;
  sourceUrl: string | null;
  priority: number;
  currentState: string;
  recommendedAction: string;
  whyEligible: string;
  lane: "P1" | "LEGACY" | "EXTRACTION";
};

export type Hi56P1Progress = {
  originalP1: number;
  processed: number;
  remaining: number;
  blocked: number;
  successful: number;
  failed: number;
  progressPercent: number;
  progressBar: string;
  progressLabel: string;
};

export type Hi56FunnelStep = {
  key: string;
  label: string;
  value: number;
  rate: number | "INSUFFICIENT_DATA";
};

export type Hi56SafetyStatus = {
  catalogueLeaks: number;
  catalogueSafe: boolean;
  rebuildAllowed: boolean;
  rebuildStatus: "ALLOWED" | "REBUILD_BLOCKED";
};

export type Hi56IntelligenceReport = Omit<Hi55IntelligenceReport, "version" | "verdict"> & {
  version: string;
  verdict: Hi56Verdict;
  campaign56: {
    status: Hi56CampaignStatus;
    summaryLine: string;
    dataCoverageImproving: boolean;
    dataCoverageReady: boolean;
  };
  p1Progress56: Hi56P1Progress;
  evidenceFunnel56: Hi56FunnelStep[];
  bottleneck56: Hi56Bottleneck;
  bottleneckRanked56: Hi56Bottleneck[];
  nextCandidates56: Hi56Candidate[];
  safety56: Hi56SafetyStatus;
  nextAdminAction: string;
};

export type Hi56EvidenceDelta = {
  improved: boolean;
  evidenceGain: boolean;
  noEvidenceGain: boolean;
  message: string;
  lines: string[];
  before: Record<string, number>;
  after: Record<string, number>;
};
