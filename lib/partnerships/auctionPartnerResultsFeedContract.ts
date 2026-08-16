/**
 * Authorised auction-house POST-AUCTION / RESULTS feed contract.
 *
 * Interface + validation only. Does not invent partners, credentials, or sale prices.
 * Extends the existing auctionPartnerFeedContract; ingestion must still pass HI 4.2.
 */

import { createHash } from "crypto";
import {
  AUCTION_PARTNER_FEED_CONTRACT,
  acceptPartnerSalePrice,
  type AuctionHouseEvidenceContribution,
  type PartnerFeedContract,
} from "./auctionPartnerFeedContract";

export const AUCTION_PARTNER_RESULTS_FEED_VERSION =
  "auction-partner-results-feed-1.1.0";

export const PARTNER_RESULTS_MAX_BATCH = 5;

export type PartnerResultsOutcome =
  | "SOLD"
  | "PASSED_IN"
  | "WITHDRAWN"
  | "CANCELLED"
  | "EXPIRED"
  | "UNKNOWN";

export type PartnerResultsSourceType =
  | "PARTNER_RESULTS_FEED"
  | "PARTNER_API"
  | "PARTNER_EXPORT"
  | "PARTNER_DOCUMENT";

/** Only ACTUAL_SALE_PRICE may become VERIFIED_SALE_PRICE. */
export type PartnerResultsPriceClassification =
  | "ACTUAL_SALE_PRICE"
  | "guide_price"
  | "reserve_price"
  | "asking_price"
  | "listing_price"
  | "advertised_price"
  | "auction_price"
  | "starting_bid"
  | "opening_bid"
  | "estimate"
  | "estimated_value"
  | "valuation"
  | "market_value"
  | "municipal_value"
  | "agent_estimate"
  | "unknown";

export type AuctionPartnerResultRecord = {
  partnerCode: string;
  /** Stable partner result row ID — preferred idempotency key with partnerCode. */
  externalResultId?: string | null;
  externalEventId?: string | null;
  externalPropertyId?: string | null;
  propertyMasterId?: string | null;
  listingPropertyId?: string | null;
  address?: string | null;
  town?: string | null;
  suburb?: string | null;
  province?: string | null;
  auctionDate?: string | null;
  outcome: PartnerResultsOutcome;
  salePrice?: number | null;
  currency?: string | null;
  /** Misclassified prices must be rejected — never treat as sale price. */
  priceClassification?: PartnerResultsPriceClassification | null;
  /** Optional non-sale monetary fields — never mapped to verified sale price. */
  guidePrice?: number | null;
  reservePrice?: number | null;
  auctionPrice?: number | null;
  startingBid?: number | null;
  sourceUrl?: string | null;
  sourceReference?: string | null;
  observedAt: string;
  publishedAt?: string | null;
  evidenceText?: string | null;
  provenance?: {
    sourceType: PartnerResultsSourceType;
    sourceId?: string | null;
    retrievedAt: string;
    contentHash?: string | null;
  } | null;
};

export type PartnerResultsIngestDecision =
  | "IMPORTED"
  | "NO_CHANGE"
  | "REJECTED"
  | "CONFLICT"
  | "INSUFFICIENT_DATA"
  | "UNAUTHORIZED_SOURCE"
  | "AMBIGUOUS_IDENTITY"
  | "IDENTITY_UNRESOLVED"
  | "AUCTION_DATE_MISMATCH"
  | "DRY_RUN_ACCEPT"
  | "DRY_RUN_REJECT";

export type PartnerResultsEvidenceLabel =
  | "VERIFIED_SOLD"
  | "SOLD_WITHOUT_PRICE"
  | "NOT_PROVEN_SOLD"
  | "CONFLICT"
  | "INSUFFICIENT_DATA"
  | "REJECTED";

export type PartnerResultsIdentityResolution =
  | {
      status: "RESOLVED";
      propertyId: string;
      auctionEventId: string | null;
      propertyMasterId: string | null;
      method: string;
      /** Known auction date on the matched event — used for mismatch checks. */
      auctionDate?: string | null;
    }
  | { status: "AMBIGUOUS"; reason: string; candidateIds: string[] }
  | { status: "MISSING"; reason: string }
  | { status: "IDENTITY_UNRESOLVED"; reason: string }
  | {
      status: "AUCTION_DATE_MISMATCH";
      reason: string;
      expected: string;
      received: string;
    };

