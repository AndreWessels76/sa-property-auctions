import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { PropertyIntelligenceDTO } from "@/lib/dto/PropertyIntelligenceDTO";
import { InvestmentScoreEngine } from "@/lib/scoring";
import { BadgeEngine } from "@/lib/intelligence/BadgeEngine";
import { DealFinder } from "@/lib/intelligence/deal-finder";
import { LocationAnalyzer } from "@/lib/intelligence/LocationAnalyzer";
import { RecommendationEngine } from "@/lib/intelligence/RecommendationEngine";
import { RentalAnalyzer } from "@/lib/intelligence/RentalAnalyzer";
import { RiskAnalyzer } from "@/lib/intelligence/RiskAnalyzer";

function dealRatingFromScore(
  score: number,
  riskScore: number,
): PropertyIntelligenceDTO["dealRating"] {
  const adjusted = score - riskScore * 0.35;

  if (adjusted >= 80) return "Excellent";
  if (adjusted >= 65) return "Good";
  if (adjusted >= 50) return "Average";
  return "Risky";
}

export class PropertyIntelligence {
  static analyse(property: PropertyDTO): PropertyIntelligenceDTO {
    const score = InvestmentScoreEngine.calculate(property);
    const deal = DealFinder.analyse(property);
    const location = LocationAnalyzer.analyse(property);
    const risk = RiskAnalyzer.analyse(property);
    const rental = RentalAnalyzer.analyse(property);

    const dealRating = dealRatingFromScore(score.score, risk.score);

    const badges = BadgeEngine.build({
      property,
      investmentScore: score.score,
      estimatedDiscount: deal.estimatedDiscount,
      rentalYield: rental.annualRentalYieldPercent,
      riskScore: risk.score,
    });

    const strengths = [
      ...score.breakdown.reasons.filter((reason) =>
        /discount|demand|liquidity|coordinates|coverage|value/i.test(reason),
      ),
      ...location.strengths,
      ...risk.strengths,
    ];

    if (rental.estimatedMonthlyRent != null) {
      strengths.push(
        `Estimated rent ≈ R${rental.estimatedMonthlyRent.toLocaleString("en-ZA")}/month.`,
      );
    }

    const risks = [...risk.risks, ...location.risks];

    const recommendations = RecommendationEngine.build({
      property,
      dealRating,
      marketPosition: deal.marketPosition,
      estimatedDiscount: deal.estimatedDiscount,
      rental,
      risks,
    });

    return {
      investmentScore: score.score,
      confidence: score.confidence,
      riskScore: risk.score,
      dealRating,
      badges,
      strengths: Array.from(new Set(strengths)).slice(0, 6),
      risks: Array.from(new Set(risks)).slice(0, 8),
      recommendations,
      dueDiligence: RecommendationEngine.checklist(),
      estimatedDiscount: deal.estimatedDiscount,
      estimatedRentalYield: rental.annualRentalYieldPercent,
      marketPosition: deal.marketPosition,
    };
  }
}
