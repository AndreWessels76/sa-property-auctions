/**
 * ACI Command Centre v2 — investor product helpers.
 * Presentation/ranking only. No parallel engines. No evidence fabrication.
 */

import { median, minMax } from "@/lib/intelligence/historical/historicalMetrics";
import {
  ACI_COMPARABLE_THRESHOLD,
  ACI_MARKET_THRESHOLD,
  ACI_POSITIONING,
  type AciDecisionStatus,
  type AciMetricsSnapshot,
} from "@/lib/aci/commandCentre";

export const ACI_COMMAND_CENTRE_V2_VERSION = "aci-command-centre-2.0.0";
export const ACI_COMPARE_MAX = 6;
export const ACI_WORKSPACE_PAGE_SIZE = 50;
export const ACI_WATCHLIST_STORAGE_KEY = "aci-operator-watchlist";

export type AciEvidenceBadge =
  | "VERIFIED"
  | "SOURCE_FOUND"
  | "INSUFFICIENT_DATA"
  | "UNKNOWN"
  | "INFERENCE";

export type AciOutcomeState =
  | "VERIFIED_SOLD"
  | "SOLD_WITHOUT_PRICE"
  | "EXPIRED"
  | "WITHDRAWN"
  | "COMPLETED_UNKNOWN"
  | "UNKNOWN";

export type AciSalePriceState =
  | "VERIFIED SALE PRICE"
  | "SALE PRICE NOT VERIFIED"
  | "NOT SUPPLIED"
  | "UNKNOWN";

export type AciOpportunityCategory = "HIGH PRIORITY" | "RESEARCH" | "WAITING" | "COMPLETE";

export type AciWorkspaceFilters = {
  province?: string | null;
  town?: string | null;
  propertyType?: string | null;
  evidenceState?: string | null;
  outcomeFilter?:
    | "SOLD"
    | "SOLD_WITHOUT_PRICE"
    | "OUTCOME_MISSING"
    | "VERIFIED_SALE_PRICE"
    | "INSUFFICIENT_DATA"
    | null;
  auctionDateFrom?: string | null;
  auctionDateTo?: string | null;
};

export type AciWorkspaceRow = {
  id: string;
  observationId: string;
  listingPropertyId: string | null;
  title: string;
  address: string | null;
  province: string | null;
  town: string | null;
  suburb: string | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  auctionDate: string | null;
  source: string | null;
  sourceUrl: string | null;
  sourceStatus: string;
  evidenceState: string;
  evidenceBadge: AciEvidenceBadge;
  outcome: string;
  outcomeState: AciOutcomeState;
  salePrice: string;
  salePriceState: AciSalePriceState;
  quality: string | null;
  lastEvidenceUpdate: string | null;
  identityStrong: boolean;
  opportunity: AciOpportunityCategory;
  decision: AciDecisionStatus;
};

export type AciClaimClass = "VERIFIED" | "INFERENCE" | "UNKNOWN";

export type AciPositioningClaim = {
  claim: string;
  classification: AciClaimClass;
  note: string;
};

export type AciProductReadinessComponent = {
  key: string;
  label: string;
  score: number;
  explanation: string;
  sourceMetric: string;
};

function upper(value: string | null | undefined): string {
  return (value ?? "").toUpperCase();
}

export function classifyOutcomeState(input: {
  outcome: string | null;
  salePrice: string | null;
  evidenceState?: string | null;
}): AciOutcomeState {
  const outcome = upper(input.outcome);
  const sale = upper(input.salePrice);
  if (outcome.includes("EXPIRED") || outcome === "EXPIRED") return "EXPIRED";
  if (outcome.includes("WITHDRAWN")) return "WITHDRAWN";
  if (outcome.includes("SOLD_WITHOUT_PRICE") || sale.includes("SOLD_WITHOUT_PRICE")) {
    return "SOLD_WITHOUT_PRICE";
  }
  if (
    (outcome === "SOLD" || outcome.includes("VERIFIED_SOLD")) &&
    (sale.includes("VERIFIED") || input.evidenceState === "SALE_PRICE_FOUND")
  ) {
    return "VERIFIED_SOLD";
  }
  if (outcome.includes("SOLD")) return "SOLD_WITHOUT_PRICE";
  if (outcome.includes("COMPLETED") || outcome === "CLOSED") return "COMPLETED_UNKNOWN";
  if (!outcome || outcome === "UNKNOWN" || outcome === "MISSING" || outcome === "INSUFFICIENT_DATA") {
    return "UNKNOWN";
  }
  return "UNKNOWN";
}