export type PartnerResultsAuthContext = {
  /** Acquisition / partnership row exists and is operationally active. */
  partnerActive: boolean;
  /** Explicit results-feed licence / agreement present (not public listing fetch). */
  resultsLicenceActive: boolean;
  /**
   * True only after real feed config + validated connection probe.
   * Never set from a bare env flag alone.
   */
  feedConnected: boolean;
};

export type PartnerResultsConnectionAssessment = {
  configured: boolean;
  validated: boolean;
  feedConnected: boolean;
  reasons: string[];
};

export type PartnerResultsDryRunClassifications = {
  authorisation: "AUTHORISED" | "NOT_AUTHORISED";
  payload: "VALID" | "INVALID_PAYLOAD";
  identity:
    | "IDENTITY_MATCH"
    | "IDENTITY_UNRESOLVED"
    | "AMBIGUOUS_IDENTITY"
    | "NOT_EVALUATED";
  auctionDate:
    | "AUCTION_DATE_MATCH"
    | "AUCTION_DATE_MISMATCH"
    | "AUCTION_DATE_MISSING"
    | "NOT_EVALUATED";
  outcome:
    | "SOLD"
    | "SOLD_WITHOUT_PRICE"
    | "NOT_PROVEN_SOLD"
    | "EXPIRED"
    | "WITHDRAWN"
    | "PASSED_IN"
    | "CANCELLED"
    | "UNKNOWN"
    | "NOT_EVALUATED";
  salePrice:
    | "SALE_PRICE_VALID"
    | "SALE_PRICE_MISSING"
    | "SALE_PRICE_REJECTED"
    | "NOT_EVALUATED";
  duplicate: boolean;
};

export type PartnerResultsFeedStatus = {
  contract: "READY" | "NOT_READY";
  partner: "ACTIVE" | "INACTIVE";
  partnerCode: string;
  resultsFeed: "CONNECTED" | "NOT_CONNECTED";
  authorisation: "AUTHORISED" | "NOT_AUTHORISED";
  ingestion: "READY" | "BLOCKED";
  productionWrite: "ALLOWED" | "BLOCKED";
  activePartnerForResults: boolean;
  verifiedResultsReceived: number;
  verifiedSalePrices: number;
  lastSuccessfulIngestion: string | null;
  nextAction: string;
  contractVersion: string;
  listingFeedContractVersion: PartnerFeedContract["version"];
  connection: PartnerResultsConnectionAssessment;
};

export const FORBIDDEN_SALE_PRICE_CLASSIFICATIONS: PartnerResultsPriceClassification[] =
  [
    "guide_price",
    "reserve_price",
    "asking_price",
    "listing_price",
    "advertised_price",
    "auction_price",
    "starting_bid",
    "opening_bid",
    "estimate",
    "estimated_value",
    "valuation",
    "market_value",
    "municipal_value",
    "agent_estimate",
  ];

export const AUCTION_PARTNER_RESULTS_FEED_CONTRACT = {
  version: AUCTION_PARTNER_RESULTS_FEED_VERSION,
  direction:
    "authorised partner results → validation → HI 4.2 / HEQ → verified evidence",
  maxBatch: PARTNER_RESULTS_MAX_BATCH,
  listingFeedContract: AUCTION_PARTNER_FEED_CONTRACT,
  idempotency: ["partnerCode", "externalResultId"] as const,
  acceptedOutcomes: [
    "SOLD",
    "PASSED_IN",
    "WITHDRAWN",
    "CANCELLED",
    "EXPIRED",
    "UNKNOWN",
  ] as PartnerResultsOutcome[],
  salePriceRules: {
    requiresExplicitSold: true as const,
    requiresActualSalePriceClassification: true as const,
    rejectedClassifications: FORBIDDEN_SALE_PRICE_CLASSIFICATIONS,
    currencyDefault: "ZAR" as const,
  },
  provenanceRequired: [
    "partnerCode",
    "observedAt",
    "sourceReferenceOrUrl",
    "provenance.sourceType",
    "provenance.retrievedAt",
  ] as const,
  nextPipeline: "HI42_RESOLUTION" as const,
};

