import type { Hi50IntelligenceReport, Hi50RateValue } from "@/lib/intelligence/historicalIntelligence50/types";

export type Hi51RecoverySnapshot = {
  historicalEvents: number;
  fetchAttempted: number;
  fetchSuccessful: number;
  fetchFailed: number;
  snapshots: number;
  extractions: number;
  outcomeEvidence: number;
  verifiedSold: number;
  verifiedSalePrices: number;
  comparableReady: number;
  marketReadyTowns: number;
  soldWithoutPrice: number;
};

export type Hi51RecoveryDelta = {
  fetchAttempts: number;
  fetchSuccessful: number;
  fetchFailed: number;
  snapshots: number;
  extractions: number;
  outcomeEvidence: number;
  verifiedSold: number;
  verifiedSalePrices: number;
  comparableReady: number;
  marketReadyTowns: number;
  lines: string[];
  improved: boolean;
};

export type Hi51ChainSuccessRates = {
  fetchSuccessRate: Hi50RateValue;
  snapshotRate: Hi50RateValue;
  extractionRate: Hi50RateValue;
  outcomeEvidenceRate: Hi50RateValue;
  salePriceRate: Hi50RateValue;
  denominators: {
    fetchAttempts: number;
    successfulFetches: number;
    snapshots: number;
    extractions: number;
    outcomeEvidence: number;
  };
};

export type Hi51P1BatchSlot = {
  batchNumber: number;
  processed: number;
  remaining: number;
  status: "completed" | "planned" | "next";
};

export type Hi51P1Progress = {
  originalCandidates: number;
  processed: number;
  remaining: number;
  batchSize: number;
  batches: Hi51P1BatchSlot[];
};

export type Hi51BatchHistoryRecord = {
  batchId: string;
  action: string;
  operator: string | null;
  started: string | null;
  completed: string | null;
  eventsSelected: number;
  eventsSucceeded: number;
  eventsFailed: number;
  snapshotsCreated: number;
  outcomesExtracted: number;
  pricesVerified: number;
};

export type Hi51DryRunCandidate = {
  eventId: string | null;
  observationId: string;
  propertyMasterId: string | null;
  listingPropertyId?: string | null;
  propertyLabel: string;
  town: string | null;
  agency: string | null;
  source: string | null;
  sourceUrl: string | null;
  priority: number;
  currentState: string;
  lastAttempt: string | null;
  whyEligible?: string;
  expectedAction: string;
};

export type Hi51FetchResultsSummary = {
  attempted: number;
  successful: number;
  failed: number;
  retryable: number;
  permanent: number;
  legacy: number;
};

export type Hi51InvestorEvidenceLabels = {
  proven: string[];
  tested: string[];
  missing: string[];
  reviewRequired: string[];
};

export type Hi51IntelligenceReport = Hi50IntelligenceReport & {
  version: string;
  recoverySnapshot: Hi51RecoverySnapshot;
  chainSuccessRates: Hi51ChainSuccessRates;
  p1Progress: Hi51P1Progress;
  fetchResults: Hi51FetchResultsSummary;
  batchHistory: Hi51BatchHistoryRecord[];
  investorLabels: Hi51InvestorEvidenceLabels;
  legacyRecoveryCandidates: number;
  missingExtractionCandidates: number;
  p4ReviewCount: number;
};
