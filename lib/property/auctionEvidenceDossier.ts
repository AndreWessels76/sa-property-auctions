/**
 * Auction Evidence Dossier — presentation assembler over existing intelligence.
 * No parallel engines. Never fabricates outcomes or sale prices.
 */

export const AUCTION_EVIDENCE_DOSSIER_VERSION = "auction-evidence-dossier-1.0.0";

export const DOSSIER_POSITIONING = {
  primary: "Don't just find the auction. Prove what happened.",
  secondary: "South Africa's property-auction intelligence platform.",
  alternatives: [
    "Auction intelligence backed by evidence.",
    "Know the auction. Know the evidence. Know what happened.",
  ],
} as const;

export type AuctionTruthStatus =
  | "VERIFIED"
  | "SOURCE_CONFIRMED"
  | "EVIDENCE_INCOMPLETE"
  | "REVIEW_REQUIRED"
  | "CONFLICT"
  | "INSUFFICIENT_DATA";

export type DossierFieldStatus =
  | "PROVEN"
  | "SOURCE_CONFIRMED"
  | "EXTRACTED"
  | "UNKNOWN"
  | "CONFLICT"
  | "REVIEW_REQUIRED"
  | "INSUFFICIENT_DATA";

export type DossierClaim = {
  label: string;
  value: string | null;
  status: DossierFieldStatus;
  why: string;
  source?: string | null;
  sourceUrl?: string | null;
  observedAt?: string | null;
  confidence?: string | null;
  evidenceType?: string | null;
  resolutionState?: string | null;
};

export type DossierTimelineEvent = {
  auctionEventId: string | null;
  auctionDate: string | null;
  outcome: string;
  salePriceDisplay: string;
  salePriceVerified: boolean;
  sourceUrl: string | null;
  confidence: string | null;
  truthStatus: AuctionTruthStatus;
  notes: string[];
};

export type DossierEvidenceChainStep = {
  key: string;
  label: string;
  status: "present" | "missing" | "partial" | "blocked";
  detail: string;
};

export type DossierInvestorView = {
  whatHappened: string[];
  whatIsProven: string[];
  whatIsUnknown: string[];
  whatMarketSays: string[];
  whatToInvestigate: string[];
};

export type DossierComparableSummary = {
  count: number;
  confidence: string | null;
  insufficient: boolean;
  reason: string | null;
};

/** Explicit outcome labels for dossier UI — never inferred SOLD. */
export type DossierOutcomeLabel =
  | "VERIFIED SOLD"
  | "SOLD WITHOUT PRICE"
  | "NOT PROVEN SOLD"
  | "CONFLICT"
  | "INSUFFICIENT DATA";

export type AuctionEvidenceDossier = {
  version: string;
  generatedAt: string;
  propertyId: string;
  propertyMasterId: string | null;
  positioning: typeof DOSSIER_POSITIONING;
  headline: string;
  subheadline: string;
  truthStatus: AuctionTruthStatus;
  truthWhy: string;
  outcomeLabel: DossierOutcomeLabel;
  identityClaims: DossierClaim[];
  saleOutcome: DossierClaim;
  salePrice: DossierClaim;
  timeline: DossierTimelineEvent[];
  evidenceChain: DossierEvidenceChainStep[];
  investorView: DossierInvestorView;
  comparables: DossierComparableSummary;
  market: {
    medianDisplay: string;
    thresholdRequired: number;
    verifiedSalesAvailable: number;
    insufficient: boolean;
  };
  coverage: {
    engineStatus: "READY" | "BLOCKED";
    dataCoverage: "SUFFICIENT" | "INSUFFICIENT";
    historicalEvents: number;
    verifiedSold: number;
    verifiedSalePrices: number;
    comparableReady: number;
  };
  provenanceSummary: {
    sourcesChecked: number;
    lastChecked: string | null;
    catalogueSafe: boolean;
  };
};