export function clampPartnerResultsBatchLimit(limit: number | undefined): number {
  if (limit == null || !Number.isFinite(limit)) return PARTNER_RESULTS_MAX_BATCH;
  const n = Math.floor(limit);
  if (n < 1) return 1;
  if (n > PARTNER_RESULTS_MAX_BATCH) return PARTNER_RESULTS_MAX_BATCH;
  return n;
}

export function rejectPartnerResultsUnlimitedLimit(
  limit: number | undefined,
): { ok: true; limit: number } | { ok: false; reason: string } {
  if (limit == null) {
    return { ok: true, limit: PARTNER_RESULTS_MAX_BATCH };
  }
  if (!Number.isFinite(limit) || limit < 1) {
    return { ok: false, reason: "Batch limit must be a positive integer ≤ 5" };
  }
  if (limit > PARTNER_RESULTS_MAX_BATCH) {
    return {
      ok: false,
      reason: `Batch limit ${limit} exceeds maximum ${PARTNER_RESULTS_MAX_BATCH}`,
    };
  }
  return { ok: true, limit: Math.floor(limit) };
}

export function partnerResultIdempotencyKey(
  record: Pick<AuctionPartnerResultRecord, "partnerCode" | "externalResultId">,
): string | null {
  const partner = record.partnerCode?.trim();
  const resultId = record.externalResultId?.trim();
  if (!partner || !resultId) return null;
  return `${partner}::${resultId}`;
}

export function hashPartnerResultRecord(
  record: AuctionPartnerResultRecord,
): string {
  const canonical = JSON.stringify({
    partnerCode: record.partnerCode,
    externalResultId: record.externalResultId ?? null,
    externalEventId: record.externalEventId ?? null,
    externalPropertyId: record.externalPropertyId ?? null,
    propertyMasterId: record.propertyMasterId ?? null,
    listingPropertyId: record.listingPropertyId ?? null,
    address: record.address ?? null,
    town: record.town ?? null,
    suburb: record.suburb ?? null,
    province: record.province ?? null,
    auctionDate: record.auctionDate ?? null,
    outcome: record.outcome,
    salePrice: record.salePrice ?? null,
    currency: record.currency ?? null,
    priceClassification: record.priceClassification ?? null,
    sourceUrl: record.sourceUrl ?? null,
    sourceReference: record.sourceReference ?? null,
    observedAt: record.observedAt,
    publishedAt: record.publishedAt ?? null,
    evidenceText: record.evidenceText ?? null,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function normalizeAuctionDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1]!;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return trimmed.toLowerCase();
  return d.toISOString().slice(0, 10);
}

/**
 * Assess whether a results feed is actually connected.
 * A bare env flag is never sufficient — URL + credentials + validated probe required.
 */
export function assessResultsFeedConnection(input: {
  feedUrl?: string | null;
  feedCredentialConfigured?: boolean;
  connectionValidated?: boolean;
  validationReason?: string | null;
}): PartnerResultsConnectionAssessment {
  const reasons: string[] = [];
  const url = input.feedUrl?.trim() ?? "";
  const configured = Boolean(url) && Boolean(input.feedCredentialConfigured);
  if (!url) reasons.push("Results feed URL not configured");
  if (!input.feedCredentialConfigured) {
    reasons.push("Results feed credentials not configured");
  }
  const validated = Boolean(configured && input.connectionValidated);
  if (configured && !input.connectionValidated) {
    reasons.push(
      input.validationReason?.trim() ||
        "Feed connection not validated — probe required before CONNECTED",
    );
  }
  return {
    configured,
    validated,
    feedConnected: validated,
    reasons,
  };
}

export function evaluateResultsFeedAuthorisation(
  ctx: PartnerResultsAuthContext,
): {
  authorised: boolean;
  feedConnected: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!ctx.partnerActive) reasons.push("Partner inactive for results feed");
  if (!ctx.resultsLicenceActive) {
    reasons.push("No active results-feed licence / data agreement");
  }
  if (!ctx.feedConnected) reasons.push("Results feed not connected");
  return {
    authorised: reasons.length === 0,
    feedConnected: ctx.feedConnected,
    reasons,
  };
}

