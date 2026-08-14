/**
 * Acquisition gap detection — recommends HDA/HEA priority, not investment advice.
 */

import { II45_MINIMUM_MARKET_SALES } from "./config";
import type { AcquisitionGap, BuildContext } from "./types";
import { buildMarketEvidenceSummary } from "./marketEvidence";

export function detectAcquisitionGaps(ctx: BuildContext): AcquisitionGap[] {
  const summary = buildMarketEvidenceSummary(ctx);
  const gaps: AcquisitionGap[] = [];

  const town = ctx.town ?? ctx.observations[0]?.town ?? null;
  const agency = ctx.agency ?? ctx.observations[0]?.agency ?? null;
  const verified = summary.verifiedSalePriceCount;
  const required = II45_MINIMUM_MARKET_SALES;

  if (verified < required) {
    gaps.push({
      town,
      agency,
      verifiedSales: verified,
      required,
      gap: required - verified,
      recommendedAction: "Historical Evidence Acquisition queue",
      priority: verified === 0 ? "P1" : verified < 3 ? "P2" : "P3",
    });
  }

  return gaps;
}

export function detectTownGaps(
  towns: Map<string, BuildContext>,
): AcquisitionGap[] {
  const all: AcquisitionGap[] = [];
  for (const [town, ctx] of towns) {
    all.push(...detectAcquisitionGaps({ ...ctx, town }));
  }
  return all.sort((a, b) => a.gap - b.gap);
}
