import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { calculateSavings } from "@/lib/ai/savings";

export type MarketPosition =
  | "Below Market"
  | "Market Value"
  | "Above Market";

export class DealFinder {
  static analyse(property: PropertyDTO): {
    estimatedDiscount: number | null;
    marketPosition: MarketPosition;
    badges: string[];
  } {
    const estimated = property.estimated_value ?? 0;
    const auction = property.auction_price ?? 0;
    const badges: string[] = [];

    if (estimated <= 0 || auction <= 0) {
      return {
        estimatedDiscount: null,
        marketPosition: "Market Value",
        badges,
      };
    }

    const savings = calculateSavings(estimated, auction);
    const estimatedDiscount = savings.percent > 0 ? savings.percent : 0;

    let marketPosition: MarketPosition = "Market Value";

    if (auction < estimated * 0.95) {
      marketPosition = "Below Market";
      badges.push("Below Market");
    } else if (auction > estimated * 1.05) {
      marketPosition = "Above Market";
      badges.push("Above Market");
    }

    if (savings.percent >= 20) {
      badges.push("Strong Discount");
    }

    return {
      estimatedDiscount: estimatedDiscount || null,
      marketPosition,
      badges,
    };
  }
}