export function buildBiddersChoiceResultsFeedStatus(input: {
  auth: PartnerResultsAuthContext;
  connection?: PartnerResultsConnectionAssessment;
  verifiedResultsReceived?: number;
  verifiedSalePrices?: number;
  lastSuccessfulIngestion?: string | null;
  partnerCode?: string;
}): PartnerResultsFeedStatus {
  const auth = evaluateResultsFeedAuthorisation(input.auth);
  const connection =
    input.connection ??
    assessResultsFeedConnection({
      feedUrl: null,
      feedCredentialConfigured: false,
      connectionValidated: input.auth.feedConnected,
    });
  const contract: PartnerResultsFeedStatus["contract"] = "READY";
  const partner: PartnerResultsFeedStatus["partner"] = input.auth.partnerActive
    ? "ACTIVE"
    : "INACTIVE";
  const resultsFeed: PartnerResultsFeedStatus["resultsFeed"] = connection
    .feedConnected
    ? "CONNECTED"
    : "NOT_CONNECTED";
  const authorisation: PartnerResultsFeedStatus["authorisation"] = auth.authorised
    ? "AUTHORISED"
    : "NOT_AUTHORISED";
  const ingestion: PartnerResultsFeedStatus["ingestion"] = auth.authorised
    ? "READY"
    : "BLOCKED";

  return {
    contract,
    partner,
    partnerCode: input.partnerCode ?? "bidders_choice",
    resultsFeed,
    authorisation,
    ingestion,
    productionWrite: auth.authorised ? "ALLOWED" : "BLOCKED",
    activePartnerForResults: auth.authorised,
    verifiedResultsReceived: input.verifiedResultsReceived ?? 0,
    verifiedSalePrices: input.verifiedSalePrices ?? 0,
    lastSuccessfulIngestion: input.lastSuccessfulIngestion ?? null,
    nextAction:
      "ESTABLISH AUTHORISED PARTNER RESULTS FEED — property identity, auction date, outcome, explicit transaction sale price",
    contractVersion: AUCTION_PARTNER_RESULTS_FEED_VERSION,
    listingFeedContractVersion: AUCTION_PARTNER_FEED_CONTRACT.version,
    connection,
  };
}

export function resolvePartnerResultIdentityHeuristic(
  record: AuctionPartnerResultRecord,
  lookup?: {
    byExternalResultId?: Record<string, PartnerResultsIdentityResolution>;
    byExternalEventId?: Record<string, PartnerResultsIdentityResolution>;
    byExternalPropertyId?: Record<string, PartnerResultsIdentityResolution>;
    byListingPropertyId?: Record<string, PartnerResultsIdentityResolution>;
    byMasterId?: Record<string, PartnerResultsIdentityResolution>;
    byAddressTownDate?: Record<string, PartnerResultsIdentityResolution>;
  },
): PartnerResultsIdentityResolution {
  if (
    record.externalResultId &&
    lookup?.byExternalResultId?.[record.externalResultId]
  ) {
    return lookup.byExternalResultId[record.externalResultId]!;
  }
  if (record.externalEventId && lookup?.byExternalEventId?.[record.externalEventId]) {
    return lookup.byExternalEventId[record.externalEventId]!;
  }
  if (
    record.externalPropertyId &&
    lookup?.byExternalPropertyId?.[record.externalPropertyId]
  ) {
    return lookup.byExternalPropertyId[record.externalPropertyId]!;
  }
  if (
    record.listingPropertyId &&
    lookup?.byListingPropertyId?.[record.listingPropertyId]
  ) {
    return lookup.byListingPropertyId[record.listingPropertyId]!;
  }
  if (record.propertyMasterId && lookup?.byMasterId?.[record.propertyMasterId]) {
    return lookup.byMasterId[record.propertyMasterId]!;
  }

  const hasExternal =
    Boolean(record.externalResultId?.trim()) ||
    Boolean(record.externalEventId?.trim()) ||
    Boolean(record.externalPropertyId?.trim()) ||
    Boolean(record.listingPropertyId?.trim()) ||
    Boolean(record.propertyMasterId?.trim());

  if (!hasExternal) {
    const town = record.town?.trim();
    const address = record.address?.trim();
    const date = record.auctionDate?.trim();
    if (!town && !address) {
      return {
        status: "IDENTITY_UNRESOLVED",
        reason: "Missing property identity",
      };
    }
    if (!date) {
      return { status: "MISSING", reason: "Missing auction date" };
    }
    const key = `${(address ?? "").toLowerCase()}|${(town ?? "").toLowerCase()}|${date}`;
    if (lookup?.byAddressTownDate?.[key]) {
      return lookup.byAddressTownDate[key]!;
    }
    return {
      status: "IDENTITY_UNRESOLVED",
      reason: "Identity not resolvable without external IDs or known address match",
    };
  }

  if (!record.auctionDate?.trim() && !record.externalEventId?.trim()) {
    return { status: "MISSING", reason: "Missing auction date" };
  }

  return {
    status: "IDENTITY_UNRESOLVED",
    reason: "Identity keys present but no matching property/event",
  };
}

