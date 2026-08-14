export {
  HISTORICAL_SOURCE_COVERAGE48_VERSION,
  HSC48_P1_BATCH_LIMIT,
  HSA49_VERSION,
  HSA49_DEFAULT_BATCH_LIMIT,
  HSA49_MAX_BATCH_LIMIT,
  HSA49_MAX_RETRY_ATTEMPTS,
} from "./config";

export {
  classifyFetchError,
  deriveRetryRecommendation,
  type Hsc48DiagnosticState,
  type Hsc48RetryRecommendation,
  type Hsc48SourceStatus,
} from "./diagnosticStates";

export {
  classifyFetchFailure,
  failureBreakdown,
  isRetryableErrorCode,
  type FetchErrorCode,
  type ClassifiedFetchFailure,
} from "./fetchErrorClassification";

export {
  evaluateRetry,
  countAttemptsForProperty,
  computeRetryDelay,
  errorCodeToFetchState,
  type RetryDecision,
} from "./retryPolicy";

export {
  deriveFetchState,
  buildAcquisitionTimeline,
  type Hsa49FetchState,
  type AcquisitionTimelineStep,
} from "./fetchStateMachine";

export {
  validateSnapshotContent,
  type SnapshotValidationResult,
} from "./snapshotValidation";

export { diagnoseConnectivityExtended, type ExtendedConnectivityDiagnostic } from "./connectivityExtended";

export {
  assignAcquisitionPriority,
  countByPriority,
  type Hsa49AcquisitionPriority,
  type Hsa49PriorityAssignment,
} from "./acquisitionPriority49";

export { buildSourceHealthMetrics, type Hsa49SourceHealth } from "./sourceHealth";

export {
  explainEventGaps,
  groupGapCounts,
  buildResearchEvidenceLabels,
  type Hsa49GapGroup,
  type Hsa49EventGapExplanation,
} from "./acquisitionGaps49";

export { buildDryRunPreview, type Hsa49DryRunCandidate } from "./dryRunPreview";

export {
  buildFetchDiagnostic,
  isFetchFailed,
  isFetchSuccessful,
  latestEnrichmentRunForProperty,
  latestRefetchRunForProperty,
} from "./fetchDiagnostics";

export { buildEventDiagnostic } from "./eventDiagnostic";

export {
  aggregateEventMetrics,
  buildCoverageFractions,
  stateBreakdown,
  computeBeforeAfterDelta,
} from "./aggregateMetrics";

export { gapCodesForDiagnostic, acquisitionWouldReduceGap } from "./gapMapping";

export { deriveHsc48Verdict } from "./verdict";

export type {
  Hsc48EventDiagnostic,
  Hsc48Metrics,
  Hsc48CoverageFractions,
  Hsc48DiagnosticReport,
  Hsc48BeforeAfter,
  Hsc48ProductionVerdict,
  Hsc48FetchDiagnostic,
  Hsc48ExtractionState,
  Hsc48OutcomeState,
  Hsc48SalePriceState,
} from "./types";
