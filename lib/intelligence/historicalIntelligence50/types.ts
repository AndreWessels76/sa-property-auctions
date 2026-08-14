import type { Hsc48DiagnosticReport, Hsc48EventDiagnostic, Hsc48Metrics } from "@/lib/intelligence/historicalSourceCoverage48/types";
import type { ConnectivityDiagnostic } from "@/lib/intelligence/investorIntelligence47/connectivityDiagnostic";

export type Hi50EvidenceState =
  | "FETCH_NOT_ATTEMPTED"
  | "FETCH_ELIGIBLE"
  | "FETCH_IN_PROGRESS"
  | "FETCH_SUCCESS"
  | "FETCH_HTTP_ERROR"
  | "FETCH_NETWORK_ERROR"
  | "FETCH_BLOCKED"
  | "SOURCE_UNAVAILABLE"
  | "SNAPSHOT_AVAILABLE"
  | "EXTRACTION_AVAILABLE"
  | "OUTCOME_FOUND"
  | "SALE_PRICE_FOUND"
  | "VERIFIED"
  | "REVIEW_REQUIRED"
  | "CONFLICT"
  | "INSUFFICIENT_DATA";

export type Hi50RecoveryPriority = 1 | 2 | 3 | 4;

export type Hi50RecoveryAssignment = {
  priority: Hi50RecoveryPriority;
  reason: string;
  nextAction: string;
};

export type Hi50FailureClassification =
  | "NEW_RUN_WITH_EXPLICIT_ERROR"
  | "LEGACY_UNKNOWN_FAILURE"
  | "NONE";

export type Hi50RateValue = number | "INSUFFICIENT_DATA";

export type Hi50SuccessRates = {
  fetchSuccessRate: Hi50RateValue;
  snapshotRate: Hi50RateValue;
  extractionRate: Hi50RateValue;
  outcomeEvidenceRate: Hi50RateValue;
  verifiedSalePriceRate: Hi50RateValue;
  denominators: {
    fetchAttempts: number;
    fetchSuccessful: number;
    snapshots: number;
    extractions: number;
    historicalEvents: number;
    outcomeEvidence: number;
    verifiedSalePrices: number;
  };
};

export type Hi50Bottleneck =
  | "FETCH_NOT_ATTEMPTED"
  | "FETCH_FAILURE"
  | "SNAPSHOT_MISSING"
  | "EXTRACTION_MISSING"
  | "OUTCOME_MISSING"
  | "SALE_PRICE_MISSING"
  | "IDENTITY_REVIEW"
  | "SOURCE_BLOCKED"
  | "NO_DATA";

export type Hi50BottleneckReport = {
  primary: Hi50Bottleneck;
  count: number;
  total: number;
  recommendedAction: string;
};

export type Hi50EventRow = {
  observationId: string;
  auctionEventId: string | null;
  propertyLabel: string;
  town: string | null;
  agency: string | null;
  auctionDate: string | null;
  sourceUrl: string | null;
  sourceStatus: string;
  recoveryPriority: Hi50RecoveryPriority;
  evidenceState: Hi50EvidenceState;
  fetchState: string | null;
  httpStatus: number | null;
  errorCode: string | null;
  failureClassification: Hi50FailureClassification;
  retryable: boolean;
  snapshot: boolean;
  extraction: string;
  outcome: string;
  salePrice: string;
  resolution: string | null;
  evidenceQuality: string | null;
  lastAttempt: string | null;
  attemptNumber: number;
  nextAction: string;
};

export type Hi50CoverageDashboard = {
  historicalEvents: number;
  licensedSources: string;
  fetchAttempted: string;
  neverAttempted: number;
  fetchSuccessful: number;
  fetchFailed: number;
  legacyFailuresRequiringRefetch: number;
  snapshots: number;
  extractions: number;
  outcomeEvidence: number;
  verifiedSold: number;
  soldWithoutPrice: number;
  verifiedSalePrices: number;
  comparableReady: number;
  marketReadyTowns: number;
  conflicts: number;
  reviewRequired: number;
  catalogueLeaks: number;
};

export type Hi50BeforeAfterSnapshot = {
  fetchAttempted: number;
  snapshots: number;
  extractions: number;
  outcomeEvidence: number;
  verifiedSold: number;
  verifiedSalePrices: number;
  comparableReady: number;
};

export type Hi50DeltaLine = string;

export type Hi50GapEntry = {
  eventId: string;
  property: string;
  town: string | null;
  source: string | null;
  currentState: Hi50EvidenceState;
  lastAttempt: string | null;
  failure: string | null;
  nextAction: string;
  priority: Hi50RecoveryPriority;
  group: "P1" | "P2" | "P3" | "P4" | "REVIEW_REQUIRED" | "VERIFIED";
};

export type Hi50IntelligenceReport = {
  version: string;
  generatedAt: string;
  connectivity: ConnectivityDiagnostic;
  metrics: Hsc48Metrics;
  coverage: Hsc48DiagnosticReport["coverage"];
  coverageDashboard: Hi50CoverageDashboard;
  stateBreakdown: Record<Hi50EvidenceState, number>;
  recoveryPriorityCounts: Record<"p1" | "p2" | "p3" | "p4", number>;
  successRates: Hi50SuccessRates;
  bottleneck: Hi50BottleneckReport;
  events: Hi50EventRow[];
  gapEntries: Hi50GapEntry[];
  verdict: string;
  reason: string;
  liveDataUnavailable: boolean;
};

export type Hi50ProductionVerdict =
  | "PRODUCTION READY"
  | "PRODUCTION READY WITH LIMITATIONS"
  | "INSUFFICIENT DATA — ENGINE READY"
  | "PRODUCTION BLOCKED";