export function validateAuctionDateMatch(input: {
  recordAuctionDate?: string | null;
  expectedAuctionDate?: string | null;
}):
  | { ok: true; classification: "AUCTION_DATE_MATCH" | "AUCTION_DATE_MISSING" }
  | {
      ok: false;
      classification: "AUCTION_DATE_MISMATCH";
      expected: string;
      received: string;
    } {
  const received = normalizeAuctionDate(input.recordAuctionDate);
  const expected = normalizeAuctionDate(input.expectedAuctionDate);
  if (!received) {
    return { ok: true, classification: "AUCTION_DATE_MISSING" };
  }
  if (!expected) {
    return { ok: true, classification: "AUCTION_DATE_MATCH" };
  }
  if (received !== expected) {
    return {
      ok: false,
      classification: "AUCTION_DATE_MISMATCH",
      expected,
      received,
    };
  }
  return { ok: true, classification: "AUCTION_DATE_MATCH" };
}

export type EvaluatePartnerResultInput = {
  record: AuctionPartnerResultRecord;
  auth: PartnerResultsAuthContext;
  identity: PartnerResultsIdentityResolution;
  /** Prior observation content hash for same identity+source. */
  existingContentHash?: string | null;
  /** Prior idempotency key seen for partnerCode+externalResultId. */
  existingExternalResultKey?: string | null;
  /** Prior verified sale price for same event (conflict detection). */
  existingVerifiedSalePrice?: number | null;
  dryRun?: boolean;
};

export type EvaluatePartnerResultOutput = {
  decision: PartnerResultsIngestDecision;
  evidenceLabel: PartnerResultsEvidenceLabel;
  reasons: string[];
  salePriceAccepted: boolean;
  contentHash: string;
  idempotencyKey: string | null;
  nextPipeline: "HI42_RESOLUTION" | null;
  contribution: AuctionHouseEvidenceContribution | null;
  classifications: PartnerResultsDryRunClassifications;
};

function hasSourceReference(record: AuctionPartnerResultRecord): boolean {
  return Boolean(record.sourceUrl?.trim() || record.sourceReference?.trim());
}

function isForbiddenClassification(
  classification: PartnerResultsPriceClassification | null | undefined,
): boolean {
  if (!classification || classification === "ACTUAL_SALE_PRICE") return false;
  if (classification === "unknown") return true;
  return FORBIDDEN_SALE_PRICE_CLASSIFICATIONS.includes(classification);
}

function emptyClassifications(): PartnerResultsDryRunClassifications {
  return {
    authorisation: "NOT_AUTHORISED",
    payload: "INVALID_PAYLOAD",
    identity: "NOT_EVALUATED",
    auctionDate: "NOT_EVALUATED",
    outcome: "NOT_EVALUATED",
    salePrice: "NOT_EVALUATED",
    duplicate: false,
  };
}

