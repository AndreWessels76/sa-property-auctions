/**
 * Production verdict for HSC 4.8 — measure reality, do not manufacture it.
 */

import type { ConnectivityDiagnostic } from "@/lib/intelligence/investorIntelligence47/connectivityDiagnostic";
import type { Hsc48Metrics, Hsc48ProductionVerdict } from "./types";

export function deriveHsc48Verdict(input: {
  connectivity: ConnectivityDiagnostic;
  metrics: Hsc48Metrics;
  engineTested: boolean;
}): {
  verdict: Hsc48ProductionVerdict;
  reason: string;
  provenInProduction: string[];
  engineTested: string[];
  sourceCoverage: string[];
  dataStillMissing: string[];
  technicalBlockers: string[];
  adminReviewRequired: string[];
} {
  const provenInProduction: string[] = [];
  const engineTested: string[] = [];
  const sourceCoverage: string[] = [];
  const dataStillMissing: string[] = [];
  const technicalBlockers: string[] = [];
  const adminReviewRequired: string[] = [];

  if (
    input.connectivity.status === "LIVE_DATA_UNAVAILABLE" ||
    input.connectivity.status === "AUTH_ERROR"
  ) {
    return {
      verdict: "PRODUCTION BLOCKED",
      reason: `PRODUCTION BLOCKED — LIVE DATA UNAVAILABLE: ${input.connectivity.message}`,
      provenInProduction,
      engineTested: input.engineTested
        ? ["HSC 4.8 diagnostic engine unit-tested offline"]
        : [],
      sourceCoverage,
      dataStillMissing: ["Cannot read production historical events"],
      technicalBlockers: [input.connectivity.message],
      adminReviewRequired: [],
    };
  }

  if (input.metrics.historicalEvents > 0) {
    provenInProduction.push(
      `${input.metrics.historicalEvents} historical auction events audited`,
    );
  }
  if (input.metrics.propertyMasters > 0) {
    provenInProduction.push(`${input.metrics.propertyMasters} property masters`);
  }
  if (input.metrics.catalogueLeaks === 0 && input.metrics.historicalEvents > 0) {
    provenInProduction.push("Public catalogue safety — 0 leaks");
  }

  sourceCoverage.push(
    `Source coverage: ${input.metrics.sourceFound}/${input.metrics.historicalEvents}`,
  );
  sourceCoverage.push(
    `Fetch coverage: ${input.metrics.fetchAttempted}/${input.metrics.historicalEvents}`,
  );
  sourceCoverage.push(
    `Snapshot coverage: ${input.metrics.snapshots + input.metrics.noChange}/${input.metrics.historicalEvents}`,
  );
  sourceCoverage.push(
    `Extraction coverage: ${input.metrics.extractionAttempted}/${input.metrics.historicalEvents}`,
  );

  if (input.metrics.tlsErrors > 0) {
    technicalBlockers.push(`${input.metrics.tlsErrors} events blocked by TLS errors`);
  }
  if (input.metrics.networkErrors > 0) {
    technicalBlockers.push(`${input.metrics.networkErrors} events blocked by network errors`);
  }
  if (input.metrics.http404 > 0) {
    technicalBlockers.push(`${input.metrics.http404} events returned HTTP 404`);
  }
  if (input.metrics.sourceBlocked > 0) {
    technicalBlockers.push(`${input.metrics.sourceBlocked} events license-blocked`);
  }

  if (input.metrics.reviewRequired > 0) {
    adminReviewRequired.push(`${input.metrics.reviewRequired} events require admin review`);
  }
  if (input.metrics.conflicts > 0) {
    adminReviewRequired.push(`${input.metrics.conflicts} conflicting outcome observations`);
  }

  if (input.metrics.verifiedSalePrices === 0) {
    dataStillMissing.push("No verified sale prices in production");
  }
  if (input.metrics.verifiedSold === 0) {
    dataStillMissing.push("No verified SOLD outcomes in production");
  }
  if (input.metrics.fetchAttempted < input.metrics.historicalEvents) {
    dataStillMissing.push(
      `${input.metrics.historicalEvents - input.metrics.fetchAttempted} events never fetch-attempted`,
    );
  }

  if (input.engineTested) {
    engineTested.push(
      "HSC 4.8 per-event evidence chain diagnostic",
      "HEA 4.3 P1–P4 queue integration",
      "Refetch audit + enrichment run join",
      "HI 4.2 / HEQ 4.4 / II 4.6 gap mapping",
    );
  }

  let verdict: Hsc48ProductionVerdict;
  let reason: string;

  const snapshotCoverage =
    input.metrics.snapshots + input.metrics.noChange;
  const fetchRate =
    input.metrics.historicalEvents > 0
      ? snapshotCoverage / input.metrics.historicalEvents
      : 0;

  if (
    input.metrics.verifiedSalePrices >= 5 &&
    input.metrics.marketReadyTowns > 0
  ) {
    verdict = "PRODUCTION SOURCE COVERAGE VERIFIED";
    reason = "Verified sale prices meet market threshold with source coverage";
  } else if (
    fetchRate >= 0.5 &&
    (input.metrics.verifiedSold > 0 || input.metrics.verifiedSalePrices > 0)
  ) {
    verdict = "PRODUCTION SOURCE COVERAGE PARTIAL";
    reason = "Partial source coverage with some verified evidence";
  } else if (
    input.metrics.successfulFetches > 0 &&
    input.metrics.verifiedSalePrices === 0 &&
    input.metrics.verifiedSold === 0
  ) {
    verdict = "INSUFFICIENT DATA — ENGINE READY";
    reason =
      "Source fetches completed but licensed sources have not yielded verified sale outcomes or prices";
  } else if (input.connectivity.status === "CONNECTED") {
    verdict = "INSUFFICIENT DATA — ENGINE READY";
    reason =
      input.metrics.historicalEvents > 0
        ? `${input.metrics.historicalEvents - snapshotCoverage} events stop before snapshot — engine ready, evidence missing`
        : "Connected but no historical events";
  } else {
    verdict = "INSUFFICIENT DATA — ENGINE READY";
    reason = "Engine tested — production evidence chain incomplete";
  }

  return {
    verdict,
    reason,
    provenInProduction,
    engineTested,
    sourceCoverage,
    dataStillMissing,
    technicalBlockers,
    adminReviewRequired,
  };
}
