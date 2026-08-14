import type { Hi53IntelligenceReport } from "@/lib/intelligence/historicalIntelligence53";
import type { Hi51RecoverySnapshot } from "@/lib/intelligence/historicalIntelligence51";

export type Hi54CampaignStatus =
  | "CAMPAIGN_NOT_STARTED"
  | "CAMPAIGN_IN_PROGRESS"
  | "CAMPAIGN_BLOCKED"
  | "CAMPAIGN_AWAITING_REVIEW"
  | "CAMPAIGN_DATA_COVERED"
  | "CAMPAIGN_COMPLETE";

export type Hi54Verdict =
  | "INSUFFICIENT DATA — ENGINE READY"
  | "CAMPAIGN IN PROGRESS"
  | "CAMPAIGN AWAITING REVIEW"
  | "DATA COVERED — MARKET INTELLIGENCE AVAILABLE"
  | "CAMPAIGN COMPLETE"
  | "PRODUCTION BLOCKED — LIVE DATA UNAVAILABLE";

export type Hi54P1Progress = {
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

export type Hi54CoverageRates = {
  sourceCoverage: number | "INSUFFICIENT_DATA";
  fetchCoverage: number | "INSUFFICIENT_DATA";
  snapshotCoverage: number | "INSUFFICIENT_DATA";
  extractionCoverage: number | "INSUFFICIENT_DATA";
  outcomeCoverage: number | "INSUFFICIENT_DATA";
  salePriceCoverage: number | "INSUFFICIENT_DATA";
};

export type Hi54EvidenceQualityCounts = {
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  INSUFFICIENT_DATA: number;
  CONFLICT: number;
  REVIEW_REQUIRED: number;
  UNKNOWN: number;
};

export type Hi54FunnelStep = {
  key: string;
  label: string;
  value: number;
};

export type Hi54Bottleneck = {
  code: string;
  count: number;
  total: number;
  percentage: number;
  recommendedAction: string;
};

export type Hi54SafetyStatus = {
  catalogueLeaks: number;
  catalogueSafe: boolean;
  rebuildAllowed: boolean;
  rebuildStatus: "ALLOWED" | "REBUILD_BLOCKED";
  lastSuccessfulAcquisition: string | null;
  lastSuccessfulRebuild: string | null;
};

export type Hi54IntelligenceReport = Omit<Hi53IntelligenceReport, "version" | "verdict"> & {
  version: string;
  verdict: Hi54Verdict;
  campaign54: {
    status: Hi54CampaignStatus;
    summaryLine: string;
  };
  p1Progress54: Hi54P1Progress;
  evidenceFunnel54: Hi54FunnelStep[];
  coverageRates: Hi54CoverageRates;
  evidenceQualityCounts: Hi54EvidenceQualityCounts;
  bottleneck54: Hi54Bottleneck;
  bottleneckRanked54: Hi54Bottleneck[];
  safety: Hi54SafetyStatus;
  nextAdminAction: string;
};

export type { Hi51RecoverySnapshot };