export function mapResultToEvidenceContribution(
  record: AuctionPartnerResultRecord,
  opts?: { salePriceAccepted: boolean },
): AuctionHouseEvidenceContribution {
  const outcome: AuctionHouseEvidenceContribution["outcome"] =
    record.outcome === "EXPIRED" ? "UNKNOWN" : record.outcome;

  return {
    partnerCode: record.partnerCode,
    partnerName: record.partnerCode,
    propertyExternalId: record.externalPropertyId ?? null,
    propertyMasterId: record.propertyMasterId ?? null,
    auctionEventExternalId: record.externalEventId ?? null,
    auctionDate: record.auctionDate ?? null,
    outcome,
    salePrice: opts?.salePriceAccepted ? (record.salePrice ?? null) : null,
    currency: "ZAR",
    verifiedSale: Boolean(opts?.salePriceAccepted),
    sourceUrl: record.sourceUrl ?? record.sourceReference ?? null,
    observedAt: record.observedAt,
    evidenceText:
      record.evidenceText ??
      `Partner results feed ${record.outcome}${
        opts?.salePriceAccepted && record.salePrice != null
          ? ` salePrice=${record.salePrice}`
          : ""
      }${
        record.externalResultId
          ? ` externalResultId=${record.externalResultId}`
          : ""
      }`,
    confidence: opts?.salePriceAccepted ? "high" : "medium",
  };
}

/**
 * Pure evaluation — no DB writes. Dry-run and execute share this gate.
 */
