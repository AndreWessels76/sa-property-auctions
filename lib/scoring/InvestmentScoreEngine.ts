import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { calculateSavings } from "@/lib/ai/savings";
import type {
  InvestmentScoreResult,
  ScoreBreakdown,
} from "./ScoreBreakdown";
import { ScoreWeights } from "./ScoreWeights";

function clamp(value: number, min = 0, max = 100): number {
  return Math.round(Math.min(max, Math.max(min, value)));
}

function scoreMarketValue(
  property: PropertyDTO,
  reasons: string[],
): number {
  const estimated = property.estimated_value ?? 0;

  if (estimated <= 0) {
    reasons.push("No estimated market value available.");
    return 35;
  }

  if (estimated >= 5_000_000) {
    reasons.push("High estimated market value.");
    return 70;
  }

  if (estimated >= 1_500_000) {
    reasons.push("Solid estimated market value range.");
    return 85;
  }

  reasons.push("Accessible estimated market value for auction buyers.");
  return 90;
}

function scoreAuctionValue(
  property: PropertyDTO,
  reasons: string[],
): number {
  const estimated = property.estimated_value ?? 0;
  const auction = property.auction_price ?? 0;

  if (estimated <= 0 || auction <= 0) {
    reasons.push("Cannot assess auction discount without both prices.");
    return 40;
  }

  const savings = calculateSavings(estimated, auction);

  if (savings.percent >= 35) {
    reasons.push(`Strong discount of about ${savings.percent}%.`);
    return 95;
  }

  if (savings.percent >= 20) {
    reasons.push(`Attractive discount of about ${savings.percent}%.`);
    return 85;
  }

  if (savings.percent >= 10) {
    reasons.push(`Moderate discount of about ${savings.percent}%.`);
    return 70;
  }

  if (savings.percent > 0) {
    reasons.push(`Limited discount of about ${savings.percent}%.`);
    return 55;
  }

  reasons.push("Auction price is at or above estimated value.");
  return 30;
}

function scoreLocation(
  property: PropertyDTO,
  reasons: string[],
): number {
  let score = 30;

  if (property.province) score += 15;
  if (property.town) score += 20;
  if (property.suburb) score += 15;
  if (property.address) score += 10;
  if (property.latitude != null && property.longitude != null) {
    score += 10;
    reasons.push("GPS coordinates available for map/comparables.");
  } else {
    reasons.push("Location completeness is limited.");
  }

  return clamp(score);
}

function scoreDataQuality(
  property: PropertyDTO,
  reasons: string[],
): number {
  if (property.qualityScore != null && property.qualityScore > 0) {
    reasons.push(`Image/data quality score ${property.qualityScore}.`);
    return clamp(property.qualityScore);
  }

  const fields = [
    property.title,
    property.description,
    property.province,
    property.town,
    property.suburb,
    property.address,
    property.property_type,
    property.auction_date,
    property.auction_price,
    property.estimated_value,
    property.bedrooms,
    property.bathrooms,
  ];

  const filled = fields.filter((value) => {
    if (typeof value === "number") return value > 0;
    return Boolean(value);
  }).length;

  const score = clamp((filled / fields.length) * 100);

  if (score < 60) {
    reasons.push("Listing data is incomplete.");
  } else {
    reasons.push("Listing data coverage supports scoring.");
  }

  return score;
}

function scorePropertyFeatures(
  property: PropertyDTO,
  reasons: string[],
): number {
  let score = 40;

  if ((property.bedrooms ?? 0) >= 3) {
    score += 20;
    reasons.push(`${property.bedrooms} bedrooms suit family demand.`);
  } else if ((property.bedrooms ?? 0) > 0) {
    score += 10;
  }

  if ((property.bathrooms ?? 0) >= 2) score += 15;
  else if ((property.bathrooms ?? 0) > 0) score += 8;

  if ((property.garages ?? 0) > 0) score += 10;

  if (property.property_type) score += 10;

  return clamp(score);
}