function mapResearchStatus(status: string): DossierFieldStatus {
  const s = status.toLowerCase();
  if (s === "verified") return "PROVEN";
  if (s === "source_confirmed") return "SOURCE_CONFIRMED";
  if (s === "extracted") return "EXTRACTED";
  if (s === "pending_verification") return "REVIEW_REQUIRED";
  if (s === "unavailable" || s === "not_supplied") return "UNKNOWN";
  return "UNKNOWN";
}

function deriveEventTruth(input: {
  outcome: string;
  salePrice: number | null;
  confidence: string | null;
}): AuctionTruthStatus {
  const outcome = input.outcome.toUpperCase();
  if (outcome === "SOLD" && input.salePrice != null && input.confidence === "high") {
    return "VERIFIED";
  }
  if (
    outcome === "SOLD" ||
    outcome === "WITHDRAWN" ||
    outcome === "CANCELLED" ||
    outcome === "PASSED_IN"
  ) {
    if (input.confidence === "high" || input.confidence === "medium") {
      return "SOURCE_CONFIRMED";
    }
    return "EVIDENCE_INCOMPLETE";
  }
  if (outcome === "UNKNOWN" || outcome === "COMPLETED_UNKNOWN" || outcome === "EXPIRED") {
    return "INSUFFICIENT_DATA";
  }
  return "EVIDENCE_INCOMPLETE";
}

export function deriveOverallTruthStatus(input: {
  overallQuality?: string | null;
  conflicts?: number;
  reviewRequired?: boolean;
  verifiedSold: number;
  verifiedSalePrices: number;
  eventCount: number;
}): AuctionTruthStatus {
  if ((input.conflicts ?? 0) > 0) return "CONFLICT";
  if (input.reviewRequired) return "REVIEW_REQUIRED";
  const q = (input.overallQuality ?? "").toUpperCase();
  if (q === "CONFLICT") return "CONFLICT";
  if (q === "REVIEW_REQUIRED" || q === "LOW") return "REVIEW_REQUIRED";
  if (input.verifiedSold > 0 && input.verifiedSalePrices > 0) return "VERIFIED";
  if (input.verifiedSold > 0) return "SOURCE_CONFIRMED";
  if (input.eventCount > 0 && q && q !== "INSUFFICIENT_DATA") return "EVIDENCE_INCOMPLETE";
  return "INSUFFICIENT_DATA";
}

export function formatSalePriceDisplay(input: {
  salePrice: number | null;
  verified: boolean;
}): string {
  if (!input.verified || input.salePrice == null) {
    return "Sale price not verified.";
  }
  return `R${input.salePrice.toLocaleString("en-ZA")}`;
}

export function deriveDossierOutcomeLabel(input: {
  truthStatus: AuctionTruthStatus;
  verifiedSold: number;
  verifiedSalePrices: number;
  soldWithoutPrice?: number;
}): DossierOutcomeLabel {
  if (input.truthStatus === "CONFLICT") return "CONFLICT";
  if (input.verifiedSold > 0 && input.verifiedSalePrices > 0) return "VERIFIED SOLD";
  if (input.verifiedSold > 0 || (input.soldWithoutPrice ?? 0) > 0) return "SOLD WITHOUT PRICE";
  if (input.truthStatus === "INSUFFICIENT_DATA") return "INSUFFICIENT DATA";
  return "NOT PROVEN SOLD";
}

/** Reject non-sale price kinds — never map guide/reserve/auction/estimate to sale. */
export function isRejectedPriceKind(kind: string | null | undefined): boolean {
  if (!kind) return false;
  const k = kind.toLowerCase().replace(/\s+/g, "_");
  return [
    "guide",
    "guide_price",
    "reserve",
    "reserve_price",
    "asking",
    "asking_price",
    "auction_price",
    "starting_bid",
    "opening_bid",
    "estimate",
    "estimated_value",
    "valuation",
  ].includes(k);
}

