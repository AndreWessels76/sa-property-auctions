import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { PropertyIntelligenceDTO } from "@/lib/dto/PropertyIntelligenceDTO";
import type { RentalAnalysis } from "@/lib/intelligence/RentalAnalyzer";

/** Standard SA auction due-diligence checklist */
export const DUE_DILIGENCE_CHECKLIST = [
  "Arrange property viewing",
  "Verify occupancy",
  "Obtain title deed",
  "Check municipal arrears",
  "Verify zoning",
] as const;

/** Property-specific inspection recommendations */
export const INSPECTION_RECOMMENDATIONS = [
  "Verify municipal rates",
  "Inspect roof",
  "Check eviction status",
] as const;

export class RecommendationEngine {
  static checklist(): string[] {
    return [...DUE_DILIGENCE_CHECKLIST];
  }

  static build(input: {
    property: PropertyDTO;
    dealRating: PropertyIntelligenceDTO["dealRating"];
    marketPosition: PropertyIntelligenceDTO["marketPosition"];
    estimatedDiscount: number | null;
    rental: RentalAnalysis;
    risks: string[];
  }): string[] {
    const recommendations: string[] = [...INSPECTION_RECOMMENDATIONS];

    const source = (input.property.source ?? "").toLowerCase();

    if (source.includes("sheriff")) {
      recommendations.push("Review sheriff conditions of sale with an attorney.");
    }

    if (input.risks.some((risk) => risk.toLowerCase().includes("no images"))) {
      recommendations.push("Request additional photos before bidding.");
    }

    if (
      input.risks.some((risk) =>
        risk.toLowerCase().includes("estimated value unknown"),
      )
    ) {
      recommendations.push("Obtain an independent valuation.");
    }

    if (input.marketPosition === "Below Market") {
      recommendations.push(
        "Confirm comparable sales nearby before bidding aggressively.",
      );
    }

    if (
      input.rental.annualRentalYieldPercent != null &&
      input.rental.annualRentalYieldPercent >= 8
    ) {
      recommendations.push(
        "Validate rental demand with local letting agents.",
      );
    }

    if (input.dealRating === "Risky") {
      recommendations.push(
        "Complete full due diligence before committing capital.",
      );
    }

    return Array.from(new Set(recommendations)).slice(0, 8);
  }
}
