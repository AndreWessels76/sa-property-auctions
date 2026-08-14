export * from "./config";
export * from "./types";
export * from "./cache";
export * from "./marketEvidence";
export * from "./marketPosition";
export * from "./decisionStatus";
export * from "./comparablePresentation";
export * from "./pricePresentation";
export * from "./investorQuestions";
export * from "./snapshot";
export * from "./areaIntelligence";
export * from "./agencyIntelligence";
export * from "./timeSeries";
export * from "./acquisitionGaps";
export * from "./dashboard";

export function buildEvidenceChain(propertyMasterId: string | null): Array<{
  stage: string;
  label: string;
}> {
  return [
    { stage: "property", label: "Property listing" },
    { stage: "property_master", label: propertyMasterId ?? "NOT_LINKED" },
    { stage: "auction_event", label: "Auction Event chain" },
    { stage: "source", label: "Licensed source" },
    { stage: "source_snapshot", label: "Source snapshot" },
    { stage: "extraction", label: "Due diligence extraction" },
    { stage: "resolution", label: "Historical resolution (HI 4.2)" },
    { stage: "evidence_quality", label: "Evidence quality (HEQ 4.4)" },
    { stage: "intelligence_metric", label: "Investor Intelligence 4.5 metric" },
  ];
}
