/**
 * ACI Command Centre — presentation/orchestration helpers.
 * No parallel intelligence, acquisition, or evidence engines.
 */

import {
  HI56_MAX_BATCH_LIMIT,
  HI56_MINIMUM_COMPARABLE_SALES,
  HI56_MINIMUM_MARKET_SALES,
} from "@/lib/intelligence/historicalIntelligence56/config";
import { parseLeadingInt } from "@/lib/intelligence/historicalIntelligence54";
import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";
import type { Hi56IntelligenceReport } from "@/lib/intelligence/historicalIntelligence56/types";

export const ACI_COMMAND_CENTRE_VERSION = "aci-command-centre-1.0.0";
export const ACI_MAX_BATCH = HI56_MAX_BATCH_LIMIT;
export const ACI_COMPARABLE_THRESHOLD = HI56_MINIMUM_COMPARABLE_SALES;
export const ACI_MARKET_THRESHOLD = HI56_MINIMUM_MARKET_SALES;
export const ACI_POSITIONING = "Don't just find the auction. Prove it.";

export type AciHealthTone = "GREEN" | "AMBER" | "RED";

export type AciDecisionStatus =
  | "WATCH"
  | "RESEARCH"
  | "COMPARE"
  | "READY FOR REVIEW"
  | "INSUFFICIENT DATA"
  | "DO NOT PUBLISH";

export type AciActionItem = {
  id: string;
  priority: number;
  label: string;
  href: string;
  count: number;
  reason: string;
};

export type AciScoreComponent = {
  key: string;
  label: string;
  score: number;
  numerator: number;
  denominator: number;
  explanation: string;
  sourceMetric: string;
};

export type AciCompetitiveScore = {
  overall: number;
  components: AciScoreComponent[];
  formula: string;
};

export type AciMetricsSnapshot = {
  historicalEvents: number;
  auctionEvents: number | null;
  licensedSources: string;
  fetchAttempted: number;
  fetchSuccessful: number;
  fetchFailed: number;
  snapshots: number;
  extractions: number;
  outcomeEvidence: number;
  outcomeMissing: number;
  verifiedSold: number;
  soldWithoutPrice: number;
  verifiedSalePrices: number;
  comparableReady: number;
  marketReadyTowns: number;
  catalogueLeaks: number;
  legacyUnknownFailures: number;
};

export type AciPartnerFeedView = {
  contractVersion: string;
  partner: string;
  resultsFeed: string;
  connectionState: string;
  authorisation: string;
  productionWrite: string;
  url: "PRESENT" | "MISSING" | "INVALID";
  credentials: "PRESENT" | "MISSING" | "INVALID";
  lastSuccessfulIngestion: string | null;
  nextAction: string;
};

export type AciTimelineStage = {
  key: string;
  label: string;
  state: string;
  done: boolean;
};

export type AciDeltaRow = {
  metric: string;
  before: number;
  after: number;
  delta: number;
};

export function clampAciBatchLimit(limit: number | undefined): number {
  if (limit == null || !Number.isFinite(limit)) return ACI_MAX_BATCH;
  const n = Math.floor(limit);
  if (n < 1) return 1;
  if (n > ACI_MAX_BATCH) return ACI_MAX_BATCH;
  return n;
}

export function rejectAciUnlimitedLimit(
  limit: number | undefined,
): { ok: true; limit: number } | { ok: false; reason: string } {
  if (limit == null) return { ok: true, limit: ACI_MAX_BATCH };
  if (!Number.isFinite(limit) || limit < 1) {
    return { ok: false, reason: "Batch limit must be a positive integer ≤ 5" };
  }
  if (limit > ACI_MAX_BATCH) {
    return {
      ok: false,
      reason: `Batch limit ${limit} exceeds maximum ${ACI_MAX_BATCH}`,
    };
  }
  return { ok: true, limit: Math.floor(limit) };
}

export function maskSecretPresence(
  value: string | null | undefined,
): "PRESENT" | "MISSING" {
  return value?.trim() ? "PRESENT" : "MISSING";
}

export function isRejectedSalePriceKind(kind: string | null | undefined): boolean {
  const k = (kind ?? "").toLowerCase().replace(/\s+/g, "_");
  return [
    "reserve",
    "reserve_price",
    "guide",
    "guide_price",
    "starting_bid",
    "opening_bid",
    "auction_price",
    "asking_price",
    "listing_price",
    "estimated_value",
    "estimate",
    "valuation",
    "market_value",
    "municipal_value",
    "agent_estimate",
  ].includes(k);
}

