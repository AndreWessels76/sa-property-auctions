/**
 * Investor Intelligence 4.5 admin dashboard aggregates.
 */

import { II45_MINIMUM_MARKET_SALES } from "./config";
import type { BuildContext, InvestorDashboard45 } from "./types";
import { buildMarketEvidenceSummary } from "./marketEvidence";

export function buildInvestorDashboard45(
  globalCtx: BuildContext,
  townContexts: Map<string, BuildContext>,
): InvestorDashboard45 {
  const summary = buildMarketEvidenceSummary(globalCtx);

  let marketReadyTowns = 0;
  for (const ctx of townContexts.values()) {
    const s = buildMarketEvidenceSummary(ctx);
    if (s.verifiedSalePriceCount >= II45_MINIMUM_MARKET_SALES) marketReadyTowns++;
  }

  const agencies = new Map<string, BuildContext>();
  for (const o of globalCtx.observations) {
    const agency = o.agency ?? "unknown";
    const existing = agencies.get(agency) ?? { observations: [], agency };
    existing.observations.push(o);
    agencies.set(agency, existing);
  }

  let marketReadyAgencies = 0;
  for (const ctx of agencies.values()) {
    const s = buildMarketEvidenceSummary(ctx);
    if (s.verifiedSalePriceCount >= II45_MINIMUM_MARKET_SALES) marketReadyAgencies++;
  }

  return {
    historicalEvents: summary.historicalEventCount,
    verifiedSales: summary.confirmedSold,
    verifiedSalePrices: summary.verifiedSalePriceCount,
    comparableReadyEvents: summary.comparableReadyCount,
    marketReadyTowns,
    marketReadyAgencies,
    evidenceQualityHigh: summary.evidenceQuality.high,
    openConflicts: summary.conflictCount,
    reviewRequired: summary.evidenceQuality.insufficient,
    insufficientData:
      summary.verifiedSalePriceCount < II45_MINIMUM_MARKET_SALES
        ? summary.historicalEventCount
        : 0,
  };
}
