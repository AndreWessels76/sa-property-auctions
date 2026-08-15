import { buildEvidenceFunnel54 } from "@/lib/intelligence/historicalIntelligence54";
import type { Hi55FunnelStep } from "./types";

/** Reuse HI 5.4 funnel builder — no parallel funnel math. */
export function buildEvidenceFunnel55(input: {
  licensedSources: number;
  fetchAttempted: number;
  fetchSuccessful: number;
  snapshots: number;
  extractions: number;
  outcomeEvidence: number;
  verifiedSold: number;
  verifiedSalePrices: number;
  comparableReady: number;
  marketReadyTowns: number;
}): Hi55FunnelStep[] {
  return buildEvidenceFunnel54(input);
}