export function classifySalePriceState(input: {
  salePrice: string | null;
  evidenceState?: string | null;
  outcomeState: AciOutcomeState;
}): AciSalePriceState {
  const sale = upper(input.salePrice);
  if (sale.includes("VERIFIED") || input.evidenceState === "SALE_PRICE_FOUND") {
    return "VERIFIED SALE PRICE";
  }
  if (input.outcomeState === "SOLD_WITHOUT_PRICE" || sale.includes("SOLD_WITHOUT_PRICE")) {
    return "SALE PRICE NOT VERIFIED";
  }
  if (sale.includes("NOT_SUPPLIED") || sale.includes("MISSING") || sale.includes("NOT SUPPLIED")) {
    return "NOT SUPPLIED";
  }
  if (input.outcomeState === "UNKNOWN") return "UNKNOWN";
  return "SALE PRICE NOT VERIFIED";
}

export function classifyEvidenceBadge(input: {
  sourceStatus: string | null;
  snapshot: boolean;
  saleVerified: boolean;
  outcomeState: AciOutcomeState;
}): AciEvidenceBadge {
  if (input.saleVerified || input.outcomeState === "VERIFIED_SOLD") return "VERIFIED";
  if (input.snapshot || upper(input.sourceStatus).includes("LICENSED") || upper(input.sourceStatus) === "FOUND") {
    return "SOURCE_FOUND";
  }
  if (input.outcomeState === "UNKNOWN") return "INSUFFICIENT_DATA";
  return "UNKNOWN";
}

export function rankOpportunity(input: {
  identityStrong: boolean;
  auctionDate: string | null;
  outcomeState: AciOutcomeState;
  salePriceState: AciSalePriceState;
}): AciOpportunityCategory {
  if (input.salePriceState === "VERIFIED SALE PRICE") return "COMPLETE";
  const hasAuction = Boolean(input.auctionDate);
  if (input.identityStrong && hasAuction && input.outcomeState !== "VERIFIED_SOLD") {
    if (
      input.outcomeState === "UNKNOWN" ||
      input.outcomeState === "SOLD_WITHOUT_PRICE" ||
      input.salePriceState === "SALE PRICE NOT VERIFIED"
    ) {
      return "HIGH PRIORITY";
    }
  }
  if (input.identityStrong || hasAuction) return "RESEARCH";
  return "WAITING";
}

export function filterWorkspaceRows(
  rows: AciWorkspaceRow[],
  filters: AciWorkspaceFilters,
): AciWorkspaceRow[] {
  return rows.filter((row) => {
    if (filters.province && row.province !== filters.province) return false;
    if (filters.town && row.town !== filters.town) return false;
    if (filters.propertyType && row.propertyType !== filters.propertyType) return false;
    if (filters.evidenceState && row.evidenceState !== filters.evidenceState) return false;
    if (filters.auctionDateFrom && (row.auctionDate ?? "") < filters.auctionDateFrom) return false;
    if (filters.auctionDateTo && (row.auctionDate ?? "") > filters.auctionDateTo) return false;
    switch (filters.outcomeFilter) {
      case "SOLD":
        return row.outcomeState === "VERIFIED_SOLD" || row.outcomeState === "SOLD_WITHOUT_PRICE";
      case "SOLD_WITHOUT_PRICE":
        return row.outcomeState === "SOLD_WITHOUT_PRICE";
      case "OUTCOME_MISSING":
        return row.outcomeState === "UNKNOWN" || row.outcomeState === "COMPLETED_UNKNOWN";
      case "VERIFIED_SALE_PRICE":
        return row.salePriceState === "VERIFIED SALE PRICE";
      case "INSUFFICIENT_DATA":
        return row.evidenceBadge === "INSUFFICIENT_DATA" || row.outcomeState === "UNKNOWN";
      default:
        return true;
    }
  });
}

export function paginateRows<T>(rows: T[], page = 1, pageSize = ACI_WORKSPACE_PAGE_SIZE): {
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
} {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(Math.max(1, pageSize), 100);
  const start = (safePage - 1) * safeSize;
  return {
    rows: rows.slice(start, start + safeSize),
    page: safePage,
    pageSize: safeSize,
    total: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / safeSize)),
  };
}

