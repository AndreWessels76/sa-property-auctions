import type { Hi51IntelligenceReport } from "@/lib/intelligence/historicalIntelligence51";
import type { Hi52EvidenceLabels, Hi52Verdict } from "./types";
import { primaryBottleneck } from "./bottleneck";

export function deriveHi52Verdict(input: {
  liveDataUnavailable?: boolean;
  emptyDatabase?: boolean;
  catalogueLeaks: number;
  historicalEvents: number;
  verifiedSalePrices: number;
  verifiedSold: number;
  neverAttempted: number;
  fetchAttempted: number;
}): { verdict: Hi52Verdict; reason: string } {
  if (input.liveDataUnavailable) {
    return {
      verdict: "PRODUCTION BLOCKED — LIVE DATA UNAVAILABLE",
      reason: "Connectivity failed — do not interpret as zero rows",
    };
  }
  if (input.emptyDatabase || input.historicalEvents === 0) {
    return {
      verdict: "EMPTY DATABASE",
      reason: "Connected but no historical events present",
    };
  }
  if (input.catalogueLeaks > 0) {
    return {
      verdict: "PRODUCTION BLOCKED — LIVE DATA UNAVAILABLE",
      reason: `Catalogue leaks = ${input.catalogueLeaks} — FAIL THE RELEASE`,
    };
  }
  if (input.verifiedSalePrices > 0 && input.neverAttempted === 0) {
    return {
      verdict: "PRODUCTION DATA COVERED",
      reason: "Verified sale prices present and fetch coverage complete",
    };
  }
  if (input.fetchAttempted > 0 && input.verifiedSalePrices === 0) {
    return {
      verdict: "INSUFFICIENT DATA — ENGINE READY",
      reason: "Engine operational — verified sale evidence still insufficient",
    };
  }
  if (input.fetchAttempted > 0 && input.neverAttempted > 0) {
    return {
      verdict: "PRODUCTION DATA PARTIALLY COVERED",
      reason: "Partial fetch coverage — controlled recovery required",
    };
  }
  return {
    verdict: "INSUFFICIENT DATA — ENGINE READY",
    reason: "Controlled recovery engine ready — evidence incomplete",
  };
}

export function buildEvidenceLabels(report: Hi51IntelligenceReport): Hi52EvidenceLabels {
  const provenInProduction: string[] = [];
  const tested: string[] = [];
  const engineReady: string[] = [];
  const insufficientData: string[] = [];
  const reviewRequired: string[] = [];

  if (report.coverageDashboard.catalogueLeaks === 0) {
    provenInProduction.push("Public catalogue safety — 0 leaks");
  }
  provenInProduction.push(
    `Licensed sources: ${report.coverageDashboard.licensedSources}`,
  );
  provenInProduction.push(
    `Historical events: ${report.coverageDashboard.historicalEvents}`,
  );
  if (Number(report.coverageDashboard.fetchSuccessful) > 0) {
    provenInProduction.push(
      `${report.coverageDashboard.fetchSuccessful} successful fetches in production`,
    );
  }

  tested.push("HI 5.2 controlled batch orchestration (limit 5)");
  tested.push("P1 / Legacy / Extraction dry-run paths");
  tested.push("Fetch classifier + legacy separation");

  engineReady.push("Acquire P1 (5) via HEA 4.3");
  engineReady.push("Retry Legacy Failures (5)");
  engineReady.push("Extract Existing Snapshots (5) without refetch");
  engineReady.push("HI 4.2 resolve + HEQ 4.4 quality + rebuild");

  if (Number(report.coverageDashboard.verifiedSold) === 0) {
    insufficientData.push("No verified SOLD outcomes");
  }
  if (Number(report.coverageDashboard.verifiedSalePrices) === 0) {
    insufficientData.push("No verified sale prices — do not declare sale statistics ready");
  }
  if (Number(report.coverageDashboard.comparableReady) === 0) {
    insufficientData.push("Comparable ready = 0 (threshold not met)");
  }
  if (Number(report.coverageDashboard.marketReadyTowns) === 0) {
    insufficientData.push("Market ready towns = 0 (min 5 sales)");
  }
  if (Number(report.coverageDashboard.neverAttempted) > 0) {
    insufficientData.push(
      `${report.coverageDashboard.neverAttempted} events never fetch-attempted`,
    );
  }

  if (Number(report.coverageDashboard.reviewRequired) > 0) {
    reviewRequired.push(`${report.coverageDashboard.reviewRequired} events require review`);
  }
  if (report.p4ReviewCount > 0) {
    reviewRequired.push(`${report.p4ReviewCount} P4 blocked records visible`);
  }

  return {
    provenInProduction,
    tested,
    engineReady,
    insufficientData,
    reviewRequired,
  };
}

export function nextAdminActionFromReport(report: Hi51IntelligenceReport): string {
  const primary = primaryBottleneck(report.events);
  return `${primary.code} (${primary.count}/${primary.total}) → ${primary.recommendedAction}`;
}
