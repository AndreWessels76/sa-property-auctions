import type { AIPropertyAnalysisDTO } from "@/lib/dto/AIPropertyAnalysisDTO";
import type { PropertyAnalysisPayload } from "@/lib/ai/buildPropertyAnalysisPayload";

function pickString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function pickNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function pickStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function mapPropertyAnalysisResponse(
  raw: unknown,
): AIPropertyAnalysisDTO {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;

  const score = pickNumber(data.score);
  const confidence = pickNumber(data.confidence);
  const estimatedDiscount = pickNumber(data.estimatedDiscount);
  const summary =
    pickString(data.summary) ?? "Insufficient data for a full analysis.";

  return {
    score: score != null ? clamp(score, 0, 100) : 50,
    confidence: confidence != null ? clamp(confidence, 0, 1) : 0.4,
    summary,
    strengths: pickStringArray(data.strengths),
    risks: pickStringArray(data.risks),
    buyerProfile: pickStringArray(data.buyerProfile),
    estimatedDiscount:
      estimatedDiscount != null ? clamp(estimatedDiscount, 0, 100) : null,
  };
}

export function fallbackPropertyAnalysis(
  payload: PropertyAnalysisPayload,
): AIPropertyAnalysisDTO {
  const strengths: string[] = [];
  const risks: string[] = [];
  const buyerProfile: string[] = [];

  let estimatedDiscount: number | null = null;

  if (
    payload.estimatedValue != null &&
    payload.auctionPrice != null &&
    payload.estimatedValue > 0
  ) {
    estimatedDiscount = clamp(
      ((payload.estimatedValue - payload.auctionPrice) /
        payload.estimatedValue) *
        100,
      0,
      100,
    );

    if (estimatedDiscount >= 15) {
      strengths.push(
        `Auction price is about ${Math.round(estimatedDiscount)}% below estimated value.`,
      );
    } else {
      risks.push("Limited discount versus estimated market value.");
    }
  } else {
    risks.push("Estimated value or auction price is missing.");
  }

  if (payload.town) {
    strengths.push(`Located in ${payload.town}.`);
  }

  if (payload.bedrooms != null && payload.bedrooms >= 3) {
    strengths.push(`${payload.bedrooms} bedrooms may suit family buyers.`);
    buyerProfile.push("Family buyers");
  }

  if (payload.auctionType) {
    buyerProfile.push(`${payload.auctionType} auction buyers`);
  }

  if (!buyerProfile.length) {
    buyerProfile.push("Value-seeking auction investors");
  }

  const score =
    estimatedDiscount != null
      ? clamp(40 + estimatedDiscount * 0.8, 0, 100)
      : 45;

  return {
    score: Math.round(score),
    confidence: 0.35,
    summary: `${payload.title} — rule-based preview until an AI provider key is configured.`,
    strengths,
    risks,
    buyerProfile,
    estimatedDiscount:
      estimatedDiscount != null ? Math.round(estimatedDiscount) : null,
  };
}
