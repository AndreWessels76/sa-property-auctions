import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

export interface IntelligenceBadge {
  emoji: string;
  label: string;
}

export class BadgeEngine {
  static build(input: {
    property: PropertyDTO;
    investmentScore: number;
    estimatedDiscount: number | null;
    rentalYield: number | null;
    riskScore: number;
  }): IntelligenceBadge[] {
    const badges: IntelligenceBadge[] = [];
    const bedrooms = input.property.bedrooms ?? 0;
    const type = (input.property.property_type ?? "").toLowerCase();
    const source = (input.property.source ?? "").toLowerCase();

    if (
      (input.estimatedDiscount ?? 0) >= 20 &&
      input.riskScore < 35 &&
      input.investmentScore >= 75
    ) {
      badges.push({ emoji: "💎", label: "Hidden Gem" });
    }

    if (
      bedrooms >= 3 &&
      (type.includes("house") ||
        type.includes("home") ||
        type.includes("townhouse"))
    ) {
      badges.push({ emoji: "🏡", label: "Family Home" });
    }

    if ((input.estimatedDiscount ?? 0) >= 15) {
      badges.push({ emoji: "⭐", label: "Great Value" });
    }

    if (
      input.rentalYield != null &&
      input.rentalYield >= 8
    ) {
      badges.push({ emoji: "📈", label: "High Yield" });
    }

    if (source.includes("sheriff")) {
      badges.push({ emoji: "⚖️", label: "Sheriff Sale" });
    }

    if (input.investmentScore >= 85 && input.riskScore < 25) {
      badges.push({ emoji: "🔥", label: "Top Pick" });
    }

    return badges.slice(0, 4);
  }
}