export function compareExclusion(salePriceState: AciSalePriceState): {
  included: boolean;
  label: string;
} {
  if (salePriceState === "VERIFIED SALE PRICE") {
    return { included: true, label: "VERIFIED SALE PRICE" };
  }
  return { included: false, label: "EXCLUDED — SALE PRICE NOT VERIFIED" };
}

export function marketStatistics(input: {
  verifiedPrices: number[];
  town: string;
  suburb?: string | null;
  propertyType?: string | null;
}): {
  ready: boolean;
  status: "MARKET_READY" | "INSUFFICIENT_DATA";
  count: number;
  median: number | null;
  min: number | null;
  max: number | null;
  note: string;
  provenance: string;
} {
  const prices = input.verifiedPrices.filter((n) => Number.isFinite(n) && n > 0);
  if (prices.length < ACI_MARKET_THRESHOLD) {
    return {
      ready: false,
      status: "INSUFFICIENT_DATA",
      count: prices.length,
      median: null,
      min: null,
      max: null,
      note: `INSUFFICIENT_DATA — ${prices.length} verified sale prices (minimum ${ACI_MARKET_THRESHOLD}). Median, average, and trends are not calculated.`,
      provenance: "verified sale-price observations only",
    };
  }
  const range = minMax(prices);
  return {
    ready: true,
    status: "MARKET_READY",
    count: prices.length,
    median: median(prices),
    min: range.min,
    max: range.max,
    note: `Based on ${prices.length} verified transaction prices in ${input.town}.`,
    provenance: "auction_outcome_observations.sale_price where confidence is verified",
  };
}

export function buildProductReadiness(metrics: AciMetricsSnapshot): {
  overall: number;
  components: AciProductReadinessComponent[];
  formula: string;
} {
  const n = Math.max(0, metrics.historicalEvents);
  const discovery = n > 0 ? 100 : 0;
  const research = n <= 0 ? 0 : Math.round(((metrics.snapshots + metrics.extractions) / (2 * n)) * 1000) / 10;
  const comparison =
    metrics.verifiedSalePrices >= ACI_COMPARABLE_THRESHOLD
      ? Math.min(100, Math.round((metrics.comparableReady / Math.max(1, n)) * 1000) / 10)
      : 0;
  const decision = metrics.outcomeEvidence > 0 ? Math.round((metrics.outcomeEvidence / n) * 1000) / 10 : 0;
  const provenance = n <= 0 ? 0 : Math.round((metrics.snapshots / n) * 1000) / 10;
  const market = metrics.verifiedSalePrices >= ACI_MARKET_THRESHOLD ? 100 : 0;
  const components: AciProductReadinessComponent[] = [
    {
      key: "discovery",
      label: "Discovery Value",
      score: discovery,
      explanation: n > 0 ? `${n} historical events are visible` : "No auction events",
      sourceMetric: "historicalEvents",
    },
    {
      key: "research",
      label: "Research Value",
      score: research,
      explanation: "Snapshots and extractions available for inspection",
      sourceMetric: "snapshots",
    },
    {
      key: "comparison",
      label: "Comparison Value",
      score: comparison,
      explanation:
        metrics.verifiedSalePrices < ACI_COMPARABLE_THRESHOLD
          ? "INSUFFICIENT_DATA — fewer than 3 verified sale prices"
          : "Verified transactions available for comparison",
      sourceMetric: "verifiedSalePrices",
    },
    {
      key: "decision",
      label: "Decision Value",
      score: decision,
      explanation: "Research readiness from outcome evidence coverage",
      sourceMetric: "outcomeEvidence",
    },
    {
      key: "provenance",
      label: "Provenance Value",
      score: provenance,
      explanation: "Claims traceable to snapshots",
      sourceMetric: "snapshots",
    },
    {
      key: "market",
      label: "Market Intelligence Value",
      score: market,
      explanation:
        metrics.verifiedSalePrices < ACI_MARKET_THRESHOLD
          ? "INSUFFICIENT_DATA — fewer than 5 verified sale prices"
          : "Town market statistics are gated-ready",
      sourceMetric: "verifiedSalePrices",
    },
  ];
  return {
    overall: Math.round(components.reduce((s, c) => s + c.score, 0) / components.length),
    components,
    formula: "unweighted mean of 6 product-readiness components (0–100)",
  };
}

