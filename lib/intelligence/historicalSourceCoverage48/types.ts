/**
 * HSC 4.8 shared types.
 */

import type { AcquisitionGapCode } from "@/lib/intelligence/investorIntelligence46/types";
import type { ConnectivityDiagnostic } from "@/lib/intelligence/investorIntelligence47/connectivityDiagnostic";
import type { ClassifiedFetchFailure } from "./fetchErrorClassification";
import type { AcquisitionTimelineStep, Hsa49FetchState } from "./fetchStateMachine";
import type { Hsa49PriorityAssignment } from "./acquisitionPriority49";
import type {
  Hsc48DiagnosticState,
  Hsc48RetryRecommendation,
  Hsc48SourceStatus,
} from "./diagnosticStates";

export type Hsc48ExtractionState =
  | "NOT_RUN"
  | "RUN"
  | "SUCCESS"
  | "FAILED"
  | "NO_EVIDENCE";

export type Hsc48OutcomeState =
  | "UNKNOWN"
  | "SOLD"
  | "WITHDRAWN"
  | "CANCELLED"
  | "POSTPONED"
  | "PASSED_IN"
  | "CONFLICT";

export type Hsc48SalePriceState =
  | "VERIFIED"
  | "MISSING"
  | "SOLD_WITHOUT_PRICE"
  | "REJECTED_GUIDE"
  | "REJECTED_RESERVE"
  | "NOT_APPLICABLE";

export type Hsc48FetchDiagnostic = {
  eventId: string | null;
  propertyMasterId: string | null;
  listingPropertyId: string | null;
  sourceUrl: string | null;
  agency: string | null;
  attemptTimestamp: string | null;
  httpStatus: number | null;
  responseReceived: boolean;
  contentLength: number | null;
  redirectCount: number | null;
  finalUrl: string | null;
  networkError: string | null;
  tlsError: string | null;
  dnsError: string | null;
  timeout: boolean;
  licenseDecision: string | null;
  robotsDecision: string | null;
  fetchDurationMs: number | null;
  snapshotResult: string | null;
  enrichmentStatus: string | null;
  refetchStatus: string | null;
  errorCode?: string | null;
  retryable?: boolean;
  attemptNumber?: number;
  contentType?: string | null;
  snapshotId?: string | null;
  retryAfterMs?: number | null;
};

export type Hsc48SourceProvenance = {
  sourceId: string | null;
  sourceName: string | null;
  agency: string | null;
  sourceUrl: string | null;
  sourceTier: string | null;
  discoveredAt: string | null;
  lastCheckedAt: string | null;
  sourceStatus: Hsc48SourceStatus;
};

export type Hsc48SnapshotCoverage = {
  exists: boolean;
  snapshotId: string | null;
  sha256: string | null;
  observedAt: string | null;
  sourceUrl: string | null;
  contentLength: number | null;
  version: string | null;
  extractionLinked: boolean;
  noChange: boolean;
  valid?: boolean | null;
  validationReason?: string | null;
  sourceChanged?: boolean;
};

export type Hsc48ExtractionCoverage = {
  state: Hsc48ExtractionState;
  extractionRunId: string | null;
  extractionVersion: string | null;
  fieldsExtracted: number;
  outcomeExtracted: boolean;
  salePriceExtracted: boolean;
  sizeExtracted: boolean;
  identitySignals: string[];
  confidence: string | null;
};

export type Hsc48IdentityDiagnostic = {
  masterId: string | null;
  fingerprint: string | null;
  address: string | null;
  town: string | null;
  suburb: string | null;
  erfIdentifier: string | null;
  coordinates: { lat: number | null; lng: number | null };
  propertyType: string | null;
  size: number | null;
  identityConfidence: string | null;
  reviewRequired: boolean;
};

