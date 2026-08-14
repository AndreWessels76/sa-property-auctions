import type { Hi52IntelligenceReport } from "@/lib/intelligence/historicalIntelligence52";
import type { Hi51RecoverySnapshot } from "@/lib/intelligence/historicalIntelligence51";
import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";

export type Hi53CampaignStatus =
  | "CAMPAIGN_NOT_STARTED"
  | "CAMPAIGN_IN_PROGRESS"
  | "CAMPAIGN_PARTIALLY_COVERED"
  | "CAMPAIGN_DATA_COVERED"
  | "CAMPAIGN_BLOCKED";

export type Hi53FunnelStep = {
  key: string;
  label: string;
  value: number;
};

export type Hi53CampaignProgress = {
  status: Hi53CampaignStatus;
  totalEvents: number;
  neverAttempted: number;
  fetchAttempted: number;
  fetchSuccessful: number;
  fetchFailed: number;
  remaining: number;
  progressRatio: number;
  progressBar: string;
  summaryLine: string;
};

export type Hi53P1CampaignStats = {
  total: number;
  completed: number;
  remaining: number;
  successful: number;
  failed: number;
  retryable: number;
  permanent: number;
  batchSize: number;
  plannedBatches: number;
};

export type Hi53BatchPlanSlot = {
  batchNumber: number;
  size: number;
  status: "completed" | "next" | "planned";
  remainingAfter: number;
};

export type Hi53MetricChange = {
  key: string;
  label: string;
  before: number;
  after: number;
  delta: number;
  line: string;
};

export type Hi53ExplicitDelta = {
  before: Hi51RecoverySnapshot & { neverAttempted: number };
  after: Hi51RecoverySnapshot & { neverAttempted: number };
  changes: Hi53MetricChange[];
  lines: string[];
  improved: boolean;
};

export type Hi53ReviewItem = {
  observationId: string;
  eventId: string | null;
  propertyLabel: string;
  category:
    | "identity"
    | "outcome"
    | "sale_price"
    | "source_conflict"
    | "evidence_quality"
    | "source_unavailable";
  reason: string;
  priority: number;
  nextAction: string;
};

export type Hi53Bottleneck = {
  code: string;
  count: number;
  total: number;
  recommendedAction: string;
};

export type Hi53ReportLabels = {
  provenInProduction: string[];
  tested: string[];
  recovered: string[];
  stillMissing: string[];
  reviewRequired: string[];
  insufficientData: string[];
};

export type Hi53IntelligenceReport = Omit<Hi52IntelligenceReport, "version" | "verdict"> & {
  version: string;
  verdict: string;
  campaign: Hi53CampaignProgress;
  p1Campaign: Hi53P1CampaignStats;
  batchPlan: Hi53BatchPlanSlot[];
  evidenceFunnel: Hi53FunnelStep[];
  bottleneck53: Hi53Bottleneck;
  bottleneckRanked53: Hi53Bottleneck[];
  reviewQueue: Hi53ReviewItem[];
  catalogueSafe: boolean;
  reportLabels: Hi53ReportLabels;
  nextAdminAction: string;
};

export type { Hi50EventRow, Hi51RecoverySnapshot };