export function positioningClaims(): AciPositioningClaim[] {
  return [
    {
      claim: ACI_POSITIONING,
      classification: "VERIFIED",
      note: "ACI product promise — evidence and provenance, not a listing feed.",
    },
    {
      claim: "ACI presents auction evidence, outcomes, provenance, and evidence dossiers.",
      classification: "VERIFIED",
      note: "Describes this platform's implemented objects, not coverage volume.",
    },
    {
      claim: "Property24 / AuctionHQ-style products emphasise listings, discovery, and attention.",
      classification: "INFERENCE",
      note: "Competitive category label — not a verified claim about any competitor's data.",
    },
    {
      claim: "Lightstone / WinDeed-style products emphasise deeds, valuations, and property information.",
      classification: "INFERENCE",
      note: "Competitive category label — ACI does not replace deeds offices.",
    },
    {
      claim: "ACI currently has enough verified sale prices for market statistics.",
      classification: "UNKNOWN",
      note: "Coverage is live production state; do not assert market-readiness without ≥5 verified prices.",
    },
  ];
}

export type AciTimelineEventV2 = {
  key: string;
  label: string;
  available: boolean;
  state: string;
  timestamp: string | null;
  source: string | null;
  sourceReference: string | null;
  classification: string;
  provenance: string;
  verificationState: string;
};

