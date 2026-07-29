import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

export interface RiskFactor {
  label: string;
  points: number;
}

export interface RiskAnalysis {
  /** Total risk points (higher = riskier) */
  score: number;
  factors: RiskFactor[];
  strengths: string[];
  risks: string[];
}

function hasImages(property: PropertyDTO): boolean {
  return Boolean(
    property.image || property.thumbnail || property.heroImage,
  );
}

export class RiskAnalyzer {
  static analyse(property: PropertyDTO): RiskAnalysis {
    const factors: RiskFactor[] = [];
    const strengths: string[] = [];
    const source = (property.source ?? "").toLowerCase();

    if (!hasImages(property)) {
      factors.push({ label: "No images", points: 15 });
    } else {
      strengths.push("Listing includes property images.");
    }

    if (!property.description?.trim()) {
      factors.push({ label: "No description", points: 10 });
    } else {
      strengths.push("Listing has a description.");
    }

    if (source.includes("sheriff")) {
      factors.push({ label: "Sheriff Auction", points: 15 });
    } else if (source.includes("bank")) {
      factors.push({ label: "Bank Auction", points: 8 });
    } else if (source) {
      strengths.push(`Known auction source: ${property.source}.`);
    }

    if (!property.address?.trim()) {
      factors.push({ label: "Missing Address", points: 10 });
    } else {
      strengths.push("Street address is present.");
    }

    if ((property.estimated_value ?? 0) <= 0) {
      factors.push({ label: "Estimated Value Unknown", points: 20 });
    } else {
      strengths.push("Estimated market value is available.");
    }

    const score = factors.reduce((total, factor) => total + factor.points, 0);

    const risks = factors.map(
      (factor) => `${factor.label} (+${factor.points} Risk)`,
    );

    return {
      score,
      factors,
      strengths,
      risks,
    };
  }
}
