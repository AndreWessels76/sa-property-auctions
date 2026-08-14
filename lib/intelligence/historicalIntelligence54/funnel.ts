import type { Hi54FunnelStep } from "./types";

export function buildEvidenceFunnel54(input: {
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
}): Hi54FunnelStep[] {
  return [
    { key: "licensedSources", label: "Licensed Sources", value: input.licensedSources },
    { key: "fetchAttempted", label: "Fetch Attempted", value: input.fetchAttempted },
    { key: "fetchSuccessful", label: "Fetch Successful", value: input.fetchSuccessful },
    { key: "snapshots", label: "Snapshots", value: input.snapshots },
    { key: "extractions", label: "Extractions", value: input.extractions },
    { key: "outcomeEvidence", label: "Outcome Evidence", value: input.outcomeEvidence },
    { key: "verifiedSold", label: "Verified SOLD", value: input.verifiedSold },
    { key: "verifiedSalePrices", label: "Verified Sale Price", value: input.verifiedSalePrices },
    { key: "comparableReady", label: "Comparable Ready", value: input.comparableReady },
    { key: "marketReadyTowns", label: "Market Ready", value: input.marketReadyTowns },
  ];
}