export function displayVerifiedSalePrice(input: {
  salePrice: number | null;
  verified: boolean;
}): string {
  if (!input.verified || input.salePrice == null || input.salePrice <= 0) {
    return "SALE PRICE NOT VERIFIED";
  }
  return `R${Math.round(input.salePrice).toLocaleString("en-ZA")}`;
}

export function metricsFromHi56(
  report: Hi56IntelligenceReport,
  auctionEvents?: number | null,
): AciMetricsSnapshot {
  const cov = report.coverage52;
  const bottleneck = report.bottleneck56;
  const outcomeMissing =
    bottleneck.code === "OUTCOME_MISSING"
      ? bottleneck.count
      : Math.max(
          0,
          cov.historicalEvents - parseLeadingInt(cov.outcomeEvidence),
        );
  return {
    historicalEvents: cov.historicalEvents,
    auctionEvents: auctionEvents ?? null,
    licensedSources: String(cov.licensedSources),
    fetchAttempted: parseLeadingInt(cov.fetchAttempted, report.metrics.fetchAttempted),
    fetchSuccessful: cov.fetchSuccessful,
    fetchFailed: cov.fetchFailed,
    snapshots: parseLeadingInt(cov.snapshots, report.metrics.snapshots),
    extractions: parseLeadingInt(cov.extractions, report.metrics.extractionAttempted),
    outcomeEvidence: parseLeadingInt(cov.outcomeEvidence, report.coverage.outcomeEvidence),
    outcomeMissing,
    verifiedSold: cov.verifiedSold,
    soldWithoutPrice: cov.soldWithoutPrice,
    verifiedSalePrices: cov.verifiedSalePrices,
    comparableReady: cov.comparableReady,
    marketReadyTowns: cov.marketReadyTowns,
    catalogueLeaks: cov.catalogueLeaks,
    legacyUnknownFailures: cov.legacyFailures ?? 0,
  };
}

export function buildAciHealth(input: {
  catalogueLeaks: number;
  outcomeMissing: number;
  verifiedSalePrices: number;
  partnerConnected: boolean;
  partnerAuthorised: boolean;
}): { tone: AciHealthTone; label: string; reasons: string[] } {
  const reasons: string[] = [];
  if (input.catalogueLeaks > 0) {
    return {
      tone: "RED",
      label: "PUBLIC CATALOGUE BLOCKED",
      reasons: [`catalogueLeaks = ${input.catalogueLeaks}`],
    };
  }
  if (input.outcomeMissing > 0) {
    reasons.push(`${input.outcomeMissing} events missing outcome evidence`);
  }
  if (input.verifiedSalePrices < ACI_MARKET_THRESHOLD) {
    reasons.push("Market intelligence INSUFFICIENT_DATA");
  }
  if (!input.partnerConnected || !input.partnerAuthorised) {
    reasons.push("Partner results feed not authorised/connected");
  }
  if (reasons.length === 0) {
    return { tone: "GREEN", label: "ENGINE CONNECTED", reasons: ["Catalogue safe"] };
  }
  return { tone: "AMBER", label: "INSUFFICIENT EVIDENCE", reasons };
}

