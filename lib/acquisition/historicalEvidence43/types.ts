import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { Hea43SourceTier } from "./config";

export type Hea43AcquisitionState =
  | "UNRESOLVED"
  | "SOURCE_FOUND"
  | "SOURCE_NOT_FOUND"
  | "EXTRACTED"
  | "VERIFIED"
  | "CONFLICT"
  | "REVIEW_REQUIRED"
  | "INSUFFICIENT_DATA"
  | "LICENSE_BLOCKED"
  | "FETCH_FAILED"
  | "NO_CHANGE";

export type Hea43ReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SPLIT_IDENTITY"
  | "CONFLICT_RESOLVED";

export type Hea43SourceCandidate = {
  sourceUrl: string;
  sourceType: Hea43SourceTier | "UNKNOWN";
  connector: string | null;
  partner: string | null;
  score: number;
  licensed: boolean;
  exactUrlMatch: boolean;
  identityStrength: "strong" | "medium" | "weak";
  notes: string[];
};

export type Hea43EvidenceObject = {
  eventId: string | null;
  propertyMasterId: string | null;
  listingPropertyId: string | null;
  sourceUrl: string | null;
  sourceSnapshotId: string | null;
  sourceType: string | null;
  sourcePublishedAt: string | null;
  fetchedAt: string | null;
  evidenceText: string | null;
  evidenceHash: string | null;
  extractedOutcome: string | null;
  extractedSalePrice: number | null;
  confidence: string | null;
  identityConfidence: string | null;
};

export type Hea43QueueItem = {
  priority: 1 | 2 | 3 | 4;
  propertyId: string;
  auctionEventId: string | null;
  propertyMasterId: string | null;
  town: string | null;
  agency: string | null;
  sourceUrl: string | null;
  reason: string;
  candidates: Hea43SourceCandidate[];
  identityStrength: "strong" | "medium" | "weak";
};

export type Hea43AcquisitionFunnel = {
  eventsRequiringEnrichment: number;
  sourcesDiscovered: number;
  sourcesFetched: number;
  httpSuccess: number;
  httpFailed: number;
  sourceUnavailable: number;
  licenseBlocked: number;
  outcomesExtracted: number;
  salePricesExtracted: number;
  verified: number;
  conflicts: number;
  reviewRequired: number;
  insufficientData: number;
  notFound: number;
  noChange: number;
};

export type Hea43AcquireResult = {
  ok: boolean;
  dryRun: boolean;
  propertyId: string;
  auctionEventId: string | null;
  state: Hea43AcquisitionState;
  outcome: string | null;
  salePrice: number | null;
  resolutionState: string | null;
  message: string;
  candidates: Hea43SourceCandidate[];
  evidence: Hea43EvidenceObject | null;
};

export type Hea43BatchResult = {
  ok: boolean;
  runId: string;
  dryRun: boolean;
  version: string;
  processed: number;
  funnel: Hea43AcquisitionFunnel;
  results: Hea43AcquireResult[];
  message: string;
};

export type Hea43SearchContext = {
  event: HistoricalEventObservation;
  externalListingId?: string | null;
  partnerReference?: string | null;
};