export function buildAuctionEvidenceDossier(input: {
  propertyId: string;
  propertyTitle: string | null;
  propertyMasterId: string | null;
  researchFields: Array<{ label: string; value: string | null; status: string }>;
  timelineEvents: Array<{
    auctionEventId: string | null;
    auctionDate: string | null;
    outcome: string;
    salePrice: number | null;
    sourceUrl: string | null;
    confidence: string | null;
  }>;
  evidenceQuality?: {
    overallQuality: string;
    outcomeStatus?: string | null;
    outcomeValue?: string | null;
    salePriceStatus?: string | null;
    salePriceValue?: number | null;
    conflicts: string[];
    missingEvidence: string[];
    sourceTier?: string | null;
  } | null;
  investor?: {
    whatWeKnow: string[];
    whatWeDoNotKnow: string[];
    whatNeedsVerification: string[];
    decisionStatus?: string | null;
    acquisitionHints?: string[];
  } | null;
  acquisition?: {
    stoppingPoint?: string | null;
    proven: string[];
    tested: string[];
    missing: string[];
    reviewRequired: string[];
  } | null;
  historicalSummary?: {
    historicalEvents: number;
    confirmedSales: number;
  } | null;
  performance?: {
    verifiedSalePrices: number;
    comparableCount: number;
    comparableConfidence: string | null;
  } | null;
  marketThreshold?: number;
  comparableMinimum?: number;
}): AuctionEvidenceDossier {
  const marketThreshold = input.marketThreshold ?? 5;
  const comparableMinimum = input.comparableMinimum ?? 3;
  const events = input.timelineEvents;
  const verifiedSalePrices = input.performance?.verifiedSalePrices ?? 0;
  const verifiedSold = events.filter(
    (e) => e.outcome.toUpperCase() === "SOLD" && e.salePrice != null,
  ).length;
  // Prefer explicit performance count when present
  const soldCount =
    input.historicalSummary?.confirmedSales ??
    events.filter((e) => e.outcome.toUpperCase() === "SOLD").length;

  const truthStatus = deriveOverallTruthStatus({
    overallQuality: input.evidenceQuality?.overallQuality,
    conflicts: input.evidenceQuality?.conflicts.length ?? 0,
    reviewRequired: (input.acquisition?.reviewRequired.length ?? 0) > 0,
    verifiedSold: soldCount,
    verifiedSalePrices,
    eventCount: events.length,
  });

  const saleVerified =
    input.evidenceQuality?.salePriceStatus === "VERIFIED" &&
    input.evidenceQuality.salePriceValue != null;

  const salePriceValue = saleVerified ? input.evidenceQuality!.salePriceValue! : null;

  const truthWhy =
    truthStatus === "VERIFIED"
      ? "Explicit source-backed sale evidence supports the claim."
      : truthStatus === "SOURCE_CONFIRMED"
        ? "Source confirms relevant information; complete verification is not yet available."
        : truthStatus === "CONFLICT"
          ? "Sources disagree — human review required."
          : truthStatus === "REVIEW_REQUIRED"
            ? "Ambiguous or incomplete evidence requires human review."
            : truthStatus === "EVIDENCE_INCOMPLETE"
              ? "Some evidence exists but critical fields remain missing."
              : "No explicit post-auction sale evidence found.";

  const identityClaims: DossierClaim[] = input.researchFields.map((f) => ({
    label: f.label,
    value: f.value,
    status: mapResearchStatus(f.status),
    why:
      f.value == null
        ? "Not supplied by auction source — never fabricated."
        : `Field status: ${f.status.replace(/_/g, " ")}.`,
  }));

  const soldWithoutPrice = Math.max(0, soldCount - verifiedSalePrices);

  const outcomeLabel = deriveDossierOutcomeLabel({
    truthStatus,
    verifiedSold: soldCount,
    verifiedSalePrices,
    soldWithoutPrice,
  });

  const saleOutcome: DossierClaim = {
    label: "Sale outcome",
    value: outcomeLabel,
    status:
      truthStatus === "VERIFIED"
        ? "PROVEN"
        : truthStatus === "SOURCE_CONFIRMED"
          ? "SOURCE_CONFIRMED"
          : truthStatus === "CONFLICT"
            ? "CONFLICT"
            : truthStatus === "REVIEW_REQUIRED"
              ? "REVIEW_REQUIRED"
              : "INSUFFICIENT_DATA",
    why: truthWhy,
    source: input.evidenceQuality?.sourceTier ?? null,
    confidence: input.evidenceQuality?.outcomeStatus ?? null,
  };

  const salePrice: DossierClaim = {
    label: "Sale price",
    value: formatSalePriceDisplay({
      salePrice: salePriceValue,
      verified: saleVerified,
    }),
    status: saleVerified ? "PROVEN" : "INSUFFICIENT_DATA",
    why: saleVerified
      ? "Explicit verified sale price with source-backed evidence."
      : "Sale price not verified. Guide, reserve, auction price, starting bid and estimates are never treated as sale price.",
    confidence: input.evidenceQuality?.salePriceStatus ?? null,
  };

  const timeline: DossierTimelineEvent[] = events.map((e) => {
    const verified = e.salePrice != null && e.confidence === "high" && e.outcome.toUpperCase() === "SOLD";
    const status = deriveEventTruth({
      outcome: e.outcome,
      salePrice: e.salePrice,
      confidence: e.confidence,
    });
    return {
      auctionEventId: e.auctionEventId,
      auctionDate: e.auctionDate,
      outcome: e.outcome,
      salePriceDisplay: formatSalePriceDisplay({
        salePrice: e.salePrice,
        verified,
      }),
      salePriceVerified: verified,
      sourceUrl: e.sourceUrl,
      confidence: e.confidence,
      truthStatus: status,
      notes:
        e.outcome.toUpperCase() === "EXPIRED" || e.outcome.toUpperCase() === "COMPLETED_UNKNOWN"
          ? ["Expired/completed is not treated as SOLD."]
          : [],
    };
  });

  const sourcesChecked = new Set(
    events.map((e) => e.sourceUrl).filter(Boolean) as string[],
  ).size;

  const evidenceChain: DossierEvidenceChainStep[] = [
    {
      key: "property_master",
      label: "Property Master",
      status: input.propertyMasterId ? "present" : "missing",
      detail: input.propertyMasterId ? "Linked" : "Not linked",
    },
    {
      key: "auction_event",
      label: "Auction Event",
      status: events.length > 0 ? "present" : "missing",
      detail: `${events.length} event(s)`,
    },
    {
      key: "licensed_source",
      label: "Licensed Source",
      status: sourcesChecked > 0 ? "present" : "partial",
      detail: sourcesChecked > 0 ? `${sourcesChecked} source URL(s)` : "No source URLs on chain",
    },
    {
      key: "fetch",
      label: "Fetch",
      status: input.acquisition?.stoppingPoint ? "partial" : "missing",
      detail: input.acquisition?.stoppingPoint ?? "No acquisition diagnostic",
    },
    {
      key: "snapshot",
      label: "Snapshot",
      status: (input.acquisition?.proven ?? []).some((p) => /snapshot/i.test(p))
        ? "present"
        : "missing",
      detail: "From existing HEA/HSC diagnostic",
    },
    {
      key: "extraction",
      label: "Extraction",
      status: (input.acquisition?.proven ?? []).some((p) => /extract/i.test(p))
        ? "present"
        : "partial",
      detail: "Deterministic extraction only",
    },
    {
      key: "resolution",
      label: "Resolution",
      status:
        truthStatus === "VERIFIED" || truthStatus === "SOURCE_CONFIRMED"
          ? "present"
          : truthStatus === "INSUFFICIENT_DATA"
            ? "missing"
            : "partial",
      detail: truthStatus,
    },
    {
      key: "quality",
      label: "Quality Audit",
      status: input.evidenceQuality ? "present" : "missing",
      detail: input.evidenceQuality?.overallQuality ?? "Not assessed",
    },
    {
      key: "intelligence",
      label: "Intelligence",
      status:
        verifiedSalePrices >= marketThreshold
          ? "present"
          : events.length > 0
            ? "partial"
            : "missing",
      detail:
        verifiedSalePrices >= marketThreshold
          ? "Market thresholds met"
          : "INSUFFICIENT DATA for market statistics",
    },
  ];

  const comparableCount = input.performance?.comparableCount ?? 0;
  const compsInsufficient = comparableCount < comparableMinimum;

  const investorView: DossierInvestorView = {
    whatHappened:
      timeline.length > 0
        ? timeline.map(
            (t) =>
              `${t.auctionDate?.slice(0, 10) ?? "Date unknown"} — ${t.outcome}` +
              (t.salePriceVerified ? ` · ${t.salePriceDisplay}` : ""),
          )
        : ["No historical auction events on the Property Master chain yet."],
    whatIsProven: [
      ...(input.investor?.whatWeKnow ?? []),
      ...(input.acquisition?.proven ?? []),
    ].slice(0, 8),
    whatIsUnknown: [
      ...(input.investor?.whatWeDoNotKnow ?? []),
      ...(input.evidenceQuality?.missingEvidence ?? []),
      ...(input.acquisition?.missing ?? []),
    ].slice(0, 8),
    whatMarketSays:
      verifiedSalePrices >= marketThreshold
        ? [`${verifiedSalePrices} verified sale prices available in scope.`]
        : [
            `Market median: INSUFFICIENT DATA`,
            `${marketThreshold} verified sales required`,
            `${verifiedSalePrices} currently available`,
          ],
    whatToInvestigate: [
      ...(input.investor?.whatNeedsVerification ?? []),
      ...(input.investor?.acquisitionHints ?? []),
      ...(input.acquisition?.reviewRequired ?? []),
    ].slice(0, 8),
  };

  if (investorView.whatIsProven.length === 0) {
    investorView.whatIsProven.push("No proven sale outcome or sale price yet.");
  }
  if (investorView.whatIsUnknown.length === 0) {
    investorView.whatIsUnknown.push("Verified sale outcome and sale price remain unknown.");
  }
  if (investorView.whatToInvestigate.length === 0) {
    investorView.whatToInvestigate.push(
      "Acquire licensed historical source evidence for this Property Master.",
    );
  }

  return {
    version: AUCTION_EVIDENCE_DOSSIER_VERSION,
    generatedAt: new Date().toISOString(),
    propertyId: input.propertyId,
    propertyMasterId: input.propertyMasterId,
    positioning: DOSSIER_POSITIONING,
    headline: DOSSIER_POSITIONING.primary,
    subheadline: `${input.propertyTitle ?? "Property"} — auction-process truth with provenance`,
    truthStatus,
    truthWhy,
    outcomeLabel,
    identityClaims,
    saleOutcome,
    salePrice,
    timeline,
    evidenceChain,
    investorView,
    comparables: {
      count: comparableCount,
      confidence: input.performance?.comparableConfidence ?? null,
      insufficient: compsInsufficient,
      reason: compsInsufficient
        ? `Comparable intelligence requires at least ${comparableMinimum} valid comparables (${comparableCount} available).`
        : null,
    },
    market: {
      medianDisplay:
        verifiedSalePrices >= marketThreshold
          ? "See market intelligence when scope qualifies"
          : "INSUFFICIENT DATA",
      thresholdRequired: marketThreshold,
      verifiedSalesAvailable: verifiedSalePrices,
      insufficient: verifiedSalePrices < marketThreshold,
    },
    coverage: {
      engineStatus: "READY",
      dataCoverage:
        verifiedSalePrices >= marketThreshold && comparableCount >= comparableMinimum
          ? "SUFFICIENT"
          : "INSUFFICIENT",
      historicalEvents: input.historicalSummary?.historicalEvents ?? events.length,
      verifiedSold: soldCount,
      verifiedSalePrices,
      comparableReady: compsInsufficient ? 0 : comparableCount,
    },
    provenanceSummary: {
      sourcesChecked,
      lastChecked: events.map((e) => e.auctionDate).filter(Boolean).sort().at(-1) ?? null,
      catalogueSafe: true,
    },
  };
}
