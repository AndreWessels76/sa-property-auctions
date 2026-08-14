/**
 * Production verdict for II 4.7 — never claim production-ready without verified evidence.
 */

import type { ConnectivityDiagnostic } from "./connectivityDiagnostic";
import { II47_MINIMUM_MARKET_SALES } from "./config";

export type ProductionVerdict =
  | "PRODUCTION DATA COVERAGE VERIFIED"
  | "PRODUCTION DATA COVERAGE PARTIAL"
  | "INSUFFICIENT DATA — ENGINE READY"
  | "PRODUCTION BLOCKED";

export type LiveEvidenceMetrics = {
  propertyMasters: number;
  auctionEvents: number;
  historicalEvents: number;
  eligibleP1: number;
  eligibleP2: number;
  eligibleP3: number;
  eligibleP4: number;
  enrichmentRuns: number;
  successfulFetches: number;
  noChange: number;
  outcomeObservations: number;
  verifiedSold: number;
  soldWithoutPrice: number;
  verifiedSalePrices: number;
  conflicts: number;
  reviewRequired: number;
  comparableReady: number;
  marketReadyTowns: number;
  publicCatalogueLeaks: number;
  acquisitionGaps: number;
};

export function deriveProductionVerdict(input: {
  connectivity: ConnectivityDiagnostic;
  metrics: LiveEvidenceMetrics;
  engineTested: boolean;
}): {
  verdict: ProductionVerdict;
  reason: string;
  provenInProduction: string[];
  engineTested: string[];
  dataStillMissing: string[];
} {
  const provenInProduction: string[] = [];
  const engineTested: string[] = [];
  const dataStillMissing: string[] = [];

  if (input.connectivity.status === "LIVE_DATA_UNAVAILABLE") {
    return {
      verdict: "PRODUCTION BLOCKED",
      reason: input.connectivity.message,
      provenInProduction,
      engineTested: input.engineTested
        ? ["Unit tests pass — engine logic verified offline"]
        : [],
      dataStillMissing: ["Production database not reachable — cannot verify live evidence"],
    };
  }

  if (input.connectivity.status === "AUTH_ERROR") {
    return {
      verdict: "PRODUCTION BLOCKED",
      reason: input.connectivity.message,
      provenInProduction,
      engineTested: [],
      dataStillMissing: ["Authentication to production database failed"],
    };
  }

  if (input.metrics.historicalEvents > 0) {
    provenInProduction.push(`${input.metrics.historicalEvents} historical auction events in corpus`);
  }
  if (input.metrics.propertyMasters > 0) {
    provenInProduction.push(`${input.metrics.propertyMasters} property masters`);
  }
  if (input.metrics.eligibleP1 > 0) {
    provenInProduction.push(
      `${input.metrics.eligibleP1} P1-eligible licensed sources with exact URLs`,
    );
  }
  if (input.metrics.publicCatalogueLeaks === 0 && input.metrics.historicalEvents > 0) {
    provenInProduction.push("Public catalogue safety — 0 historical leaks detected");
  }

  if (input.engineTested) {
    engineTested.push(
      "HEA 4.3 acquisition pipeline",
      "HI 4.2 outcome/sale-price resolution",
      "HEQ 4.4 evidence quality",
      "II 4.6 investor research layer",
      "Comparable engine rejection codes",
    );
  }

  if (input.metrics.verifiedSalePrices === 0) {
    dataStillMissing.push("No verified sale prices in production");
  }
  if (input.metrics.verifiedSold === 0) {
    dataStillMissing.push("No verified SOLD outcomes in production");
  }
  if (input.metrics.verifiedSalePrices < II47_MINIMUM_MARKET_SALES) {
    dataStillMissing.push(
      `Verified sale prices (${input.metrics.verifiedSalePrices}) below market threshold (${II47_MINIMUM_MARKET_SALES})`,
    );
  }
  if (input.metrics.successfulFetches === 0 && input.metrics.historicalEvents > 0) {
    dataStillMissing.push("No successful source fetches persisted yet — run Acquire P1 (5)");
  }

  let verdict: ProductionVerdict;
  let reason: string;

  if (
    input.metrics.verifiedSalePrices >= II47_MINIMUM_MARKET_SALES &&
    input.metrics.marketReadyTowns > 0
  ) {
    verdict = "PRODUCTION DATA COVERAGE VERIFIED";
    reason = "Verified sale prices meet market threshold with calculable town statistics";
  } else if (
    (input.metrics.verifiedSalePrices > 0 || input.metrics.verifiedSold > 0) &&
    input.metrics.verifiedSalePrices < II47_MINIMUM_MARKET_SALES
  ) {
    verdict = "PRODUCTION DATA COVERAGE PARTIAL";
    reason =
      "Some verified production evidence exists but market thresholds not yet met";
  } else if (
    input.metrics.successfulFetches > 0 &&
    input.metrics.verifiedSalePrices === 0 &&
    input.metrics.verifiedSold === 0
  ) {
    verdict = "INSUFFICIENT DATA — ENGINE READY";
    reason =
      "Source fetches completed but licensed sources have not yet yielded verified sale outcomes or prices";
  } else if (
    input.connectivity.status === "CONNECTED" ||
    input.connectivity.status === "EMPTY_DATABASE"
  ) {
    verdict = "INSUFFICIENT DATA — ENGINE READY";
    reason =
      input.metrics.historicalEvents > 0
        ? "Production corpus reachable — licensed sources have not yet yielded verified sale evidence"
        : "Connected but no historical events in corpus";
  } else {
    verdict = "INSUFFICIENT DATA — ENGINE READY";
    reason = "Engine tested — production evidence not yet acquired";
  }

  return {
    verdict,
    reason,
    provenInProduction,
    engineTested,
    dataStillMissing,
  };
}
