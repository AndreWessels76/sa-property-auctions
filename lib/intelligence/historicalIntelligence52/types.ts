import type { Hi51IntelligenceReport, Hi51RecoverySnapshot } from "@/lib/intelligence/historicalIntelligence51";
import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";

export type Hi52ExecutionState =
  | "FETCH_ELIGIBLE_P1"
  | "FETCH_ATTEMPTED"
  | "FETCH_SUCCESS"
  | "FETCH_FAILED"
  | "FETCH_RETRYABLE"
  | "FETCH_PERMANENT"
  | "LEGACY_UNKNOWN_FAILURE"
  | "SNAPSHOT_AVAILABLE"
  | "MISSING_EXTRACTION"
  | "EXTRACTION_COMPLETE"
  | "OUTCOME_FOUND"
  | "SALE_PRICE_FOUND"
  | "VERIFIED"
  | "REVIEW_REQUIRED"
  | "CONFLICT"
  | "INSUFFICIENT_DATA";

export type Hi52StageId = "A_P1" | "B_LEGACY" | "C_EXTRACTION" | "D_RESOLUTION";

export type Hi52StageSummary = {
  id: Hi52StageId;
  label: string;
  eligible: number;
  nextBatch: number;
  processed: number;
  remaining: number;
  recommendedAction: string;
};

export type Hi52BottleneckRank = {
  code: string;
  count: number;
  total: number;
  recommendedAction: string;
};

export type Hi52CoverageDashboard = {
  historicalEvents: number;
  licensedSources: string;
  fetchAttempted: string;
  neverAttempted: number;
  fetchSuccessful: number;
  fetchFailed: number;
  retryable: number;
  permanent: number;
  legacyFailures: number;
  snapshots: string;
  missingExtraction: number;
  extractions: string;
  outcomeEvidence: string;
  verifiedSold: number;
  soldWithoutPrice: number;
  verifiedSalePrices: number;
  comparableReady: number;
  marketReadyTowns: number;
  catalogueLeaks: number;
};

export type Hi52BatchDeltaReport = {
  candidates: number;
  attempted: number;
  successful: number;
  failed: number;
  retryable: number;
  permanent: number;
  before: Hi51RecoverySnapshot;
  after: Hi51RecoverySnapshot;
  lines: string[];
  improved: boolean;
};

export type Hi52DryRunCandidate = {
  eventId: string | null;
  observationId: string;
  propertyMasterId: string | null;
  propertyLabel: string;
  town: string | null;
  agency: string | null;
  source: string | null;
  sourceUrl: string | null;
  stage: Hi52StageId;
  executionState: Hi52ExecutionState;
  priority: number;
  currentState: string;
  lastAttempt: string | null;
  expectedAction: string;
  reason: string;
};

export type Hi52EvidenceLabels = {
  provenInProduction: string[];
  tested: string[];
  engineReady: string[];
  insufficientData: string[];
  reviewRequired: string[];
};

export type Hi52IntelligenceReport = Omit<Hi51IntelligenceReport, "bottleneck" | "verdict"> & {
  version: string;
  verdict: Hi52Verdict | string;
  bottleneck: Hi52BottleneckRank;
  coverage52: Hi52CoverageDashboard;
  stages: Hi52StageSummary[];
  bottleneckRanked: Hi52BottleneckRank[];
  stateMachineCounts: Record<string, number>;
  evidenceLabels: Hi52EvidenceLabels;
  nextAdminAction: string;
};

export type Hi52Verdict =
  | "PRODUCTION DATA COVERED"
  | "PRODUCTION DATA PARTIALLY COVERED"
  | "INSUFFICIENT DATA — ENGINE READY"
  | "PRODUCTION BLOCKED — LIVE DATA UNAVAILABLE"
  | "EMPTY DATABASE";

export type { Hi50EventRow };
