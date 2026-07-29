export interface PropertyQuality {
  score: number;
  stars: number;
  grade: string;
}

type QualityInput = {
  title?: string | null;
  description?: string | null;
  address?: string | null;
  province?: string | null;
  town?: string | null;
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  garages?: number | null;
  estimated_value?: number | null;
  auction_price?: number | null;
  auction_date?: string | null;
  qualityScore?: number | null;
};

function scoreToQuality(score: number): PropertyQuality {
  const stars = Math.min(5, Math.max(1, Math.ceil(score / 20)));
  let grade = "Poor";

  if (score >= 90) grade = "Excellent";
  else if (score >= 75) grade = "Very Good";
  else if (score >= 60) grade = "Good";
  else if (score >= 40) grade = "Average";

  return { score, stars, grade };
}

export function getPropertyQuality(property: QualityInput): PropertyQuality {
  if (property.qualityScore != null && property.qualityScore > 0) {
    return scoreToQuality(property.qualityScore);
  }

  return calculatePropertyQuality(property);
}

export function calculatePropertyQuality(
  property: QualityInput,
): PropertyQuality {
  let score = 0;

  if (property.title) score += 10;
  if (property.description) score += 10;
  if (property.address) score += 15;
  if (property.province) score += 5;
  if (property.town) score += 5;
  if (property.property_type) score += 10;
  if ((property.bedrooms ?? 0) > 0) score += 10;
  if ((property.bathrooms ?? 0) > 0) score += 10;
  if ((property.garages ?? 0) > 0) score += 5;
  if ((property.estimated_value ?? 0) > 0) score += 10;
  if ((property.auction_price ?? 0) > 0) score += 10;
  if (property.auction_date) score += 10;

  return scoreToQuality(score);
}