export function evaluatePartnerResultRecord(
  input: EvaluatePartnerResultInput,
): EvaluatePartnerResultOutput {
  const reasons: string[] = [];
  const contentHash =
    input.record.provenance?.contentHash?.trim() ||
    hashPartnerResultRecord(input.record);
  const dryRun = input.dryRun !== false;
  const idempotencyKey = partnerResultIdempotencyKey(input.record);
  const classifications = emptyClassifications();

  const auth = evaluateResultsFeedAuthorisation(input.auth);
  classifications.authorisation = auth.authorised
    ? "AUTHORISED"
    : "NOT_AUTHORISED";

  if (!auth.authorised) {
    return {
      decision: "UNAUTHORIZED_SOURCE",
      evidenceLabel: "REJECTED",
      reasons: auth.reasons,
      salePriceAccepted: false,
      contentHash,
      idempotencyKey,
      nextPipeline: null,
      contribution: null,
      classifications,
    };
  }

  if (!input.record.partnerCode?.trim()) {
    reasons.push("missing partnerCode");
  }
  if (!input.record.observedAt?.trim()) {
    reasons.push("missing observedAt");
  }
  if (!hasSourceReference(input.record)) {
    reasons.push("missing source reference");
  }
  if (!input.record.provenance?.sourceType) {
    reasons.push("missing provenance");
  } else if (!input.record.provenance.retrievedAt?.trim()) {
    reasons.push("missing provenance.retrievedAt");
  }

  if (!input.record.auctionDate?.trim()) {
    reasons.push("missing auction date");
    classifications.auctionDate = "AUCTION_DATE_MISSING";
  }

  const currency = (input.record.currency ?? "ZAR").trim().toUpperCase();
  if (currency && currency !== "ZAR") {
    reasons.push(`invalid currency: ${currency}`);
  }

  // Non-sale monetary fields must never become salePrice when salePrice absent
  if (
    input.record.salePrice == null &&
    (input.record.guidePrice != null ||
      input.record.reservePrice != null ||
      input.record.auctionPrice != null ||
      input.record.startingBid != null)
  ) {
    // Informational only — not a hard reject; sale remains missing
    reasons.push(
      "Non-sale monetary fields present (guide/reserve/auction/starting) — not used as sale price",
    );
  }

  if (input.identity.status === "AMBIGUOUS") {
    classifications.identity = "AMBIGUOUS_IDENTITY";
    classifications.payload = "INVALID_PAYLOAD";
    return {
      decision: "AMBIGUOUS_IDENTITY",
      evidenceLabel: "INSUFFICIENT_DATA",
      reasons: [input.identity.reason, ...reasons],
      salePriceAccepted: false,
      contentHash,
      idempotencyKey,
      nextPipeline: null,
      contribution: null,
      classifications,
    };
  }

  if (
    input.identity.status === "IDENTITY_UNRESOLVED" ||
    (input.identity.status === "MISSING" &&
      input.identity.reason.toLowerCase().includes("identity"))
  ) {
    classifications.identity = "IDENTITY_UNRESOLVED";
    classifications.payload = "INVALID_PAYLOAD";
    return {
      decision: "IDENTITY_UNRESOLVED",
      evidenceLabel: "INSUFFICIENT_DATA",
      reasons: [input.identity.reason, ...reasons],
      salePriceAccepted: false,
      contentHash,
      idempotencyKey,
      nextPipeline: null,
      contribution: null,
      classifications,
    };
  }

  if (input.identity.status === "AUCTION_DATE_MISMATCH") {
    classifications.identity = "IDENTITY_MATCH";
    classifications.auctionDate = "AUCTION_DATE_MISMATCH";
    classifications.payload = "INVALID_PAYLOAD";
    return {
      decision: "AUCTION_DATE_MISMATCH",
      evidenceLabel: "REJECTED",
      reasons: [input.identity.reason, ...reasons],
      salePriceAccepted: false,
      contentHash,
      idempotencyKey,
      nextPipeline: null,
      contribution: null,
      classifications,
    };
  }

  if (input.identity.status === "MISSING") {
    const identityReason = input.identity.reason.toLowerCase();
    const decision: PartnerResultsIngestDecision = identityReason.includes(
      "auction date",
    )
      ? "REJECTED"
      : "IDENTITY_UNRESOLVED";
    classifications.identity =
      decision === "IDENTITY_UNRESOLVED"
        ? "IDENTITY_UNRESOLVED"
        : "NOT_EVALUATED";
    if (identityReason.includes("auction date")) {
      classifications.auctionDate = "AUCTION_DATE_MISSING";
    }
    classifications.payload = "INVALID_PAYLOAD";
    return {
      decision,
      evidenceLabel: "INSUFFICIENT_DATA",
      reasons: [input.identity.reason, ...reasons],
      salePriceAccepted: false,
      contentHash,
      idempotencyKey,
      nextPipeline: null,
      contribution: null,
      classifications,
    };
  }

  // RESOLVED identity — check auction date against matched event
  classifications.identity = "IDENTITY_MATCH";
  const dateCheck = validateAuctionDateMatch({
    recordAuctionDate: input.record.auctionDate,
    expectedAuctionDate: input.identity.auctionDate ?? null,
  });
  if (!dateCheck.ok) {
    classifications.auctionDate = "AUCTION_DATE_MISMATCH";
    classifications.payload = "INVALID_PAYLOAD";
    return {
      decision: "AUCTION_DATE_MISMATCH",
      evidenceLabel: "REJECTED",
      reasons: [
        `AUCTION_DATE_MISMATCH: expected ${dateCheck.expected}, received ${dateCheck.received}`,
        ...reasons,
      ],
      salePriceAccepted: false,
      contentHash,
      idempotencyKey,
      nextPipeline: null,
      contribution: null,
      classifications,
    };
  }
  classifications.auctionDate = dateCheck.classification;

  if (
    (idempotencyKey &&
      input.existingExternalResultKey &&
      input.existingExternalResultKey === idempotencyKey) ||
    (input.existingContentHash && input.existingContentHash === contentHash)
  ) {
    classifications.payload = "VALID";
    classifications.duplicate = true;
    classifications.outcome =
      input.record.outcome === "SOLD" ? "SOLD_WITHOUT_PRICE" : input.record.outcome;
    classifications.salePrice =
      input.record.salePrice != null ? "SALE_PRICE_MISSING" : "SALE_PRICE_MISSING";
    return {
      decision: "NO_CHANGE",
      evidenceLabel: "INSUFFICIENT_DATA",
      reasons: [
        idempotencyKey && input.existingExternalResultKey === idempotencyKey
          ? "Duplicate partnerCode+externalResultId — NO_CHANGE"
          : "Content hash unchanged — duplicate observation",
      ],
      salePriceAccepted: false,
      contentHash,
      idempotencyKey,
      nextPipeline: null,
      contribution: null,
      classifications,
    };
  }

  const hardReject: string[] = reasons.filter(
    (r) =>
      r.startsWith("missing ") ||
      r.startsWith("invalid currency") ||
      r.startsWith("invalid negative"),
  );

  let salePriceAccepted = false;
  const priceRejectReasons: string[] = [];

  if (input.record.salePrice != null) {
    if (input.record.salePrice <= 0 || !Number.isFinite(input.record.salePrice)) {
      hardReject.push("invalid negative or non-numeric price");
    } else if (isForbiddenClassification(input.record.priceClassification)) {
      priceRejectReasons.push(
        `Forbidden price classification: ${input.record.priceClassification}`,
      );
    } else if (input.record.outcome !== "SOLD") {
      priceRejectReasons.push(
        "sale price only accepted with explicit SOLD outcome",
      );
    } else {
      const contributionProbe = mapResultToEvidenceContribution(input.record, {
        salePriceAccepted: true,
      });
      const priceGate = acceptPartnerSalePrice(contributionProbe);
      if (!priceGate.ok) {
        priceRejectReasons.push(priceGate.reason);
      } else if (
        input.existingVerifiedSalePrice != null &&
        input.existingVerifiedSalePrice !== input.record.salePrice
      ) {
        classifications.payload = "VALID";
        classifications.salePrice = "SALE_PRICE_REJECTED";
        classifications.outcome = "SOLD";
        return {
          decision: "CONFLICT",
          evidenceLabel: "CONFLICT",
          reasons: [
            `Conflicting sale prices: existing ${input.existingVerifiedSalePrice} vs incoming ${input.record.salePrice}`,
          ],
          salePriceAccepted: false,
          contentHash,
          idempotencyKey,
          nextPipeline: "HI42_RESOLUTION",
          contribution: mapResultToEvidenceContribution(input.record, {
            salePriceAccepted: false,
          }),
          classifications,
        };
      } else {
        salePriceAccepted = true;
      }
    }
  }

  if (hardReject.length > 0) {
    classifications.payload = "INVALID_PAYLOAD";
    classifications.salePrice = "SALE_PRICE_REJECTED";
    return {
      decision: dryRun ? "DRY_RUN_REJECT" : "REJECTED",
      evidenceLabel: "REJECTED",
      reasons: hardReject,
      salePriceAccepted: false,
      contentHash,
      idempotencyKey,
      nextPipeline: null,
      contribution: null,
      classifications,
    };
  }

  let evidenceLabel: PartnerResultsEvidenceLabel = "NOT_PROVEN_SOLD";
  if (input.record.outcome === "SOLD") {
    evidenceLabel = salePriceAccepted ? "VERIFIED_SOLD" : "SOLD_WITHOUT_PRICE";
  }

  classifications.payload = "VALID";
  classifications.outcome =
    input.record.outcome === "SOLD"
      ? salePriceAccepted
        ? "SOLD"
        : "SOLD_WITHOUT_PRICE"
      : input.record.outcome;
  classifications.salePrice = salePriceAccepted
    ? "SALE_PRICE_VALID"
    : input.record.salePrice != null || priceRejectReasons.length > 0
      ? "SALE_PRICE_REJECTED"
      : "SALE_PRICE_MISSING";

  const contribution = mapResultToEvidenceContribution(input.record, {
    salePriceAccepted,
  });

  return {
    decision: dryRun ? "DRY_RUN_ACCEPT" : "IMPORTED",
    evidenceLabel,
    reasons: [
      ...priceRejectReasons,
      ...reasons.filter((r) => r.startsWith("Non-sale monetary")),
    ],
    salePriceAccepted,
    contentHash,
    idempotencyKey,
    nextPipeline: "HI42_RESOLUTION",
    contribution,
    classifications,
  };
}
