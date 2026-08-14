/**
 * Resolution dashboard aggregates (HI 4.2).
 */

import { HI42_MINIMUM_MARKET_SALES } from "./config";
import type { HistoricalEventResolution, ResolutionDashboard } from "./types";

export function buildResolutionDashboard(
  resolutions: HistoricalEventResolution[],
): ResolutionDashboard {
  const evidenceConfidence = { high: 0, medium: 0, low: 0, insufficient: 0 };
  let unresolved = 0;
  let sourceFound = 0;
  let extracted = 0;
  let identityPending = 0;
  let reviewRequired = 0;
  let verified = 0;
  let verifiedSold = 0;
  let soldWithoutPrice = 0;
  let verifiedSalePrices = 0;
  let conflicts = 0;
  let identityReviews = 0;
  let insufficientData = 0;
  let comparableReady = 0;

  for (const r of resolutions) {
    const q = r.evidenceQuality.toLowerCase();
    if (q === "high") evidenceConfidence.high += 1;
    else if (q === "medium") evidenceConfidence.medium += 1;
    else if (q === "low") evidenceConfidence.low += 1;
    else evidenceConfidence.insufficient += 1;

    switch (r.state) {
      case "UNRESOLVED":
        unresolved += 1;
        break;
      case "SOURCE_FOUND":
        sourceFound += 1;
        break;
      case "EXTRACTED":
        extracted += 1;
        break;
      case "IDENTITY_PENDING":
        identityPending += 1;
        break;
      case "REVIEW_REQUIRED":
        reviewRequired += 1;
        break;
      case "VERIFIED":
        verified += 1;
        break;
      case "CONFLICT":
        conflicts += 1;
        break;
      case "INSUFFICIENT_DATA":
        insufficientData += 1;
        break;
    }

    if (r.outcome === "SOLD" && r.state === "VERIFIED") verifiedSold += 1;
    if (r.label === "SOLD_WITHOUT_PRICE" || r.agreement === "SOLD_WITHOUT_PRICE") {
      soldWithoutPrice += 1;
    }
    if (r.salePrice != null && r.agreement === "VERIFIED") verifiedSalePrices += 1;
    if (r.identityReviewRequired) identityReviews += 1;
    if (r.comparableEligible) comparableReady += 1;
  }

  return {
    totalHistoricalEvents: resolutions.length,
    unresolved,
    sourceFound,
    extracted,
    identityPending,
    reviewRequired,
    verified,
    verifiedSold,
    soldWithoutPrice,
    verifiedSalePrices,
    conflicts,
    identityReviews,
    insufficientData,
    comparableReady,
    marketStatisticsAvailable: verifiedSalePrices >= HI42_MINIMUM_MARKET_SALES,
    evidenceConfidence,
  };
}