export function buildResearchTimelineV2(input: {
  discoveredAt?: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceStatus: string | null;
  auctionDate: string | null;
  fetchState: string | null;
  fetchTimestamp: string | null;
  snapshot: boolean;
  snapshotId: string | null;
  snapshotAt: string | null;
  extraction: string | null;
  extractionId: string | null;
  outcome: string | null;
  salePrice: string | null;
  saleVerified: boolean;
  hasDossier: boolean;
}): AciTimelineEventV2[] {
  const sourceFound = Boolean(input.sourceUrl || input.sourceStatus);
  const fetched =
    input.fetchState === "FETCH_SUCCESS" ||
    Boolean(input.snapshot) ||
    Boolean(input.extraction && input.extraction !== "MISSING" && input.extraction !== "NONE");
  const extracted =
    Boolean(input.extraction) &&
    input.extraction !== "MISSING" &&
    input.extraction !== "NONE" &&
    input.extraction !== "NOT_RUN";
  const outcome = upper(input.outcome);
  const outcomeAvailable =
    Boolean(outcome) &&
    outcome !== "UNKNOWN" &&
    outcome !== "MISSING" &&
    outcome !== "INSUFFICIENT_DATA";

  function unavailable(key: string, label: string): AciTimelineEventV2 {
    return {
      key,
      label,
      available: false,
      state: "NOT AVAILABLE",
      timestamp: null,
      source: null,
      sourceReference: null,
      classification: "NOT AVAILABLE",
      provenance: "No event recorded",
      verificationState: "UNKNOWN",
    };
  }

  const stages: AciTimelineEventV2[] = [
    {
      key: "discovered",
      label: "DISCOVERED",
      available: true,
      state: "YES",
      timestamp: input.discoveredAt ?? input.auctionDate ?? null,
      source: input.sourceName,
      sourceReference: input.sourceUrl,
      classification: "SOURCE_FOUND",
      provenance: "historical event record",
      verificationState: "SOURCE_CONFIRMED",
    },
  ];

  stages.push(
    sourceFound
      ? {
          key: "source",
          label: "SOURCE FOUND",
          available: true,
          state: input.sourceStatus ?? "FOUND",
          timestamp: input.discoveredAt ?? null,
          source: input.sourceName,
          sourceReference: input.sourceUrl,
          classification: "SOURCE_FOUND",
          provenance: "licensed source record",
          verificationState: input.sourceStatus ?? "UNKNOWN",
        }
      : unavailable("source", "SOURCE FOUND"),
  );

  stages.push(
    input.auctionDate
      ? {
          key: "auction",
          label: "AUCTION",
          available: true,
          state: input.auctionDate,
          timestamp: input.auctionDate ?? null,
          source: input.sourceName,
          sourceReference: input.sourceUrl,
          classification: "SOURCE_FOUND",
          provenance: "auction date on event/property",
          verificationState: "SOURCE_CONFIRMED",
        }
      : unavailable("auction", "AUCTION"),
  );

  stages.push(
    fetched
      ? {
          key: "fetch",
          label: "FETCH",
          available: true,
          state: input.fetchState ?? "FETCH_SUCCESS",
          timestamp: input.fetchTimestamp ?? null,
          source: input.sourceName,
          sourceReference: input.sourceUrl,
          classification: "SOURCE_FOUND",
          provenance: "licensed fetch attempt",
          verificationState: input.fetchState ?? "UNKNOWN",
        }
      : unavailable("fetch", "FETCH"),
  );

  stages.push(
    input.snapshot
      ? {
          key: "snapshot",
          label: "SNAPSHOT",
          available: true,
          state: input.snapshotId ?? "PRESENT",
          timestamp: input.snapshotAt ?? null,
          source: input.sourceName,
          sourceReference: input.snapshotId,
          classification: "SOURCE_FOUND",
          provenance: "snapshot record",
          verificationState: "PRESENT",
        }
      : unavailable("snapshot", "SNAPSHOT"),
  );

  stages.push(
    extracted
      ? {
          key: "extraction",
          label: "EXTRACTION",
          available: true,
          state: input.extraction ?? "EXTRACTED",
          timestamp: input.snapshotAt ?? null,
          source: input.sourceName,
          sourceReference: input.extractionId,
          classification: "SOURCE_FOUND",
          provenance: "extraction run",
          verificationState: input.extraction ?? "UNKNOWN",
        }
      : unavailable("extraction", "EXTRACTION"),
  );

  stages.push(
    outcomeAvailable
      ? {
          key: "outcome",
          label: "OUTCOME",
          available: true,
          state: outcome,
          timestamp: input.snapshotAt ?? input.fetchTimestamp ?? null,
          source: input.sourceName,
          sourceReference: input.sourceUrl,
          classification: outcome.includes("SOLD") ? "SOURCE_FOUND" : "UNKNOWN",
          provenance: "outcome observation / extraction",
          verificationState: outcome,
        }
      : unavailable("outcome", "OUTCOME"),
  );

  stages.push(
    input.saleVerified
      ? {
          key: "sale_price",
          label: "SALE PRICE",
          available: true,
          state: "VERIFIED",
          timestamp: input.snapshotAt ?? null,
          source: input.sourceName,
          sourceReference: input.sourceUrl,
          classification: "VERIFIED",
          provenance: "explicit transaction amount",
          verificationState: "VERIFIED",
        }
      : unavailable("sale_price", "SALE PRICE"),
  );

  stages.push(
    input.hasDossier
      ? {
          key: "dossier",
          label: "DOSSIER",
          available: true,
          state: "AVAILABLE",
          timestamp: null,
          source: "Auction Evidence Dossier",
          sourceReference: input.sourceUrl,
          classification: "SOURCE_FOUND",
          provenance: "assembled from existing intelligence services",
          verificationState: "ASSEMBLED",
        }
      : unavailable("dossier", "DOSSIER"),
  );

  return stages;
}

export function salePricePanel(input: {
  salePriceState: AciSalePriceState;
  verifiedAmount: number | null;
  source: string | null;
  timestamp: string | null;
  snapshotId: string | null;
}): {
  state: AciSalePriceState;
  amountDisplay: string;
  source: string | null;
  timestamp: string | null;
  provenance: string | null;
  verificationState: string;
} {
  if (input.salePriceState === "VERIFIED SALE PRICE" && input.verifiedAmount != null && input.verifiedAmount > 0) {
    return {
      state: "VERIFIED SALE PRICE",
      amountDisplay: `R${Math.round(input.verifiedAmount).toLocaleString("en-ZA")}`,
      source: input.source,
      timestamp: input.timestamp,
      provenance: input.snapshotId,
      verificationState: "VERIFIED",
    };
  }
  return {
    state: input.salePriceState,
    amountDisplay:
      input.salePriceState === "VERIFIED SALE PRICE"
        ? "VERIFIED SALE PRICE"
        : input.salePriceState,
    source: input.source,
    timestamp: input.timestamp,
    provenance: input.snapshotId,
    verificationState: input.salePriceState,
  };
}

export function parseWatchlistIds(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.trim().length > 0).slice(0, 50);
  } catch {
    return [];
  }
}