export type Hsc48EventDiagnostic = {
  observationId: string;
  auctionEventId: string | null;
  propertyMasterId: string | null;
  listingPropertyId: string | null;
  propertyLabel: string;
  agency: string | null;
  town: string | null;
  auctionDate: string | null;
  queuePriority: 1 | 2 | 3 | 4 | null;
  queueReason: string | null;
  source: Hsc48SourceProvenance;
  fetch: Hsc48FetchDiagnostic | null;
  fetchAttempted: boolean;
  fetchSuccessful: boolean;
  snapshot: Hsc48SnapshotCoverage;
  extraction: Hsc48ExtractionCoverage;
  outcomeState: Hsc48OutcomeState;
  salePriceState: Hsc48SalePriceState;
  evidenceQuality: string | null;
  resolutionState: string | null;
  primaryState: Hsc48DiagnosticState;
  retryRecommendation: Hsc48RetryRecommendation;
  mappedGapCodes: AcquisitionGapCode[];
  acquisitionWouldReduceGap: boolean;
  nextAction: string;
  stoppingPoint: string;
  /** HSA 4.9 extensions */
  fetchError?: ClassifiedFetchFailure | null;
  fetchState?: Hsa49FetchState;
  acquisitionTimeline?: AcquisitionTimelineStep[];
  acquisitionPriority?: Hsa49PriorityAssignment;
};

export type Hsc48CoverageFractions = {
  total: number;
  sourceFound: number;
  sourceLicensed: number;
  fetchAttempted: number;
  fetchSuccessful: number;
  snapshots: number;
  extractions: number;
  outcomeEvidence: number;
  salePriceEvidence: number;
};

export type Hsc48Metrics = {
  propertyMasters: number;
  auctionEvents: number;
  historicalEvents: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  queueBlocked: number;
  queueUnavailable: number;
  queueCompleted: number;
  enrichmentAttempts: number;
  successfulFetches: number;
  failedFetches: number;
  sourceFound: number;
  sourceLicensed: number;
  sourceBlocked: number;
  sourceUnavailable: number;
  fetchAttempted: number;
  tlsErrors: number;
  networkErrors: number;
  dnsErrors: number;
  timeouts: number;
  http403: number;
  http404: number;
  http429: number;
  http5xx: number;
  snapshots: number;
  noChange: number;
  extractionAttempted: number;
  extractionSuccessful: number;
  extractionFailed: number;
  extractionNoEvidence: number;
  outcomeObservations: number;
  verifiedSold: number;
  soldWithoutPrice: number;
  unknownOutcomes: number;
  verifiedSalePrices: number;
  conflicts: number;
  reviewRequired: number;
  comparableReady: number;
  marketReadyTowns: number;
  acquisitionGaps: number;
  catalogueLeaks: number;
  retryableFailures?: number;
  p1Eligible?: number;
  p2Retryable?: number;
  p3Review?: number;
  p4Blocked?: number;
};

export type Hsc48ProductionVerdict =
  | "PRODUCTION SOURCE COVERAGE VERIFIED"
  | "PRODUCTION SOURCE COVERAGE PARTIAL"
  | "INSUFFICIENT DATA — ENGINE READY"
  | "PRODUCTION BLOCKED";

export type Hsc48DiagnosticReport = {
  version: string;
  generatedAt: string;
  connectivity: ConnectivityDiagnostic;
  metrics: Hsc48Metrics;
  coverage: Hsc48CoverageFractions;
  events: Hsc48EventDiagnostic[];
  stateBreakdown: Record<string, number>;
  verdict: Hsc48ProductionVerdict;
  reason: string;
  provenInProduction: string[];
  engineTested: string[];
  sourceCoverage: string[];
  dataStillMissing: string[];
  technicalBlockers: string[];
  adminReviewRequired: string[];
  liveDataUnavailable: boolean;
  /** HSA 4.9 */
  sourceHealth?: import("./sourceHealth").Hsa49SourceHealth[];
  failureBreakdown?: Record<string, number>;
  gapGroups?: Record<string, number>;
};

export type Hsc48BeforeAfter = {
  before: Hsc48Metrics;
  after: Hsc48Metrics;
  delta: Partial<Hsc48Metrics>;
};
