/**
 * Investor decision status — evidence assessment, NOT investment advice.
 */

import { II45_MINIMUM_COMPARABLE_SALES, II45_MINIMUM_MARKET_SALES } from "./config";
import type {
  BuildContext,
  InvestorDecisionStatus,
  MarketEvidenceSummary,
  MarketPosition,
} from "./types";

export function deriveDecisionStatus(
  summary: MarketEvidenceSummary,
  position: MarketPosition,
  ctx: BuildContext,
  comparableCount: number,
): { status: InvestorDecisionStatus; reasons: string[] } {
  const reasons: string[] = [];

  if (summary.conflictCount > 0) {
    reasons.push(`${summary.conflictCount} open conflict(s) on linked evidence`);
    return { status: "CONFLICT", reasons };
  }

  const needsReview = ctx.scoredEvents?.some(
    (e) => e.score.overallConfidence === "INSUFFICIENT" && e.observation.verified,
  );
  if (needsReview) {
    reasons.push("Evidence quality review required on one or more events");
    return { status: "REVIEW_REQUIRED", reasons };
  }

  const verifiedSales = summary.verifiedSalePriceCount;
  reasons.push(`${verifiedSales} verified market sale price(s)`);
  reasons.push(
    `${comparableCount} verified comparable sale(s) with matching property type`,
  );

  if (verifiedSales === 0 && comparableCount === 0 && summary.historicalEventCount === 0) {
    reasons.push("No historical evidence linked");
    return { status: "INSUFFICIENT_DATA", reasons };
  }

  if (verifiedSales < II45_MINIMUM_MARKET_SALES && comparableCount < II45_MINIMUM_COMPARABLE_SALES) {
    if (verifiedSales === 0) reasons.push("auction price not supplied or unverified");
    if (position.missingCategories.length) {
      reasons.push(...position.missingCategories);
    }
    return { status: "LIMITED_EVIDENCE", reasons };
  }

  if (
    verifiedSales >= II45_MINIMUM_MARKET_SALES &&
    comparableCount >= II45_MINIMUM_COMPARABLE_SALES &&
    summary.evidenceQuality.high >= summary.historicalEventCount * 0.5
  ) {
    return { status: "STRONG_EVIDENCE", reasons };
  }

  if (verifiedSales >= II45_MINIMUM_MARKET_SALES || comparableCount >= II45_MINIMUM_COMPARABLE_SALES) {
    return { status: "GOOD_EVIDENCE", reasons };
  }

  return { status: "LIMITED_EVIDENCE", reasons };
}
