export interface IntelligenceBadge {
  emoji: string;
  label: string;
}

export interface PropertyIntelligenceDTO {
  investmentScore: number;
  confidence: number;
  riskScore: number;
  dealRating: "Excellent" | "Good" | "Average" | "Risky";
  badges: IntelligenceBadge[];
  strengths: string[];
  risks: string[];
  recommendations: string[];
  dueDiligence: string[];
  estimatedDiscount: number | null;
  estimatedRentalYield: number | null;
  marketPosition: "Below Market" | "Market Value" | "Above Market";
}