function scoreAuctionRisk(
  property: PropertyDTO,
  reasons: string[],
): number {
  let score = 70;
  const source = (property.source ?? "").toLowerCase();

  if (source.includes("sheriff")) {
    score -= 15;
    reasons.push("Sheriff auction typically carries higher process risk.");
  } else if (source.includes("bank")) {
    score -= 8;
    reasons.push("Bank auction — moderate process risk.");
  } else if (source) {
    reasons.push(`Auction source: ${property.source}.`);
  }

  if (property.auction_date) {
    const days =
      (new Date(property.auction_date).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24);

    if (Number.isFinite(days)) {
      if (days < 0) {
        score -= 20;
        reasons.push("Auction date is in the past.");
      } else if (days < 7) {
        score -= 10;
        reasons.push("Auction is imminent — limited diligence time.");
      } else if (days > 60) {
        score += 5;
        reasons.push("Enough lead time before auction.");
      }
    }
  } else {
    score -= 15;
    reasons.push("Missing auction date increases uncertainty.");
  }

  if ((property.status ?? "").toLowerCase() === "sold") {
    score = 20;
    reasons.push("Property marked as sold.");
  }

  return clamp(score);
}

function scoreLiquidity(
  property: PropertyDTO,
  reasons: string[],
): number {
  const type = (property.property_type ?? "").toLowerCase();

  if (type.includes("apartment") || type.includes("flat")) {
    reasons.push("Apartments generally have stronger liquidity.");
    return 90;
  }

  if (type.includes("townhouse")) {
    reasons.push("Townhouses usually resell reasonably well.");
    return 85;
  }

  if (type.includes("house") || type.includes("home")) {
    reasons.push("Houses have broad buyer demand.");
    return 80;
  }

  if (type.includes("commercial")) {
    reasons.push("Commercial stock can be slower to exit.");
    return 55;
  }

  if (type.includes("farm") || type.includes("land") || type.includes("vacant")) {
    reasons.push("Land/farm assets are typically less liquid.");
    return 45;
  }

  reasons.push("Property type liquidity is uncertain.");
  return 60;
}

function scoreConfidence(property: PropertyDTO): number {
  let points = 0;
  let total = 0;

  const checks: Array<[boolean, number]> = [
    [Boolean(property.title), 1],
    [Boolean(property.province), 1],
    [Boolean(property.town), 1],
    [Boolean(property.property_type), 1],
    [(property.auction_price ?? 0) > 0, 2],
    [(property.estimated_value ?? 0) > 0, 2],
    [Boolean(property.auction_date), 1],
    [(property.bedrooms ?? 0) > 0, 1],
    [property.latitude != null && property.longitude != null, 1],
    [(property.qualityScore ?? 0) > 0, 1],
  ];

  for (const [ok, weight] of checks) {
    total += weight;
    if (ok) points += weight;
  }

  return clamp((points / total) * 100);
}

export class InvestmentScoreEngine {
  static calculate(property: PropertyDTO): InvestmentScoreResult {
    const reasons: string[] = [];

    const marketValue = scoreMarketValue(property, reasons);
    const auctionValue = scoreAuctionValue(property, reasons);
    const location = scoreLocation(property, reasons);
    const dataQuality = scoreDataQuality(property, reasons);
    const propertyFeatures = scorePropertyFeatures(property, reasons);
    const auctionRisk = scoreAuctionRisk(property, reasons);
    const liquidity = scoreLiquidity(property, reasons);
    const confidence = scoreConfidence(property);

    const overall = clamp(
      marketValue * ScoreWeights.marketValue +
        auctionValue * ScoreWeights.auctionValue +
        location * ScoreWeights.location +
        dataQuality * ScoreWeights.dataQuality +
        propertyFeatures * ScoreWeights.propertyFeatures +
        auctionRisk * ScoreWeights.auctionRisk +
        liquidity * ScoreWeights.liquidity,
    );

    const breakdown: ScoreBreakdown = {
      overall,
      marketValue,
      auctionValue,
      location,
      dataQuality,
      propertyFeatures,
      auctionRisk,
      liquidity,
      confidence,
      reasons,
    };

    return {
      score: overall,
      confidence,
      breakdown,
    };
  }
}