export function buildAciActionQueue(input: {
  outcomeMissing: number;
  soldWithoutPrice: number;
  verifiedSalePrices: number;
  comparableReady: number;
  marketReadyTowns: number;
  catalogueLeaks: number;
  partnerAuthorised: boolean;
  partnerConnected: boolean;
}): AciActionItem[] {
  const items: AciActionItem[] = [];
  if (input.catalogueLeaks > 0) {
    items.push({
      id: "catalogue_leaks",
      priority: 1,
      label: `PUBLIC CATALOGUE BLOCKED — ${input.catalogueLeaks} leak(s)`,
      href: "/admin/aci",
      count: input.catalogueLeaks,
      reason: "Do not rebuild public catalogue",
    });
  }
  if (input.outcomeMissing > 0) {
    items.push({
      id: "outcome_missing",
      priority: 2,
      label: `${input.outcomeMissing} events require outcome evidence`,
      href: "/admin/aci/discover",
      count: input.outcomeMissing,
      reason: "OUTCOME_MISSING — authorised results feed required for new evidence",
    });
  }
  if (input.soldWithoutPrice > 0) {
    items.push({
      id: "sold_without_price",
      priority: 3,
      label: `${input.soldWithoutPrice} SOLD events require verified sale-price evidence`,
      href: "/admin/aci",
      count: input.soldWithoutPrice,
      reason: "Do not re-audit exhausted snapshots — wait for authorised results feed",
    });
  }
  if (!input.partnerAuthorised || !input.partnerConnected) {
    items.push({
      id: "partner_feed",
      priority: 4,
      label: "Bidders Choice results feed requires authorisation",
      href: "/admin/aci#partner-results",
      count: 1,
      reason: "CONFIG_MISSING — URL, credentials, and results licence absent",
    });
  }
  if (input.comparableReady === 0) {
    items.push({
      id: "comparables",
      priority: 5,
      label: "0 comparable-ready properties",
      href: "/admin/aci/compare",
      count: 0,
      reason: `Threshold remains ≥${ACI_COMPARABLE_THRESHOLD} verified sale prices`,
    });
  }
  if (input.marketReadyTowns === 0) {
    items.push({
      id: "market",
      priority: 6,
      label: "0 market-ready towns",
      href: "/admin/aci/market",
      count: 0,
      reason: `Threshold remains ≥${ACI_MARKET_THRESHOLD} verified sale prices`,
    });
  }
  return items.sort((a, b) => a.priority - b.priority);
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function buildCompetitiveScore(metrics: AciMetricsSnapshot): AciCompetitiveScore {
  const n = Math.max(0, metrics.historicalEvents);
  const evidence = pct(metrics.outcomeEvidence, n);
  const outcome = pct(n - metrics.outcomeMissing, n);
  const sale = pct(metrics.verifiedSalePrices, n);
  const comparable = pct(metrics.comparableReady, n);
  const market =
    metrics.verifiedSalePrices < ACI_MARKET_THRESHOLD
      ? 0
      : pct(metrics.marketReadyTowns, Math.max(1, metrics.marketReadyTowns));
  const source = pct(metrics.fetchSuccessful, n);
  const provenance = pct(metrics.snapshots, n);
  const safety = metrics.catalogueLeaks === 0 ? 100 : 0;
  const operational =
    (metrics.fetchAttempted >= n && metrics.fetchFailed === 0 ? 50 : 20) +
    (metrics.catalogueLeaks === 0 ? 10 : 0);

  const components: AciScoreComponent[] = [
    {
      key: "evidence",
      label: "Evidence Coverage",
      score: evidence,
      numerator: metrics.outcomeEvidence,
      denominator: n,
      explanation: "Outcome observations / historical events",
      sourceMetric: "outcomeEvidence",
    },
    {
      key: "outcome",
      label: "Outcome Coverage",
      score: outcome,
      numerator: Math.max(0, n - metrics.outcomeMissing),
      denominator: n,
      explanation: "Events with resolved outcome evidence",
      sourceMetric: "outcomeMissing",
    },
    {
      key: "sale_price",
      label: "Sale Price Coverage",
      score: sale,
      numerator: metrics.verifiedSalePrices,
      denominator: n,
      explanation: "Verified transaction prices only",
      sourceMetric: "verifiedSalePrices",
    },
    {
      key: "comparable",
      label: "Comparable Coverage",
      score: comparable,
      numerator: metrics.comparableReady,
      denominator: n,
      explanation: `Comparable-ready requires ≥${ACI_COMPARABLE_THRESHOLD} verified sales`,
      sourceMetric: "comparableReady",
    },
    {
      key: "market",
      label: "Market Coverage",
      score: market,
      numerator: metrics.marketReadyTowns,
      denominator: ACI_MARKET_THRESHOLD,
      explanation:
        metrics.verifiedSalePrices < ACI_MARKET_THRESHOLD
          ? "INSUFFICIENT_DATA — fewer than 5 verified sale prices"
          : "Towns meeting market-ready threshold",
      sourceMetric: "marketReadyTowns",
    },
    {
      key: "source",
      label: "Source Coverage",
      score: source,
      numerator: metrics.fetchSuccessful,
      denominator: n,
      explanation: "Successful licensed fetches / historical events",
      sourceMetric: "fetchSuccessful",
    },
    {
      key: "provenance",
      label: "Provenance Quality",
      score: provenance,
      numerator: metrics.snapshots,
      denominator: n,
      explanation: "Snapshots retained / historical events",
      sourceMetric: "snapshots",
    },
    {
      key: "safety",
      label: "Public Safety",
      score: safety,
      numerator: metrics.catalogueLeaks === 0 ? 1 : 0,
      denominator: 1,
      explanation:
        metrics.catalogueLeaks === 0
          ? "catalogueLeaks = 0 — PUBLIC CATALOGUE SAFE"
          : "PUBLIC CATALOGUE BLOCKED",
      sourceMetric: "catalogueLeaks",
    },
    {
      key: "operational",
      label: "Operational Readiness",
      score: operational,
      numerator: operational,
      denominator: 100,
      explanation: "Engine fetch complete + catalogue safety (partner feed scored separately)",
      sourceMetric: "fetchAttempted",
    },
  ];

  const overall = Math.round(
    components.reduce((sum, c) => sum + c.score, 0) / components.length,
  );

  return {
    overall,
    components,
    formula: "unweighted mean of 9 component scores (0–100), rounded",
  };
}

export function buildEvidenceTimeline(event: Hi50EventRow): AciTimelineStage[] {
  const outcome = (event.outcome ?? "").toUpperCase();
  const sale = (event.salePrice ?? "").toUpperCase();
  const fetched =
    event.fetchState === "FETCH_SUCCESS" ||
    event.evidenceState === "FETCH_SUCCESS" ||
    event.snapshot ||
    event.extraction === "AVAILABLE" ||
    event.extraction === "COMPLETE";
  const outcomeDone =
    Boolean(outcome) &&
    outcome !== "UNKNOWN" &&
    outcome !== "INSUFFICIENT_DATA" &&
    outcome !== "NOT_SUPPLIED" &&
    outcome !== "MISSING";
  const saleVerified =
    sale.includes("VERIFIED") ||
    event.evidenceState === "SALE_PRICE_FOUND" ||
    event.evidenceState === "VERIFIED";

  return [
    { key: "discovered", label: "DISCOVERED", state: "YES", done: true },
    {
      key: "licensed",
      label: "LICENSED",
      state: event.sourceStatus || "LICENSED",
      done: true,
    },
    {
      key: "fetched",
      label: "FETCHED",
      state: event.fetchState ?? (fetched ? "FETCH_SUCCESS" : "NOT FETCHED"),
      done: fetched,
    },
    {
      key: "snapshot",
      label: "SNAPSHOT",
      state: event.snapshot ? "PRESENT" : "MISSING",
      done: event.snapshot,
    },
    {
      key: "extracted",
      label: "EXTRACTED",
      state: event.extraction || "MISSING",
      done: event.extraction !== "MISSING" && event.extraction !== "NONE",
    },
    {
      key: "outcome",
      label: "OUTCOME RESOLVED",
      state: outcome || "UNKNOWN",
      done: outcomeDone,
    },
    {
      key: "sale_price",
      label: "SALE PRICE VERIFIED",
      state: saleVerified ? "VERIFIED" : "NOT VERIFIED",
      done: saleVerified,
    },
  ];
}

export function deriveDecisionStatus(input: {
  catalogueLeaks: number;
  outcome: string | null;
  salePriceVerified: boolean;
  comparableReady: boolean;
  marketReady: boolean;
}): AciDecisionStatus {
  if (input.catalogueLeaks > 0) return "DO NOT PUBLISH";
  if (input.salePriceVerified && input.comparableReady) return "READY FOR REVIEW";
  if (input.salePriceVerified) return "COMPARE";
  const outcome = (input.outcome ?? "").toUpperCase();
  if (outcome.includes("SOLD")) return "RESEARCH";
  if (!outcome || outcome === "UNKNOWN" || outcome === "INSUFFICIENT_DATA") {
    return "INSUFFICIENT DATA";
  }
  return "WATCH";
}

export function investorWorkflow(input: {
  discovered: boolean;
  researched: boolean;
  outcome: string | null;
  salePriceVerified: boolean;
  comparableCount: number;
}): Array<{ stage: string; state: string; ok: boolean }> {
  const verifyWarn =
    (input.outcome ?? "").toUpperCase().includes("SOLD") && !input.salePriceVerified;
  const compareOk = input.comparableCount >= ACI_COMPARABLE_THRESHOLD;
  const decide =
    input.salePriceVerified && compareOk
      ? "READY FOR REVIEW"
      : "INSUFFICIENT DATA";
  return [
    { stage: "DISCOVER", state: input.discovered ? "✓" : "✕", ok: input.discovered },
    { stage: "RESEARCH", state: input.researched ? "✓" : "✕", ok: input.researched },
    {
      stage: "VERIFY",
      state: verifyWarn
        ? "⚠ SOLD_WITHOUT_PRICE"
        : input.salePriceVerified
          ? "✓"
          : "✕ NOT VERIFIED",
      ok: input.salePriceVerified,
    },
    {
      stage: "COMPARE",
      state: compareOk ? "✓" : "✕ No verified comparables",
      ok: compareOk,
    },
    { stage: "DECIDE", state: decide, ok: decide === "READY FOR REVIEW" },
  ];
}

export function buildBeforeAfterDelta(
  before: AciMetricsSnapshot,
  after: AciMetricsSnapshot,
): AciDeltaRow[] {
  const keys: Array<{ metric: string; field: keyof AciMetricsSnapshot }> = [
    { metric: "Historical Events", field: "historicalEvents" },
    { metric: "Auction Events", field: "auctionEvents" },
    { metric: "Fetch Attempted", field: "fetchAttempted" },
    { metric: "Fetch Successful", field: "fetchSuccessful" },
    { metric: "Fetch Failed", field: "fetchFailed" },
    { metric: "Snapshots", field: "snapshots" },
    { metric: "Extractions", field: "extractions" },
    { metric: "Outcome Evidence", field: "outcomeEvidence" },
    { metric: "Outcome Missing", field: "outcomeMissing" },
    { metric: "Verified SOLD", field: "verifiedSold" },
    { metric: "SOLD Without Price", field: "soldWithoutPrice" },
    { metric: "Verified Sale Prices", field: "verifiedSalePrices" },
    { metric: "Comparable Ready", field: "comparableReady" },
    { metric: "Market Ready Towns", field: "marketReadyTowns" },
    { metric: "Catalogue Leaks", field: "catalogueLeaks" },
    { metric: "Legacy Unknown Failures", field: "legacyUnknownFailures" },
  ];
  return keys.map(({ metric, field }) => {
    const b = Number(before[field] ?? 0);
    const a = Number(after[field] ?? 0);
    return { metric, before: b, after: a, delta: a - b };
  });
}

export function groupEventsByTown(events: Hi50EventRow[]): Array<{
  town: string;
  historicalEvents: number;
  outcomeEvidence: number;
  verifiedSold: number;
  verifiedSalePrices: number;
  comparableReady: number;
  marketReady: boolean;
  marketStatus: "MARKET_READY" | "INSUFFICIENT_DATA";
}> {
  const map = new Map<string, Hi50EventRow[]>();
  for (const e of events) {
    const town = e.town?.trim() || "UNKNOWN";
    const list = map.get(town) ?? [];
    list.push(e);
    map.set(town, list);
  }
  return [...map.entries()]
    .map(([town, rows]) => {
      const verifiedSalePrices = rows.filter((r) => {
        const sale = (r.salePrice ?? "").toUpperCase();
        return sale.includes("VERIFIED") || r.evidenceState === "SALE_PRICE_FOUND";
      }).length;
      const verifiedSold = rows.filter((r) =>
        (r.outcome ?? "").toUpperCase().includes("SOLD"),
      ).length;
      const outcomeEvidence = rows.filter((r) => {
        const o = (r.outcome ?? "").toUpperCase();
        return o && o !== "UNKNOWN" && o !== "INSUFFICIENT_DATA" && o !== "MISSING";
      }).length;
      const marketReady = verifiedSalePrices >= ACI_MARKET_THRESHOLD;
      return {
        town,
        historicalEvents: rows.length,
        outcomeEvidence,
        verifiedSold,
        verifiedSalePrices,
        comparableReady: verifiedSalePrices >= ACI_COMPARABLE_THRESHOLD ? 1 : 0,
        marketReady,
        marketStatus: (marketReady ? "MARKET_READY" : "INSUFFICIENT_DATA") as
          | "MARKET_READY"
          | "INSUFFICIENT_DATA",
      };
    })
    .sort((a, b) => b.historicalEvents - a.historicalEvents);
}

export function publicationSafety(catalogueLeaks: number): {
  safe: boolean;
  label: "PUBLIC CATALOGUE SAFE" | "PUBLIC CATALOGUE BLOCKED";
  rebuildAllowed: boolean;
} {
  const safe = catalogueLeaks === 0;
  return {
    safe,
    label: safe ? "PUBLIC CATALOGUE SAFE" : "PUBLIC CATALOGUE BLOCKED",
    rebuildAllowed: safe,
  };
}
