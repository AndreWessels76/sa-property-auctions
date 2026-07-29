import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { calculateSavings } from "@/lib/ai/savings";
import { PropertyIntelligence } from "@/lib/intelligence";
import type { AlertType } from "@/lib/repositories/AlertRepository";
import {
  HIDDEN_GEM_DISCOUNT_THRESHOLD,
  HIGH_SCORE_THRESHOLD,
  PRICE_DROP_PERCENT_THRESHOLD,
} from "./alertThresholds";

export interface PropertyAlertSignal {
  type: AlertType;
  title: string;
  message: string;
  investmentScore?: number;
  discountPercent?: number;
  previousPrice?: number;
  newPrice?: number;
}

function formatPrice(amount: number): string {
  return `R${amount.toLocaleString("en-ZA")}`;
}

export class IntelligenceAlertDetector {
  /**
   * Detect intelligence-based alert signals for a property.
   *
   * Investment Score ≥ 85 → HIGH_SCORE
   * Discount ≥ 25% below market → HIDDEN_GEM
   * Price drop (e.g. R2m → R1.7m) → PRICE_DROP
   */
  static detect(
    property: PropertyDTO,
    previousPrice?: number | null,
  ): PropertyAlertSignal[] {
    const signals: PropertyAlertSignal[] = [];
    const intelligence = PropertyIntelligence.analyse(property);

    if (intelligence.investmentScore >= HIGH_SCORE_THRESHOLD) {
      signals.push({
        type: "HIGH_SCORE",
        title: "High investment score",
        message: `Investment score: ${intelligence.investmentScore}`,
        investmentScore: intelligence.investmentScore,
      });
    }

    const discount = intelligence.estimatedDiscount ?? 0;

    if (discount >= HIDDEN_GEM_DISCOUNT_THRESHOLD) {
      signals.push({
        type: "HIDDEN_GEM",
        title: "Hidden gem",
        message: `${discount}% onder markwaarde`,
        discountPercent: discount,
      });
    }

    const currentPrice = property.auction_price ?? 0;
    const priorPrice = previousPrice ?? 0;

    if (
      priorPrice > 0 &&
      currentPrice > 0 &&
      currentPrice < priorPrice
    ) {
      const dropPercent = Math.round(
        ((priorPrice - currentPrice) / priorPrice) * 100,
      );

      if (dropPercent >= PRICE_DROP_PERCENT_THRESHOLD) {
        signals.push({
          type: "PRICE_DROP",
          title: "Price drop",
          message: `${formatPrice(priorPrice)} → ${formatPrice(currentPrice)}`,
          previousPrice: priorPrice,
          newPrice: currentPrice,
        });
      }
    }

    return signals;
  }

  /** Quick check using raw values without full intelligence pass */
  static detectDiscount(
    property: PropertyDTO,
  ): number | null {
    const estimated = property.estimated_value ?? 0;
    const auction = property.auction_price ?? 0;

    if (estimated <= 0 || auction <= 0) {
      return null;
    }

    const savings = calculateSavings(estimated, auction);

    return savings.percent > 0 ? savings.percent : null;
  }
}
