import type { Hi53FunnelStep } from "./types";

export function buildEvidenceFunnel(input: {
  historicalEvents: number;
  licensedSources: number;
  fetchAttempted: number;
  fetchSuccessful: number;
  snapshots: number;
  extractions: number;
  outcomeEvidence: number;
  verifiedSold: number;
  verifiedSalePrices: number;
}): Hi53FunnelStep[] {
  return [
    { key: "historicalEvents", label: "Historical Events", value: input.historicalEvents },
    { key: "licensedSources", label: "Licensed Sources", value: input.licensedSources },
    { key: "fetchAttempted", label: "Fetch Attempted", value: input.fetchAttempted },
    { key: "fetchSuccessful", label: "Fetch Successful", value: input.fetchSuccessful },
    { key: "snapshots", label: "Snapshots", value: input.snapshots },
    { key: "extractions", label: "Extractions", value: input.extractions },
    { key: "outcomeEvidence", label: "Outcome Observations", value: input.outcomeEvidence },
    { key: "verifiedSold", label: "Verified SOLD", value: input.verifiedSold },
    { key: "verifiedSalePrices", label: "Verified Sale Prices", value: input.verifiedSalePrices },
  ];
}

export function renderFunnelText(steps: Hi53FunnelStep[]): string {
  return steps.map((s, i) => `${i === 0 ? "" : "        ↓\n"}${s.value} ${s.label}`).join("\n");
}
